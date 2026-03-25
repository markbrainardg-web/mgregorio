const express = require('express');
const { getUsers, getSettings, saveSettings } = require('../db');

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

/* GET /api/settings — any logged-in user can read */
router.get('/', requireAuth, (req, res) => {
  res.json(getSettings());
});

/* PUT /api/settings — super_admin only */
router.put('/', requireAuth, requireSuperAdmin, (req, res) => {
  const current = getSettings();
  // Only allow known keys
  const allowed = ['timerPopupEnabled', 'milestones', 'onboardingEnabled', 'onboardingTarget'];
  const updated = { ...current };
  allowed.forEach(k => {
    if (typeof req.body[k] !== 'undefined') updated[k] = req.body[k];
  });
  if (updated.milestones !== undefined) {
    if (!Array.isArray(updated.milestones) || updated.milestones.length < 1 ||
        updated.milestones.some(m => typeof m !== 'string' || !m.trim())) {
      return res.status(400).json({ error: 'milestones must be a non-empty array of strings.' });
    }
    updated.milestones = updated.milestones.map(m => m.trim());
  }
  saveSettings(updated);
  res.json(updated);
});

module.exports = router;
