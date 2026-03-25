require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'sprout-pmt-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   false, // set to true if serving over HTTPS
    maxAge:   24 * 60 * 60 * 1000, // 24 hours
  },
}));

// API routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/hubspot',     require('./routes/hubspot'));
app.use('/api/ai',          require('./routes/ai'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/roles',       require('./routes/roles'));
app.use('/api/audit',       require('./routes/audit'));
app.use('/api/settings',       require('./routes/settings'));
app.use('/api/announcements',  require('./routes/announcements'));
app.use('/api/integrations',   require('./routes/integrations'));
app.use('/api/projects',       require('./routes/projects'));
app.use('/api/tools',          require('./routes/tools'));
app.use('/api/resource-hub',        require('./routes/resourcehub'));
app.use('/api/dashboard-overrides', require('./routes/dashboard-overrides'));

// Public resource hub pages (email-gated, no PMT login required)
app.use('/hub',                require('./routes/hubpublic'));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Catch-all — serve the app for any unknown path (handles /reset-password etc.)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'PMTool.html'));
});

app.listen(PORT, HOST, () => {
  const url = process.env.APP_URL || `http://localhost:${PORT}`;
  console.log(`\n  Sprout PMT running at ${url}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: ${url}\n`);
});
