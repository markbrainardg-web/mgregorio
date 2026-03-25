const express = require('express');
const crypto  = require('crypto');
const { getUsers, getAnnouncements, saveAnnouncements } = require('../db');

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

/* GET /api/announcements — active & non-expired (all authenticated users) */
router.get('/', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  const active = getAnnouncements().filter(a =>
    a.active && (!a.expiresAt || a.expiresAt > now)
  );
  res.json(active);
});

/* GET /api/announcements/all — full list for management (super_admin only) */
router.get('/all', requireAuth, requireSuperAdmin, (req, res) => {
  res.json(getAnnouncements());
});

/* POST /api/announcements — create */
router.post('/', requireAuth, requireSuperAdmin, (req, res) => {
  const { title, message, expiresAt } = req.body;
  if (!title || !message)
    return res.status(400).json({ error: 'Title and message are required.' });

  const user = getUsers().find(u => u.id === req.session.userId);
  const list = getAnnouncements();
  const item = {
    id:            crypto.randomBytes(6).toString('hex'),
    title:         title.trim(),
    message:       message.trim(),
    createdBy:     user.id,
    createdByName: user.name,
    createdAt:     new Date().toISOString(),
    expiresAt:     expiresAt || null,
    active:        true,
  };
  list.unshift(item);
  saveAnnouncements(list);
  res.status(201).json(item);
});

/* PUT /api/announcements/:id — edit */
router.put('/:id', requireAuth, requireSuperAdmin, (req, res) => {
  const { title, message, expiresAt, active } = req.body;
  const list = getAnnouncements();
  const item = list.find(a => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found.' });

  if (title     !== undefined) item.title     = title.trim();
  if (message   !== undefined) item.message   = message.trim();
  if (expiresAt !== undefined) item.expiresAt = expiresAt || null;
  if (active    !== undefined) item.active    = active;

  saveAnnouncements(list);
  res.json(item);
});

/* DELETE /api/announcements/:id */
router.delete('/:id', requireAuth, requireSuperAdmin, (req, res) => {
  const list    = getAnnouncements();
  const updated = list.filter(a => a.id !== req.params.id);
  if (updated.length === list.length) return res.status(404).json({ error: 'Not found.' });
  saveAnnouncements(updated);
  res.json({ ok: true });
});

module.exports = router;
