const express = require('express');
const crypto = require('crypto');
const { getUsers, getPermissions, savePermissions, getRoles, appendAuditEntry } = require('../db');

const router = express.Router();

const VALID_FLAGS = [
  'view_admin_dashboard', 'view_all_projects', 'view_my_dashboard', 'view_my_projects',
  'view_users', 'view_hubspot', 'manage_users', 'create_delete_projects',
  'edit_projects', 'edit_milestones', 'act_as_user', 'log_time', 'view_audit_trail',
  'view_project_details', 'view_resource_hub', 'generate_resource_hub',
];

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

/* ── GET /api/permissions ─────────────────────────────────── */
router.get('/', requireAuth, (req, res) => {
  res.json(getPermissions());
});

/* ── PUT /api/permissions ─────────────────────────────────── */
router.put('/', requireAuth, requireSuperAdmin, (req, res) => {
  const matrix = req.body;
  const roles  = getRoles();

  // Validate all known roles are present and all flag values are boolean
  for (const role of roles) {
    if (!matrix[role.id] || typeof matrix[role.id] !== 'object')
      return res.status(400).json({ error: `Missing role: ${role.id}` });
    for (const flag of VALID_FLAGS) {
      if (typeof matrix[role.id][flag] !== 'boolean')
        return res.status(400).json({ error: `Invalid flag "${flag}" for role "${role.id}"` });
    }
  }

  savePermissions(matrix);
  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'permissions.updated',
    details:   'Access Matrix permissions were updated',
    meta:      { updatedBy: actor?.name },
  });
  res.json({ ok: true });
});

module.exports = router;
