const express = require('express');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const { getUsers, saveUsers, appendAuditEntry } = require('../db');

const router = express.Router();

/* ── Middleware ───────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function requireAdmin(req, res, next) {
  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user || user.role !== 'super_admin')
    return res.status(403).json({ error: 'Super Admin access required.' });
  next();
}

function safeUser(u) {
  const { passwordHash, resetToken, resetExpires, ...safe } = u;
  return safe;
}

/* ── GET /api/users ───────────────────────────────────────── */
router.get('/', requireAuth, (req, res) => {
  res.json(getUsers().map(safeUser));
});

/* ── POST /api/users ──────────────────────────────────────── */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, name, email, role, color, hubspotOwnerId, photoUrl, jobTitle, phone } = req.body;

  if (!username || !password || !name)
    return res.status(400).json({ error: 'Username, password, and name are required.' });

  const users = getUsers();
  if (users.find(u => u.username === username.trim()))
    return res.status(409).json({ error: 'Username already taken.' });

  const newUser = {
    id:             Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    username:       username.trim(),
    passwordHash:   await bcrypt.hash(password, 10),
    name:           name.trim(),
    email:          (email || '').trim().toLowerCase(),
    role:           role  || 'project_manager',
    color:          color || '#4f46e5',
    hubspotOwnerId: hubspotOwnerId || null,
    photoUrl:       photoUrl       || null,
    jobTitle:       (jobTitle || '').trim() || null,
    phone:          (phone    || '').trim() || null,
    resetToken:     null,
    resetExpires:   null,
  };

  users.push(newUser);
  saveUsers(users);
  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'user.created',
    details:   `Created user ${newUser.name} (${newUser.role})`,
    meta:      { targetUserId: newUser.id, targetUserName: newUser.name, targetUserRole: newUser.role },
  });
  res.status(201).json(safeUser(newUser));
});

/* ── PUT /api/users/me ────────────────────────────────────── */
router.put('/me', requireAuth, async (req, res) => {
  const { name, email, currentPassword, newPassword, color, photoUrl } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (newPassword) {
    if (!currentPassword)
      return res.status(400).json({ error: 'Current password is required to set a new password.' });
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match)
      return res.status(400).json({ error: 'Current password is incorrect.' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (name)              user.name     = name.trim();
  if (email !== undefined) user.email  = email.trim().toLowerCase();
  if (color)             user.color    = color;
  if (photoUrl !== undefined) user.photoUrl = photoUrl || null;

  saveUsers(users);
  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    user.id,
    userName:  user.name,
    userRole:  user.role,
    action:    'user.self_updated',
    details:   `${user.name} updated their own profile`,
    meta:      { targetUserId: user.id },
  });
  res.json(safeUser(user));
});

/* ── PUT /api/users/:id ───────────────────────────────────── */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, password, name, email, role, color, hubspotOwnerId, photoUrl, jobTitle, phone } = req.body;

  const users = getUsers();
  const user  = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (username && username.trim() !== user.username) {
    if (users.find(u => u.username === username.trim() && u.id !== id))
      return res.status(409).json({ error: 'Username already taken.' });
    user.username = username.trim();
  }

  if (password)                    user.passwordHash   = await bcrypt.hash(password, 10);
  if (name)                        user.name           = name.trim();
  if (email !== undefined)         user.email          = email.trim().toLowerCase();
  if (role)                        user.role           = role;
  if (color)                       user.color          = color;
  if (hubspotOwnerId !== undefined) user.hubspotOwnerId = hubspotOwnerId || null;
  if (photoUrl       !== undefined) user.photoUrl       = photoUrl       || null;
  if (jobTitle !== undefined) user.jobTitle = (jobTitle || '').trim() || null;
  if (phone    !== undefined) user.phone    = (phone    || '').trim() || null;

  saveUsers(users);
  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'user.updated',
    details:   `Updated user ${user.name} (${user.role})`,
    meta:      { targetUserId: user.id, targetUserName: user.name },
  });
  res.json(safeUser(user));
});

/* ── POST /api/users/bulk ─────────────────────────────────── */
router.post('/bulk', requireAuth, requireAdmin, async (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Expected a non-empty array of users.' });

  const users = getUsers();
  const actor = users.find(u => u.id === req.session.userId);
  const created = [];
  const errors  = [];

  for (let i = 0; i < rows.length; i++) {
    const { name, username, email, role, password } = rows[i];
    const rowNum = i + 2; // +2 because row 1 is header

    if (!name || !username || !password) {
      errors.push(`Row ${rowNum}: name, username, and password are required.`);
      continue;
    }
    if (users.find(u => u.username === username.trim()) || created.find(u => u.username === username.trim())) {
      errors.push(`Row ${rowNum}: username "${username}" is already taken.`);
      continue;
    }

    const validRoles = ['super_admin', 'lead', 'project_manager', 'implementer'];
    const assignedRole = validRoles.includes(role) ? role : 'project_manager';

    const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6'];
    const newUser = {
      id:           Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      username:     username.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      name:         name.trim(),
      email:        (email || '').trim().toLowerCase(),
      role:         assignedRole,
      color:        colors[Math.floor(Math.random() * colors.length)],
      hubspotOwnerId: null,
      photoUrl:       null,
      resetToken:     null,
      resetExpires:   null,
    };

    users.push(newUser);
    created.push(newUser);
  }

  if (created.length > 0) {
    saveUsers(users);
    appendAuditEntry({
      id:        crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      userId:    actor?.id || 'unknown',
      userName:  actor?.name || 'Unknown',
      userRole:  actor?.role || 'unknown',
      action:    'user.bulkCreated',
      details:   `Bulk imported ${created.length} user(s)`,
      meta:      { count: created.length },
    });
  }

  res.status(201).json({
    created: created.length,
    errors,
    users: created.map(safeUser),
  });
});

/* ── PATCH /api/users/bulk-profile ───────────────────────── */
router.patch('/bulk-profile', requireAuth, requireAdmin, (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Expected a non-empty array.' });

  const users = getUsers();
  const actor = users.find(u => u.id === req.session.userId);
  let changed = 0;

  rows.forEach(row => {
    const user = users.find(u => u.id === row.id);
    if (!user) return;
    if (row.name     !== undefined) user.name     = (row.name     || '').trim() || user.name;
    if (row.email    !== undefined) user.email    = (row.email    || '').trim().toLowerCase();
    if (row.phone    !== undefined) user.phone    = (row.phone    || '').trim() || null;
    if (row.jobTitle !== undefined) user.jobTitle = (row.jobTitle || '').trim() || null;
    changed++;
  });

  if (changed > 0) {
    saveUsers(users);
    appendAuditEntry({
      id:        require('crypto').randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      userId:    actor?.id || 'unknown',
      userName:  actor?.name || 'Unknown',
      userRole:  actor?.role || 'unknown',
      action:    'user.bulkProfileUpdated',
      details:   `Bulk updated profiles for ${changed} user(s)`,
      meta:      { count: changed },
    });
  }

  res.json({ ok: true, updated: changed });
});

/* ── POST /api/users/onboarding-reset — super_admin only ──── */
router.post('/onboarding-reset', requireAuth, requireAdmin, (req, res) => {
  const users = getUsers().map(u => ({ ...u, onboardingCompleted: false }));
  saveUsers(users);
  res.json({ ok: true });
});

/* ── POST /api/users/me/onboarding-complete ───────────────── */
router.post('/me/onboarding-complete', requireAuth, (req, res) => {
  const users = getUsers();
  const user  = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.onboardingCompleted = true;
  saveUsers(users);
  res.json({ ok: true });
});

/* ── DELETE /api/users/:id ────────────────────────────────── */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;

  if (id === req.session.userId)
    return res.status(400).json({ error: 'You cannot delete your own account.' });

  const users       = getUsers();
  const deletedUser = users.find(u => u.id === id);
  const updated     = users.filter(u => u.id !== id);

  if (updated.length === users.length)
    return res.status(404).json({ error: 'User not found.' });

  saveUsers(updated);
  const actor = getUsers().find(u => u.id === req.session.userId);
  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    actor?.id || 'unknown',
    userName:  actor?.name || 'Unknown',
    userRole:  actor?.role || 'unknown',
    action:    'user.deleted',
    details:   `Deleted user ${deletedUser?.name || id}`,
    meta:      { targetUserId: id, targetUserName: deletedUser?.name },
  });
  res.json({ ok: true });
});

module.exports = router;
