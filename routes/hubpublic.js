/**
 * hubpublic.js — Public-facing resource hub routes (no PMT auth required)
 *
 * GET  /hub/:slug         → email gate or full hub page
 * POST /hub/:slug/verify  → validate email, set hub session cookie
 */

const express = require('express');
const { getHubs, getProjects, getUsers } = require('../db');

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
function buildGateHtml(hub) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(hub.projectTitle)} — Sprout Resource Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600;700;800&family=Rubik:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Rubik',sans-serif;background:#F7F9ED;min-height:100vh;display:flex;flex-direction:column}
    h1,h2,h3,h4{font-family:'Fira Sans',sans-serif}
    header{background:linear-gradient(135deg,#092903 0%,#1a6b08 100%);color:#fff;padding:18px 40px;display:flex;align-items:center;gap:16px;box-shadow:0 4px 16px rgba(9,41,3,.35)}
    .logo{height:64px;width:auto;object-fit:contain;flex-shrink:0}
    .header-text p{font-size:.85rem;opacity:.75;margin-top:2px}
    .gate-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 20px}
    .gate-box{background:#fff;border-radius:18px;padding:44px 40px;max-width:440px;width:100%;box-shadow:0 8px 32px rgba(9,41,3,.12);text-align:center}
    .gate-icon{font-size:2.8rem;margin-bottom:16px}
    .gate-box h2{font-size:1.35rem;font-weight:800;color:#092903;margin-bottom:8px}
    .gate-box p{font-size:.9rem;color:#5a7a5a;line-height:1.55;margin-bottom:24px}
    .gate-input{width:100%;padding:12px 16px;border:1.5px solid #c0d8ba;border-radius:10px;font-size:.95rem;font-family:'Rubik',sans-serif;outline:none;margin-bottom:14px;transition:border .2s,box-shadow .2s}
    .gate-input:focus{border-color:#32CE13;box-shadow:0 0 0 3px rgba(50,206,19,.15)}
    .gate-btn{width:100%;padding:13px;background:#092903;color:#32CE13;border:none;border-radius:10px;font-family:'Fira Sans',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;transition:background .2s}
    .gate-btn:hover{background:#1a6b08}
    .gate-btn:disabled{opacity:.6;cursor:not-allowed}
    .gate-error{display:none;color:#dc3545;font-size:.85rem;margin-top:10px;padding:10px 14px;background:#fff5f5;border:1px solid #f5c2c7;border-radius:8px}
    .gate-error.show{display:block}
    footer{text-align:center;padding:20px;font-size:.78rem;color:#8aaa8a;border-top:1px solid #d4e8d0}
    .footer-brand{color:#32CE13;font-family:'Fira Sans',sans-serif;font-weight:800}
  </style>
</head>
<body>
<header>
  <img class="logo" src="/Sprout%20Logo.png" alt="Sprout Solutions" />
  <div class="header-text">
    <p>Implementation Resource Hub</p>
  </div>
</header>

<div class="gate-wrap">
  <div class="gate-box">
    <div class="gate-icon">🔒</div>
    <h2>${escHtml(hub.projectTitle)}</h2>
    <p>This resource hub is private. Enter your email address to verify access.</p>
    <input class="gate-input" type="email" id="gateEmail" placeholder="your@email.com" />
    <button class="gate-btn" id="gateBtn" onclick="verifyAccess()">Access Resource Hub →</button>
    <div class="gate-error" id="gateError"></div>
  </div>
</div>

<footer>
  <span class="footer-brand">Sprout Solutions</span> &mdash; Implementation Resource Hub
</footer>

<script>
  document.getElementById('gateEmail').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyAccess();
  });

  function verifyAccess() {
    const email = document.getElementById('gateEmail').value.trim();
    const errEl = document.getElementById('gateError');
    const btn   = document.getElementById('gateBtn');
    if (!email) { showError('Please enter your email address.'); return; }

    btn.disabled = true;
    btn.textContent = 'Verifying…';
    errEl.classList.remove('show');

    fetch(window.location.pathname + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        window.location.reload();
      } else {
        showError(data.error || 'This email is not authorized. Please contact your Sprout Solutions project team.');
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
    el.classList.add('show');
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

  const completedCount = MILESTONES.filter(m => milestones[m]).length;
  const progress       = MILESTONES.length ? Math.round((completedCount / MILESTONES.length) * 100) : 0;
  const serverToday    = new Date().toISOString().split('T')[0];

  // PM name lookup
  const allUsers = getUsers();
  const pm = project?.projectManager ? allUsers.find(u => u.id === project.projectManager) : null;

  // Internal-user admin banner
  const adminBanner = isInternalUser ? `
    <div class="internal-banner">
      🔒 <strong>Internal View</strong> — You are viewing this as a logged-in Sprout team member. Clients see only the sections you have enabled.
    </div>` : '';

  // ── Section: Milestones ──
  const msSection = sections.milestones ? `
    <section class="hub-section" id="milestones">
      <h2 class="section-title">🏁 Project Milestones</h2>
      <div class="hub-card">
        <div class="progress-header">
          <span class="progress-label">Overall Progress</span>
          <span class="progress-value">${completedCount} / ${MILESTONES.length} &nbsp; ${progress}%</span>
        </div>
        ${progressBar(progress)}
        <div class="ms-list">
          ${MILESTONES.map((m, i) => {
    const done      = !!milestones[m];
    const isCurrent = !done && MILESTONES.slice(0, i).every(pm2 => milestones[pm2]);
    return `
            <div class="ms-row ${done ? 'ms-done' : isCurrent ? 'ms-current' : 'ms-pending'}">
              <div class="ms-check-wrap">
                ${done ? '<span class="ms-check-icon">✓</span>' : isCurrent ? '<span class="ms-cur-icon">▶</span>' : '<span class="ms-pend-icon">○</span>'}
              </div>
              <div class="ms-info">
                <div class="ms-name">${escHtml(m)}</div>
                ${(() => { const a = timeline[m]?.actualDate || (done ? serverToday : ''); return done ? `<div class="ms-date ms-date-actual">Completed: ${fmtDate(a)}</div>` : timeline[m]?.targetDate ? `<div class="ms-date">Target: ${fmtDate(timeline[m].targetDate)}</div>` : ''; })()}
              </div>
              ${done ? `<span class="ms-badge ms-badge-done">Completed</span>` : isCurrent ? `<span class="ms-badge ms-badge-cur">In Progress</span>` : `<span class="ms-badge ms-badge-pend">Pending</span>`}
            </div>`;
  }).join('')}
        </div>
      </div>
    </section>` : '';

  // ── Section: Timeline ──
  const tlSection = sections.timeline ? `
    <section class="hub-section" id="timeline">
      <h2 class="section-title">📅 Project Timeline</h2>
      <div class="hub-card">
        <table class="hub-table">
          <thead>
            <tr><th>#</th><th>Milestone</th><th>Target Date</th><th>Completed On</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${MILESTONES.map((m, i) => {
    const done       = !!milestones[m];
    const target     = timeline[m]?.targetDate;
    const actual     = timeline[m]?.actualDate || (done ? serverToday : '');
    const statusCls  = done ? 'tl-done' : (i === completedCount ? 'tl-cur' : 'tl-pend');
    const statusLbl  = done ? '✓ Done' : (i === completedCount ? '▶ In Progress' : '○ Pending');
    return `
              <tr class="${statusCls}">
                <td>${i + 1}</td>
                <td>${escHtml(m)}</td>
                <td>${fmtDate(target)}</td>
                <td style="${done ? 'color:#16a34a;font-weight:600' : 'color:#9ca3af'}">${done ? fmtDate(actual) : '—'}</td>
                <td><span class="tl-badge tl-badge-${done ? 'done' : i === completedCount ? 'cur' : 'pend'}">${statusLbl}</span></td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
    </section>` : '';

  // ── Section: Documents ──
  const docsSection = sections.documents && salesDocs.length > 0 ? `
    <section class="hub-section" id="documents">
      <h2 class="section-title">📄 Project Documents</h2>
      <div class="hub-card">
        <ul class="hub-link-list">
          ${salesDocs.map(d => `
            <li>
              <a href="${escHtml(d.url)}" target="_blank" rel="noopener">
                <span class="link-icon">📎</span>
                <span class="link-label">${escHtml(d.name || d.url)}</span>
                <span class="link-arrow">↗</span>
              </a>
            </li>`).join('')}
        </ul>
      </div>
    </section>` : (sections.documents ? `
    <section class="hub-section" id="documents">
      <h2 class="section-title">📄 Project Documents</h2>
      <div class="hub-card hub-empty">No documents have been shared yet.</div>
    </section>` : '');

  // ── Section: Recordings (Full access only) ──
  const recSection = sections.recordings && canSee('recordings') ? `
    <section class="hub-section" id="recordings">
      <h2 class="section-title">🎬 Meeting Recordings</h2>
      <div class="hub-card">
        ${recordings.length === 0
    ? '<div class="hub-empty-inner">No recordings have been added yet.</div>'
    : `<ul class="hub-link-list">
            ${recordings.map(r => `
              <li>
                <a href="${escHtml(r.driveUrl)}" target="_blank" rel="noopener">
                  <span class="link-icon">▶️</span>
                  <span class="link-label">${escHtml(r.name)}</span>
                  <span class="link-meta">${fmtDate(r.addedAt)}</span>
                  <span class="link-arrow">↗</span>
                </a>
              </li>`).join('')}
          </ul>`}
      </div>
    </section>` : '';

  // ── Section: Ticketing ──
  const tickSection = sections.ticketing && hub.ticketingUrl ? `
    <section class="hub-section" id="ticketing">
      <h2 class="section-title">🎫 Submit a Ticket</h2>
      <div class="hub-card">
        ${hub.ticketingNote ? `<p style="margin-bottom:16px;color:#4a7a44;font-size:.9rem;line-height:1.55">${escHtml(hub.ticketingNote)}</p>` : ''}
        <a href="${escHtml(hub.ticketingUrl)}" target="_blank" rel="noopener" class="hub-btn-primary">Submit a Ticket ↗</a>
      </div>
    </section>` : '';

  // ── Section: Key Contacts (Full access only) ──
  const pmCard = pm ? `
    <div class="contact-card contact-card-pm">
      <div class="contact-avatar contact-avatar-pm">${(pm.name || '?')[0].toUpperCase()}</div>
      <div class="contact-info">
        <div class="contact-name">${escHtml(pm.name)}</div>
        <div class="contact-meta contact-role-pm">Project Manager</div>
        ${pm.email ? `<a href="mailto:${escHtml(pm.email)}" class="contact-email">${escHtml(pm.email)}</a>` : ''}
      </div>
    </div>` : '';

  const ctcSection = sections.contacts && canSee('contacts') && (pm || contacts.length > 0) ? `
    <section class="hub-section" id="contacts">
      <h2 class="section-title">📞 Key Contacts</h2>
      <div class="hub-card">
        <div class="contact-grid">
          ${pmCard}
          ${contacts.map(c => `
            <div class="contact-card">
              <div class="contact-avatar">${(c.name || '?')[0].toUpperCase()}</div>
              <div class="contact-info">
                <div class="contact-name">${escHtml(c.name)}</div>
                ${c.position ? `<div class="contact-meta">${escHtml(c.position)}</div>` : ''}
                ${c.projectRole ? `<div class="contact-meta" style="color:#8139EE">${escHtml(c.projectRole)}</div>` : ''}
                ${c.email ? `<a href="mailto:${escHtml(c.email)}" class="contact-email">${escHtml(c.email)}</a>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(hub.projectTitle)} — Sprout Resource Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700;800&family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Rubik',sans-serif;background:#F7F9ED;color:#1a2e1a}
    h1,h2,h3,h4,h5,h6{font-family:'Fira Sans',sans-serif}

    /* ── Header ── */
    header{background:linear-gradient(135deg,#092903 0%,#1a6b08 100%);color:#fff;padding:20px 40px;display:flex;align-items:center;gap:18px;box-shadow:0 4px 16px rgba(9,41,3,.35)}
    .logo{height:72px;width:auto;flex-shrink:0;object-fit:contain}
    .header-center{flex:1}
    .header-project{font-size:1.3rem;font-weight:800;line-height:1.2}
    .header-sub{font-size:.82rem;opacity:.75;margin-top:3px}
    .header-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:.78rem;opacity:.8}
    .header-badge{background:rgba(50,206,19,.2);border:1px solid rgba(50,206,19,.4);border-radius:20px;padding:3px 10px;font-size:.72rem;font-weight:700;letter-spacing:.3px;color:#32CE13}

    /* ── Internal banner ── */
    .internal-banner{background:#eafce6;border-bottom:2px solid #32CE13;padding:11px 40px;font-size:.85rem;color:#092903}
    .internal-banner strong{font-weight:700}

    /* ── Nav ── */
    .hub-nav{background:#fff;border-bottom:1px solid #d4e8d0;padding:0 40px;display:flex;gap:0;overflow-x:auto}
    .hub-nav a{display:inline-flex;align-items:center;gap:6px;padding:14px 18px;font-family:'Fira Sans',sans-serif;font-size:.83rem;font-weight:600;color:#5a7a5a;text-decoration:none;border-bottom:2.5px solid transparent;white-space:nowrap;transition:color .15s,border-color .15s}
    .hub-nav a:hover{color:#092903;border-bottom-color:#32CE13}

    /* ── Main layout ── */
    main{max-width:980px;margin:36px auto;padding:0 24px 60px}

    /* ── Section ── */
    .hub-section{margin-bottom:44px}
    .section-title{font-family:'Fira Sans',sans-serif;font-size:.95rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#5a7a5a;margin-bottom:16px;border-left:4px solid #32CE13;padding-left:12px}

    /* ── Card ── */
    .hub-card{background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(9,41,3,.07)}
    .hub-empty{color:#8aaa8a;font-size:.88rem;padding:20px 24px}
    .hub-empty-inner{text-align:center;color:#8aaa8a;font-size:.88rem;padding:16px 0}

    /* ── Project overview ── */
    .overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:0}
    .overview-stat{background:#f5fcf4;border:1px solid #d4e8d0;border-radius:10px;padding:14px 18px}
    .overview-stat-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#5a7a5a;margin-bottom:4px}
    .overview-stat-value{font-size:1.05rem;font-weight:700;color:#092903}

    /* ── Progress bar ── */
    .progress-header{display:flex;justify-content:space-between;margin-bottom:8px}
    .progress-label{font-size:.82rem;color:#5a7a5a}
    .progress-value{font-size:.82rem;font-weight:700;color:#092903}
    .hub-progress-wrap{height:10px;background:#e4f0e4;border-radius:20px;overflow:hidden;margin-bottom:20px}
    .hub-progress-bar{height:100%;background:linear-gradient(90deg,#32CE13,#1a6b08);border-radius:20px;transition:width .4s}

    /* ── Milestones ── */
    .ms-list{display:flex;flex-direction:column;gap:8px}
    .ms-row{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;border:1.5px solid #e4ece4;transition:all .15s}
    .ms-done{background:#f0fdf4;border-color:#86efac}
    .ms-current{background:#fffbeb;border-color:#fcd34d}
    .ms-pending{background:#fafafa;border-color:#e4ece4}
    .ms-check-wrap{width:28px;text-align:center;flex-shrink:0}
    .ms-check-icon{color:#16a34a;font-weight:700;font-size:1rem}
    .ms-cur-icon{color:#d97706;font-size:.9rem}
    .ms-pend-icon{color:#9ca3af;font-size:.85rem}
    .ms-info{flex:1;min-width:0}
    .ms-name{font-size:.88rem;font-weight:600;color:#092903}
    .ms-date{font-size:.74rem;color:#8aaa8a;margin-top:2px}
    .ms-date-actual{font-size:.74rem;color:#16a34a;font-weight:600;margin-top:2px}
    .ms-badge{font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:20px;flex-shrink:0;white-space:nowrap}
    .ms-badge-done{background:#d1fae5;color:#065f46}
    .ms-badge-cur{background:#fef3c7;color:#92400e}
    .ms-badge-pend{background:#f3f4f6;color:#6b7280}

    /* ── Timeline table ── */
    .hub-table{width:100%;border-collapse:collapse;font-size:.85rem}
    .hub-table th{padding:10px 14px;text-align:left;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#5a7a5a;border-bottom:2px solid #e4ece4;background:#f9fdf9}
    .hub-table td{padding:11px 14px;border-bottom:1px solid #f0f5f0;color:#1a2e1a}
    .hub-table tr:last-child td{border-bottom:none}
    .hub-table tr.tl-done td{background:#f0fdf4}
    .hub-table tr.tl-cur td{background:#fffbeb}
    .tl-badge{font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap}
    .tl-badge-done{background:#d1fae5;color:#065f46}
    .tl-badge-cur{background:#fef3c7;color:#92400e}
    .tl-badge-pend{background:#f3f4f6;color:#6b7280}

    /* ── Link list ── */
    .hub-link-list{list-style:none;display:flex;flex-direction:column;gap:6px}
    .hub-link-list li a{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;text-decoration:none;color:#1a6b08;font-weight:500;font-size:.9rem;transition:background .15s;border:1px solid #e4ece4}
    .hub-link-list li a:hover{background:#eafce6;color:#092903}
    .link-icon{font-size:1.1rem;flex-shrink:0}
    .link-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .link-meta{font-size:.74rem;color:#9ab09a;flex-shrink:0}
    .link-arrow{font-size:.85rem;color:#9ab09a;flex-shrink:0}

    /* ── Contacts ── */
    .contact-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
    .contact-card{display:flex;align-items:flex-start;gap:14px;padding:16px;background:#f9fdf9;border:1px solid #e4ece4;border-radius:12px}
    .contact-card-pm{background:#f0fdf4;border:1.5px solid #6ee7b7}
    .contact-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#8139EE,#32CE13);color:#fff;font-family:'Fira Sans',sans-serif;font-size:1rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-transform:uppercase}
    .contact-avatar-pm{background:linear-gradient(135deg,#092903,#1a6b08)}
    .contact-role-pm{color:#065f46;font-weight:700}
    .contact-info{flex:1;min-width:0}
    .contact-name{font-size:.9rem;font-weight:700;color:#092903}
    .contact-meta{font-size:.76rem;color:#5a7a5a;margin-top:2px}
    .contact-email{font-size:.78rem;color:#1a6b08;text-decoration:none;margin-top:4px;display:block;word-break:break-all}
    .contact-email:hover{text-decoration:underline}

    /* ── Button ── */
    .hub-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#092903;color:#32CE13;border-radius:10px;text-decoration:none;font-family:'Fira Sans',sans-serif;font-size:.9rem;font-weight:700;transition:background .2s}
    .hub-btn-primary:hover{background:#1a6b08}

    /* ── Footer ── */
    footer{text-align:center;padding:28px;font-size:.8rem;color:#8aaa8a;border-top:1px solid #d4e8d0}
    .footer-brand{color:#32CE13;font-family:'Fira Sans',sans-serif;font-weight:800}

    @media(max-width:600px){
      header{padding:16px 20px}
      .hub-nav{padding:0 16px}
      main{padding:0 16px 40px}
      .hub-table{font-size:.78rem}
      .hub-table th,.hub-table td{padding:8px 10px}
    }
  </style>
</head>
<body>

<header>
  <img class="logo" src="/Sprout%20Logo.png" alt="Sprout Solutions" />
  <div class="header-center">
    <div class="header-project">${escHtml(hub.projectTitle)}</div>
    <div class="header-sub">Implementation Resource Hub</div>
  </div>
  <div class="header-meta">
    ${pm ? `<span>PM: ${escHtml(pm.name)}</span>` : ''}
    <span>${fmtDate(new Date().toISOString())}</span>
    <span class="header-badge">${progress}% Complete</span>
  </div>
</header>

${adminBanner}

<nav class="hub-nav">
  ${sections.milestones ? '<a href="#milestones">🏁 Milestones</a>' : ''}
  ${sections.timeline   ? '<a href="#timeline">📅 Timeline</a>'     : ''}
  ${sections.documents  ? '<a href="#documents">📄 Documents</a>'   : ''}
  ${sections.recordings && canSee('recordings') ? '<a href="#recordings">🎬 Recordings</a>' : ''}
  ${sections.ticketing && hub.ticketingUrl ? '<a href="#ticketing">🎫 Ticketing</a>' : ''}
  ${sections.contacts && canSee('contacts') && contacts.length > 0 ? '<a href="#contacts">📞 Contacts</a>' : ''}
</nav>

<main>
  <!-- Overview stat bar -->
  <section class="hub-section" style="margin-top:0;margin-bottom:32px">
    <div class="hub-card">
      <div class="overview-grid">
        <div class="overview-stat">
          <div class="overview-stat-label">Project</div>
          <div class="overview-stat-value" style="font-size:.92rem">${escHtml(hub.projectTitle)}</div>
        </div>
        ${pm ? `<div class="overview-stat"><div class="overview-stat-label">Project Manager</div><div class="overview-stat-value" style="font-size:.92rem">${escHtml(pm.name)}</div></div>` : ''}
        <div class="overview-stat">
          <div class="overview-stat-label">Status</div>
          <div class="overview-stat-value" style="font-size:.92rem;text-transform:capitalize">${escHtml(project?.status || '—')}</div>
        </div>
        <div class="overview-stat">
          <div class="overview-stat-label">Milestones Done</div>
          <div class="overview-stat-value">${completedCount} / ${MILESTONES.length}</div>
        </div>
        <div class="overview-stat">
          <div class="overview-stat-label">Overall Progress</div>
          <div class="overview-stat-value" style="color:#16a34a">${progress}%</div>
        </div>
      </div>
    </div>
  </section>

  ${msSection}
  ${tlSection}
  ${docsSection}
  ${recSection}
  ${tickSection}
  ${ctcSection}
</main>

<footer>
  <p><span class="footer-brand">Sprout Solutions</span> &mdash; Implementation Resource Hub &mdash; Data refreshes automatically on every visit.</p>
</footer>

</body>
</html>`;
}

// ── GET /hub/:slug ─────────────────────────────────────────────
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const hub = getHubs().find(h => h.slug === slug);

  if (!hub) return res.status(404).send(build404Html());

  // Internal PMT users get full bypass
  if (req.session.userId) {
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

// ── POST /hub/:slug/verify ─────────────────────────────────────
router.post('/:slug/verify', (req, res) => {
  const { slug }  = req.params;
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.json({ ok: false, error: 'Email is required.' });
  }

  const hub = getHubs().find(h => h.slug === slug);
  if (!hub) return res.json({ ok: false, error: 'Hub not found.' });
  if (!hub.isPublic) return res.json({ ok: false, error: 'This hub is not currently available.' });

  const normalized = email.trim().toLowerCase();
  const entry      = hub.accessList.find(a => a.email.toLowerCase() === normalized);

  if (!entry) {
    return res.json({ ok: false, error: 'This email is not authorized. Please contact your Sprout Solutions project team.' });
  }

  if (!req.session.hubAccess) req.session.hubAccess = {};
  req.session.hubAccess[slug] = {
    email:       normalized,
    accessLevel: entry.accessLevel,
    expiresAt:   Date.now() + HUB_SESSION_TTL,
  };

  res.json({ ok: true, accessLevel: entry.accessLevel });
});

module.exports = router;
