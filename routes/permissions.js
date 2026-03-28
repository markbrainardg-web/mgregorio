const express = require('express');
const crypto = require('crypto');
const { getUsers, getPermissions, savePermissions, getRoles, appendAuditEntry } = require('../db');

const router = express.Router();

const VALID_FLAGS = [
  // Dashboard
  'view_admin_dashboard', 'view_my_dashboard', 'view_pm_dashboard_table', 'edit_dashboard_fields',
  // Projects — access
  'view_all_projects', 'view_my_projects', 'create_delete_projects', 'edit_projects',
  // Projects — milestones
  'move_milestone_kanban', 'edit_timeline', 'edit_actual_dates',
  // Projects — time tracking
  'use_timer', 'log_time',
  // Projects — documentation
  'view_docs', 'edit_docs',
  // Projects — contacts
  'view_contacts', 'edit_contacts',
  // Projects — recordings
  'view_recordings', 'manage_recordings',
  // Projects — files
  'view_files', 'manage_files',
  // Projects — Sprout Success Kit
  'view_resource_hub', 'generate_resource_hub',
  // Projects — other
  'view_sidekick', 'view_survey_form',
  // Administration
  'view_users', 'manage_users', 'view_hubspot', 'act_as_user', 'view_audit_trail', 'view_tools_hub',
  // Legacy (kept for backward compatibility, not shown in UI)
  'edit_milestones', 'view_project_details',
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

  // Validate all known roles are present and submitted flag values are boolean
  for (const role of roles) {
    if (!matrix[role.id] || typeof matrix[role.id] !== 'object')
      return res.status(400).json({ error: `Missing role: ${role.id}` });
    for (const [flag, val] of Object.entries(matrix[role.id])) {
      if (!VALID_FLAGS.includes(flag))
        return res.status(400).json({ error: `Unknown flag "${flag}" for role "${role.id}"` });
      if (typeof val !== 'boolean')
        return res.status(400).json({ error: `Invalid value for flag "${flag}" on role "${role.id}"` });
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
