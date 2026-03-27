const express = require('express');
const { getUsers, getIntegrations, getProjects, saveProjects, getPermissions } = require('../db');

const router = express.Router();
const HS = 'https://api.hubapi.com';

// In-memory cache for HubSpot deals — refreshed once daily at 7 AM
let dealsCache = null;
let dealsCacheTime = 0;

function hsHeaders() {
  const hs    = getIntegrations().connectors?.find(c => c.id === 'hubspot');
  const token = hs?.apiKey || process.env.HUBSPOT_TOKEN;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function requireAdmin(req, res, next) {
  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user || user.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required.' });
  next();
}

function requireHubspotAccess(req, res, next) {
  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });
  const perms = getPermissions();
  const allowed = perms[user.role]?.view_hubspot === true;
  if (!allowed) return res.status(403).json({ error: 'HubSpot access not granted for your role.' });
  next();
}

// Only these client_stage values are pulled
const ACTIVE_STAGES = ['Sales Handover', 'Customer Onboarding', 'implem_upsell_onboarding', 'Customer Success'];

// Only this stage triggers auto-sync to local DB
const AUTO_SYNC_STAGE = 'Customer Onboarding';

function hsStatusToLocal(clientStatus, stage) {
  const s = (clientStatus || stage || '').toLowerCase().trim();
  if (s.includes('churn'))                         return 'churn';
  if (s.includes('on hold') || s.includes('hold')) return 'on-hold';
  if (s.includes('return') || s.includes('sales')) return 'on-hold-sales';
  if (s.includes('complet'))                       return 'completed';
  return 'ongoing';
}

function resolveToLocalUser(raw, users) {
  if (!raw) return null;
  return users.find(u =>
    (u.hubspotOwnerId && u.hubspotOwnerId === raw) ||
    (u.email && u.email.toLowerCase() === raw.toLowerCase())
  ) || null;
}

// Shared auto-sync — called by both the background refresh and the manual Refresh button.
// Only Customer Onboarding companies are written to the local DB.
function autoSyncCustomerOnboarding(deals) {
  const coDeals = deals.filter(d => d.stage === AUTO_SYNC_STAGE);
  if (!coDeals.length) return;

  const users    = getUsers();
  const existing = getProjects();
  let added = 0, updated = 0;

  coDeals.forEach(deal => {
    const matchedPm      = deal.ownerHubspotId ? resolveToLocalUser(deal.ownerHubspotId, users) : null;
    const projectManager = matchedPm?.id || null;

    const implUsers = [
      resolveToLocalUser(deal.hrImplementerRaw,       users),
      resolveToLocalUser(deal.payrollImplementerRaw,  users),
      resolveToLocalUser(deal.payrollMasterRaw,       users),
      resolveToLocalUser(deal.softwareImplementerRaw, users),
    ].filter(Boolean);
    const hsAssigned = [...new Set(implUsers.map(u => u.id))];

    const idx = existing.findIndex(p =>
      p.hubspotId === deal.id || p.id === `hs_${deal.id}`
    );

    if (idx === -1) {
      existing.push({
        id:             `hs_${deal.id}`,
        title:          deal.name,
        description:    `Auto-synced from HubSpot — ${deal.stage}`,
        status:         hsStatusToLocal(deal.clientStatus, deal.stage),
        priority:       'medium',
        projectManager,
        hubspotOwnerId: deal.ownerHubspotId || null,
        assignedTo:     hsAssigned,
        dueDate:        '',
        progress:       0,
        createdBy:      'hubspot',
        hubspotId:      deal.id,
        hubspotStage:   deal.stage,
        projectType:    'client',
        syncedAt:       new Date().toISOString(),
        milestones:     {},
        timeline:       {},
      });
      added++;
    } else {
      const proj = existing[idx];
      const manuallyAdded = (proj.assignedTo || []).filter(id =>
        !hsAssigned.includes(id) && id !== (projectManager || proj.projectManager)
      );
      existing[idx] = {
        ...proj,
        title:          deal.name,
        status:         hsStatusToLocal(deal.clientStatus, deal.stage),
        hubspotStage:   deal.stage,
        hubspotOwnerId: deal.ownerHubspotId || null,
        projectManager: projectManager || proj.projectManager,
        assignedTo:     [...new Set([...hsAssigned, ...manuallyAdded])],
      };
      updated++;
    }
  });

  if (added > 0 || updated > 0) {
    saveProjects(existing);
    console.log(`[HubSpot] Auto-sync: ${added} new, ${updated} updated (Customer Onboarding only).`);
  }
}

function buildSearchBody(after) {
  return {
    filterGroups: ACTIVE_STAGES.map(stage => ({
      filters: [{ propertyName: 'client_stage', operator: 'EQ', value: stage }],
    })),
    properties: [
      'name',
      'client_stage',
      'client_status',
      'project_manager',
      'co_project_manager',
      'hubspot_owner_id',
      'hr_software_implementer',
      'payroll_software_implementer',
      'mrr',
      'implem_package',
      'segment__sprout_current_',
      'hrtc',
      'headcount',
      'accumulated_otp',
      'proposal_signed_date',
      'new_project_notification_sent_date',
      'hand_over_date',
      'sprout_hr_url',
      'payroll_company_code',
      'products_availed__main_services_',
      'industry__sprout_official_2025',
      'address',
      'payroll_master',
      'software_implementation_officer_',
    ],
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
    limit: 100,
    ...(after ? { after } : {}),
  };
}

/* ── GET /api/hubspot/my-deals ────────────────────────────────
   Returns only the deals assigned to the requesting PM.
   Uses the shared cache — no extra HubSpot API calls.
─────────────────────────────────────────────────────────────── */
router.get('/my-deals', requireAuth, (req, res) => {
  if (!dealsCache) return res.json({ deals: [] });

  const user     = getUsers().find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });

  // Find this user's HubSpot project IDs from local projects
  const projects    = getProjects();
  const myHsIds     = new Set(
    projects
      .filter(p => p.projectManager === user.id || (p.assignedTo || []).includes(user.id))
      .map(p => String(p.hubspotId))
      .filter(Boolean)
  );

  // Also match deals directly by HubSpot owner ID — catches projects that exist in
  // HubSpot with this user as PM but haven't been imported into the local database yet.
  const userHsId = user.hubspotOwnerId || null;

  const myDeals = (dealsCache.deals || []).filter(d =>
    myHsIds.has(String(d.id)) ||
    (userHsId && (d.ownerHubspotId === userHsId || d.coProjectManagerHsId === userHsId))
  );
  res.json({ pipeline: dealsCache.pipeline, deals: myDeals });
});

/* ── GET /api/hubspot/deal-team/:hubspotId ────────────────────
   Returns implementer team fields for a single cached deal.
   Does NOT hit HubSpot API — reads from in-memory dealsCache.
─────────────────────────────────────────────────────────────── */
router.get('/deal-team/:hubspotId', requireAuth, (req, res) => {
  if (!dealsCache) return res.json({});
  const deal = (dealsCache.deals || []).find(d => String(d.id) === String(req.params.hubspotId));
  if (!deal) return res.json({});
  res.json({
    hrsi:          deal.hrImplementer          || null,
    psi:           deal.payrollImplementer      || null,
    payrollMaster: deal.payrollMaster           || null,
    softwareImpl:  deal.softwareImplementer     || null,
  });
});

/* ── GET /api/hubspot/deals ───────────────────────────────────
   Fetches Company objects where client_stage is
   "Sales Handover", "Customer Onboarding", or "implem_upsell_onboarding".
   Only the six requested internal properties are pulled.
─────────────────────────────────────────────────────────────── */
// Resolve any raw email values still sitting in the implementer fields of a deals array
function patchEmailsInDeals(deals) {
  const emailToName = {};
  getUsers().forEach(u => { if (u.email) emailToName[u.email.toLowerCase().trim()] = u.name; });
  const IMPL_FIELDS = ['hrImplementer', 'payrollImplementer', 'payrollMaster', 'softwareImplementer'];
  deals.forEach(d => {
    IMPL_FIELDS.forEach(f => {
      if (d[f] && d[f].includes('@')) {
        const resolved = emailToName[d[f].toLowerCase().trim()];
        if (resolved) d[f] = resolved;
      }
    });
  });
}

router.get('/deals', requireAuth, requireHubspotAccess, async (req, res) => {
  // Serve from cache unless a forced refresh is requested
  const forceRefresh = req.query.refresh === 'true';
  if (!forceRefresh && dealsCache) {
    // Patch any email-valued implementer fields still in the cache before serving
    patchEmailsInDeals(dealsCache.deals || []);
    return res.json(dealsCache);
  }

  try {
    // Fetch owners and first page of companies in parallel
    const [ownersData, firstPage] = await Promise.all([
      fetch(`${HS}/crm/v3/owners?limit=500`, { headers: hsHeaders() }).then(r => r.json()),
      fetch(`${HS}/crm/v3/objects/companies/search`, {
        method:  'POST',
        headers: hsHeaders(),
        body:    JSON.stringify(buildSearchBody(undefined)),
      }).then(r => r.json()),
    ]);

    const ownerMap = {};
    const emailMap = {};
    (ownersData.results || []).forEach(o => {
      const name = (`${o.firstName || ''} ${o.lastName || ''}`).trim() || o.email || 'Unknown';
      ownerMap[o.id] = name;
      if (o.email) emailMap[o.email.toLowerCase()] = name;
    });
    // Also index local users by email so raw-email fallbacks resolve to a real name
    getUsers().forEach(u => { if (u.email) emailMap[u.email.toLowerCase()] = u.name; });
    const resolveOwnerField = v => v ? (ownerMap[v] || emailMap[v?.toLowerCase()] || v) : '';

    if (!firstPage.results) {
      return res.status(502).json({ error: 'Could not reach HubSpot. Check your token.' });
    }

    let allCompanies = firstPage.results;
    let after        = firstPage.paging?.next?.after;

    while (after) {
      const data = await fetch(`${HS}/crm/v3/objects/companies/search`, {
        method:  'POST',
        headers: hsHeaders(),
        body:    JSON.stringify(buildSearchBody(after)),
      }).then(r => r.json());

      if (!data.results) break;
      allCompanies = allCompanies.concat(data.results);
      after        = data.paging?.next?.after;
    }

    // Shape response — keep the same field names the frontend already uses
    const deals = allCompanies.map(company => {
      const p = company.properties;

      // Primary PM: custom project_manager field, fallback to hubspot_owner_id
      const pmHsId    = p.project_manager    || null;
      const ownerHsId = p.hubspot_owner_id   || null;

      // Co PM: co_project_manager field first, then hubspot_owner_id if different from primary PM
      const coPmHsId = p.co_project_manager
        ? p.co_project_manager
        : (ownerHsId && ownerHsId !== pmHsId ? ownerHsId : null);

      return {
        id:                      company.id,
        name:                    p.name                         || 'Unnamed Company',
        implemPackage:           p.implem_package               || '',
        stage:                   p.client_stage                 || 'Unknown',
        isCompleted:             false,
        owner:                   ownerMap[pmHsId] || ownerMap[ownerHsId] || 'Unassigned',
        ownerHubspotId:          pmHsId || ownerHsId || null,
        clientStatus:            p.client_status                || '',
        coProjectManager:        coPmHsId ? (ownerMap[coPmHsId] || 'Unknown') : '',
        coProjectManagerHsId:    coPmHsId || null,
        hrImplementer:           resolveOwnerField(p.hr_software_implementer),
        payrollImplementer:      resolveOwnerField(p.payroll_software_implementer),
        amount:                  p.mrr                          || null,
        onboardingDate:          null,
        // new fields
        segment:                 p.segment__sprout_current_          || '',
        salesperson:             ownerMap[p.hrtc] || p.hrtc          || '',
        headcount:               p.headcount                         || '',
        implemFeeAmount:         p.accumulated_otp                   || null,
        proposalDate:            p.proposal_signed_date              || null,
        npnMonth:                p.new_project_notification_sent_date|| null,
        handoverDate:            p.hand_over_date                    || null,
        sproutHrUrl:             p.sprout_hr_url                     || '',
        payrollCode:             p.payroll_company_code              || '',
        productsAvailed:         p.products_availed__main_services_  || '',
        industry:                p.industry__sprout_official_2025    || '',
        address:                 p.address                           || '',
        payrollMaster:           resolveOwnerField(p.payroll_master),
        softwareImplementer:     resolveOwnerField(p.software_implementation_officer_),
        // raw IDs/emails for local user matching during sync
        hrImplementerRaw:        p.hr_software_implementer           || '',
        payrollImplementerRaw:   p.payroll_software_implementer      || '',
        payrollMasterRaw:        p.payroll_master                    || '',
        softwareImplementerRaw:  p.software_implementation_officer_  || '',
        // retained for sync compatibility
        closeDate:               null,
        description:             '',
      };
    });

    const response = { pipeline: 'HubSpot Companies', deals };

    // Store in cache
    dealsCache     = response;
    dealsCacheTime = Date.now();

    // Auto-sync Customer Onboarding companies to local DB on every forced refresh
    autoSyncCustomerOnboarding(deals);

    res.json(response);

  } catch (err) {
    console.error('HubSpot fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch from HubSpot.' });
  }
});

/* ── GET /api/hubspot/owners ──────────────────────────────────
   Returns a map of HubSpot owner ID → display name.
   Used by the client-side PM migration to resolve raw IDs.
─────────────────────────────────────────────────────────────── */
router.get('/owners', requireAuth, requireHubspotAccess, async (req, res) => {
  try {
    const ownersRes  = await fetch(`${HS}/crm/v3/owners?limit=500`, { headers: hsHeaders() });
    const ownersData = await ownersRes.json();
    const ownerMap   = {};
    (ownersData.results || []).forEach(o => {
      ownerMap[o.id] = (`${o.firstName || ''} ${o.lastName || ''}`).trim() || o.email || 'Unknown';
    });
    res.json(ownerMap);
  } catch (err) {
    console.error('HubSpot owners fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch HubSpot owners.' });
  }
});

/* ── POST /api/hubspot/sync ───────────────────────────────────
   Converts selected companies into local project records.
─────────────────────────────────────────────────────────────── */
router.post('/sync', requireAuth, requireHubspotAccess, (req, res) => {
  const { deals, mappings = {} } = req.body;
  if (!Array.isArray(deals) || !deals.length)
    return res.status(400).json({ error: 'No companies provided.' });

  const users = getUsers();

  const projects = deals.map(deal => {
    // Match by HubSpot owner ID stored on local user, then fall back to manual mappings
    const matchedUser   = deal.ownerHubspotId
      ? users.find(u => u.hubspotOwnerId && u.hubspotOwnerId === deal.ownerHubspotId)
      : null;
    const projectManager = matchedUser?.id || mappings[deal.owner] || null;
    return {
      id:             `hs_${deal.id}`,
      title:          deal.name,
      description:    `Synced from HubSpot — ${deal.stage}`,
      status:         hsStatusToLocal(deal.clientStatus, deal.stage),
      priority:       'medium',
      projectManager,
      hubspotOwnerId: deal.ownerHubspotId || null,
      assignedTo:     [],
      dueDate:        '',
      progress:       0,
      createdBy:      'hubspot',
      hubspotId:      deal.id,
      hubspotStage:   deal.stage,
    };
  });

  res.json({ projects });
});

// ── Daily 7 AM cache refresh ──────────────────────────────────
async function refreshHubSpotCache() {
  try {
    const hs    = getIntegrations().connectors?.find(c => c.id === 'hubspot');
    const token = hs?.apiKey || process.env.HUBSPOT_TOKEN;
    if (!token) return;

    const [ownersData, firstPage] = await Promise.all([
      fetch(`${HS}/crm/v3/owners?limit=500`, { headers: hsHeaders() }).then(r => r.json()),
      fetch(`${HS}/crm/v3/objects/companies/search`, {
        method: 'POST', headers: hsHeaders(),
        body: JSON.stringify(buildSearchBody(undefined)),
      }).then(r => r.json()),
    ]);

    const ownerMap = {};
    const emailMap = {};
    (ownersData.results || []).forEach(o => {
      const name = (`${o.firstName || ''} ${o.lastName || ''}`).trim() || o.email || 'Unknown';
      ownerMap[o.id] = name;
      if (o.email) emailMap[o.email.toLowerCase()] = name;
    });
    // Also index local users by email so raw-email fallbacks resolve to a real name
    getUsers().forEach(u => { if (u.email) emailMap[u.email.toLowerCase()] = u.name; });
    const resolveOwnerField = v => v ? (ownerMap[v] || emailMap[v?.toLowerCase()] || v) : '';

    if (!firstPage.results) return;

    let allCompanies = firstPage.results;
    let after        = firstPage.paging?.next?.after;
    while (after) {
      const data = await fetch(`${HS}/crm/v3/objects/companies/search`, {
        method: 'POST', headers: hsHeaders(),
        body: JSON.stringify(buildSearchBody(after)),
      }).then(r => r.json());
      if (!data.results) break;
      allCompanies = allCompanies.concat(data.results);
      after = data.paging?.next?.after;
    }

    const deals = allCompanies.map(company => {
      const p = company.properties;
      const pmHsId    = p.project_manager  || null;
      const ownerHsId = p.hubspot_owner_id || null;
      const coPmHsId  = p.co_project_manager
        ? p.co_project_manager
        : (ownerHsId && ownerHsId !== pmHsId ? ownerHsId : null);
      return {
        id: company.id, name: p.name || 'Unnamed Company',
        implemPackage: p.implem_package || '', stage: p.client_stage || 'Unknown',
        isCompleted: false,
        owner: ownerMap[pmHsId] || ownerMap[ownerHsId] || 'Unassigned',
        ownerHubspotId: pmHsId || ownerHsId || null,
        clientStatus: p.client_status || '',
        coProjectManager: coPmHsId ? (ownerMap[coPmHsId] || 'Unknown') : '',
        coProjectManagerHsId: coPmHsId || null,
        hrImplementer: resolveOwnerField(p.hr_software_implementer),
        payrollImplementer: resolveOwnerField(p.payroll_software_implementer),
        amount: p.mrr || null, onboardingDate: null,
        segment: p.segment__sprout_current_ || '',
        salesperson: ownerMap[p.hrtc] || p.hrtc || '',
        headcount: p.headcount || '',
        implemFeeAmount: p.accumulated_otp || null,
        proposalDate: p.proposal_signed_date || null,
        npnMonth: p.new_project_notification_sent_date || null,
        handoverDate: p.hand_over_date || null,
        sproutHrUrl: p.sprout_hr_url || '',
        payrollCode: p.payroll_company_code || '',
        productsAvailed: p.products_availed__main_services_ || '',
        industry: p.industry__sprout_official_2025 || '',
        address: p.address || '',
        payrollMaster: resolveOwnerField(p.payroll_master),
        softwareImplementer: resolveOwnerField(p.software_implementation_officer_),
        hrImplementerRaw:        p.hr_software_implementer           || '',
        payrollImplementerRaw:   p.payroll_software_implementer      || '',
        payrollMasterRaw:        p.payroll_master                    || '',
        softwareImplementerRaw:  p.software_implementation_officer_  || '',
        closeDate: null, description: '',
      };
    });

    dealsCache     = { pipeline: 'HubSpot Companies', deals };
    dealsCacheTime = Date.now();
    console.log(`[HubSpot] Cache refreshed — ${deals.length} companies loaded at ${new Date().toLocaleTimeString()}.`);

    autoSyncCustomerOnboarding(deals);

  } catch (err) {
    console.warn('[HubSpot] Cache refresh failed:', err.message);
  }
}

// Refresh cache every hour
setInterval(refreshHubSpotCache, 60 * 60 * 1000);
console.log('[HubSpot] Cache will refresh every hour.');

// Warm the cache on server start so the first user never hits a cold load
setTimeout(refreshHubSpotCache, 3000);

/* Returns implementer text names for a given HubSpot deal ID from the in-memory cache.
   Returns null if no cache or deal not found. */
function getImplementersByHubspotId(hubspotId) {
  if (!dealsCache) return null;
  const deal = (dealsCache.deals || []).find(d => String(d.id) === String(hubspotId));
  if (!deal) return null;
  return {
    hrsi:          deal.hrImplementer          || null,
    psi:           deal.payrollImplementer      || null,
    payrollMaster: deal.payrollMaster           || null,
    softwareImpl:  deal.softwareImplementer     || null,
  };
}

module.exports = router;
module.exports.getImplementersByHubspotId = getImplementersByHubspotId;
