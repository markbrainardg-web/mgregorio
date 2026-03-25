const express = require('express');
const crypto  = require('crypto');
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

// ── GET /api/resource-hub ──────────────────────────────────────
// Return all hubs (any authenticated user — used for admin overview)
router.get('/', requireAuth, (req, res) => {
  res.json(getHubs());
});

// ── GET /api/resource-hub/project/:projectId ──────────────────
// Check if a hub exists for a given project (any authenticated user)
router.get('/project/:projectId', requireAuth, (req, res) => {
  const hub = getHubs().find(h => h.projectId === req.params.projectId);
  res.json(hub || null);
});

// ── GET /api/resource-hub/:id ──────────────────────────────────
// Get a single hub by ID
router.get('/:id', requireAuth, (req, res) => {
  const hub = getHubs().find(h => h.id === req.params.id);
  if (!hub) return res.status(404).json({ error: 'Hub not found.' });
  res.json(hub);
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
    details:   `Resource hub generated for project: ${project.title}`,
    meta:      { projectId, slug: hub.slug },
  });

  res.json(hub);
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

  const allowed = ['isPublic', 'sections', 'limitedSections', 'accessList', 'recordings', 'ticketingUrl', 'ticketingNote'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) list[idx][key] = req.body[key];
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
    details:   `Resource hub updated for project: ${list[idx].projectTitle}`,
    meta:      { hubId: req.params.id },
  });

  res.json(list[idx]);
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
    details:   `Resource hub deleted for project: ${removed.projectTitle}`,
    meta:      { hubId: req.params.id, slug: removed.slug },
  });

  res.json({ ok: true });
});

module.exports = router;
