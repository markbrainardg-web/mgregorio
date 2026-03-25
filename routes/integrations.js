const express = require('express');
const { getUsers, getIntegrations, saveIntegrations } = require('../db');

const router = express.Router();
const HS = 'https://api.hubapi.com';

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

// Env var fallback per connector id
const ENV_KEYS = {
  hubspot:   () => process.env.HUBSPOT_TOKEN,
  anthropic: () => process.env.ANTHROPIC_API_KEY,
};

const DEFAULT_CONNECTOR_IDS = ['hubspot', 'anthropic'];
const DEFAULT_CONNECTOR_DEFS = {
  hubspot:   { id: 'hubspot',   name: 'HubSpot',              type: 'sync', enabled: true, apiKey: '', mappings: [
    { source: 'name',           sourceLabel: 'Company Name',           target: 'title',       targetLabel: 'Project Title' },
    { source: 'client_status',  sourceLabel: 'Client Status',          target: 'status',      targetLabel: 'Status' },
    { source: 'implem_package', sourceLabel: 'Implementation Package', target: 'description', targetLabel: 'Description' },
  ]},
  anthropic: { id: 'anthropic', name: 'Claude AI (Anthropic)', type: 'api',  enabled: true, apiKey: '', mappings: [] },
};

/* GET /api/integrations — returns config; API keys masked */
router.get('/', requireAuth, requireSuperAdmin, (req, res) => {
  const data = getIntegrations();

  // Merge: ensure every default connector is present even if not yet in the stored file
  const storedMap = Object.fromEntries(data.connectors.map(c => [c.id, c]));
  const allConnectors = DEFAULT_CONNECTOR_IDS.map(id => storedMap[id] || DEFAULT_CONNECTOR_DEFS[id]);
  // Also include any custom connectors added beyond the defaults
  data.connectors.forEach(c => { if (!DEFAULT_CONNECTOR_IDS.includes(c.id)) allConnectors.push(c); });

  const masked = {
    connectors: allConnectors.map(c => {
      const envKey       = ENV_KEYS[c.id]?.() || '';
      const effectiveKey = c.apiKey || envKey;
      const fromEnv      = !c.apiKey && !!envKey;
      return {
        ...c,
        apiKey:    effectiveKey ? `••••••••${effectiveKey.slice(-4)}` : '',
        apiKeySet: !!effectiveKey,
        keySource: fromEnv ? 'env' : (c.apiKey ? 'db' : 'none'),
      };
    }),
  };
  res.json(masked);
});

/* PUT /api/integrations — save full connector list */
router.put('/', requireAuth, requireSuperAdmin, (req, res) => {
  const { connectors } = req.body;
  if (!Array.isArray(connectors)) return res.status(400).json({ error: 'Invalid payload.' });

  const current = getIntegrations();

  const updated = {
    connectors: connectors.map(incoming => {
      const existing = current.connectors.find(c => c.id === incoming.id) || {};
      // Preserve the real stored key when the masked placeholder is sent back
      const apiKey = (incoming.apiKey && !incoming.apiKey.startsWith('••'))
        ? incoming.apiKey.trim()
        : existing.apiKey || '';
      return { ...existing, ...incoming, apiKey };
    }),
  };

  saveIntegrations(updated);
  res.json({ ok: true });
});

/* POST /api/integrations/:id/test — test a connector's API key */
router.post('/:id/test', requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { apiKey } = req.body;

  if (id === 'hubspot') {
    const storedKey = getIntegrations().connectors.find(c => c.id === 'hubspot')?.apiKey || '';
    const token = (apiKey && !apiKey.startsWith('••')) ? apiKey.trim() : storedKey || process.env.HUBSPOT_TOKEN;
    if (!token) return res.json({ ok: false, error: 'No API key provided.' });

    try {
      const r = await fetch(`${HS}/crm/v3/owners?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (r.ok) {
        res.json({ ok: true });
      } else {
        const data = await r.json().catch(() => ({}));
        res.json({ ok: false, error: data.message || `HTTP ${r.status}` });
      }
    } catch (err) {
      res.json({ ok: false, error: 'Could not reach HubSpot. Check your network.' });
    }
    return;
  }

  if (id === 'anthropic') {
    const storedKey = getIntegrations().connectors.find(c => c.id === 'anthropic')?.apiKey || '';
    const token = (apiKey && !apiKey.startsWith('••')) ? apiKey.trim() : storedKey || process.env.ANTHROPIC_API_KEY;
    if (!token) return res.json({ ok: false, error: 'No API key provided.' });
    try {
      const r = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': token, 'anthropic-version': '2023-06-01' },
      });
      if (r.ok) {
        res.json({ ok: true });
      } else {
        const data = await r.json().catch(() => ({}));
        res.json({ ok: false, error: data.error?.message || `HTTP ${r.status}` });
      }
    } catch (err) {
      res.json({ ok: false, error: 'Could not reach Anthropic API.' });
    }
    return;
  }

  res.json({ ok: false, error: `Unknown connector: ${id}` });
});

module.exports = router;
