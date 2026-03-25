const express = require('express');
const crypto  = require('crypto');
const { getUsers, getAuditLog, appendAuditEntry, clearAuditLog, getPermissions } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function requireSuperAdmin(req, res, next) {
  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user || user.role !== 'super_admin')
    return res.status(403).json({ error: 'Super Admin access required.' });
  next();
}

/* ── GET /api/audit ─────────────────────────────────────────── */
router.get('/', requireAuth, (req, res) => {
  // Check permission via the live permissions matrix
  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });
  const matrix = getPermissions();
  const allowed = matrix[user.role]?.view_audit_trail === true;
  if (!allowed) return res.status(403).json({ error: 'Access denied.' });
  res.json(getAuditLog());
});

/* ── POST /api/audit ─────────────────────────────────────────── */
// Called from the frontend to log client-side events (project changes, milestones, etc.)
router.post('/', requireAuth, (req, res) => {
  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });

  const { action, details, meta = {} } = req.body;
  if (!action || !details) return res.status(400).json({ error: 'action and details are required.' });

  const entry = {
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    user.id,
    userName:  user.name,
    userRole:  user.role,
    action,
    details,
    meta,
  };

  appendAuditEntry(entry);
  res.status(201).json({ ok: true });
});

/* ── DELETE /api/audit ──────────────────────────────────────── */
router.delete('/', requireAuth, requireSuperAdmin, (req, res) => {
  clearAuditLog();
  res.json({ ok: true });
});

module.exports = router;
