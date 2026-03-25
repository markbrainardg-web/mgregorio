const express = require('express');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();
const FILE   = path.join(__dirname, '../pmt-dashboard-overrides.json');

function read() {
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}

function write(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

/* GET /api/dashboard-overrides — returns full override map */
router.get('/', requireAuth, (req, res) => {
  res.json(read());
});

/* PATCH /api/dashboard-overrides/:hsId
   Body: { field, value }          → set override
         { field, reset: true }    → clear override (revert to HubSpot) */
router.patch('/:hsId', requireAuth, (req, res) => {
  const { hsId } = req.params;
  const { field, value, reset } = req.body;
  if (!field) return res.status(400).json({ error: 'field required' });

  const data = read();
  if (!data[hsId]) data[hsId] = {};

  if (reset) {
    delete data[hsId][field];
    if (Object.keys(data[hsId]).length === 0) delete data[hsId];
  } else {
    data[hsId][field] = value;
  }

  write(data);
  res.json({ ok: true });
});

module.exports = router;
