/**
 * hubpublic.js — Public-facing resource hub routes (no PMT auth required)
 *
 * GET  /hub/:slug         → email gate or full hub page
 * POST /hub/:slug/verify  → validate email, set hub session cookie
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const { getHubs, saveHubs, getProjects, getUsers } = require('../db');
const { getImplementersByHubspotId } = require('./hubspot');

const router = express.Router();

const MILESTONES = [
  'Project Team Assignment',
  'KOM or Requirements Alignment',
  'Data Gathering',
  'Simulation I',
  'Training and System Setup',
  'Project Review Checklist',
  'Simulation II / Parallel Run',
  'Pre Handover',
  'Project Handover',
  'Hypercare',
];

const HUB_SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function progressBar(pct) {
  return `
    <div class="hub-progress-wrap">
      <div class="hub-progress-bar" style="width:${pct}%"></div>
    </div>`;
}

// ── Gate HTML ──────────────────────────────────────────────────
function buildGateHtml(hub, errorMsg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(hub.projectTitle)} — Sprout Resource Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600;700;800&family=Rubik:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }

    body {
      font-family: 'Rubik', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(ellipse at 20% 50%, #0d3d06 0%, #061a02 45%, #020d01 100%);
      overflow: hidden;
      position: relative;
    }

    /* Ambient glow orbs */
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }
    .orb-green1 {
      width: 600px; height: 600px;
      background: radial-gradient(circle, #32CE13, transparent 70%);
      opacity: 0.2;
      top: -150px; left: -150px;
      animation: drift1 3s ease-in-out infinite alternate;
    }
    .orb-green2 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, #1a6b08, transparent 70%);
      opacity: 0.22;
      bottom: -120px; right: -100px;
      animation: drift2 2.5s ease-in-out infinite alternate;
    }
    .orb-white {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%);
      opacity: 0.06;
      top: 40%; left: 55%;
      animation: drift3 2s ease-in-out infinite alternate;
    }

    /* Subtle grid texture overlay */
    .bg-grid {
      position: fixed; inset: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(50,206,19,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(50,206,19,.04) 1px, transparent 1px);
      background-size: 48px 48px;
    }

    @keyframes drift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(100px, 120px) scale(1.2); } }
    @keyframes drift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-90px,-100px) scale(1.15); } }
    @keyframes drift3 { from { transform: translate(0,0) scale(1); } to { transform: translate(-80px, 60px) scale(1.1); } }

    /* Card */
    .gate-wrap {
      position: relative; z-index: 10;
      width: 100%; max-width: 460px;
      padding: 20px;
    }

    .gate-box {
      background: linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(50,206,19,0.2);
      border-radius: 24px;
      padding: 48px 44px 44px;
      box-shadow:
        0 0 0 1px rgba(50,206,19,0.05),
        0 32px 64px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(255,255,255,0.08);
      animation: cardIn .5s cubic-bezier(.22,1,.36,1) both;
    }

    @keyframes cardIn {
      from { opacity:0; transform: translateY(24px) scale(.97); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }

    /* Logo area */
    .gate-logo-wrap {
      text-align: center;
      margin-bottom: 32px;
    }
    .gate-logo {
      height: 80px;
      width: auto;
      filter: brightness(0) invert(1);
      opacity: .9;
    }
    .gate-divider {
      width: 40px; height: 2px;
      background: linear-gradient(90deg, transparent, #32CE13, transparent);
      margin: 16px auto 0;
      border-radius: 2px;
    }

    /* Lock badge */
    .gate-badge {
      display: flex; align-items: center; justify-content: center;
      width: 56px; height: 56px;
      background: linear-gradient(135deg, rgba(50,206,19,.15), rgba(50,206,19,.05));
      border: 1px solid rgba(50,206,19,.3);
      border-radius: 16px;
      margin: 0 auto 20px;
      font-size: 1.6rem;
      box-shadow: 0 0 20px rgba(50,206,19,.15);
    }

    .gate-title {
      font-family: 'Fira Sans', sans-serif;
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: -.01em;
    }
    .gate-subtitle {
      font-size: .875rem;
      color: rgba(255,255,255,.45);
      text-align: center;
      line-height: 1.55;
      margin-bottom: 32px;
    }

    /* Form */
    .gate-field { margin-bottom: 16px; }
    .gate-label {
      display: block;
      font-size: .78rem;
      font-weight: 600;
      color: rgba(255,255,255,.55);
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 7px;
    }
    .gate-label span { font-weight: 400; text-transform: none; letter-spacing: 0; color: rgba(255,255,255,.3); }

    .gate-input {
      width: 100%;
      padding: 13px 16px;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px;
      font-size: .95rem;
      font-family: 'Rubik', sans-serif;
      color: #fff;
      outline: none;
      transition: border .2s, box-shadow .2s, background .2s;
    }
    .gate-input::placeholder { color: rgba(255,255,255,.25); }
    .gate-input:focus {
      border-color: rgba(50,206,19,.6);
      background: rgba(50,206,19,.06);
      box-shadow: 0 0 0 3px rgba(50,206,19,.12), 0 0 16px rgba(50,206,19,.08);
    }

    .gate-btn {
      width: 100%;
      margin-top: 8px;
      padding: 14px;
      background: linear-gradient(135deg, #32CE13 0%, #28a80f 100%);
      color: #061a02;
      border: none;
      border-radius: 12px;
      font-family: 'Fira Sans', sans-serif;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      letter-spacing: .01em;
      box-shadow: 0 4px 20px rgba(50,206,19,.35), 0 1px 0 rgba(255,255,255,.2) inset;
      transition: transform .15s, box-shadow .15s, background .2s;
    }
    .gate-btn:hover {
      background: linear-gradient(135deg, #3de01e 0%, #32CE13 100%);
      box-shadow: 0 6px 28px rgba(50,206,19,.5);
      transform: translateY(-1px);
    }
    .gate-btn:active { transform: translateY(0); }
    .gate-btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }

    .gate-error {
      margin-top: 14px;
      font-size: .83rem;
      color: #ff8080;
      background: rgba(220,53,69,.12);
      border: 1px solid rgba(220,53,69,.3);
      border-radius: 10px;
      padding: 10px 14px;
      text-align: center;
      ${errorMsg ? '' : 'display:none'}
    }

    /* Footer */
    .gate-footer {
      text-align: center;
      margin-top: 28px;
      font-size: .75rem;
      color: rgba(255,255,255,.2);
      letter-spacing: .02em;
    }
    .gate-footer strong { color: rgba(50,206,19,.5); font-family: 'Fira Sans', sans-serif; }
  </style>
</head>
<body>
<div class="bg-grid"></div>
<div class="orb orb-green1"></div>
<div class="orb orb-green2"></div>
<div class="orb orb-white"></div>

<div class="gate-wrap">
  <div class="gate-box">

    <div class="gate-logo-wrap">
      <img class="gate-logo" src="/Sprout%20Logo.png" alt="Sprout Solutions" />
      <div class="gate-divider"></div>
    </div>

    <div class="gate-badge">🔒</div>
    <h2 class="gate-title">${escHtml(hub.projectTitle)}</h2>
    <p class="gate-subtitle">This resource hub is private. Enter your credentials to verify access.</p>

    <div class="gate-field">
      <label class="gate-label" for="gateEmail">Email Address</label>
      <input class="gate-input" type="email" id="gateEmail" placeholder="your@email.com" />
    </div>
    <div class="gate-field">
      <label class="gate-label" for="gatePassword">Password <span>(if provided by your project team)</span></label>
      <input class="gate-input" type="password" id="gatePassword" placeholder="Leave blank if no password was set" />
    </div>
    <button class="gate-btn" id="gateBtn" onclick="verifyAccess()">Access Resource Hub →</button>
    <div class="gate-error" id="gateError">${errorMsg ? escHtml(errorMsg) : ''}</div>

  </div>
  <div class="gate-footer"><strong>Sprout Solutions</strong> &mdash; Implementation Resource Hub</div>
</div>

<script>
  document.getElementById('gatePassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyAccess();
  });
  document.getElementById('gateEmail').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyAccess();
  });

  function verifyAccess() {
    const email    = document.getElementById('gateEmail').value.trim();
    const password = document.getElementById('gatePassword').value;
    const errEl    = document.getElementById('gateError');
    const btn      = document.getElementById('gateBtn');
    if (!email) { showError('Please enter your email address.'); return; }

    btn.disabled = true;
    btn.textContent = 'Verifying…';
    errEl.style.display = 'none';

    fetch(window.location.pathname + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        window.location.reload();
      } else {
        showError(data.error || 'Access denied. Please contact your Sprout Solutions project team.');
        btn.disabled = false;
        btn.textContent = 'Access Resource Hub →';
      }
    })
    .catch(() => {
      showError('Something went wrong. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Access Resource Hub →';
    });
  }

  function showError(msg) {
    const el = document.getElementById('gateError');
    el.textContent = msg;
    el.style.display = 'block';
  }
</script>
</body>
</html>`;
}

// ── Private / Not Found ────────────────────────────────────────
function buildPrivateHtml(hub) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hub Unavailable — Sprout Solutions</title>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@700;800&family=Rubik:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Rubik',sans-serif;background:#F7F9ED;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px}
    h2{font-family:'Fira Sans',sans-serif;color:#092903;font-size:1.4rem;margin-bottom:8px}
    p{color:#5a7a5a;font-size:.9rem;line-height:1.55}
  </style>
</head>
<body>
  <div style="font-size:3rem;margin-bottom:16px">🔒</div>
  <h2>This resource hub is currently unavailable.</h2>
  <p>Please contact your Sprout Solutions project team for access.</p>
</body>
</html>`;
}

function build404Html() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Not Found — Sprout Solutions</title>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@700;800&family=Rubik:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Rubik',sans-serif;background:#F7F9ED;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px}
    h2{font-family:'Fira Sans',sans-serif;color:#092903;font-size:1.4rem;margin-bottom:8px}
    p{color:#5a7a5a;font-size:.9rem}
  </style>
</head>
<body>
  <div style="font-size:3rem;margin-bottom:16px">🔍</div>
  <h2>Resource hub not found.</h2>
  <p>The link may be invalid or expired. Please contact your project team.</p>
</body>
</html>`;
}

// ── Escape HTML ────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Full Hub HTML ──────────────────────────────────────────────
function buildHubHtml(hub, project, accessLevel, isInternalUser) {
  const sections   = hub.sections || {};
  const defaultLimitedSecs = { milestones: true, timeline: true, documents: true, recordings: false, contacts: false, ticketing: false };
  const limitedSecs = hub.limitedSections ? { ...defaultLimitedSecs, ...hub.limitedSections } : defaultLimitedSecs;
  const canSee = key => accessLevel === 'full' || !!limitedSecs[key];
  const milestones = project?.milestones || {};
  const timeline   = project?.timeline   || {};
  const details    = project?.details    || {};
  const salesDocs  = details.salesDocs   || [];
  const contacts   = details.contacts    || [];
  const recordings = hub.recordings      || [];

  // Use project's actual milestone list (from Kanban columns) instead of hardcoded list
  const projectMilestones = Object.keys(milestones).length > 0 ? Object.keys(milestones) : MILESTONES;

  const completedCount = projectMilestones.filter(m => milestones[m]).length;
  const inProgressCount = 1; // always 1 "in progress" unless all done
  const pendingCount   = Math.max(0, projectMilestones.length - completedCount - (completedCount < projectMilestones.length ? 1 : 0));
  const progress       = projectMilestones.length ? Math.round((completedCount / projectMilestones.length) * 100) : 0;
  const serverToday    = new Date().toISOString().split('T')[0];

  const allUsers = getUsers();
  const pm = project?.projectManager ? allUsers.find(u => u.id === project.projectManager) : null;

  // Resolve implementer team members — prefer saved teamRoles, fall back to live deals cache
  let teamRoles = project?.teamRoles || {};
  const hasTeamRoles = Object.values(teamRoles).some(r => r?.name || r?.id);
  if (!hasTeamRoles && project?.hubspotId) {
    const live = getImplementersByHubspotId(project.hubspotId);
    if (live) {
      teamRoles = {
        hrsi:          { id: null, name: live.hrsi          || null },
        psi:           { id: null, name: live.psi           || null },
        payrollMaster: { id: null, name: live.payrollMaster || null },
        softwareImpl:  { id: null, name: live.softwareImpl  || null },
      };
    }
  }
  function fuzzyNameMatch(a, b) {
    const ta = a.trim().toLowerCase().split(/\s+/);
    const tb = b.trim().toLowerCase().split(/\s+/);
    const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    return shorter.every(t => longer.some(lt => lt.startsWith(t)));
  }
  function resolveTeamMember(role) {
    if (!role) return null;
    let u = role.id ? allUsers.find(u => u.id === role.id) : null;
    if (!u && role.name) u = allUsers.find(u => u.name?.trim().toLowerCase() === role.name.trim().toLowerCase());
    if (!u && role.name) u = allUsers.find(u => u.name && fuzzyNameMatch(u.name, role.name));
    const name = u?.name || role.name;
    if (!name) return null;
    return { name, jobTitle: u?.jobTitle || null, email: u?.email || null };
  }
  const sproutTeam = [
    pm ? { label: pm.jobTitle || 'Project Manager',                          name: pm.name, email: pm.email } : null,
    resolveTeamMember(teamRoles.hrsi)         ? { label: resolveTeamMember(teamRoles.hrsi).jobTitle         || 'HR Software Implementation Officer',      ...resolveTeamMember(teamRoles.hrsi) }         : null,
    resolveTeamMember(teamRoles.psi)          ? { label: resolveTeamMember(teamRoles.psi).jobTitle          || 'Payroll Software Implementation Officer', ...resolveTeamMember(teamRoles.psi) }          : null,
    resolveTeamMember(teamRoles.payrollMaster)? { label: resolveTeamMember(teamRoles.payrollMaster).jobTitle || 'Payroll Master',                          ...resolveTeamMember(teamRoles.payrollMaster)} : null,
    resolveTeamMember(teamRoles.softwareImpl) ? { label: resolveTeamMember(teamRoles.softwareImpl).jobTitle  || 'Software Implementation Officer',         ...resolveTeamMember(teamRoles.softwareImpl) } : null,
  ].filter(Boolean);

  // Client name for the second contacts section header
  const clientName = escHtml(hub.projectTitle || project?.title || 'Client');

  const statusLabel = s => ({ ongoing:'Ongoing', 'on-hold':'On Hold', 'on-hold-sales':'On Hold – Sales', churn:'Churned', completed:'Completed' }[s] || (s||'—'));
  const statusColor = s => ({ ongoing:'#16a34a', 'on-hold':'#d97706', 'on-hold-sales':'#9333ea', churn:'#dc2626', completed:'#0891b2' }[s] || '#5a7a5a');

  const adminBanner = isInternalUser ? `
    <div style="background:#eafce6;border-bottom:2px solid #32CE13;padding:10px 40px;font-size:.84rem;color:#092903;display:flex;align-items:center;justify-content:space-between;gap:1rem">
      <span>🔒 <strong>Internal View</strong> — You are viewing this as a logged-in Sprout team member.</span>
      <a href="/hub/${escHtml(hub.slug)}/logout" style="font-size:.79rem;font-weight:700;color:#092903;background:#d2f96d;border:1px solid #a3d900;border-radius:7px;padding:4px 12px;text-decoration:none;white-space:nowrap;flex-shrink:0">🚪 Test Client View</a>
    </div>` : '';

  // ── Zigzag milestone timeline ──
  const msZigzag = projectMilestones.map((m, i) => {
    const done      = !!milestones[m];
    const isCurrent = !done && projectMilestones.slice(0, i).every(prev => milestones[prev]);
    const targetStart = timeline[m]?.startDate;
    const targetEnd   = timeline[m]?.endDate || timeline[m]?.targetDate;
    const actual      = timeline[m]?.actualDate || (done ? serverToday : '');
    const isLeft      = i % 2 === 0;
    const dotColor    = done ? '#16a34a' : isCurrent ? '#d97706' : '#d1d5db';
    const dotIcon     = done ? '✓' : isCurrent ? '▶' : String(i + 1);
    const cardBg      = done ? '#f0fdf4' : isCurrent ? '#fffbeb' : '#fff';
    const cardBorder  = done ? '#86efac' : isCurrent ? '#fcd34d' : '#e4ece4';
    const badge       = done
      ? `<span style="font-size:.7rem;font-weight:700;padding:2px 9px;border-radius:20px;background:#d1fae5;color:#065f46">✓ Completed</span>`
      : isCurrent
        ? `<span style="font-size:.7rem;font-weight:700;padding:2px 9px;border-radius:20px;background:#fef3c7;color:#92400e;animation:pulse-badge 2s infinite">▶ In Progress</span>`
        : `<span style="font-size:.7rem;font-weight:700;padding:2px 9px;border-radius:20px;background:#f3f4f6;color:#6b7280">Pending</span>`;
    const dateHtml    = done
      ? `${targetStart ? `<div style="font-size:.72rem;color:#8aaa8a;margin-top:3px">📅 Start: ${fmtDate(targetStart)}</div>` : ''}${targetEnd ? `<div style="font-size:.72rem;color:#8aaa8a;margin-top:2px">🎯 Target: ${fmtDate(targetEnd)}</div>` : ''}<div style="font-size:.72rem;color:#16a34a;font-weight:600;margin-top:2px">✅ Completed: ${fmtDate(actual)}</div>`
      : `${targetStart ? `<div style="font-size:.72rem;color:#8aaa8a;margin-top:3px">📅 Start: ${fmtDate(targetStart)}</div>` : ''}${targetEnd ? `<div style="font-size:.72rem;color:#8aaa8a;margin-top:2px">🎯 Target: ${fmtDate(targetEnd)}</div>` : ''}`;
    const card = `
      <div style="background:${cardBg};border:1.5px solid ${cardBorder};border-radius:12px;padding:14px 18px;box-shadow:0 2px 8px rgba(9,41,3,.06);max-width:340px;${isLeft?'margin-left:auto;margin-right:24px':'margin-left:24px;margin-right:auto'}">
        <div style="font-size:.88rem;font-weight:700;color:#092903;margin-bottom:4px">${escHtml(m)}</div>
        ${dateHtml}
        <div style="margin-top:8px">${badge}</div>
      </div>`;
    return `
      <div class="ms-row" style="display:grid;grid-template-columns:1fr 40px 1fr;align-items:center;position:relative;min-height:80px;animation-delay:${i * 0.12}s">
        <div>${isLeft ? card : ''}</div>
        <div style="display:flex;flex-direction:column;align-items:center;z-index:1">
          <div style="width:36px;height:36px;border-radius:50%;background:${dotColor};color:#fff;font-family:'Fira Sans',sans-serif;font-size:.78rem;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px ${done?'#d1fae5':isCurrent?'#fef3c7':'#f3f4f6'};${isCurrent?'animation:pulse-dot 2s infinite':''}">
            ${dotIcon}
          </div>
          ${i < projectMilestones.length - 1 ? `<div style="width:2px;height:32px;background:${done?'#86efac':'#e4ece4'};margin-top:2px"></div>` : ''}
        </div>
        <div>${!isLeft ? card : ''}</div>
      </div>`;
  }).join('');

  // ── Documents section ──
  const docsHtml = sections.documents ? `
    <section id="documents" style="margin-bottom:40px">
      <div style="font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5a7a5a;margin-bottom:14px;border-left:4px solid #32CE13;padding-left:12px">📄 Project Documents</div>
      <div style="background:#fff;border-radius:14px;padding:20px 24px;box-shadow:0 2px 10px rgba(9,41,3,.07)">
        ${salesDocs.length === 0
          ? '<div style="color:#8aaa8a;font-size:.88rem;text-align:center;padding:12px 0">No documents have been shared yet.</div>'
          : `<ul style="list-style:none;display:flex;flex-direction:column;gap:8px">${salesDocs.map(d=>`
            <li><a href="${escHtml(d.url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;text-decoration:none;color:#1a6b08;font-weight:500;font-size:.9rem;border:1px solid #e4ece4;transition:background .15s" onmouseover="this.style.background='#eafce6'" onmouseout="this.style.background=''">
              <span style="font-size:1.1rem">📎</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(d.name||d.url)}</span>
              ${d.addedAt ? `<span style="font-size:.78rem;color:#9ab09a;white-space:nowrap;flex-shrink:0">${fmtDate(d.addedAt)}</span>` : ''}
              <span style="font-size:.85rem;color:#9ab09a">↗</span>
            </a></li>`).join('')}</ul>`}
      </div>
    </section>` : '';

  // ── Timeline Revisions section (visible when versions exist) ──
  const timelineVersions = project?.timelineVersions || [];
  const tlRevisionsHtml = timelineVersions.length > 0 ? (() => {
    const allVersions = [...timelineVersions].reverse(); // newest first
    const rows = allVersions.map((v, i) => {
      const isActive = i === 0; // most recent = active
      return `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border-radius:12px;border:1.5px solid ${isActive ? '#86efac' : '#e4ece4'};background:${isActive ? '#f0fdf4' : '#fafafa'};margin-bottom:8px">
          <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:${isActive ? 'linear-gradient(135deg,#16a34a,#065f46)' : '#e4ece4'};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:${isActive ? '#fff' : '#5a7a5a'}">v${v.versionNumber}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:.88rem;font-weight:700;color:#092903">${escHtml(v.name)}</span>
              ${isActive ? `<span style="font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:10px;background:#16a34a;color:#fff">ACTIVE</span>` : ''}
            </div>
            ${v.revisionReason ? `<div style="font-size:.79rem;color:#4a7a44;margin-top:3px">📝 ${escHtml(v.revisionReason)}</div>` : ''}
            <div style="font-size:.73rem;color:#9ab09a;margin-top:3px">Saved ${fmtDate(v.createdAt)} by ${escHtml(v.createdBy)}</div>
          </div>
        </div>`;
    }).join('');
    return `
    <section id="timeline-revisions" style="margin-bottom:40px">
      <div style="font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5a7a5a;margin-bottom:14px;border-left:4px solid #16a34a;padding-left:12px">📋 Timeline Revisions</div>
      <div style="background:#fff;border-radius:14px;padding:20px 24px;box-shadow:0 2px 10px rgba(9,41,3,.07)">${rows}</div>
    </section>`;
  })() : '';

  // ── Recordings section ──
  const recHtml = sections.recordings && canSee('recordings') ? `
    <section id="recordings" style="margin-bottom:40px">
      <div style="font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5a7a5a;margin-bottom:14px;border-left:4px solid #8139EE;padding-left:12px">🎬 Meeting Recordings</div>
      <div style="background:#fff;border-radius:14px;padding:20px 24px;box-shadow:0 2px 10px rgba(9,41,3,.07)">
        ${recordings.length === 0
          ? '<div style="color:#8aaa8a;font-size:.88rem;text-align:center;padding:12px 0">No recordings have been added yet.</div>'
          : `<ul style="list-style:none;display:flex;flex-direction:column;gap:8px">${recordings.map(r=>`
            <li><a href="${escHtml(r.driveUrl)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;text-decoration:none;color:#5a3d9a;font-weight:500;font-size:.9rem;border:1px solid #e8e0f5;transition:background .15s" onmouseover="this.style.background='#f5f0ff'" onmouseout="this.style.background=''">
              <span style="font-size:1.1rem">▶️</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.name)}</span>
              <span style="font-size:.74rem;color:#9ab09a">${fmtDate(r.addedAt)}</span>
              <span style="font-size:.85rem;color:#9ab09a">↗</span>
            </a></li>`).join('')}</ul>`}
      </div>
    </section>` : '';

  // ── Ticketing section ──
  const tickHtml = sections.ticketing && hub.ticketingUrl ? `
    <section id="ticketing" style="margin-bottom:40px">
      <div style="font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5a7a5a;margin-bottom:14px;border-left:4px solid #1679FA;padding-left:12px">🎫 Submit a Ticket</div>
      <div style="background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(9,41,3,.07)">
        ${hub.ticketingNote?`<p style="margin-bottom:16px;color:#4a7a44;font-size:.9rem;line-height:1.55">${escHtml(hub.ticketingNote)}</p>`:''}
        <a href="${escHtml(hub.ticketingUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#092903;color:#32CE13;border-radius:10px;text-decoration:none;font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700">Submit a Ticket ↗</a>
      </div>
    </section>` : '';

  // ── Contacts section ──
  const sproutTeamHtml = sproutTeam.length > 0 ? `
    <div style="margin-bottom:20px">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#065f46;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:3px;height:14px;background:#16a34a;border-radius:2px"></span>
        Sprout Project Team
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${sproutTeam.map(m=>`
          <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;background:#f0fdf4;border:1.5px solid #6ee7b7;border-radius:12px">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#092903,#1a6b08);color:#fff;font-family:'Fira Sans',sans-serif;font-size:1rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(m.name||'?')[0].toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:.88rem;font-weight:700;color:#092903">${escHtml(m.name)}</div>
              <div style="font-size:.72rem;color:#065f46;font-weight:700;margin-top:2px">${escHtml(m.label)}</div>
              ${m.email?`<a href="mailto:${escHtml(m.email)}" style="font-size:.75rem;color:#1a6b08;text-decoration:none;margin-top:3px;display:block;word-break:break-all">${escHtml(m.email)}</a>`:''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const clientContactsHtml = contacts.length > 0 ? `
    <div>
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#92400e;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:3px;height:14px;background:#f59e0b;border-radius:2px"></span>
        ${clientName} Project Team
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${contacts.map(c=>`
          <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;font-family:'Fira Sans',sans-serif;font-size:1rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(c.name||'?')[0].toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:.88rem;font-weight:700;color:#092903">${escHtml(c.name)}</div>
              ${c.position?`<div style="font-size:.72rem;color:#5a7a5a;margin-top:2px">${escHtml(c.position)}</div>`:''}
              ${c.projectRole?`<div style="font-size:.72rem;color:#92400e;font-weight:600;margin-top:2px">${escHtml(c.projectRole)}</div>`:''}
              ${c.email?`<a href="mailto:${escHtml(c.email)}" style="font-size:.75rem;color:#1a6b08;text-decoration:none;margin-top:3px;display:block;word-break:break-all">${escHtml(c.email)}</a>`:''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const ctcHtml = sections.contacts && canSee('contacts') && (sproutTeam.length > 0 || contacts.length > 0) ? `
    <section id="contacts" style="margin-bottom:40px">
      <div style="font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5a7a5a;margin-bottom:14px;border-left:4px solid #f59e0b;padding-left:12px">📞 Key Contacts</div>
      <div style="background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(9,41,3,.07)">
        ${sproutTeamHtml}
        ${clientContactsHtml}
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escHtml(hub.projectTitle)} — Sprout Resource Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700;800&family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Rubik',sans-serif;background:#f0f4f0;color:#1a2e1a;min-height:100vh}
    h1,h2,h3,h4,h5,h6{font-family:'Fira Sans',sans-serif}

    header{background:linear-gradient(135deg,#092903 0%,#0d3d05 40%,#1a6b08 100%);color:#fff;padding:18px 36px;display:flex;align-items:center;gap:18px;box-shadow:0 4px 20px rgba(9,41,3,.4);position:sticky;top:0;z-index:100}
    .logo{height:56px;width:auto;flex-shrink:0;object-fit:contain}
    .header-center{flex:1}
    .header-project{font-size:1.2rem;font-weight:800;line-height:1.2;letter-spacing:.01em}
    .header-sub{font-size:.78rem;opacity:.7;margin-top:2px}
    .header-right{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
    .header-pill{background:rgba(50,206,19,.25);border:1px solid rgba(50,206,19,.5);border-radius:20px;padding:3px 12px;font-size:.72rem;font-weight:700;color:#32CE13;letter-spacing:.3px}

    nav.hub-nav{background:#fff;border-bottom:1px solid #dce8d8;padding:0 36px;display:flex;gap:0;overflow-x:auto;box-shadow:0 1px 4px rgba(9,41,3,.06)}
    nav.hub-nav a{display:inline-flex;align-items:center;gap:6px;padding:13px 16px;font-family:'Fira Sans',sans-serif;font-size:.82rem;font-weight:600;color:#6a8a6a;text-decoration:none;border-bottom:2.5px solid transparent;white-space:nowrap;transition:color .15s,border-color .15s}
    nav.hub-nav a:hover,nav.hub-nav a.active{color:#092903;border-bottom-color:#32CE13}

    .hub-main{max-width:1100px;margin:0 auto;padding:28px 28px 60px}

    /* ── Stat tiles ── */
    .stat-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
    .stat-tile{
      border-radius:14px;padding:20px 22px;color:#fff;position:relative;overflow:hidden;
      box-shadow:0 4px 14px rgba(0,0,0,.12);
      opacity:0;
      transition:transform .2s ease,box-shadow .2s ease;
    }
    .stat-tile:hover{transform:translateY(-5px) scale(1.02);box-shadow:0 12px 32px rgba(0,0,0,.22)}

    /* Mirror shine sweep */
    .stat-tile::after{
      content:'';
      position:absolute;
      top:-60%;left:-80%;
      width:50%;height:220%;
      background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%);
      transform:skewX(-10deg);
      animation:shineSweep 3.5s ease-in-out infinite;
    }
    .stat-tile:nth-child(2)::after{animation-delay:.4s}
    .stat-tile:nth-child(3)::after{animation-delay:.8s}
    .stat-tile:nth-child(4)::after{animation-delay:1.2s}
    @keyframes shineSweep{0%,60%,100%{left:-80%}30%{left:130%}}

    /* Slide-in alternating left/right */
    @keyframes tileInLeft{from{opacity:0;transform:translateX(-40px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}
    @keyframes tileInRight{from{opacity:0;transform:translateX(40px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}
    .stat-tile.tile-animate-left{animation:tileInLeft .55s cubic-bezier(.22,1,.36,1) forwards}
    .stat-tile.tile-animate-right{animation:tileInRight .55s cubic-bezier(.22,1,.36,1) forwards}

    .stat-tile-icon{position:absolute;right:16px;top:14px;font-size:2rem;opacity:.22}
    .stat-tile-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;opacity:.85;margin-bottom:6px}
    .stat-tile-value{font-size:1.5rem;font-weight:800;line-height:1;font-family:'Fira Sans',sans-serif}
    .stat-tile-sub{font-size:.75rem;opacity:.8;margin-top:5px}

    /* ── Dashboard grid ── */
    .dash-grid{display:grid;grid-template-columns:1fr 320px;gap:20px;margin-bottom:32px;align-items:start}

    /* ── Chart card ── */
    .chart-card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(9,41,3,.08)}
    .chart-card-title{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a7a5a;margin-bottom:18px;display:flex;align-items:center;gap:8px}
    .chart-card-title::before{content:'';display:inline-block;width:4px;height:16px;background:#32CE13;border-radius:2px}
    .donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none}
    .donut-pct{font-family:'Fira Sans',sans-serif;font-size:2rem;font-weight:800;color:#092903;line-height:1}
    .donut-lbl{font-size:.72rem;color:#8aaa8a;font-weight:600;margin-top:2px}

    /* ── Timeline zigzag ── */
    .timeline-section{background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 2px 12px rgba(9,41,3,.08);margin-bottom:32px}
    .timeline-header{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a7a5a;margin-bottom:24px;display:flex;align-items:center;gap:8px}
    .timeline-header::before{content:'';display:inline-block;width:4px;height:16px;background:#1679FA;border-radius:2px}

    @keyframes pulse-dot{0%,100%{box-shadow:0 0 0 4px #fef3c7}50%{box-shadow:0 0 0 8px #fef9c3}}
    @keyframes pulse-badge{0%,100%{opacity:1}50%{opacity:.7}}
    @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes milestoneIn{from{opacity:0;transform:translateY(-28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    .ms-row{opacity:0;animation:milestoneIn .45s cubic-bezier(.22,1,.36,1) forwards}
    .hub-main>*{animation:fadeInUp .4s ease both}
    .hub-main>*:nth-child(1){animation-delay:.05s}
    .hub-main>*:nth-child(2){animation-delay:.1s}
    .hub-main>*:nth-child(3){animation-delay:.15s}
    .hub-main>*:nth-child(4){animation-delay:.2s}

    footer{text-align:center;padding:24px;font-size:.78rem;color:#8aaa8a;border-top:1px solid #dce8d8;background:#fff}
    .footer-brand{color:#32CE13;font-family:'Fira Sans',sans-serif;font-weight:800}

    @media(max-width:768px){
      header{padding:14px 18px}
      .hub-main{padding:16px 14px 48px}
      .stat-tiles{grid-template-columns:repeat(2,1fr);gap:10px}
      .stat-tile-value{font-size:1.2rem}
      .dash-grid{grid-template-columns:1fr}
    }
    @media(max-width:480px){
      .stat-tiles{grid-template-columns:1fr 1fr}
      nav.hub-nav{padding:0 12px}
      nav.hub-nav a{padding:11px 10px;font-size:.76rem}
    }
  </style>
</head>
<body>

<header>
  <img class="logo" src="/Sprout%20Logo.png" alt="Sprout Solutions"/>
  <div class="header-center">
    <div class="header-project">${escHtml(hub.projectTitle)}</div>
    <div class="header-sub">Implementation Resource Hub &nbsp;·&nbsp; ${fmtDate(new Date().toISOString())}</div>
  </div>
  <div class="header-right">
    ${pm ? `<span style="font-size:.78rem;opacity:.8">PM: ${escHtml(pm.name)}</span>` : ''}
    <span class="header-pill">${progress}% Complete</span>
    ${!isInternalUser ? `<a href="/hub/${escHtml(hub.slug)}/logout" style="font-size:.7rem;color:rgba(255,255,255,.55);text-decoration:underline;margin-top:1px">Sign out</a>` : ''}
  </div>
</header>

${adminBanner}

<nav class="hub-nav">
  <a href="#overview">📊 Overview</a>
  ${sections.milestones||sections.timeline ? '<a href="#timeline">🗺️ Milestones</a>' : ''}
  ${sections.documents  ? '<a href="#documents">📄 Documents</a>'   : ''}
  ${sections.recordings && canSee('recordings') ? '<a href="#recordings">🎬 Recordings</a>' : ''}
  ${sections.ticketing && hub.ticketingUrl ? '<a href="#ticketing">🎫 Ticketing</a>' : ''}
  ${sections.contacts && canSee('contacts') && (pm||contacts.length>0) ? '<a href="#contacts">📞 Contacts</a>' : ''}
</nav>

<div class="hub-main">

  <!-- ── Stat Tiles ── -->
  <div class="stat-tiles" id="overview">
    <div class="stat-tile tile-animate-left" style="background:linear-gradient(135deg,#16a34a,#15803d);animation-delay:.05s">
      <div class="stat-tile-icon">📊</div>
      <div class="stat-tile-label">Overall Progress</div>
      <div class="stat-tile-value" id="tile-progress">0%</div>
      <div class="stat-tile-sub">${completedCount} of ${projectMilestones.length} milestones done</div>
    </div>
    <div class="stat-tile tile-animate-left" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);animation-delay:.18s">
      <div class="stat-tile-icon">👤</div>
      <div class="stat-tile-label">Project Manager</div>
      <div class="stat-tile-value" style="font-size:1.05rem;line-height:1.3">${escHtml(pm?.name||'—')}</div>
      <div class="stat-tile-sub">${pm?.email ? escHtml(pm.email) : 'Sprout Solutions'}</div>
    </div>
    <div class="stat-tile tile-animate-right" style="background:linear-gradient(135deg,#0891b2,#0e7490);animation-delay:.31s">
      <div class="stat-tile-icon">🏁</div>
      <div class="stat-tile-label">Milestones Done</div>
      <div class="stat-tile-value"><span id="tile-ms-done">0</span> <span style="font-size:1rem;opacity:.7">/ ${projectMilestones.length}</span></div>
      <div class="stat-tile-sub">${pendingCount} remaining</div>
    </div>
    <div class="stat-tile tile-animate-right" style="background:linear-gradient(135deg,#d97706,#b45309);animation-delay:.44s">
      <div class="stat-tile-icon">📌</div>
      <div class="stat-tile-label">Project Status</div>
      <div class="stat-tile-value" style="font-size:1.1rem;text-transform:capitalize">${statusLabel(project?.status)}</div>
      <div class="stat-tile-sub">Implementation stage</div>
    </div>
  </div>

  <!-- ── Dashboard Grid: Chart + Donut ── -->
  <div class="dash-grid" id="timeline">

    <!-- Left: Timeline Zigzag -->
    <div class="timeline-section">
      <div class="timeline-header">🗺️ Project Milestone Timeline</div>
      <div style="position:relative">
        <!-- vertical center line -->
        <div style="position:absolute;left:50%;top:18px;bottom:18px;width:2px;background:linear-gradient(to bottom,#d1fae5,#e4ece4);transform:translateX(-50%);z-index:0"></div>
        ${msZigzag}
      </div>
    </div>

    <!-- Right: Donut chart -->
    <div>
      <div class="chart-card" style="margin-bottom:20px">
        <div class="chart-card-title">Progress Overview</div>
        <div style="position:relative;height:220px;display:flex;align-items:center;justify-content:center">
          <canvas id="hub-donut-chart"></canvas>
          <div class="donut-center">
            <div class="donut-pct" id="hub-donut-center">0%</div>
            <div class="donut-lbl">Complete</div>
          </div>
        </div>
        <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:5px;font-size:.75rem;color:#5a7a5a"><span style="width:10px;height:10px;border-radius:50%;background:#16a34a;display:inline-block"></span>Done (${completedCount})</div>
          <div style="display:flex;align-items:center;gap:5px;font-size:.75rem;color:#5a7a5a"><span style="width:10px;height:10px;border-radius:50%;background:#d97706;display:inline-block"></span>In Progress (${completedCount < projectMilestones.length ? 1 : 0})</div>
          <div style="display:flex;align-items:center;gap:5px;font-size:.75rem;color:#5a7a5a"><span style="width:10px;height:10px;border-radius:50%;background:#e5e7eb;display:inline-block"></span>Pending (${pendingCount})</div>
        </div>
      </div>

      <!-- Mini stat card -->
      <div class="chart-card">
        <div class="chart-card-title">Timeline Summary</div>
        ${projectMilestones.map((m, i) => {
          const done = !!milestones[m];
          const isCur = !done && projectMilestones.slice(0,i).every(p=>milestones[p]);
          const tStart = timeline[m]?.startDate;
          const tEnd   = timeline[m]?.endDate || timeline[m]?.targetDate;
          if (!done && !isCur) return '';
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f5f0">
            <div style="width:8px;height:8px;border-radius:50%;background:${done?'#16a34a':'#d97706'};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:.78rem;font-weight:600;color:#092903;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(m)}</div>
              ${tStart?`<div style="font-size:.7rem;color:#8aaa8a">Start: ${fmtDate(tStart)}</div>`:''}
              ${tEnd?`<div style="font-size:.7rem;color:#8aaa8a">Target: ${fmtDate(tEnd)}</div>`:''}
            </div>
            <span style="font-size:.68rem;font-weight:700;padding:2px 7px;border-radius:10px;background:${done?'#d1fae5':'#fef3c7'};color:${done?'#065f46':'#92400e'};flex-shrink:0">${done?'Done':'Active'}</span>
          </div>`;
        }).filter(Boolean).join('')}
        ${completedCount === 0 ? '<div style="font-size:.82rem;color:#8aaa8a;text-align:center;padding:12px 0">No milestones completed yet.</div>' : ''}
      </div>
    </div>
  </div>

  <!-- ── Lower sections ── -->
  ${docsHtml}
  ${tlRevisionsHtml}
  ${recHtml}
  ${tickHtml}
  ${ctcHtml}

</div>

<footer>
  <p><span class="footer-brand">Sprout Solutions</span> &mdash; Implementation Resource Hub &mdash; Data refreshes automatically on every visit.</p>
</footer>

<script>
  // ── Tile count-up ──
  (function() {
    function countUp(elId, target, suffix, duration) {
      const el = document.getElementById(elId);
      if (!el) return;
      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = Math.round(start) + (suffix || '');
        if (start >= target) clearInterval(timer);
      }, 16);
    }
    setTimeout(() => {
      countUp('tile-progress', ${progress}, '%', 900);
      countUp('tile-ms-done', ${completedCount}, '', 900);
    }, 300);
  })();

  // ── Donut chart ──
  (function() {
    const ctx = document.getElementById('hub-donut-chart');
    if (!ctx) return;
    const done    = ${completedCount};
    const inProg  = ${completedCount < projectMilestones.length ? 1 : 0};
    const pending = ${pendingCount};
    const total = done + inProg + pending;
    const targetPct = total > 0 ? Math.round((done / total) * 100) : 0;
    const centerLabel = document.getElementById('hub-donut-center');

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Pending'],
        datasets: [{
          data: [done, inProg, pending],
          backgroundColor: ['#16a34a', '#d97706', '#e5e7eb'],
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 8,
        }],
      },
      options: {
        cutout: '72%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => ' ' + c.label + ': ' + c.parsed + ' milestone' + (c.parsed !== 1 ? 's' : ''),
            },
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1400,
          easing: 'easeInOutQuart',
          onProgress: function(anim) {
            if (!centerLabel) return;
            const current = Math.round(targetPct * anim.currentStep / anim.numSteps);
            centerLabel.textContent = current + '%';
          },
          onComplete: function() {
            if (centerLabel) centerLabel.textContent = targetPct + '%';
          },
        },
      },
    });
  })();

  // ── Scrollspy nav ──
  (function() {
    const links  = document.querySelectorAll('nav.hub-nav a');
    const ids    = [...links].map(a => a.getAttribute('href').replace('#',''));
    const secs   = ids.map(id => document.getElementById(id)).filter(Boolean);
    const onScroll = () => {
      const scrollY = window.scrollY + 80;
      let active = ids[0];
      secs.forEach((s, i) => { if (s && s.offsetTop <= scrollY) active = ids[i]; });
      links.forEach(a => {
        const key = a.getAttribute('href').replace('#','');
        a.classList.toggle('active', key === active);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();
</script>
</body>
</html>`;
}

// ── GET /hub/:slug ─────────────────────────────────────────────
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const hub = getHubs().find(h => h.slug === slug);

  if (!hub) return res.status(404).send(build404Html());

  // Internal PMT users get full bypass — unless they clicked "Test Client View"
  if (req.session.userId && !req.session.hubForceGate?.[slug]) {
    const project = getProjects().find(p => p.id === hub.projectId);
    return res.send(buildHubHtml(hub, project, 'full', true));
  }

  if (!hub.isPublic) return res.send(buildPrivateHtml(hub));

  // Check hub session
  const access = req.session.hubAccess?.[slug];
  if (!access || access.expiresAt < Date.now()) {
    return res.send(buildGateHtml(hub));
  }

  const project = getProjects().find(p => p.id === hub.projectId);
  return res.send(buildHubHtml(hub, project, access.accessLevel, false));
});

// ── GET /hub/:slug/logout ──────────────────────────────────────
// Clears hub session. For PMT users, also forces them through the gate on next visit.
router.get('/:slug/logout', (req, res) => {
  const { slug } = req.params;

  // Clear hub access session for this slug
  if (req.session.hubAccess) delete req.session.hubAccess[slug];

  // For internal PMT users: set a flag so the gate is shown on next visit
  if (req.session.userId) {
    if (!req.session.hubForceGate) req.session.hubForceGate = {};
    req.session.hubForceGate[slug] = true;
  }

  res.redirect(`/hub/${slug}`);
});

// ── POST /hub/:slug/verify ─────────────────────────────────────
router.post('/:slug/verify', (req, res) => {
  const { slug }     = req.params;
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.json({ ok: false, error: 'Email is required.' });
  }

  const hubs = getHubs();
  const hubIdx = hubs.findIndex(h => h.slug === slug);
  if (hubIdx === -1) return res.json({ ok: false, error: 'Hub not found.' });

  const hub = hubs[hubIdx];
  if (!hub.isPublic) return res.json({ ok: false, error: 'This hub is not currently available.' });

  const normalized = email.trim().toLowerCase();
  const entry      = hub.accessList.find(a => a.email.toLowerCase() === normalized);

  // Log this attempt
  const logEntry = {
    email:     normalized,
    timestamp: new Date().toISOString(),
    ip:        req.ip || req.connection?.remoteAddress || 'unknown',
    success:   false,
  };

  if (!entry) {
    logEntry.reason = 'email_not_found';
    if (!hubs[hubIdx].accessLog) hubs[hubIdx].accessLog = [];
    hubs[hubIdx].accessLog.unshift(logEntry);
    if (hubs[hubIdx].accessLog.length > 100) hubs[hubIdx].accessLog.splice(100);
    saveHubs(hubs);
    return res.json({ ok: false, error: 'This email is not authorized. Please contact your Sprout Solutions project team.' });
  }

  // Check password if one is set
  if (entry.passwordHash) {
    const pw = (password || '').trim();
    if (!pw || !bcrypt.compareSync(pw, entry.passwordHash)) {
      logEntry.reason = 'wrong_password';
      if (!hubs[hubIdx].accessLog) hubs[hubIdx].accessLog = [];
      hubs[hubIdx].accessLog.unshift(logEntry);
      if (hubs[hubIdx].accessLog.length > 100) hubs[hubIdx].accessLog.splice(100);
      saveHubs(hubs);
      return res.json({ ok: false, error: 'Incorrect password. Please try again or contact your project team.' });
    }
  }

  // Success
  logEntry.success = true;
  logEntry.reason  = 'ok';
  if (!hubs[hubIdx].accessLog) hubs[hubIdx].accessLog = [];
  hubs[hubIdx].accessLog.unshift(logEntry);
  if (hubs[hubIdx].accessLog.length > 100) hubs[hubIdx].accessLog.splice(100);

  // Update lastAccess on entry
  entry.lastAccess = new Date().toISOString();
  saveHubs(hubs);

  if (!req.session.hubAccess) req.session.hubAccess = {};
  req.session.hubAccess[slug] = {
    email:       normalized,
    accessLevel: entry.accessLevel,
    expiresAt:   Date.now() + HUB_SESSION_TTL,
  };

  // Clear force-gate flag now that user has verified
  if (req.session.hubForceGate) delete req.session.hubForceGate[slug];

  res.json({ ok: true, accessLevel: entry.accessLevel });
});

module.exports = router;
