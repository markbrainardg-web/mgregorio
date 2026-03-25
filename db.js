/**
 * db.js — Simple JSON file store for users and permissions
 * Pure Node.js, no native modules required.
 */
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const FILE             = path.join(__dirname, 'pmt-users.json');
const PERMISSIONS_FILE = path.join(__dirname, 'pmt-permissions.json');
const ROLES_FILE       = path.join(__dirname, 'pmt-roles.json');
const AUDIT_FILE       = path.join(__dirname, 'pmt-audit.json');
const SETTINGS_FILE    = path.join(__dirname, 'pmt-settings.json');

const DEFAULT_ROLES = [
  { id: 'super_admin',     label: 'Super Admin',    system: true },
  { id: 'lead',            label: 'Lead',           system: true },
  { id: 'project_manager', label: 'Project Manager', system: true },
  { id: 'implementer',     label: 'Implementer',    system: true },
];

const DEFAULT_PERMISSIONS = {
  super_admin: {
    view_admin_dashboard:    true,
    view_all_projects:       true,
    view_my_dashboard:       true,
    view_my_projects:        true,
    view_users:              true,
    view_hubspot:            true,
    manage_users:            true,
    create_delete_projects:  true,
    edit_projects:           true,
    edit_milestones:         true,
    act_as_user:             true,
    log_time:                true,
    view_audit_trail:        true,
    view_project_details:    true,
    view_resource_hub:       true,
    generate_resource_hub:   true,
    edit_dashboard_fields:   true,
    view_pm_dashboard_table: false,
  },
  lead: {
    view_admin_dashboard:    true,
    view_all_projects:       true,
    view_my_dashboard:       true,
    view_my_projects:        true,
    view_users:              false,
    view_hubspot:            true,
    manage_users:            false,
    create_delete_projects:  true,
    edit_projects:           true,
    edit_milestones:         true,
    act_as_user:             false,
    log_time:                true,
    view_audit_trail:        false,
    view_project_details:    true,
    view_resource_hub:       true,
    generate_resource_hub:   false,
    edit_dashboard_fields:   true,
    view_pm_dashboard_table: false,
  },
  project_manager: {
    view_admin_dashboard:    false,
    view_all_projects:       false,
    view_my_dashboard:       true,
    view_my_projects:        true,
    view_users:              false,
    view_hubspot:            false,
    manage_users:            false,
    create_delete_projects:  false,
    edit_projects:           true,
    edit_milestones:         true,
    act_as_user:             false,
    log_time:                true,
    view_audit_trail:        false,
    view_project_details:    true,
    view_resource_hub:       true,
    generate_resource_hub:   true,
    edit_dashboard_fields:   true,
    view_pm_dashboard_table: true,
  },
  implementer: {
    view_admin_dashboard:    false,
    view_all_projects:       false,
    view_my_dashboard:       true,
    view_my_projects:        true,
    view_users:              false,
    view_hubspot:            false,
    manage_users:            false,
    create_delete_projects:  false,
    edit_projects:           false,
    edit_milestones:         true,
    act_as_user:             false,
    log_time:                true,
    view_audit_trail:        false,
    view_project_details:    false,
    view_resource_hub:       false,
    generate_resource_hub:   false,
    edit_dashboard_fields:   false,
    view_pm_dashboard_table: false,
  },
};

function getUsers() {
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2), 'utf8');
}

function getPermissions() {
  if (!fs.existsSync(PERMISSIONS_FILE)) return DEFAULT_PERMISSIONS;
  try {
    const stored = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf8'));
    // Merge defaults so newly added flags are present for every role
    const merged = {};
    for (const role of Object.keys(DEFAULT_PERMISSIONS)) {
      merged[role] = { ...DEFAULT_PERMISSIONS[role], ...stored[role] };
    }
    return merged;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

function savePermissions(matrix) {
  fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(matrix, null, 2), 'utf8');
}

function getRoles() {
  if (!fs.existsSync(ROLES_FILE)) return [...DEFAULT_ROLES];
  try {
    return JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8'));
  } catch {
    return [...DEFAULT_ROLES];
  }
}

function saveRoles(roles) {
  fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2), 'utf8');
}

function getAuditLog() {
  if (!fs.existsSync(AUDIT_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function appendAuditEntry(entry) {
  const log = getAuditLog();
  log.unshift(entry); // newest first
  // Keep max 1000 entries to avoid unbounded growth
  if (log.length > 1000) log.splice(1000);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function clearAuditLog() {
  fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');
}

const DEFAULT_SETTINGS = {
  timerPopupEnabled:  true,
  onboardingEnabled:  false,
  onboardingTarget:   'new', // 'all' | 'new'
};

function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf8');
}

const PROJECTS_FILE     = path.join(__dirname, 'pmt-projects.json');
const TOOLS_FILE        = path.join(__dirname, 'pmt-tools.json');
const INTEGRATIONS_FILE = path.join(__dirname, 'pmt-integrations.json');
const HUBS_FILE         = path.join(__dirname, 'pmt-resource-hubs.json');

const DEFAULT_INTEGRATIONS = {
  connectors: [
    {
      id: 'hubspot',
      name: 'HubSpot',
      type: 'sync',
      enabled: true,
      apiKey: '',
      mappings: [
        { source: 'name',           sourceLabel: 'Company Name',           target: 'title',       targetLabel: 'Project Title' },
        { source: 'client_status',  sourceLabel: 'Client Status',          target: 'status',      targetLabel: 'Status' },
        { source: 'implem_package', sourceLabel: 'Implementation Package', target: 'description', targetLabel: 'Description' },
      ],
    },
    {
      id: 'anthropic',
      name: 'Claude AI (Anthropic)',
      type: 'api',
      enabled: true,
      apiKey: '',
      mappings: [],
    },
  ],
};

function getProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8')); }
  catch { return []; }
}

function saveProjects(list) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function getAllUserTools() {
  if (!fs.existsSync(TOOLS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveAllUserTools(data) {
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getIntegrations() {
  if (!fs.existsSync(INTEGRATIONS_FILE)) return JSON.parse(JSON.stringify(DEFAULT_INTEGRATIONS));
  try {
    return JSON.parse(fs.readFileSync(INTEGRATIONS_FILE, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_INTEGRATIONS));
  }
}

function saveIntegrations(data) {
  fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const ANNOUNCEMENTS_FILE = path.join(__dirname, 'pmt-announcements.json');

function getAnnouncements() {
  if (!fs.existsSync(ANNOUNCEMENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8'));
  } catch { return []; }
}

function saveAnnouncements(list) {
  fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function getHubs() {
  if (!fs.existsSync(HUBS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HUBS_FILE, 'utf8')); }
  catch { return []; }
}

function saveHubs(list) {
  fs.writeFileSync(HUBS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// Seed default users on first run
if (getUsers().length === 0) {
  const seeds = [
    { id: 'u1', username: 'admin', passwordHash: bcrypt.hashSync('admin123', 10), name: 'Alex Admin',  email: '', role: 'super_admin',     color: '#4f46e5', resetToken: null, resetExpires: null },
    { id: 'u2', username: 'john',  passwordHash: bcrypt.hashSync('user123',  10), name: 'John Doe',    email: '', role: 'project_manager', color: '#10b981', resetToken: null, resetExpires: null },
    { id: 'u3', username: 'jane',  passwordHash: bcrypt.hashSync('user456',  10), name: 'Jane Smith',  email: '', role: 'project_manager', color: '#f59e0b', resetToken: null, resetExpires: null },
  ];
  saveUsers(seeds);
  console.log('  Database seeded with default users.');
}

// Seed default permissions on first run
if (!fs.existsSync(PERMISSIONS_FILE)) {
  savePermissions(DEFAULT_PERMISSIONS);
  console.log('  Permissions seeded with defaults.');
}

// Seed default roles on first run
if (!fs.existsSync(ROLES_FILE)) {
  saveRoles(DEFAULT_ROLES);
  console.log('  Roles seeded with defaults.');
}

module.exports = { getUsers, saveUsers, getPermissions, savePermissions, getRoles, saveRoles, getAuditLog, appendAuditEntry, clearAuditLog, getSettings, saveSettings, getAnnouncements, saveAnnouncements, getIntegrations, saveIntegrations, getProjects, saveProjects, getAllUserTools, saveAllUserTools, getHubs, saveHubs };
