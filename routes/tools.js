const express = require('express');
const { getAllUserTools, saveAllUserTools } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

/* GET /api/tools — returns tools for the logged-in user */
router.get('/', requireAuth, (req, res) => {
  const all = getAllUserTools();
  res.json(all[req.session.userId] || []);
});

/* PUT /api/tools — saves tools for the logged-in user */
router.put('/', requireAuth, (req, res) => {
  const tools = req.body;
  if (!Array.isArray(tools)) return res.status(400).json({ error: 'Expected an array.' });
  const all = getAllUserTools();
  all[req.session.userId] = tools;
  saveAllUserTools(all);
  res.json({ ok: true });
});

/* POST /api/tools/migrate — one-time seed from localStorage for this user */
router.post('/migrate', requireAuth, (req, res) => {
  const all = getAllUserTools();
  if (all[req.session.userId]) {
    return res.json({ ok: true, skipped: true });
  }
  const tools = req.body;
  if (!Array.isArray(tools)) return res.status(400).json({ error: 'Expected an array.' });
  all[req.session.userId] = tools;
  saveAllUserTools(all);
  res.json({ ok: true, migrated: true });
});

module.exports = router;
