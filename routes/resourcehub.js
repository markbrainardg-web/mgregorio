const express = require('express');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const { getUsers, getPermissions, getProjects, getHubs, saveHubs, appendAuditEntry } = require('../db');

const router = express.Router();

// ── Auth helpers ──────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function canUser(userId, flag) {
  const user   = getUsers().find(u => u.id === userId);
  if (!user) return false;
  const matrix = getPermissions();
  return !!(matrix[user.role]?.[flag]);
}

function genId() {
  return crypto.randomBytes(6).toString('hex');
}

function generateSlug(title) {
  const base   = (title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  const suffix = Math.random().toString(36).substr(2, 6);
  return `${base}-${suffix}`;
}

// Strip password hashes from hub before sending to frontend
function sanitizeHub(hub) {
  if (!hub) return hub;
  return {
    ...hub,
    accessList: (hub.accessList || []).map(a => {
      const { passwordHash, ...rest } = a;
      return { ...rest, hasPassword: !!passwordHash };
    }),
  };
}

// ── GET /api/resource-hub ──────────────────────────────────────
// Return all hubs (any authenticated user — used for admin overview)
router.get('/', requireAuth, (req, res) => {
  res.json(getHubs().map(sanitizeHub));
});

// ── GET /api/resource-hub/project/:projectId ──────────────────
// Check if a hub exists for a given project (any authenticated user)
router.get('/project/:projectId', requireAuth, (req, res) => {
  const hub = getHubs().find(h => h.projectId === req.params.projectId);
  res.json(hub ? sanitizeHub(hub) : null);
});

// ── GET /api/resource-hub/ticket-alerts ───────────────────────
// Returns open ticket counts across this user's projects (for notification bell)
router.get('/ticket-alerts', requireAuth, (req, res) => {
  const userId  = req.session.userId;
  const user    = getUsers().find(u => u.id === userId);
  if (!user) return res.json({ count: 0, items: [] });
  const { getPermissions, getProjects } = require('../db');
  const matrix   = getPermissions();
  const projects = getProjects();
  const canViewAll = !!(matrix[user.role]?.view_all_projects);
  const alerts = [];
  getHubs().forEach(hub => {
    const project = projects.find(p => p.id === hub.projectId);
    if (!project) return;
    const isPM   = project.projectManager === userId;
    const isTeam = Object.values(project.teamRoles || {}).some(r => r?.id === userId);
    if (!canViewAll && !isPM && !isTeam) return;
    (hub.tickets || [])
      .filter(t => t.status === 'open' || t.status === 'in_progress')
      .forEach(t => alerts.push({
        ticketNumber:  t.ticketNumber,
        subject:       t.subject,
        priority:      t.priority,
        projectTitle:  hub.projectTitle,
        submittedAt:   t.submittedAt,
        hubId:         hub.id,
      }));
  });
  alerts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json({ count: alerts.length, items: alerts.slice(0, 15) });
});

// ── GET /api/resource-hub/:id ──────────────────────────────────
// Get a single hub by ID
router.get('/:id', requireAuth, (req, res) => {
  const hub = getHubs().find(h => h.id === req.params.id);
  if (!hub) return res.status(404).json({ error: 'Hub not found.' });
  res.json(sanitizeHub(hub));
});

// ── POST /api/resource-hub ─────────────────────────────────────
// Create a new hub (requires generate_resource_hub permission)
router.post('/', requireAuth, (req, res) => {
  if (!canUser(req.session.userId, 'generate_resource_hub')) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId is required.' });

  // One hub per project
  const existing = getHubs().find(h => h.projectId === projectId);
  if (existing) return res.status(409).json({ error: 'A resource hub already exists for this project.', hub: existing });

  const project = getProjects().find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const actor = getUsers().find(u => u.id === req.session.userId);

  // Auto-populate access list from project contacts (contacts with email only)
  const contacts     = project.details?.contacts || [];
  const accessList   = contacts
    .filter(c => c.email && c.email.trim())
    .map(c => ({
      contactId:   c.id,
      name:        c.name,
      email:       c.email.trim().toLowerCase(),
      accessLevel: c.access || 'limited',
      addedAt:     new Date().toISOString(),
    }));

  // Auto-add the PM who generated the hub (if they have an email)
  if (actor?.email && actor.email.trim()) {
    const pmEmail = actor.email.trim().toLowerCase();
    if (!accessList.find(a => a.email === pmEmail)) {
      accessList.unshift({
        contactId:   actor.id,
        name:        actor.name,
        email:       pmEmail,
        accessLevel: 'full',
        addedAt:     new Date().toISOString(),
        isPM:        true,
      });
    }
  }

  const hub = {
    id:           genId(),
    slug:         generateSlug(project.title),
    projectId,
    projectTitle: project.title,
    createdAt:    new Date().toISOString(),
    createdBy:    actor?.id || req.session.userId,
    createdByName: actor?.name || 'Unknown',
    isPublic:     true,
    sections: {
      milestones:  true,
      timeline:    true,
      documents:   true,
      recordings:  false,
      contacts:    true,
      ticketing:   false,
    },
    limitedSections: {
      milestones:  true,
      timeline:    true,
      documents:   true,
      recordings:  false,
      contacts:    false,
      ticketing:   false,
    },
    ticketingUrl:  '',
    ticketingNote: '',
    accessList,
    recordings:    [],
    accessLog:     [],
  };

  const list = getHubs();
  list.push(hub);
  saveHubs(list);

  appendAuditEntry({
    id:        genId(),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'resource_hub.created',
    details:   `Sprout Success Kit generated for project: ${project.title}`,
    meta:      { projectId, slug: hub.slug },
  });

  res.json(sanitizeHub(hub));
});

// ── PUT /api/resource-hub/:id ──────────────────────────────────
// Update hub settings (requires generate_resource_hub permission)
router.put('/:id', requireAuth, (req, res) => {
  if (!canUser(req.session.userId, 'generate_resource_hub')) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const list = getHubs();
  const idx  = list.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Hub not found.' });

  const allowed = ['isPublic', 'sections', 'limitedSections', 'recordings', 'ticketingUrl', 'ticketingNote'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) list[idx][key] = req.body[key];
  }

  // Handle accessList separately — preserve existing passwordHash values
  if (req.body.accessList !== undefined) {
    const existingList = list[idx].accessList || [];
    list[idx].accessList = req.body.accessList.map(newEntry => {
      const existing = existingList.find(e => e.email.toLowerCase() === newEntry.email.toLowerCase());
      return {
        ...newEntry,
        ...(existing?.passwordHash ? { passwordHash: existing.passwordHash } : {}),
      };
    });
  }
  list[idx].updatedAt = new Date().toISOString();

  saveHubs(list);

  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        genId(),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'resource_hub.updated',
    details:   `Sprout Success Kit updated for project: ${list[idx].projectTitle}`,
    meta:      { hubId: req.params.id },
  });

  res.json(sanitizeHub(list[idx]));
});

// ── DELETE /api/resource-hub/:id ───────────────────────────────
// Delete a hub (requires generate_resource_hub permission)
router.delete('/:id', requireAuth, (req, res) => {
  if (!canUser(req.session.userId, 'generate_resource_hub')) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const list = getHubs();
  const idx  = list.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Hub not found.' });

  const removed = list.splice(idx, 1)[0];
  saveHubs(list);

  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        genId(),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'resource_hub.deleted',
    details:   `Sprout Success Kit deleted for project: ${removed.projectTitle}`,
    meta:      { hubId: req.params.id, slug: removed.slug },
  });

  res.json({ ok: true });
});

// ── POST /api/resource-hub/:id/set-password ────────────────────
// Set or reset password for a contact in the access list
router.post('/:id/set-password', requireAuth, (req, res) => {
  if (!canUser(req.session.userId, 'generate_resource_hub')) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });

  const list = getHubs();
  const idx  = list.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Hub not found.' });

  const entry = list[idx].accessList.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!entry) return res.status(404).json({ error: 'Contact not found in access list.' });

  if (!password || password.trim() === '') {
    // Clear password
    delete entry.passwordHash;
  } else {
    entry.passwordHash = bcrypt.hashSync(password.trim(), 10);
  }

  list[idx].updatedAt = new Date().toISOString();
  saveHubs(list);

  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        genId(),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'resource_hub.password_set',
    details:   `Password ${password ? 'set' : 'cleared'} for ${email} in hub: ${list[idx].projectTitle}`,
    meta:      { hubId: req.params.id, email },
  });

  res.json({ ok: true });
});

// ── PATCH /api/resource-hub/:id/tickets/:ticketId ─────────────
// PM: change status and/or add a reply
router.patch('/:id/tickets/:ticketId', requireAuth, (req, res) => {
  if (!canUser(req.session.userId, 'view_resource_hub')) {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const list   = getHubs();
  const hubIdx = list.findIndex(h => h.id === req.params.id);
  if (hubIdx === -1) return res.status(404).json({ error: 'Hub not found.' });
  const hub       = list[hubIdx];
  const ticketIdx = (hub.tickets || []).findIndex(t => t.id === req.params.ticketId);
  if (ticketIdx === -1) return res.status(404).json({ error: 'Ticket not found.' });
  const ticket = hub.tickets[ticketIdx];
  const { status, reply } = req.body;
  const actor  = getUsers().find(u => u.id === req.session.userId);
  if (status && ['open', 'in_progress', 'closed'].includes(status)) {
    ticket.status = status;
    if (status === 'closed' && !ticket.closedAt) ticket.closedAt = new Date().toISOString();
    if (status !== 'closed') ticket.closedAt = null;
  }
  if (reply?.trim()) {
    if (!ticket.replies) ticket.replies = [];
    ticket.replies.push({
      id:       genId(),
      from:     'pm',
      fromName: actor?.name || 'Sprout Team',
      message:  reply.trim(),
      sentAt:   new Date().toISOString(),
    });
  }
  list[hubIdx].tickets[ticketIdx] = ticket;
  list[hubIdx].updatedAt          = new Date().toISOString();
  saveHubs(list);
  res.json({ ok: true, ticket: { ...ticket, attachments: (ticket.attachments || []).map(({ stored, ...r }) => r) } });
});

module.exports = router;
