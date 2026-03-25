const express = require('express');
const { getProjects, saveProjects } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

/* GET /api/projects */
router.get('/', requireAuth, (req, res) => {
  res.json(getProjects());
});

/* PUT /api/projects — replaces the full project list */
router.put('/', requireAuth, (req, res) => {
  const projects = req.body;
  if (!Array.isArray(projects)) return res.status(400).json({ error: 'Expected an array of projects.' });
  saveProjects(projects);
  res.json({ ok: true });
});

/* POST /api/projects/migrate — one-time seed from localStorage; no-op if server already has projects */
router.post('/migrate', requireAuth, (req, res) => {
  const existing = getProjects();
  if (existing.length > 0) {
    return res.json({ ok: true, skipped: true, count: existing.length });
  }
  const projects = req.body;
  if (!Array.isArray(projects)) return res.status(400).json({ error: 'Expected an array of projects.' });
  saveProjects(projects);
  res.json({ ok: true, migrated: true, count: projects.length });
});

module.exports = router;
