const express = require('express');
const { getUsers, getIntegrations } = require('../db');

const router = express.Router();
const HS = 'https://api.hubapi.com';

// In-memory cache for HubSpot deals — avoids a full API round-trip on every page load
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
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

// Only these client_stage values are pulled
const ACTIVE_STAGES = ['Sales Handover', 'Customer Onboarding', 'implem_upsell_onboarding', 'Customer Success'];

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

/* ── GET /api/hubspot/deals ───────────────────────────────────
   Fetches Company objects where client_stage is
   "Sales Handover", "Customer Onboarding", or "implem_upsell_onboarding".
   Only the six requested internal properties are pulled.
─────────────────────────────────────────────────────────────── */
router.get('/deals', requireAuth, requireAdmin, async (req, res) => {
  // Serve from cache unless it's expired or a forced refresh is requested
  const forceRefresh = req.query.refresh === 'true';
  const cacheValid   = dealsCache && (Date.now() - dealsCacheTime < CACHE_TTL_MS);
  if (!forceRefresh && cacheValid) {
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
    (ownersData.results || []).forEach(o => {
      ownerMap[o.id] = (`${o.firstName || ''} ${o.lastName || ''}`).trim() || o.email || 'Unknown';
    });

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
        hrImplementer:           p.hr_software_implementer      || '',
        payrollImplementer:      p.payroll_software_implementer || '',
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
        payrollMaster:           p.payroll_master                    || '',
        softwareImplementer:     p.software_implementation_officer_  || '',
        // retained for sync compatibility
        closeDate:               null,
        description:             '',
      };
    });

    const response = { pipeline: 'HubSpot Companies', deals };

    // Store in cache
    dealsCache     = response;
    dealsCacheTime = Date.now();

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
router.get('/owners', requireAuth, requireAdmin, async (req, res) => {
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
router.post('/sync', requireAuth, requireAdmin, (req, res) => {
  const { deals, mappings = {} } = req.body;
  if (!Array.isArray(deals) || !deals.length)
    return res.status(400).json({ error: 'No companies provided.' });

  const users = getUsers();

  function hsStatusToLocal(clientStatus, stage) {
    const s = (clientStatus || stage || '').toLowerCase().trim();
    if (s.includes('churn'))                         return 'churn';
    if (s.includes('on hold') || s.includes('hold')) return 'on-hold';
    if (s.includes('return') || s.includes('sales')) return 'on-hold-sales';
    if (s.includes('complet'))                       return 'completed';
    return 'ongoing';
  }

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

// Warm the cache on server start so the first user never hits a cold load
setTimeout(async () => {
  try {
    const hs    = getIntegrations().connectors?.find(c => c.id === 'hubspot');
    const token = hs?.apiKey || process.env.HUBSPOT_TOKEN;
    if (!token) return; // no token configured yet, skip warm-up

    const [ownersData, firstPage] = await Promise.all([
      fetch(`${HS}/crm/v3/owners?limit=500`, { headers: hsHeaders() }).then(r => r.json()),
      fetch(`${HS}/crm/v3/objects/companies/search`, {
        method: 'POST', headers: hsHeaders(),
        body: JSON.stringify(buildSearchBody(undefined)),
      }).then(r => r.json()),
    ]);

    const ownerMap = {};
    (ownersData.results || []).forEach(o => {
      ownerMap[o.id] = (`${o.firstName || ''} ${o.lastName || ''}`).trim() || o.email || 'Unknown';
    });

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
        hrImplementer: p.hr_software_implementer || '',
        payrollImplementer: p.payroll_software_implementer || '',
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
        payrollMaster: p.payroll_master || '',
        softwareImplementer: p.software_implementation_officer_ || '',
        closeDate: null, description: '',
      };
    });

    dealsCache     = { pipeline: 'HubSpot Companies', deals };
    dealsCacheTime = Date.now();
    console.log(`[HubSpot] Cache warmed — ${deals.length} companies loaded.`);
  } catch (err) {
    console.warn('[HubSpot] Cache warm-up failed (non-fatal):', err.message);
  }
}, 3000); // 3-second delay to let the server finish starting up

module.exports = router;
