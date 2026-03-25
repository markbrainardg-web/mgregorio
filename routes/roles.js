const express = require('express');
const crypto  = require('crypto');
const { getUsers, getRoles, saveRoles, getPermissions, savePermissions, appendAuditEntry } = require('../db');

const router = express.Router();

const ALL_FLAGS = [
  'view_admin_dashboard', 'view_all_projects', 'view_my_dashboard', 'view_my_projects',
  'view_users', 'view_hubspot', 'manage_users', 'create_delete_projects',
  'edit_projects', 'edit_milestones', 'act_as_user', 'log_time', 'view_audit_trail',
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

function auditEntry(actor, action, details, meta) {
  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    actor?.id   || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action, details, meta,
  });
}

/* ── GET /api/roles ─────────────────────────────────────────── */
router.get('/', requireAuth, (req, res) => {
  res.json(getRoles());
});

/* ── POST /api/roles — create a new role ────────────────────── */
router.post('/', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const { label } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ error: 'Role label is required.' });

    const roles = getRoles();

    // Build a unique slug ID from the label
    const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'role';
    let id = base;
    let n  = 2;
    while (roles.find(r => r.id === id)) { id = `${base}_${n++}`; }

    const newRole = { id, label: label.trim(), system: false };
    roles.push(newRole);
    saveRoles(roles);

    // Seed all-false permissions entry for the new role
    const matrix = getPermissions();
    if (!matrix[id]) {
      matrix[id] = {};
      ALL_FLAGS.forEach(f => { matrix[id][f] = false; });
      savePermissions(matrix);
    }

    const actor = getUsers().find(u => u.id === req.session.userId);
    auditEntry(actor, 'role.created', `Created role "${newRole.label}"`, { roleId: id, roleLabel: newRole.label });
    res.status(201).json(newRole);
  } catch (err) {
    console.error('POST /api/roles error:', err);
    res.status(500).json({ error: 'Failed to create role: ' + err.message });
  }
});

/* ── PUT /api/roles/:id — rename a role's display label ─────── */
router.put('/:id', requireAuth, requireSuperAdmin, (req, res) => {
  try {
    const { id }    = req.params;
    const { label } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ error: 'Label is required.' });

    const roles = getRoles();
    const role  = roles.find(r => r.id === id);
    if (!role) return res.status(404).json({ error: 'Role not found.' });

    const oldLabel = role.label;
    role.label = label.trim();
    saveRoles(roles);

    const actor = getUsers().find(u => u.id === req.session.userId);
    auditEntry(actor, 'role.renamed', `Renamed role "${oldLabel}" → "${role.label}"`, { roleId: id, oldLabel, newLabel: role.label });
    res.json(role);
  } catch (err) {
    console.error('PUT /api/roles error:', err);
    res.status(500).json({ error: 'Failed to rename role: ' + err.message });
  }
});

/* ── DELETE /api/roles/:id — delete a custom role ───────────── */
router.delete('/:id', requireAuth, requireSuperAdmin, (req, res) => {
  const { id } = req.params;

  const roles = getRoles();
  const role  = roles.find(r => r.id === id);
  if (!role)         return res.status(404).json({ error: 'Role not found.' });
  if (id === 'super_admin') return res.status(400).json({ error: 'The Super Admin role cannot be deleted.' });

  const assigned = getUsers().filter(u => u.role === id);
  if (assigned.length > 0)
    return res.status(400).json({ error: `${assigned.length} user(s) are still assigned this role. Reassign them first.` });

  saveRoles(roles.filter(r => r.id !== id));

  // Remove from permissions matrix
  const matrix = getPermissions();
  delete matrix[id];
  savePermissions(matrix);

  const actor = getUsers().find(u => u.id === req.session.userId);
  auditEntry(actor, 'role.deleted', `Deleted role "${role.label}"`, { roleId: id, roleLabel: role.label });
  res.json({ ok: true });
});

module.exports = router;
