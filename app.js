/* ════════════════════════════════════════════════════════════
   ProManage — Project Management Tool
   Auth & Users → Node.js/Express/SQLite backend
   Projects     → localStorage (client-side)
════════════════════════════════════════════════════════════ */

// ── Milestones ────────────────────────────────────────────────
// Default list — overridden at startup by /api/settings if super_admin has customised them.
let MILESTONES = [
  'Project Team Assignment',
  'KOM or Requirements Alignment',
  'Data Gathering',
  'Simulation I',
  'Training and System Setup',
  'Project Review Checklist',
  'Simulation II / Parallel Run',
  'Pre Handover',
  'Project Handover',
];

// ── Timeline phase/task structure (shared by modal + Excel download) ──
// Each phase maps to one system milestone. Tasks are the standard sub-items.
// indent: 0=task, 1=sub-task, 2=sub-sub-task
const TIMELINE_PHASES = [
  {
    label: 'PHASE 1: KICK OFF MEETING',
    milestone: 'Project Team Assignment',
    tasks: [
      { label: 'Introduction',                  duration: 1,    assignedTo: 'SPROUT' },
      { label: 'Project Timeline',              duration: 1,    assignedTo: 'SPROUT' },
      { label: 'HR Policy Questionnaire',       duration: '',   assignedTo: 'SPROUT AND CLIENT' },
      { label: 'Payroll Policy Questionnaire',  duration: '',   assignedTo: 'SPROUT AND CLIENT' },
    ],
  },
  {
    label: 'PHASE 2: KOM / REQUIREMENTS ALIGNMENT',
    milestone: 'KOM or Requirements Alignment',
    tasks: [
      { label: 'Kickoff Meeting',               duration: '',   assignedTo: 'SPROUT AND CLIENT' },
      { label: 'Requirements Review',           duration: '',   assignedTo: 'SPROUT AND CLIENT' },
      { label: 'Project Charter Sign-off',      duration: '',   assignedTo: 'SPROUT AND CLIENT' },
    ],
  },
  {
    label: 'PHASE 3: DATA GATHERING',
    milestone: 'Data Gathering',
    tasks: [
      { label: 'Account Creation',              duration: 3,    assignedTo: 'SPROUT - HR AND PAYROLL IMPLEMENTER' },
      { label: 'Data Submission',               duration: '',   assignedTo: 'CLIENT' },
      { label: 'Masterfile',                    duration: 4,    assignedTo: 'CLIENT',  indent: 1 },
      { label: 'Payroll Registers',             duration: '',   assignedTo: 'CLIENT',  indent: 1 },
      { label: 'Data Validation',               duration: 2,    assignedTo: 'SPROUT - HR AND PAYROLL IMPLEMENTER' },
      { label: 'Data Migration',                duration: 2,    assignedTo: 'SPROUT - HR IMPLEMENTER' },
    ],
  },
  {
    label: 'PHASE 4: SIMULATION I',
    milestone: 'Simulation I',
    tasks: [
      { label: 'Payroll Simulation (Past Payroll Registers)', duration: 2, assignedTo: 'SPROUT - PAYROLL IMPLEMENTER' },
    ],
  },
  {
    label: 'PHASE 5: TRAINING AND SYSTEM SETUP',
    milestone: 'Training and System Setup',
    tasks: [
      { label: 'Admin Training',                    duration: '',  assignedTo: '' },
      { label: 'Sprout HR',                         duration: '',  assignedTo: '', indent: 1 },
      { label: 'Online Training Videos',            duration: 1,   assignedTo: 'CLIENT', indent: 2 },
      { label: 'Training Test Account',             duration: 1,   assignedTo: 'CLIENT', indent: 2 },
      { label: 'Admin Training',                    duration: 1,   assignedTo: 'SPROUT AND CLIENT', indent: 2 },
      { label: 'Sprout Payroll',                    duration: '',  assignedTo: '', indent: 1 },
      { label: 'Online Training Videos',            duration: 1,   assignedTo: 'CLIENT', indent: 2 },
      { label: 'Training Test Account',             duration: 1,   assignedTo: 'CLIENT', indent: 2 },
      { label: 'Admin Training',                    duration: 1,   assignedTo: 'SPROUT AND CLIENT', indent: 2 },
      { label: 'Sprout ReadyCash',                  duration: '',  assignedTo: '', indent: 1 },
      { label: 'Overview and Training',             duration: 1,   assignedTo: 'SPROUT AND CLIENT', indent: 2 },
      { label: 'Send Parallel Run & Cascade Strategy (Internal)', duration: '', assignedTo: 'Sprout - Project Managers' },
      { label: 'User Cascade',                      duration: '',  assignedTo: '' },
      { label: 'Employees Training',                duration: 3,   assignedTo: 'CLIENT', indent: 1 },
      { label: 'Managers Training',                 duration: '',  assignedTo: 'CLIENT', indent: 1 },
    ],
  },
  {
    label: 'PHASE 6: PROJECT REVIEW',
    milestone: 'Project Review Checklist',
    tasks: [
      { label: 'Sprout HR Project Review Checklist',      duration: 0.5, assignedTo: 'SPROUT AND CLIENT' },
      { label: 'Sprout Payroll Project Review Checklist', duration: 0.5, assignedTo: 'SPROUT AND CLIENT' },
    ],
  },
  {
    label: 'PHASE 7: PARALLEL RUN',
    milestone: 'Simulation II / Parallel Run',
    tasks: [
      { label: 'Cut Off / Payout Period',                   duration: 25, assignedTo: 'CLIENT' },
      { label: 'Timekeeping Validation and Finalization',   duration: 2,  assignedTo: 'CLIENT' },
      { label: 'Payroll Processing and Finalization',       duration: 2,  assignedTo: 'CLIENT' },
      { label: 'Variance Discussion',                       duration: 1,  assignedTo: 'SPROUT AND CLIENT' },
    ],
  },
  {
    label: 'PHASE 8: IMPLEMENTATION SIGN OFF',
    milestone: 'Pre Handover',
    milestone2: 'Project Handover',
    tasks: [
      { label: 'Pre-handover',                  duration: 1,   assignedTo: 'SPROUT AND CLIENT' },
      { label: 'Pre-handover Internal Meeting', duration: 1,   assignedTo: 'SPROUT' },
      { label: 'Project Handover',              duration: 1,   assignedTo: 'SPROUT AND CLIENT' },
    ],
  },
  {
    label: 'PHASE 9: ADOPTION / HYPERCARE',
    milestone: 'Hypercare',
    tasks: [
      { label: 'Transition to Customer Success Manager', duration: '', assignedTo: 'SPROUT' },
    ],
  },
];

// ── Build Timeline Planning rows (modal) ──────────────────────
// Returns HTML string for the Timeline Planning tab.
// Optional `phases` param: if provided, uses custom template phases instead of TIMELINE_PHASES.
function buildPlanningRows(timeline, milestones, isReadOnly, phases) {
  const isCustom = !!phases;
  phases = phases || TIMELINE_PHASES;
  const dateCss = `font-size:.75rem;padding:.22rem .4rem;border:1.5px solid rgba(255,255,255,.4);border-radius:6px;background:rgba(255,255,255,.15);color:#fff;width:120px;color-scheme:dark`;
  let html = '';
  phases.forEach((phase) => {
    // Date storage key: milestone name (built-in) or slugified label (custom)
    const key       = phase.milestone || phase.key || phase.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    const startDate = timeline[key]?.startDate || '';
    const endDate   = timeline[key]?.endDate || timeline[key]?.targetDate || '';
    // Status badges only apply when milestone mapping exists
    let phaseDone = false, isActive = false;
    if (phase.milestone) {
      const done  = !!milestones[phase.milestone];
      const done2 = !phase.milestone2 || !!milestones[phase.milestone2];
      phaseDone   = done && done2;
      const phaseIdx = MILESTONES.indexOf(phase.milestone);
      const prevDone = phaseIdx <= 0 || MILESTONES.slice(0, phaseIdx).every(ms => milestones[ms]);
      isActive = !phaseDone && prevDone;
    }
    const headerBg  = phaseDone ? '#166534' : isActive ? '#065f46' : '#1a6b08';
    const rowBg     = phaseDone ? '#f0fdf4' : isActive ? '#fffbeb' : '#fafafa';
    const statusBadge = phaseDone
      ? `<span style="font-size:.65rem;background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:10px;font-weight:700;white-space:nowrap">✓ Done</span>`
      : isActive
        ? `<span style="font-size:.65rem;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:10px;font-weight:700;white-space:nowrap">▶ Active</span>`
        : '';

    // Phase header row — label | badge | Start date | End date
    html += `<div style="border-radius:8px;overflow:hidden;border:1.5px solid #166534;margin-bottom:.2rem">
      <div style="background:${headerBg};color:#fff;display:grid;grid-template-columns:1fr auto auto auto;gap:.5rem;align-items:center;padding:.55rem .9rem">
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.3px">${phase.label}</span>
        <span>${statusBadge}</span>
        <div style="display:flex;flex-direction:column;gap:1px;align-items:flex-end">
          <span style="font-size:.58rem;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.04em">Start</span>
          <input type="date" class="plan-start" data-milestone="${key}" value="${startDate}"
            ${isReadOnly ? 'disabled' : ''} style="${dateCss}" />
        </div>
        <div style="display:flex;flex-direction:column;gap:1px;align-items:flex-end">
          <span style="font-size:.58rem;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.04em">End</span>
          <input type="date" class="plan-end" data-milestone="${key}" value="${endDate}"
            ${isReadOnly ? 'disabled' : ''} style="${dateCss}" />
        </div>
      </div>`;

    // Sub-task rows
    const taskDateCss = `font-size:.7rem;padding:.2rem .35rem;border:1px solid #c5d8c1;border-radius:5px;background:rgba(255,255,255,.92);color:#374151;width:100px`;
    phase.tasks.forEach((task, ti) => {
      const indent = task.indent || 0;
      const pl     = 14 + indent * 18;
      const isHdr  = !task.duration && !task.assignedTo;

      if (isCustom) {
        // Custom template: centered assignedTo + per-task Start/End date inputs
        const taskKey  = key + '_t' + ti;
        const tStart   = timeline[taskKey]?.startDate || '';
        const tEnd     = timeline[taskKey]?.endDate || timeline[taskKey]?.targetDate || '';
        html += `<div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:.4rem;align-items:center;padding:.3rem .9rem .3rem ${pl}px;background:${rowBg};border-top:1px solid #e4ece4">
          <span style="font-size:.77rem;font-weight:${isHdr?'600':'400'};color:${isHdr?'#166534':'#374151'}">${task.label}</span>
          ${task.assignedTo ? `<span style="font-size:.63rem;background:#e4ece4;color:#374151;padding:1px 7px;border-radius:8px;white-space:nowrap;max-width:170px;overflow:hidden;text-overflow:ellipsis;text-align:center">${task.assignedTo}</span>` : '<span></span>'}
          ${task.duration !== '' && task.duration != null ? `<span style="font-size:.68rem;color:#6b7280;white-space:nowrap">${task.duration}d</span>` : '<span></span>'}
          <input type="date" class="plan-start" data-milestone="${taskKey}" value="${tStart}" ${isReadOnly ? 'disabled' : ''} style="${taskDateCss}" />
          <input type="date" class="plan-end" data-milestone="${taskKey}" value="${tEnd}" ${isReadOnly ? 'disabled' : ''} style="${taskDateCss}" />
        </div>`;
      } else {
        // Built-in template: display-only
        html += `<div style="display:flex;align-items:center;gap:.5rem;padding:.28rem .9rem .28rem ${pl}px;background:${rowBg};border-top:1px solid #e4ece4">
          <span style="font-size:.77rem;font-weight:${isHdr?'600':'400'};color:${isHdr?'#166534':'#374151'};flex:1">${task.label}</span>
          ${task.duration !== '' && task.duration != null ? `<span style="font-size:.68rem;color:#6b7280;white-space:nowrap">${task.duration}d</span>` : ''}
          ${task.assignedTo ? `<span style="font-size:.65rem;background:#e4ece4;color:#374151;padding:1px 6px;border-radius:8px;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis">${task.assignedTo}</span>` : ''}
        </div>`;
      }
    });

    html += `</div>`;
  });

  // Only add uncovered system milestones for the built-in template
  if (!isCustom) {
    const coveredMs = new Set(phases.flatMap(ph => [ph.milestone, ph.milestone2].filter(Boolean)));
    MILESTONES.forEach((m) => {
      if (coveredMs.has(m)) return;
      const startDate = timeline[m]?.startDate || '';
      const endDate   = timeline[m]?.endDate || timeline[m]?.targetDate || '';
      html += `<div style="display:grid;grid-template-columns:1fr 130px 130px;gap:.5rem;align-items:center;padding:.5rem .9rem;border-radius:8px;border:1.5px solid var(--border);background:var(--bg)">
        <span style="font-size:.85rem;font-weight:500">${m}</span>
        <div style="display:flex;flex-direction:column;gap:1px">
          <span style="font-size:.6rem;color:var(--txt-muted);text-transform:uppercase">Start</span>
          <input type="date" class="plan-start" data-milestone="${m}" value="${startDate}"
            ${isReadOnly ? 'disabled' : ''}
            style="font-size:.8rem;padding:.3rem .5rem;border:1.5px solid var(--border);border-radius:6px;background:${isReadOnly?'#f8f8f8':'var(--surface)'};color:var(--txt);width:100%" />
        </div>
        <div style="display:flex;flex-direction:column;gap:1px">
          <span style="font-size:.6rem;color:var(--txt-muted);text-transform:uppercase">End</span>
          <input type="date" class="plan-end" data-milestone="${m}" value="${endDate}"
            ${isReadOnly ? 'disabled' : ''}
            style="font-size:.8rem;padding:.3rem .5rem;border:1.5px solid var(--border);border-radius:6px;background:${isReadOnly?'#f8f8f8':'var(--surface)'};color:var(--txt);width:100%" />
        </div>
      </div>`;
    });
  }

  return html;
}

// ── Sync custom template phase dates → system milestone targets ─
// For custom templates (no milestone mapping), copy each phase's last task
// end date to the corresponding system milestone by index so Progress
// Tracking can show the correct Target date.
function syncTemplateToMilestones(updatedTimeline, phases) {
  if (!phases) return; // built-in template — milestone keys already match
  phases.forEach((phase, idx) => {
    if (phase.milestone) return; // has explicit mapping — already handled
    const phaseKey = phase.key || phase.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    // Start from last task and find the most recent end date entered
    let lastEnd = updatedTimeline[phaseKey]?.endDate || updatedTimeline[phaseKey]?.targetDate || '';
    for (let ti = (phase.tasks || []).length - 1; ti >= 0; ti--) {
      const tk = phaseKey + '_t' + ti;
      const te = updatedTimeline[tk]?.endDate || updatedTimeline[tk]?.targetDate || '';
      if (te) { lastEnd = te; break; }
    }
    // Also grab the phase start date
    const phaseStart = updatedTimeline[phaseKey]?.startDate || '';
    // Write to corresponding system milestone so Progress Tracking sees it
    const sysMs = MILESTONES[idx];
    if (sysMs && (lastEnd || phaseStart)) {
      updatedTimeline[sysMs] = {
        ...(updatedTimeline[sysMs] || {}),
        ...(phaseStart ? { startDate: phaseStart } : {}),
        ...(lastEnd    ? { endDate: lastEnd, targetDate: lastEnd } : {}),
      };
    }
  });
}

// ── Parse uploaded Excel file into timeline template phases ───
function parseTimelineTemplateFile(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb     = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const phases = [];
      let current  = null;
      for (let i = 1; i < rows.length; i++) {  // skip header row
        const row  = rows[i];
        const type = String(row[0] || '').trim().toUpperCase();
        const lbl  = String(row[1] || '').trim();
        if (!lbl) continue;
        if (type === 'PHASE') {
          current = {
            label: lbl,
            key:   lbl.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''),
            tasks: [],
          };
          phases.push(current);
        } else if (current) {
          current.tasks.push({
            label:      lbl,
            indent:     parseInt(row[2]) || 0,
            duration:   (row[3] !== '' && row[3] != null) ? row[3] : '',
            assignedTo: String(row[4] || '').trim(),
          });
        }
      }
      callback(null, phases);
    } catch (err) {
      callback(err, []);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Download the blank Excel import format for admins ─────────
function downloadTimelineTemplateFormat() {
  const data = [
    ['ROW_TYPE', 'LABEL', 'INDENT (0/1/2)', 'DURATION (DAYS)', 'ASSIGNED TO', 'TARGET START DATE', 'TARGET END DATE', 'STATUS', 'REMARKS'],
    ['PHASE', 'PHASE 1: KICK OFF MEETING', '', '', '', '', '', '', ''],
    ['TASK', 'Introduction', '0', '1', 'SPROUT', '', '', 'NOT STARTED', ''],
    ['TASK', 'Project Timeline', '0', '1', 'SPROUT', '', '', 'NOT STARTED', ''],
    ['TASK', 'HR Policy Questionnaire', '0', '', 'SPROUT AND CLIENT', '', '', 'NOT STARTED', ''],
    ['PHASE', 'PHASE 2: DATA GATHERING', '', '', '', '', '', '', ''],
    ['TASK', 'Account Creation', '0', '3', 'SPROUT', '', '', 'NOT STARTED', ''],
    ['TASK', 'Data Submission', '0', '', 'CLIENT', '', '', 'NOT STARTED', ''],
    ['TASK', 'Masterfile', '1', '4', 'CLIENT', '', '', 'NOT STARTED', ''],
    ['TASK', 'Payroll Registers', '1', '', 'CLIENT', '', '', 'NOT STARTED', ''],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 45 }, { wch: 16 }, { wch: 16 }, { wch: 30 },
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 28 },
  ];
  // Dropdown validation on column H (STATUS) for all data rows
  ws['!dataValidation'] = [{
    sqref: 'H2:H1000',
    type: 'list',
    formula1: '"NOT STARTED,COMPLETED,ONGOING"',
    showDropDown: false,
  }];
  XLSX.utils.book_append_sheet(wb, ws, 'Import Format');
  XLSX.writeFile(wb, 'timeline-template-import-format.xlsx');
}

// ── Add Timeline Template modal ───────────────────────────────
function openAddTimelineTemplateModal(onSaved) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:520px;width:96%">
      <h3 style="margin-bottom:1rem">&#128203; Add Timeline Template</h3>

      <div style="margin-bottom:1rem">
        <label style="display:block;font-size:.84rem;font-weight:600;margin-bottom:.4rem;color:var(--txt)">Template Name</label>
        <input type="text" id="atpl-name" placeholder="e.g. Light Package Implementation"
          style="width:100%;padding:.45rem .75rem;border:1.5px solid var(--border);border-radius:7px;font-size:.9rem;background:var(--bg);color:var(--txt);box-sizing:border-box" />
      </div>

      <div style="margin-bottom:1rem">
        <label style="display:block;font-size:.84rem;font-weight:600;margin-bottom:.5rem;color:var(--txt)">Structure Source</label>
        <div style="display:flex;gap:.5rem">
          <label id="atpl-src-upload-lbl" style="display:flex;align-items:center;gap:.4rem;cursor:pointer;padding:.45rem .75rem;border:1.5px solid var(--primary);border-radius:7px;flex:1;font-size:.83rem;background:#f0fdf4">
            <input type="radio" name="atpl-source" value="upload" checked style="accent-color:var(--primary)" />
            &#128196; Upload Excel File
          </label>
          <label id="atpl-src-copy-lbl" style="display:flex;align-items:center;gap:.4rem;cursor:pointer;padding:.45rem .75rem;border:1.5px solid var(--border);border-radius:7px;flex:1;font-size:.83rem">
            <input type="radio" name="atpl-source" value="copy" style="accent-color:var(--primary)" />
            &#128260; Copy Built-in Standard
          </label>
        </div>
      </div>

      <div id="atpl-upload-section">
        <div style="border:2px dashed var(--border);border-radius:8px;padding:1rem;text-align:center;margin-bottom:.6rem;background:var(--surface)">
          <div style="font-size:.8rem;color:var(--txt-muted);margin-bottom:.5rem">Upload an Excel (.xlsx) file using the import format.</div>
          <input type="file" id="atpl-file-input" accept=".xlsx,.xls" style="display:none" />
          <button class="btn btn-ghost btn-sm" id="atpl-file-browse">&#128193; Choose File</button>
          <span id="atpl-file-name" style="font-size:.82rem;color:var(--txt-muted);margin-left:.5rem">No file selected</span>
        </div>
        <div id="atpl-preview" style="display:none;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.75rem;font-size:.82rem;max-height:160px;overflow-y:auto"></div>
      </div>

      <div id="atpl-copy-section" style="display:none;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.75rem;font-size:.82rem;color:var(--txt-muted)">
        Creates a copy of the Standard Payroll Implementation template (${TIMELINE_PHASES.length} phases). The structure is copied as-is — rename it to differentiate from the built-in.
      </div>

      <div id="atpl-error" style="display:none;color:#dc2626;font-size:.82rem;margin-top:.5rem;padding:.4rem .6rem;background:#fef2f2;border-radius:6px"></div>

      <div class="modal-actions" style="margin-top:1.25rem">
        <button class="btn btn-ghost" id="atpl-cancel">Cancel</button>
        <button class="btn btn-primary" id="atpl-save" disabled>Save Template</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  let parsedPhases = null;

  function updateSaveBtn() {
    const hasName   = backdrop.querySelector('#atpl-name').value.trim().length > 0;
    const hasPhases = !!parsedPhases;
    backdrop.querySelector('#atpl-save').disabled = !(hasName && hasPhases);
  }

  // Radio source toggle
  backdrop.querySelectorAll('input[name="atpl-source"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isUpload = radio.value === 'upload';
      backdrop.querySelector('#atpl-upload-section').style.display = isUpload ? 'block' : 'none';
      backdrop.querySelector('#atpl-copy-section').style.display   = isUpload ? 'none'  : 'block';
      backdrop.querySelector('#atpl-src-upload-lbl').style.borderColor = isUpload ? 'var(--primary)' : 'var(--border)';
      backdrop.querySelector('#atpl-src-upload-lbl').style.background  = isUpload ? '#f0fdf4' : 'transparent';
      backdrop.querySelector('#atpl-src-copy-lbl').style.borderColor   = isUpload ? 'var(--border)' : 'var(--primary)';
      backdrop.querySelector('#atpl-src-copy-lbl').style.background    = isUpload ? 'transparent' : '#f0fdf4';
      if (!isUpload) {
        // Copy built-in
        parsedPhases = TIMELINE_PHASES.map(p => ({
          label:      p.label,
          key:        (p.milestone || p.label).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''),
          milestone:  p.milestone,
          milestone2: p.milestone2,
          tasks:      p.tasks.map(t => ({ ...t })),
        }));
      } else {
        parsedPhases = null;
      }
      updateSaveBtn();
    });
  });

  // File browse
  backdrop.querySelector('#atpl-file-browse').addEventListener('click', () => backdrop.querySelector('#atpl-file-input').click());

  // File selected → parse
  backdrop.querySelector('#atpl-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    backdrop.querySelector('#atpl-file-name').textContent = file.name;
    parseTimelineTemplateFile(file, (err, phases) => {
      const preview = backdrop.querySelector('#atpl-preview');
      preview.style.display = 'block';
      if (err || !phases.length) {
        preview.innerHTML = '<span style="color:#dc2626">&#9888; Could not parse file. Make sure it matches the Import Format (ROW_TYPE column = PHASE or TASK).</span>';
        parsedPhases = null;
        updateSaveBtn();
        return;
      }
      parsedPhases = phases;
      const taskCount = phases.reduce((acc, p) => acc + p.tasks.length, 0);
      preview.innerHTML = `
        <div style="font-weight:600;color:#059669;margin-bottom:.5rem">&#10003; Parsed successfully: ${phases.length} phases, ${taskCount} tasks</div>
        ${phases.map(p => `<div style="font-size:.8rem;margin-bottom:.15rem"><span style="font-weight:600;color:var(--txt)">${p.label}</span> <span style="color:var(--txt-muted)">&nbsp;${p.tasks.length} tasks</span></div>`).join('')}
      `;
      updateSaveBtn();
    });
  });

  // Name input → re-check save btn
  backdrop.querySelector('#atpl-name').addEventListener('input', updateSaveBtn);

  // Cancel
  backdrop.querySelector('#atpl-cancel').addEventListener('click', () => backdrop.remove());

  // Save
  backdrop.querySelector('#atpl-save').addEventListener('click', async () => {
    const name    = backdrop.querySelector('#atpl-name').value.trim();
    const nameInp = backdrop.querySelector('#atpl-name');
    if (!name) {
      nameInp.style.borderColor = '#dc2626';
      nameInp.focus();
      const errEl = backdrop.querySelector('#atpl-error');
      errEl.style.display = 'block';
      errEl.textContent   = 'Please enter a template name before saving.';
      return;
    }
    nameInp.style.borderColor = '';
    if (!parsedPhases) return;
    const saveBtn = backdrop.querySelector('#atpl-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const res = await fetch('/api/timeline-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, phases: parsedPhases }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchTimelineTemplates();
      backdrop.remove();
      onSaved();
    } catch (err) {
      const errEl = backdrop.querySelector('#atpl-error');
      errEl.style.display  = 'block';
      errEl.textContent    = 'Save failed: ' + err.message;
      saveBtn.disabled     = false;
      saveBtn.textContent  = 'Save Template';
    }
  });
}

// ── MULTI-SELECT HELPER (shared) ──────────────────────────────
// items: array of {value, label} or plain strings
function buildMultiSelect(id, baseLabel, items) {
  const opts = items.map(i => typeof i === 'string' ? { value: i, label: i } : i);
  return `
    <div class="ms-wrap" id="${id}-wrap" style="position:relative">
      <button type="button" class="ms-btn" id="${id}-btn"
        style="padding:.4rem .75rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt);cursor:pointer;display:flex;align-items:center;gap:.4rem;white-space:nowrap;min-width:150px;justify-content:space-between">
        <span id="${id}-label">All ${baseLabel}</span><span style="font-size:.7rem">&#9660;</span>
      </button>
      <div id="${id}-dropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:999;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-lg);min-width:200px;padding:.4rem 0">
        <div style="max-height:220px;overflow-y:auto">
          ${opts.map(o => `
            <label style="display:flex;align-items:center;gap:.5rem;padding:.35rem .8rem;font-size:.82rem;cursor:pointer;white-space:nowrap">
              <input type="checkbox" class="ms-cb" data-filter="${id}" value="${o.value}" style="accent-color:var(--primary)">
              ${o.label}
            </label>`).join('')}
        </div>
        <div style="padding:.4rem .8rem;border-top:1px solid var(--border);margin-top:.2rem">
          <button type="button" class="ms-done btn btn-primary btn-sm" data-filter="${id}" style="width:100%;font-size:.8rem">Done</button>
        </div>
      </div>
    </div>`;
}

function getMultiChecked(id) {
  return [...document.querySelectorAll(`.ms-cb[data-filter="${id}"]:checked`)].map(c => c.value);
}

function wireMultiSelects(ids, baseLabels, onChange) {
  const closeAll = () => ids.forEach(id => {
    const d = document.getElementById(`${id}-dropdown`);
    if (d) d.style.display = 'none';
  });

  ids.forEach(id => {
    const btn      = document.getElementById(`${id}-btn`);
    const dropdown = document.getElementById(`${id}-dropdown`);
    if (!btn || !dropdown) return;
    btn.dataset.base = baseLabels[id] || '';

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';
      closeAll();
      dropdown.style.display = isOpen ? 'none' : 'block';
    });
    dropdown.addEventListener('change', e => {
      if (e.target.classList.contains('ms-cb')) {
        updateMultiLabel(id, baseLabels[id]);
        onChange();
      }
    });
    dropdown.querySelector('.ms-done').addEventListener('click', e => {
      e.stopPropagation();
      dropdown.style.display = 'none';
    });
    dropdown.addEventListener('click', e => e.stopPropagation());
  });

  document.addEventListener('click', closeAll);
}

function updateMultiLabel(id, base) {
  const checked = getMultiChecked(id);
  const lbl = document.getElementById(`${id}-label`);
  if (!lbl) return;
  lbl.textContent = checked.length === 0 ? `All ${base}` : checked.length === 1 ? checked[0] : `${checked.length} selected`;
}

// ── RISK ENGINE (rule-based, no API) ─────────────────────────
function computeProjectRisk(p) {
  if (p.status === 'completed' || p.status === 'churn') return { level: 'on-track', reasons: [] };
  const today  = new Date().toISOString().slice(0, 10);
  const reasons = [];

  // Overdue: past due date and not done
  if (p.dueDate && p.dueDate < today) {
    const days = Math.floor((new Date(today) - new Date(p.dueDate)) / 86400000);
    reasons.push(`Overdue by ${days} day${days !== 1 ? 's' : ''}`);
  }

  // Overdue milestones (target passed, not completed)
  const timeline = p.timeline || {};
  const milestones = p.milestones || {};
  const overdueMs = MILESTONES.filter(m =>
    !milestones[m] && timeline[m]?.targetDate && timeline[m].targetDate < today
  );
  if (overdueMs.length) {
    reasons.push(`${overdueMs.length} overdue milestone${overdueMs.length > 1 ? 's' : ''}`);
  }

  if (reasons.length >= 1) return { level: 'critical', reasons };

  // At Risk: due within 14 days and < 60% done
  const progress = getMilestoneProgress(p);
  if (p.dueDate) {
    const daysLeft = Math.floor((new Date(p.dueDate) - new Date(today)) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 14 && progress < 60) {
      reasons.push(`Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}, ${progress}% done`);
      return { level: 'at-risk', reasons };
    }
    if (daysLeft >= 0 && daysLeft <= 7) {
      reasons.push(`Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`);
      return { level: 'at-risk', reasons };
    }
  }

  // At Risk: on-hold status
  if (p.status === 'on-hold' || p.status === 'on-hold-sales') {
    reasons.push('Project on hold');
    return { level: 'at-risk', reasons };
  }

  return { level: 'on-track', reasons: [] };
}

function riskBadge(p) {
  if (!can('view_admin_dashboard')) return '';
  const { level, reasons } = computeProjectRisk(p);
  if (level === 'on-track') return '';
  const icon  = level === 'critical' ? '⚠️' : '⚡';
  const label = level === 'critical' ? 'Critical' : 'At Risk';
  const tip   = reasons.join(' · ');
  return `<span class="risk-badge ${level}" title="${tip}">${icon} ${label}</span>`;
}

// ── SMART ALERTS ──────────────────────────────────────────────
function getSmartAlerts() {
  const projects = getProjects();
  const today    = new Date().toISOString().slice(0, 10);
  const alerts   = { critical: [], atRisk: [], upcoming: [] };

  projects.forEach(p => {
    if (p.status === 'completed' || p.status === 'churn') return;
    const { level, reasons } = computeProjectRisk(p);

    if (level === 'critical') {
      alerts.critical.push({ id: p.id, title: p.title, sub: reasons.join(' · ') });
    } else if (level === 'at-risk') {
      alerts.atRisk.push({ id: p.id, title: p.title, sub: reasons.join(' · ') });
    }

    // Upcoming milestones in the next 7 days
    const timeline = p.timeline || {};
    const milestones = p.milestones || {};
    MILESTONES.forEach(m => {
      if (milestones[m]) return; // already done
      const target = timeline[m]?.targetDate;
      if (!target) return;
      const daysLeft = Math.floor((new Date(target) - new Date(today)) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        alerts.upcoming.push({
          id:    p.id,
          title: p.title,
          sub:   `"${m}" due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        });
      }
    });
  });

  return alerts;
}

// ── NOTIFICATION BELL ─────────────────────────────────────────
function renderNotifBell() {
  const el = document.getElementById('notif-bell');
  if (!el) return;

  // Only super_admin and lead
  if (!can('view_admin_dashboard')) { el.innerHTML = ''; return; }

  const alerts = getSmartAlerts();
  const count  = alerts.critical.length + alerts.atRisk.length;

  el.innerHTML = `
    <button class="notif-bell-btn${count === 0 ? ' no-alerts' : ''}" id="notif-bell-btn" title="${count > 0 ? count + ' alert' + (count !== 1 ? 's' : '') : 'No alerts'}">
      🔔
      ${count > 0 ? `<span class="notif-badge">${count > 9 ? '9+' : count}</span>` : ''}
    </button>`;

  document.getElementById('notif-bell-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleNotifPanel(alerts);
  });
}

let _notifPanelOpen = false;

function toggleNotifPanel(alerts) {
  let panel = document.getElementById('notif-panel');
  if (panel) {
    panel.classList.remove('open');
    setTimeout(() => panel.remove(), 260);
    _notifPanelOpen = false;
    return;
  }

  _notifPanelOpen = true;
  panel = document.createElement('div');
  panel.id        = 'notif-panel';
  panel.className = 'notif-panel';

  const allEmpty = !alerts.critical.length && !alerts.atRisk.length && !alerts.upcoming.length;

  panel.innerHTML = `
    <div class="notif-panel-header">
      <span class="notif-panel-title">🔔 Smart Alerts</span>
      <button class="notif-panel-close" id="notif-close-btn">✕</button>
    </div>
    <div class="notif-panel-body" id="notif-panel-body">
      ${allEmpty ? `
        <div class="notif-empty">
          <div style="font-size:2rem">✅</div>
          <div>Everything looks good!<br>No alerts right now.</div>
        </div>` : `
        ${alerts.critical.length ? `
          <div class="notif-section-label">🔴 Critical (${alerts.critical.length})</div>
          ${alerts.critical.map(a => `
            <div class="notif-item" data-project-id="${a.id}">
              <span class="notif-dot critical"></span>
              <div class="notif-item-text">
                <strong>${a.title}</strong>
                <div class="notif-item-sub">${a.sub}</div>
              </div>
            </div>`).join('')}` : ''}
        ${alerts.atRisk.length ? `
          <div class="notif-section-label">🟡 At Risk (${alerts.atRisk.length})</div>
          ${alerts.atRisk.map(a => `
            <div class="notif-item" data-project-id="${a.id}">
              <span class="notif-dot at-risk"></span>
              <div class="notif-item-text">
                <strong>${a.title}</strong>
                <div class="notif-item-sub">${a.sub}</div>
              </div>
            </div>`).join('')}` : ''}
        ${alerts.upcoming.length ? `
          <div class="notif-section-label">🔵 Upcoming Milestones (${alerts.upcoming.length})</div>
          ${alerts.upcoming.map(a => `
            <div class="notif-item" data-project-id="${a.id}">
              <span class="notif-dot upcoming"></span>
              <div class="notif-item-text">
                <strong>${a.title}</strong>
                <div class="notif-item-sub">${a.sub}</div>
              </div>
            </div>`).join('')}` : ''}
      `}
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('open'));

  document.getElementById('notif-close-btn').addEventListener('click', () => {
    panel.classList.remove('open');
    setTimeout(() => panel.remove(), 260);
    _notifPanelOpen = false;
  });

  // Click on a project alert → navigate to it
  panel.querySelectorAll('.notif-item[data-project-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.projectId;
      panel.classList.remove('open');
      setTimeout(() => panel.remove(), 260);
      _notifPanelOpen = false;
      navigate(can('view_all_projects') ? 'projects' : 'my-projects');
    });
  });

  // Click outside closes panel
  setTimeout(() => {
    document.addEventListener('click', function outsideClick(e) {
      if (!panel.contains(e.target) && e.target.id !== 'notif-bell-btn') {
        panel.classList.remove('open');
        setTimeout(() => panel.remove(), 260);
        _notifPanelOpen = false;
        document.removeEventListener('click', outsideClick);
      }
    });
  }, 50);
}

// ── ANNOUNCEMENT BANNER ───────────────────────────────────────
function announcementBannerHtml() {
  if (!cachedAnnouncements || cachedAnnouncements.length === 0) return '';
  const dismissed = JSON.parse(sessionStorage.getItem('pmt_dismissed_announcements') || '[]');
  const visible   = cachedAnnouncements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return '';

  const items = visible.map(a => {
    const expiry = a.expiresAt
      ? `<span style="font-size:.75rem;opacity:.8;margin-left:.5rem">&#128337; Until ${new Date(a.expiresAt).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>`
      : '';
    return `
      <div class="announcement-item" data-id="${a.id}">
        <div class="announcement-body">
          <div class="announcement-title">&#128226; ${a.title}${expiry}</div>
          <div class="announcement-message">${a.message}</div>
          <div class="announcement-meta">Posted by ${a.createdByName} &middot; ${new Date(a.createdAt).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <button class="announcement-dismiss" data-id="${a.id}" title="Dismiss">&#10005;</button>
      </div>`;
  }).join('');

  return `<div class="announcement-banner" id="announcement-banner">${items}</div>`;
}

function attachAnnouncementDismiss(container) {
  container.querySelectorAll('.announcement-dismiss').forEach(btn => {
    btn.addEventListener('click', () => {
      const id       = btn.dataset.id;
      const dismissed = JSON.parse(sessionStorage.getItem('pmt_dismissed_announcements') || '[]');
      dismissed.push(id);
      sessionStorage.setItem('pmt_dismissed_announcements', JSON.stringify(dismissed));
      btn.closest('.announcement-item').remove();
      const banner = document.getElementById('announcement-banner');
      if (banner && banner.querySelectorAll('.announcement-item').length === 0) banner.remove();
    });
  });
}

// ── DAILY BRIEFING CARD ───────────────────────────────────────
async function renderDailyBriefingCard(container, projects, stats) {
  if (!container) return;
  if (!can('view_admin_dashboard')) return; // super_admin + lead only

  const todayKey     = 'sidekick_briefing_'   + new Date().toISOString().slice(0, 10);
  const collapsedKey = 'sidekick_briefing_col';
  const cached       = sessionStorage.getItem(todayKey);
  const isCollapsed  = localStorage.getItem(collapsedKey) === 'true';

  const card = document.createElement('div');
  card.className = 'briefing-card' + (isCollapsed ? ' collapsed' : '');
  card.innerHTML = `
    <button class="briefing-toggle-btn" id="briefing-toggle">${isCollapsed ? '▼ Show' : '▲ Hide'}</button>
    <img src="/Sidekick.png" class="briefing-logo" alt="Sidekick">
    <div class="briefing-body">
      <div class="briefing-label">⚡ Sidekick Daily Briefing</div>
      <div class="briefing-collapse-body">
        <div class="briefing-text" id="briefing-text">
          <div class="briefing-skeleton">
            <span style="width:90%"></span>
            <span style="width:75%"></span>
            <span style="width:60%"></span>
          </div>
        </div>
        <div class="briefing-date" id="briefing-date"></div>
      </div>
    </div>`;

  const pageHeader = container.querySelector('.page-header');
  if (pageHeader) pageHeader.after(card);
  else container.prepend(card);

  document.getElementById('briefing-toggle').addEventListener('click', () => {
    const collapsed = card.classList.toggle('collapsed');
    document.getElementById('briefing-toggle').textContent = collapsed ? '▼ Show' : '▲ Hide';
    localStorage.setItem(collapsedKey, collapsed ? 'true' : 'false');
  });

  const textEl = document.getElementById('briefing-text');
  const dateEl = document.getElementById('briefing-date');

  const showBriefing = text => {
    textEl.textContent = text;
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  };

  // ── RULE-BASED BRIEFING (no API) ─────────────────────────────
  // To switch back to AI-generated briefing, replace this block with
  // the commented-out fetch call below and restart the server.
  const today      = new Date().toISOString().slice(0, 10);
  const ongoing    = projects.filter(p => p.status === 'ongoing').length;
  const overdue    = projects.filter(p => p.dueDate && p.dueDate < today && p.status !== 'completed' && p.status !== 'churn').length;
  const upcomingMs = projects.reduce((count, p) => {
    const timeline = p.timeline || {};
    const milestones = p.milestones || {};
    return count + MILESTONES.filter(m => {
      if (milestones[m]) return false;
      const t = timeline[m]?.targetDate;
      if (!t) return false;
      const days = Math.floor((new Date(t) - new Date(today)) / 86400000);
      return days >= 0 && days <= 7;
    }).length;
  }, 0);

  let briefing = `${stats.total || projects.length} projects in the portfolio`;
  if (ongoing)    briefing += ` — ${ongoing} ongoing`;
  if (overdue)    briefing += `, ${overdue} overdue`;
  if (upcomingMs) briefing += `, ${upcomingMs} milestone${upcomingMs !== 1 ? 's' : ''} due this week`;
  briefing += '.';

  showBriefing(briefing);

  // ── TO RE-ENABLE AI BRIEFING ─────────────────────────────────
  // 1. Delete the rule-based block above (from "const today" to showBriefing(briefing))
  // 2. Uncomment the block below
  // 3. Run: pm2 restart sprout-pmt
  //
  // if (cached) { showBriefing(cached); return; }
  // try {
  //   const res  = await fetch('/api/ai/briefing', {
  //     method: 'POST', headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ projects, stats }),
  //   });
  //   const data = await res.json();
  //   if (data.briefing) {
  //     showBriefing(data.briefing);
  //     sessionStorage.setItem(todayKey, data.briefing);
  //   } else { card.remove(); }
  // } catch { card.remove(); }
}

function getMilestoneProgress(p) {
  if (!p.milestones) return p.progress || 0;
  const completed = MILESTONES.filter(m => p.milestones[m]).length;
  return Math.round((completed / MILESTONES.length) * 100);
}

function getCurrentMilestone(p) {
  if (!p.milestones) return MILESTONES[0];
  return MILESTONES.find(m => !p.milestones[m]) || null;
}

// ── Seed Projects (localStorage) ─────────────────────────────
const SEED_PROJECTS = [
  {
    id: 'p1', title: 'Website Redesign', description: 'Full redesign of the company website with modern UI/UX.',
    status: 'in-progress', priority: 'high', assignedTo: ['u2', 'u3'],
    dueDate: '2026-04-15', progress: 45, createdBy: 'u1',
  },
  {
    id: 'p2', title: 'Mobile App MVP', description: 'Build the MVP for our mobile application.',
    status: 'planning', priority: 'high', assignedTo: ['u2'],
    dueDate: '2026-06-01', progress: 10, createdBy: 'u1',
  },
  {
    id: 'p3', title: 'Internal Dashboard', description: 'Analytics dashboard for internal reporting.',
    status: 'completed', priority: 'medium', assignedTo: ['u3'],
    dueDate: '2026-02-28', progress: 100, createdBy: 'u1',
  },
];

// ── Storage (projects only) ───────────────────────────────────
const DB = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

function initProjects() {
  // Seed only if server has no projects and localStorage has no projects (fresh install)
  if (_projectsCache.length === 0 && !DB.get('pmt_initialized', false)) {
    saveProjects(SEED_PROJECTS);
    DB.set('pmt_initialized', true);
  }
}

// ── Audit Trail logger (client-side events → server) ──────────
async function logAudit(action, details, meta = {}) {
  try {
    await fetch('/api/audit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, details, meta }),
    });
  } catch (e) { /* silent — audit logging should never break the app */ }
}

// ── Server-backed project cache ───────────────────────────────
// getProjects() and saveProjects() remain synchronous so all existing
// call sites work unchanged. The cache mirrors pmt-projects.json on the server.
let _projectsCache = [];

function getProjects() { return _projectsCache; }

function saveProjects(list) {
  _projectsCache = list;
  fetch('/api/projects', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(list),
  }).catch(err => console.error('[PMT] Failed to persist projects to server:', err));
}

async function fetchProjects() {
  try {
    const res = await fetch('/api/projects');
    if (res.ok) _projectsCache = await res.json();
  } catch (e) { _projectsCache = []; }
}

async function migrateProjectsFromLocalStorage() {
  if (_projectsCache.length > 0) return; // server already has data — nothing to do

  const local = DB.get('pmt_projects', null);
  if (!local) return; // localStorage also empty — fresh install, seed handled below

  try {
    const res = await fetch('/api/projects/migrate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(local),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.migrated) {
        _projectsCache = local;
        // Clear the localStorage copy now that server is the source of truth
        localStorage.removeItem('pmt_projects');
        localStorage.removeItem('pmt_initialized');
        console.log(`[PMT] Migrated ${data.count} projects from localStorage to server.`);
      }
    }
  } catch (e) { console.error('[PMT] Migration failed:', e); }
}
function getHSMappings()  { return DB.get('pmt_hs_mappings', {}); }
function saveHSMappings(m){ DB.set('pmt_hs_mappings', m); }

// ── App Settings (API, cached) ────────────────────────────────
let appSettings = { timerPopupEnabled: true };

async function fetchAppSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      appSettings = await res.json();
      if (Array.isArray(appSettings.milestones) && appSettings.milestones.length) {
        MILESTONES = appSettings.milestones;
      }
    }
  } catch (e) { /* use defaults */ }
}

let integrationsData = { connectors: [] };

async function fetchIntegrations() {
  try {
    const res = await fetch('/api/integrations');
    if (res.ok) integrationsData = await res.json();
  } catch (e) { /* not super_admin or network issue — keep defaults */ }
}

async function fetchAnnouncements() {
  try {
    const res = await fetch('/api/announcements');
    if (res.ok) cachedAnnouncements = await res.json();
  } catch (e) { cachedAnnouncements = []; }
}

// ── Permissions (API, cached) ─────────────────────────────────
// ── Roles (fetched from server, cached) ──────────────────────
let cachedRoles = [
  { id: 'super_admin',     label: 'Super Admin',    system: true },
  { id: 'lead',            label: 'Lead',           system: true },
  { id: 'project_manager', label: 'Project Manager', system: true },
  { id: 'implementer',     label: 'Implementer',    system: true },
];

async function fetchRoles() {
  try {
    const res = await fetch('/api/roles');
    if (res.ok) cachedRoles = await res.json();
  } catch (e) {
    console.warn('Could not fetch roles, using defaults:', e);
  }
}

// ── Timeline Templates (fetched from server, cached) ─────────
let cachedTemplates = [];

async function fetchTimelineTemplates() {
  try {
    const res = await fetch('/api/timeline-templates');
    if (res.ok) cachedTemplates = await res.json();
  } catch (e) {
    console.warn('Could not fetch timeline templates:', e);
  }
}

function getRoleLabel(roleId) {
  const r = cachedRoles.find(r => r.id === roleId);
  return r ? r.label : (roleId || '');
}

function roleBadge(roleId) {
  const label   = getRoleLabel(roleId);
  const isKnown = ['super_admin','lead','project_manager','implementer'].includes(roleId);
  const cls     = isKnown ? `badge-${roleId}` : 'badge-custom-role';
  return `<span class="badge ${cls}">${label}</span>`;
}

let permissionsMatrix = {
  super_admin:     { view_admin_dashboard:true, view_all_projects:true, view_my_dashboard:true, view_my_projects:true, view_users:true, view_hubspot:true, manage_users:true, create_delete_projects:true, edit_projects:true, edit_milestones:true, edit_actual_dates:true, act_as_user:true, log_time:true, view_audit_trail:true, view_project_details:true, view_resource_hub:true, generate_resource_hub:true, edit_dashboard_fields:true, view_pm_dashboard_table:false, manage_recordings:false, manage_files:false, view_tools_hub:true },
  lead:            { view_admin_dashboard:true, view_all_projects:true, view_my_dashboard:true, view_my_projects:true, view_users:false, view_hubspot:true, manage_users:false, create_delete_projects:true, edit_projects:true, edit_milestones:true, edit_actual_dates:true, act_as_user:false, log_time:true, view_audit_trail:false, view_project_details:true, view_resource_hub:true, generate_resource_hub:false, edit_dashboard_fields:false, view_pm_dashboard_table:false, manage_recordings:false, manage_files:false, view_tools_hub:true },
  project_manager: { view_admin_dashboard:false, view_all_projects:false, view_my_dashboard:true, view_my_projects:true, view_users:false, view_hubspot:false, manage_users:false, create_delete_projects:false, edit_projects:true, edit_milestones:true, edit_actual_dates:true, act_as_user:false, log_time:true, view_audit_trail:false, view_project_details:true, view_resource_hub:true, generate_resource_hub:true, edit_dashboard_fields:true, view_pm_dashboard_table:true, manage_recordings:false, manage_files:false, view_tools_hub:false },
  implementer:     { view_admin_dashboard:false, view_all_projects:false, view_my_dashboard:true, view_my_projects:true, view_users:false, view_hubspot:false, manage_users:false, create_delete_projects:false, edit_projects:false, edit_milestones:true, edit_actual_dates:false, act_as_user:false, log_time:true, view_audit_trail:false, view_project_details:false, view_resource_hub:false, generate_resource_hub:false, edit_dashboard_fields:false, view_pm_dashboard_table:false, manage_recordings:false, manage_files:false, view_tools_hub:false },
};

async function fetchPermissions() {
  try {
    const res = await fetch('/api/permissions');
    if (res.ok) permissionsMatrix = await res.json();
  } catch (e) {
    console.warn('Could not load permissions, using defaults:', e);
  }
}

function can(permission) {
  const role = effectiveUser()?.role;
  if (!role) return false;
  return permissionsMatrix[role]?.[permission] === true;
}

// ── Users (API, cached) ───────────────────────────────────────
let cachedUsers = [];

// ── Announcements (API, cached) ───────────────────────────────
let cachedAnnouncements = [];

async function fetchUsers() {
  try {
    const res = await fetch('/api/users');
    if (res.ok) cachedUsers = await res.json();
  } catch (e) {
    console.error('Could not fetch users:', e);
  }
  return cachedUsers;
}

function getUsers() { return cachedUsers; }

// ── Auth ─────────────────────────────────────────────────────
let currentUser = null;
let actingAs    = null;

function effectiveUser() { return actingAs || currentUser; }

function startActingAs(userId) {
  actingAs = cachedUsers.find(u => u.id === userId);
  if (!actingAs) return;
  renderSidebar();
  renderActingBanner();
  navigate('dashboard');
}

function stopActingAs() {
  actingAs = null;
  document.getElementById('acting-banner')?.remove();
  renderSidebar();
  navigate('dashboard');
}

function renderActingBanner() {
  document.getElementById('acting-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'acting-banner';
  banner.innerHTML = `
    <div style="background:#fff3cd;border-bottom:2.5px solid #FF7F00;padding:.6rem 1.5rem;display:flex;align-items:center;justify-content:space-between;font-size:.85rem;gap:1rem">
      <span>&#128100; Acting as <strong>${actingAs.name}</strong> &mdash; you are viewing the app as this user</span>
      <button onclick="stopActingAs()" style="background:#FF7F00;color:#fff;border:none;border-radius:6px;padding:.35rem .9rem;font-size:.8rem;font-weight:700;cursor:pointer;font-family:var(--font-sub)">&#10006; Back to Admin</button>
    </div>
  `;
  document.getElementById('main-content').prepend(banner);
}

async function doLogin(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return null;
  const { user } = await res.json();
  return user;
}

async function checkSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const { user } = await res.json();
    return user;
  } catch { return null; }
}

async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

// ── Screen Manager ────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Theme (Dark / Light Mode) ─────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('pmt_theme') || 'light';
  applyTheme(saved);
}

// ── User Preferences (stored in localStorage) ─────────────────
function getUserPrefs() {
  try { return JSON.parse(localStorage.getItem('pmt_prefs')) || {}; } catch { return {}; }
}
function saveUserPrefs(prefs) {
  localStorage.setItem('pmt_prefs', JSON.stringify(prefs));
}
function applyUserPrefs(prefs) {
  document.body.classList.toggle('density-compact',     prefs.tableDensity === 'compact');
  document.body.classList.toggle('pref-hide-risk',      prefs.hideRiskBadges === true);
  document.body.classList.toggle('pref-kanban-showdue', prefs.kanbanShowDueDate === true);
  document.body.classList.toggle('pref-kanban-compact', prefs.kanbanCompactActions === true);
}

// ── Onboarding ────────────────────────────────────────────────
function showOnboardingIfNeeded() {
  if (!appSettings.onboardingEnabled) return;
  if (currentUser.onboardingCompleted) return;

  const role = currentUser.role;

  const STEPS = {
    super_admin: [
      {
        icon: '🌱',
        title: 'Welcome to Sprout PMT!',
        desc: 'This quick tour will walk you through the key features of your project management tool. As a <strong>Super Admin</strong>, you have full access to everything.',
        tip: 'You can skip this tour at any time and restart it from App Settings.',
      },
      {
        icon: '👥',
        title: 'Managing Your Team',
        desc: 'Head to the <strong>Users</strong> tab to add team members, assign roles, and import users in bulk via CSV. You can also customize permissions in the <strong>Access Matrix</strong>.',
        tip: 'Roles control what each user can see and do. Use the Access Matrix to fine-tune permissions per role.',
      },
      {
        icon: '📁',
        title: 'Creating & Managing Projects',
        desc: 'The <strong>Implementation Projects</strong> tab is the heart of the app. Create new projects, assign project managers, track milestones, log time, and attach project links all in one place.',
        tip: 'Use the bulk import feature to bring in multiple projects at once from a CSV or Excel file.',
      },
      {
        icon: '📊',
        title: 'Admin Dashboard',
        desc: 'The <strong>Admin Dashboard</strong> gives you a bird\'s-eye view of all projects, team workloads, milestone completion, and overall pipeline health across your entire organization.',
        tip: 'Charts update in real time as projects and milestones are updated.',
      },
      {
        icon: '⚙️',
        title: 'App Settings & Integrations',
        desc: 'In <strong>App Settings</strong>, configure the HubSpot sync, connect Claude AI, manage milestones, and control this onboarding tour. Only Super Admins can access this area.',
        tip: 'HubSpot sync pulls deal data directly into the Projects view — no manual entry needed.',
      },
      {
        icon: '🎉',
        title: 'You\'re All Set!',
        desc: 'You now know the essentials of Sprout PMT. Your team is counting on you — go build something great! If you ever need a refresher, reset the tour from App Settings.',
        tip: 'Tip: Dark mode is available in the bottom-left of the sidebar.',
      },
    ],
    lead: [
      {
        icon: '🌱',
        title: 'Welcome to Sprout PMT!',
        desc: 'This quick tour covers the key areas you\'ll use as a <strong>Lead</strong>. You have access to all projects, the admin dashboard, and HubSpot integration.',
        tip: 'You can skip this tour at any time — it won\'t appear again once completed.',
      },
      {
        icon: '📊',
        title: 'Your Admin Dashboard',
        desc: 'The <strong>Admin Dashboard</strong> gives you a high-level view of all ongoing projects, milestone progress, and team assignments across the organization.',
        tip: 'Use the charts to quickly identify projects that are behind or stalled.',
      },
      {
        icon: '📁',
        title: 'Managing Projects',
        desc: 'Under <strong>Implementation Projects</strong>, you can create, edit, and monitor all projects. Open any project\'s details to review milestones, attached links, and time logs.',
        tip: 'You can reassign project managers and update statuses directly from the project details modal.',
      },
      {
        icon: '🔗',
        title: 'HubSpot Integration',
        desc: 'The <strong>HubSpot</strong> tab shows your active deals synced from HubSpot CRM. You can push deals into projects with one click, keeping CRM and project data in sync.',
        tip: 'Ask your Super Admin to configure the HubSpot API key in App Settings if the integration isn\'t active yet.',
      },
      {
        icon: '🎉',
        title: 'You\'re All Set!',
        desc: 'You\'re ready to lead your team with Sprout PMT. Keep projects moving and milestones on track. You\'ve got this!',
        tip: 'Tip: Dark mode is available at the bottom of the sidebar.',
      },
    ],
    project_manager: [
      {
        icon: '🌱',
        title: 'Welcome to Sprout PMT!',
        desc: 'Great to have you here! This tour covers what you need to know as a <strong>Project Manager</strong>. You\'ll manage your assigned projects and track progress day to day.',
        tip: 'You can skip this tour — it won\'t appear again after you finish.',
      },
      {
        icon: '🏠',
        title: 'Your Dashboard',
        desc: 'Your <strong>My Dashboard</strong> is your home base. It shows a summary of your active projects, upcoming milestones, and recent activity — everything you need at a glance.',
        tip: 'Check your dashboard each morning to stay on top of what\'s due.',
      },
      {
        icon: '📁',
        title: 'Your Projects',
        desc: 'Under <strong>My Projects</strong>, you\'ll find all projects assigned to you. Open a project to view and update milestones, attach project folder links, and review the team.',
        tip: 'Keep milestone statuses updated so your leads have an accurate picture of progress.',
      },
      {
        icon: '⏱️',
        title: 'Logging Time',
        desc: 'You can log time directly on any project. Use the built-in timer or enter hours manually. Time logs help leadership track effort and support billing and reporting.',
        tip: 'The timer popup lets you track time even while navigating between pages.',
      },
      {
        icon: '🎉',
        title: 'You\'re All Set!',
        desc: 'You\'re ready to manage your projects like a pro. Keep milestones moving and don\'t hesitate to reach out to your Lead if you need support!',
        tip: 'Tip: Dark mode is available at the bottom of the sidebar.',
      },
    ],
    implementer: [
      {
        icon: '🌱',
        title: 'Welcome to Sprout PMT!',
        desc: 'Welcome aboard! This quick tour will show you the essentials as an <strong>Implementer</strong>. Your focus is on milestones and logging your work.',
        tip: 'You can skip this tour — it won\'t show again once completed.',
      },
      {
        icon: '🏠',
        title: 'Your Dashboard',
        desc: 'Your <strong>My Dashboard</strong> shows your active projects and upcoming milestones. This is your starting point each day.',
        tip: 'Bookmark this page or keep it open for quick reference throughout your day.',
      },
      {
        icon: '✅',
        title: 'Milestones & Tasks',
        desc: 'Open any project under <strong>My Projects</strong> to view and update your milestones. Mark them complete as you go — your project manager relies on these updates.',
        tip: 'If a milestone is blocked, flag it early so your team can help.',
      },
      {
        icon: '🎉',
        title: 'You\'re All Set!',
        desc: 'You\'re all set to get to work! Focus on your milestones, log your time, and communicate with your project manager. Let\'s build something great!',
        tip: 'Tip: Dark mode is available at the bottom of the sidebar.',
      },
    ],
  };

  const steps = STEPS[role] || STEPS['project_manager'];
  let currentStep = 0;

  async function completeOnboarding() {
    await fetch('/api/users/me/onboarding-complete', { method: 'POST' });
    currentUser.onboardingCompleted = true;
    document.getElementById('onboarding-overlay')?.remove();
  }

  function renderStep() {
    const step     = steps[currentStep];
    const isLast   = currentStep === steps.length - 1;
    const isFirst  = currentStep === 0;
    const dots     = steps.map((_, i) =>
      `<span class="onboarding-dot${i === currentStep ? ' active' : ''}"></span>`
    ).join('');

    document.getElementById('onboarding-icon').textContent  = step.icon;
    document.getElementById('onboarding-title').textContent = step.title;
    document.getElementById('onboarding-desc').innerHTML    = step.desc;
    document.getElementById('onboarding-tip').innerHTML     = `<strong>💡 Tip:</strong> ${step.tip}`;
    document.getElementById('onboarding-dots').innerHTML    = dots;
    document.getElementById('onboarding-back-btn').style.display  = isFirst ? 'none' : '';
    document.getElementById('onboarding-next-btn').textContent    = isLast ? 'Finish' : 'Next →';

    // Trigger step animation
    const body = document.getElementById('onboarding-step-body');
    body.classList.remove('onboarding-step-animate');
    void body.offsetWidth; // reflow
    body.classList.add('onboarding-step-animate');
  }

  // Build overlay HTML
  const overlay = document.createElement('div');
  overlay.id        = 'onboarding-overlay';
  overlay.className = 'onboarding-overlay';
  overlay.innerHTML = `
    <div class="onboarding-card">
      <div class="onboarding-header" style="display:flex;gap:.9rem;align-items:center">
        <div class="onboarding-sidekick"><img src="Sidekick.png" alt="Sprout Sidekick" /></div>
        <div style="position:relative;z-index:1">
          <div style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.65)">Sprout Sidekick</div>
          <div class="onboarding-step-title">Getting Started Tour</div>
        </div>
      </div>
      <div class="onboarding-body">
        <div id="onboarding-step-body" class="onboarding-step-animate">
          <div id="onboarding-icon" class="onboarding-step-icon"></div>
          <div id="onboarding-title" style="font-size:1.2rem;font-weight:700;margin:.25rem 0 .65rem;color:var(--txt)"></div>
          <div id="onboarding-desc" class="onboarding-desc"></div>
          <div id="onboarding-tip" class="onboarding-tip"></div>
        </div>
      </div>
      <div class="onboarding-progress">
        <div id="onboarding-dots" style="display:flex;gap:.45rem;justify-content:center"></div>
      </div>
      <div class="onboarding-footer">
        <button class="onboarding-skip" id="onboarding-skip-btn">Skip tour</button>
        <div class="onboarding-nav">
          <button class="btn btn-outline btn-sm" id="onboarding-back-btn">← Back</button>
          <button class="btn btn-primary btn-sm" id="onboarding-next-btn">Next →</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  renderStep();

  document.getElementById('onboarding-next-btn').addEventListener('click', async () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep();
    } else {
      await completeOnboarding();
    }
  });

  document.getElementById('onboarding-back-btn').addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
  });

  document.getElementById('onboarding-skip-btn').addEventListener('click', async () => {
    await completeOnboarding();
  });
}

// ── App Boot ──────────────────────────────────────────────────
async function bootApp(user) {
  currentUser = user;
  await fetchUsers();
  await fetchRoles();
  await fetchTimelineTemplates();
  await fetchPermissions();
  await fetchAppSettings();
  await fetchProjects();
  await migrateProjectsFromLocalStorage();
  initProjects();
  migrateProjectTypes();
  await fetchMyTools();
  await migrateToolsFromLocalStorage();
  showScreen('app-screen');
  renderSidebar();
  initTheme();
  applyUserPrefs(getUserPrefs());
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await doLogout();
    currentUser = null;
    cachedUsers = [];
    _toolsCache = null;
    _projectsCache = [];
    window.location.href = '/';
  });
  const _prefs = getUserPrefs();
  await navigate(_prefs.defaultPage || 'dashboard');

  // Show onboarding if enabled and user hasn't completed it
  showOnboardingIfNeeded();

  // Restore timer popup window if a timer is active and popup is enabled
  if (getActiveTimer() && appSettings.timerPopupEnabled) {
    openTimerPopup();
  }

  // Listen for timer being stopped from the popup window (via localStorage storage event)
  window.addEventListener('storage', e => {
    if (e.key === 'pmt_active_timer' && !e.newValue) {
      // Popup stopped the timer — clean up main window state
      clearInterval(timerInterval);
      timerInterval = null;
      timerPopupWindow = null;
      // Refresh current page so timer row buttons update
      navigate(currentPage);
    }
  });
}

function renderSidebar() {
  const nav   = document.getElementById('sidebar-nav');
  const badge = document.getElementById('user-badge');
  const role  = effectiveUser()?.role;

  const mainItems = [
    { id: 'dashboard',    label: 'Dashboard',               icon: '&#9962;',   permission: 'view_admin_dashboard' },
    { id: 'my-dashboard', label: 'My Dashboard',            icon: '&#9962;',   permission: 'view_my_dashboard'    },
    { id: 'projects',     label: 'Implementation Projects', icon: '&#128193;', permission: 'view_all_projects'    },
    { id: 'my-projects',  label: 'My Projects',             icon: '&#128193;', permission: 'view_my_projects'     },
    { id: 'tools-hub',    label: 'Tools Hub',               icon: '&#128736;', permission: 'view_tools_hub'       },
  ];

  const adminItems = [
    { id: 'users',         label: 'Users',         icon: '&#128100;', permission: 'view_users',       superAdminOnly: true  },
    { id: 'hubspot',       label: 'HubSpot',       icon: '&#128279;', permission: 'view_hubspot',     superAdminOnly: false },
    { id: 'access-matrix', label: 'Access Matrix', icon: '&#128275;', permission: null,               superAdminOnly: true  },
    { id: 'audit-trail',   label: 'Audit Trail',   icon: '&#128203;', permission: 'view_audit_trail', superAdminOnly: false },
    { id: 'app-settings',  label: 'App Settings',  icon: '&#9881;',   permission: null,               superAdminOnly: true  },
  ];

  const filteredMain = mainItems.filter(item => {
    if (item.id === 'tools-hub')    return can('view_tools_hub');
    if (item.id === 'my-dashboard') return can('view_my_dashboard') && !can('view_admin_dashboard');
    return can(item.permission);
  });

  const filteredAdmin = adminItems.filter(item => {
    if (item.superAdminOnly) return role === 'super_admin';
    if (item.permission === null) return role === 'super_admin';
    return can(item.permission);
  });

  const mainHtml = filteredMain.map(item => `
    <button class="nav-item" data-page="${item.id}">
      <span class="nav-icon">${item.icon}</span>${item.label}
    </button>`).join('');

  const adminGroupHtml = filteredAdmin.length ? `
    <div class="nav-group">
      <button class="nav-group-header" id="admin-group-toggle">
        <span class="nav-icon">&#9965;</span>Administration
        <span class="nav-group-arrow" id="admin-group-arrow">&#9654;</span>
      </button>
      <div class="nav-group-body" id="admin-group-body">
        ${filteredAdmin.map(item => `
          <button class="nav-item nav-sub-item" data-page="${item.id}">
            <span class="nav-icon">${item.icon}</span>${item.label}
          </button>`).join('')}
      </div>
    </div>` : '';

  nav.innerHTML = mainHtml + adminGroupHtml;

  nav.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.page))
  );

  document.getElementById('admin-group-toggle')?.addEventListener('click', () => {
    const body    = document.getElementById('admin-group-body');
    const arrow   = document.getElementById('admin-group-arrow');
    const expanded = body.classList.toggle('expanded');
    arrow.style.transform = expanded ? 'rotate(90deg)' : '';
  });

  renderNotifBell();

  badge.innerHTML = `
    ${avatarHtml(currentUser, 36)}
    <div class="user-info">
      <div class="user-name">${currentUser.name}</div>
      <div class="user-role">${getRoleLabel(currentUser.role)}</div>
    </div>
    <span class="badge-edit-hint" title="Account options">&#8942;</span>`;
  badge.style.cursor = 'pointer';
  badge.onclick = (e) => { e.stopPropagation(); openUserBadgeMenu(badge); };
}

let currentPage = 'dashboard';

async function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (btn) btn.classList.add('active');

  const container = document.getElementById('page-container');

  if (page === 'dashboard' && can('view_admin_dashboard')) {
    await fetchAnnouncements();
    await renderAdminDashboard(container);
  } else if ((page === 'my-dashboard' || page === 'dashboard') && can('view_my_dashboard')) {
    await fetchAnnouncements();
    container.innerHTML = renderUserDashboard();
    const mine = getProjects().filter(p => isMyProject(p, effectiveUser()));
    const aiBtn = document.getElementById('dashboard-ai-btn');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => openDashboardChatModal({
        total: mine.length,
        ongoing: mine.filter(p => p.status === 'ongoing').length,
        completed: mine.filter(p => p.status === 'completed').length,
        onHold: mine.filter(p => p.status === 'on-hold').length,
        onHoldSales: mine.filter(p => p.status === 'on-hold-sales').length,
        churn: mine.filter(p => p.status === 'churn').length,
        projects: mine.map(p => ({
          title: p.title,
          status: p.status,
          priority: p.priority,
          dueDate: p.dueDate || null,
          pm: projectManagerDisplay(p.projectManager),
          team: userNames(p.assignedTo) || 'Not specified',
          milestones: p.milestones || {},
        })),
      }));
    }
    // Attach announcement dismiss handlers
    attachAnnouncementDismiss(container);

    // PM project table (project_manager role only)
    if (can('view_pm_dashboard_table')) renderPMProjectTable();

    // Daily briefing for non-admin users
    const myBriefingTarget = document.querySelector('#page-container .page-header');
    if (myBriefingTarget) {
      await renderDailyBriefingCard(
        myBriefingTarget.parentElement,
        mine.map(p => ({ title: p.title, status: p.status, dueDate: p.dueDate || null, milestones: p.milestones || {} })),
        { total: mine.length, ongoing: mine.filter(p => p.status === 'ongoing').length, completed: mine.filter(p => p.status === 'completed').length }
      );
    }
  } else if (page === 'projects' && can('view_all_projects')) {
    await renderAdminProjects(container);
  } else if (page === 'my-projects' && can('view_my_projects')) {
    renderUserProjects(container);
  } else if (page === 'users' && can('view_users')) {
    await fetchUsers();
    renderAdminUsers(container);
  } else if (page === 'hubspot' && can('view_hubspot')) {
    await renderHubSpotPage(container);
  } else if (page === 'access-matrix' && effectiveUser()?.role === 'super_admin') {
    renderAccessMatrix(container);
  } else if (page === 'audit-trail' && can('view_audit_trail')) {
    await renderAuditTrail(container);
  } else if (page === 'app-settings' && effectiveUser()?.role === 'super_admin') {
    await renderAppSettings(container);
  } else if (page === 'tools-hub' && can('view_tools_hub')) {
    renderToolsHub(container);
  }

  attachPageHandlers(page);
}

// ── Markdown renderer for AI chat bubbles ─────────────────────
function renderMarkdown(text) {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:.9rem;display:block;margin:.5rem 0 .2rem">$1</strong>');
  html = html.replace(/^## (.+)$/gm,  '<strong style="font-size:.95rem;display:block;margin:.5rem 0 .2rem">$1</strong>');
  html = html.replace(/^# (.+)$/gm,   '<strong style="font-size:1rem;display:block;margin:.5rem 0 .2rem">$1</strong>');

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,         '<em>$1</em>');

  // Bullet lists (- or •)
  html = html.replace(/^[\-•] (.+)$/gm, '<div style="display:flex;gap:.4rem;margin:.1rem 0"><span style="flex-shrink:0">•</span><span>$1</span></div>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, (match, item, offset, str) => {
    const num = match.match(/^(\d+)/)[1];
    return `<div style="display:flex;gap:.4rem;margin:.1rem 0"><span style="flex-shrink:0;font-weight:600">${num}.</span><span>${item}</span></div>`;
  });

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up extra <br> after block elements
  html = html.replace(/(<\/div>)<br>/g, '$1');
  html = html.replace(/(<strong[^>]*>[^<]+<\/strong>)<br>/g, '$1');

  return html;
}

// ── Utility ───────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'ongoing',        label: 'Ongoing' },
  { value: 'completed',      label: 'Completed' },
  { value: 'on-hold',        label: 'On Hold' },
  { value: 'on-hold-sales',  label: 'On Hold - Returned to Sales' },
  { value: 'churn',          label: 'Churn' },
];

function statusLabel(value) {
  return STATUS_OPTIONS.find(s => s.value === value)?.label || value;
}

function statusBadge(status) {
  const map = {
    'ongoing':       'badge-ongoing',
    'completed':     'badge-completed',
    'on-hold':       'badge-on-hold',
    'on-hold-sales': 'badge-on-hold-sales',
    'churn':         'badge-churn',
    // legacy
    'planning':      'badge-planning',
    'in-progress':   'badge-in-progress',
  };
  return `<span class="badge ${map[status] || ''}">${statusLabel(status)}</span>`;
}

function projectTypeBadge(type) {
  if (type === 'client')   return '<span class="badge badge-type-client">Client</span>';
  return '<span class="badge badge-type-internal">Internal</span>';
}

// Formats a syncedAt ISO string to a readable date + time
function formatSyncedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

// Maps HubSpot client_status / stage to a local status value
function hsStatusToLocal(clientStatus, stage) {
  const s = (clientStatus || stage || '').toLowerCase().trim();
  if (s.includes('churn'))                         return 'churn';
  if (s.includes('on hold') || s.includes('hold')) return 'on-hold';
  if (s.includes('return') || s.includes('sales')) return 'on-hold-sales';
  if (s.includes('complet'))                       return 'completed';
  return 'ongoing'; // default for active stages
}

function priorityLabel(p) {
  const colors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  return `<span style="color:${colors[p]||'#64748b'};font-weight:600;text-transform:capitalize">${p}</span>`;
}

function userNames(ids) {
  return ids.map(id => cachedUsers.find(u => u.id === id)?.name || 'Unknown').join(', ');
}

function isMyProject(p, user) {
  return p.assignedTo.includes(user.id) || p.projectManager === user.id;
}

function projectManagerDisplay(pm) {
  if (!pm) return '<span style="color:var(--txt-muted)">—</span>';
  const user = cachedUsers.find(u => u.id === pm);
  return user ? user.name : pm;
}

// Re-resolves projectManager on all HubSpot projects using the current user list.
// Called after sync and after saving a user with a hubspotOwnerId.
function applyHubspotOwnerMappings() {
  const projects = getProjects();
  const validIds  = new Set(cachedUsers.map(u => u.id));
  let changed = false;
  projects.forEach(p => {
    if (!p.hubspotOwnerId) return; // not a HubSpot project or no owner ID stored
    const match = cachedUsers.find(u => u.hubspotOwnerId && u.hubspotOwnerId === p.hubspotOwnerId);
    const newPm = match?.id || null;
    if (p.projectManager !== newPm) { p.projectManager = newPm; changed = true; }
  });
  if (changed) saveProjects(projects);
}

// One-time migration: tag existing HubSpot projects as 'client', everything else as 'internal'
function migrateProjectTypes() {
  const projects = getProjects();
  let changed = false;
  projects.forEach(p => {
    if (!p.projectType) {
      p.projectType = (p.createdBy === 'hubspot' || p.hubspotId) ? 'client' : 'internal';
      changed = true;
    }
  });
  if (changed) saveProjects(projects);
}

function avatarHtml(user, size = 36) {
  if (user?.photoUrl) {
    return `<img src="${user.photoUrl}" alt="${user.name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
  }
  const fs = Math.round(size * 0.4);
  return `<div class="user-avatar" style="background:${user?.color || '#ccc'};width:${size}px;height:${size}px;font-size:${fs}px;flex-shrink:0">${(user?.name || '?').charAt(0)}</div>`;
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── TIME TRACKING ──────────────────────────────────────────────
function getTimeEntries() { return DB.get('pmt_time_entries', []); }
function saveTimeEntries(e) { DB.set('pmt_time_entries', e); }
function getActiveTimer()  { return DB.get('pmt_active_timer', null); }
function saveActiveTimer(t){ DB.set('pmt_active_timer', t); }
function clearActiveTimer(){ localStorage.removeItem('pmt_active_timer'); }

function formatHours(h) {
  if (!h) return '0h';
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function getElapsedMs(timerOrIso) {
  if (!timerOrIso) return 0;
  if (typeof timerOrIso === 'string') {
    return Math.max(0, Date.now() - new Date(timerOrIso).getTime());
  }
  // Full timer object — account for paused time
  let ms = Date.now() - new Date(timerOrIso.startTime).getTime() - (timerOrIso.totalPausedMs || 0);
  if (timerOrIso.pausedAt) ms -= (Date.now() - new Date(timerOrIso.pausedAt).getTime());
  return Math.max(0, ms);
}

function formatElapsed(timerOrIso) {
  const secs = Math.floor(getElapsedMs(timerOrIso) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

let timerInterval = null;
function startTimerTick() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    const timer = getActiveTimer();
    if (!timer) { clearInterval(timerInterval); timerInterval = null; return; }
    if (timer.pausedAt) return; // don't advance while paused

    // Update in-row elapsed display
    const el = document.getElementById(`timer-elapsed-${timer.projectId}`);
    if (el) el.textContent = formatElapsed(timer);

    // Popup window manages its own tick via its own interval
  }, 1000);
}

function startTimer(projectId) {
  const existing = getActiveTimer();

  // Timer already running on this exact project — just open/focus the popup
  if (existing && existing.projectId === projectId) {
    if (appSettings.timerPopupEnabled) openTimerPopup();
    return;
  }

  // Timer running on a different project — confirm switch
  if (existing && existing.projectId !== projectId) {
    if (!confirm('You already have a timer running on another project. Stop it and start this one?')) return;
    stopTimer(false);
  }

  saveActiveTimer({
    projectId,
    userId:         currentUser.id,
    startTime:      new Date().toISOString(),
    description:    '',
    pausedAt:       null,
    totalPausedMs:  0,
  });
  startTimerTick();

  if (appSettings.timerPopupEnabled) {
    openTimerPopup();
  } else {
    navigate(can('view_all_projects') ? 'projects' : 'my-projects');
  }
}

function pauseTimer() {
  const timer = getActiveTimer();
  if (!timer || timer.pausedAt) return;
  timer.pausedAt = new Date().toISOString();
  saveActiveTimer(timer);
  updateTimerPopup();
}

function resumeTimer() {
  const timer = getActiveTimer();
  if (!timer || !timer.pausedAt) return;
  timer.totalPausedMs = (timer.totalPausedMs || 0) + (Date.now() - new Date(timer.pausedAt).getTime());
  timer.pausedAt = null;
  saveActiveTimer(timer);
  startTimerTick();
  updateTimerPopup();
}

function stopTimer(shouldNavigate = true) {
  const timer = getActiveTimer();
  if (!timer) return;

  // Description is kept in sync with localStorage by the popup window's input handler

  // Calculate actual worked time (excluding all paused duration)
  const hours = getElapsedMs(timer) / 1000 / 3600;
  if (hours >= (1 / 60)) {
    const entries = getTimeEntries();
    entries.push({
      id:          genId(),
      projectId:   timer.projectId,
      userId:      timer.userId,
      date:        new Date().toISOString().split('T')[0],
      hours:       Math.round(hours * 100) / 100,
      description: timer.description || 'Timer session',
      source:      'timer',
      createdAt:   new Date().toISOString(),
    });
    saveTimeEntries(entries);
  }

  clearActiveTimer();
  clearInterval(timerInterval);
  timerInterval = null;
  closeTimerPopup();

  if (shouldNavigate) navigate(can('view_all_projects') ? 'projects' : 'my-projects');
}

// ── TIMER POPUP WINDOW ────────────────────────────────────────
let timerPopupWindow = null;

function openTimerPopup() {
  // If window already open and alive, just bring it to front
  if (timerPopupWindow && !timerPopupWindow.closed) {
    timerPopupWindow.focus();
    return;
  }
  const features = [
    'width=340', 'height=460',
    'resizable=no', 'scrollbars=no',
    'menubar=no', 'toolbar=no', 'location=no', 'status=no',
  ].join(',');
  timerPopupWindow = window.open('/timer-popup.html', 'sprout-timer', features);
}

function updateTimerPopup() {
  // The popup window reads from localStorage and handles its own updates.
  // Nothing to do from the main window — localStorage is the shared state.
}

function closeTimerPopup() {
  if (timerPopupWindow && !timerPopupWindow.closed) {
    timerPopupWindow.close();
  }
  timerPopupWindow = null;
}

function openLogHoursModal(projectId) {
  const p = getProjects().find(x => x.id === projectId);
  if (!p) return;
  const today = new Date().toISOString().split('T')[0];

  const modal = createModal(`
    <h3>&#9997; Log Hours — ${p.title}</h3>
    <div class="grid-2">
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="m-log-date" value="${today}" />
      </div>
      <div class="form-group">
        <label>Hours</label>
        <input type="number" id="m-log-hours" min="0.25" max="24" step="0.25" placeholder="e.g. 2.5" />
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="m-log-desc" placeholder="What did you work on?"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save">Log Hours</button>
    </div>
  `);

  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('modal-save').addEventListener('click', () => {
    const date  = document.getElementById('m-log-date').value;
    const hours = parseFloat(document.getElementById('m-log-hours').value);
    const desc  = document.getElementById('m-log-desc').value.trim();
    if (!date || isNaN(hours) || hours <= 0) return alert('Please enter a valid date and hours.');
    const entries = getTimeEntries();
    entries.push({
      id:          genId(),
      projectId,
      userId:      currentUser.id,
      date,
      hours,
      description: desc || 'Manual entry',
      source:      'manual',
      createdAt:   new Date().toISOString(),
    });
    saveTimeEntries(entries);
    modal.remove();
    alert(`${formatHours(hours)} logged successfully!`);
  });
}

function openTimeLogModal(projectId) {
  const p = getProjects().find(x => x.id === projectId);
  if (!p) return;

  const entries    = getTimeEntries()
    .filter(e => e.projectId === projectId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const byUser = {};
  entries.forEach(e => {
    const name = cachedUsers.find(u => u.id === e.userId)?.name || 'Unknown';
    byUser[name] = (byUser[name] || 0) + e.hours;
  });

  const modal = createModal(`
    <h3>&#128336; Time Log — ${p.title}</h3>
    <div style="display:flex;gap:.75rem;margin-bottom:1.2rem;flex-wrap:wrap">
      <div class="time-summary-box">
        <div class="time-summary-val">${formatHours(totalHours)}</div>
        <div class="time-summary-lbl">Total Hours</div>
      </div>
      <div class="time-summary-box">
        <div class="time-summary-val">${entries.length}</div>
        <div class="time-summary-lbl">Entries</div>
      </div>
      <div class="time-summary-box">
        <div class="time-summary-val">${Object.keys(byUser).length}</div>
        <div class="time-summary-lbl">Contributors</div>
      </div>
    </div>
    ${Object.keys(byUser).length ? `
      <div style="margin-bottom:1rem">
        <div style="font-size:.72rem;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">By Member</div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem">
          ${Object.entries(byUser).map(([name, hrs]) => `
            <div style="background:var(--bg-soft);border-radius:6px;padding:.3rem .65rem;font-size:.8rem">
              <strong>${name}</strong> — ${formatHours(hrs)}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:.82rem;border-collapse:collapse">
        <thead>
          <tr style="background:var(--bg-soft);position:sticky;top:0">
            <th style="padding:.5rem .7rem;text-align:left;font-size:.7rem;text-transform:uppercase;color:var(--txt-muted);font-family:var(--font-sub)">Date</th>
            <th style="padding:.5rem .7rem;text-align:left;font-size:.7rem;text-transform:uppercase;color:var(--txt-muted);font-family:var(--font-sub)">Member</th>
            <th style="padding:.5rem .7rem;text-align:left;font-size:.7rem;text-transform:uppercase;color:var(--txt-muted);font-family:var(--font-sub)">Hours</th>
            <th style="padding:.5rem .7rem;text-align:left;font-size:.7rem;text-transform:uppercase;color:var(--txt-muted);font-family:var(--font-sub)">Description</th>
            <th style="padding:.5rem .7rem;text-align:left;font-size:.7rem;text-transform:uppercase;color:var(--txt-muted);font-family:var(--font-sub)">Source</th>
          </tr>
        </thead>
        <tbody>
          ${entries.length ? entries.map(e => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.5rem .7rem">${e.date}</td>
              <td style="padding:.5rem .7rem">${cachedUsers.find(u => u.id === e.userId)?.name || 'Unknown'}</td>
              <td style="padding:.5rem .7rem;font-weight:600">${formatHours(e.hours)}</td>
              <td style="padding:.5rem .7rem;color:var(--txt-muted)">${e.description}</td>
              <td style="padding:.5rem .7rem">
                <span style="font-size:.7rem;background:${e.source === 'timer' ? '#d4f5ca' : '#e0f2fe'};color:${e.source === 'timer' ? '#092903' : '#0a4fb5'};padding:.15rem .45rem;border-radius:4px;font-weight:600">
                  ${e.source === 'timer' ? '&#9201; Timer' : '&#9997; Manual'}
                </span>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="5" style="padding:2rem;text-align:center;color:var(--txt-muted)">No time entries yet.</td></tr>
          `}
        </tbody>
      </table>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Close</button>
    </div>
  `);

  modal.querySelector('.modal').style.maxWidth = '680px';
  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────
let cachedDashboardOverrides = {};

// Safe HTML attribute escaping
function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Resolve the display name for a HubSpot deal's project manager
function resolveOwner(d) {
  if (d.ownerHubspotId) {
    const u = cachedUsers.find(u => u.hubspotOwnerId && u.hubspotOwnerId === d.ownerHubspotId);
    if (u) return u.name;
  }
  return d.owner !== 'Unassigned' ? d.owner : null;
}

// Status label → internal key (handles override labels and legacy HS labels)
const STATUS_LABEL_TO_KEY = {
  'Ongoing':                     'ongoing',
  'Completed':                   'completed',
  'On Hold':                     'on-hold',
  'On Hold Returned to Sales':   'on-hold-sales',
  'On Hold - Returned to Sales': 'on-hold-sales',
  'Churn':                       'churn',
};

// Dropdown options for Project Status column
const DASH_STATUS_OPTIONS = ['Ongoing', 'Completed', 'On Hold', 'On Hold Returned to Sales', 'Churn'];

// 41 column definitions — in exact order required
// hsField: null = no HubSpot source (user fills); '__pm__' / '__status__' = computed; other string = d[hsField]
const DASH_COLS = [
  { key: 'projectName',       label: 'Project Name',             hsField: 'name',                              editable: false, type: 'text',               minW: '200px' },
  { key: 'segment',           label: 'Segment',                  hsField: 'segment',                           editable: true,  type: 'text',               minW: '120px' },
  { key: 'implemPackage',     label: 'Implem Packages',          hsField: 'implemPackage',                     editable: true,  type: 'text',               minW: '160px' },
  { key: 'projectManager',    label: 'Project Manager',          hsField: '__pm__',                            editable: true,  type: 'text',               minW: '160px' },
  { key: 'hrsi',              label: 'HRSI',                     hsField: 'hrImplementer',                     editable: true,  type: 'text',               minW: '150px' },
  { key: 'psi',               label: 'PSI',                      hsField: 'payrollImplementer',                editable: true,  type: 'text',               minW: '150px' },
  { key: 'payrollMaster',     label: 'Payroll Master',           hsField: 'payrollMaster',                     editable: true,  type: 'text',               minW: '150px' },
  { key: 'softwareImpl',      label: 'Software Implementers',    hsField: 'softwareImplementer',               editable: true,  type: 'text',               minW: '180px' },
  { key: 'csmAssigned',       label: 'CSM Assigned',             hsField: null,                                editable: true,  type: 'text',               minW: '150px' },
  { key: 'salesperson',       label: 'Salesperson',              hsField: 'salesperson',                       editable: true,  type: 'text',               minW: '150px' },
  { key: 'headcount',         label: 'Headcount',                hsField: 'headcount',                         editable: true,  type: 'text',               minW: '100px' },
  { key: 'handoverHeadcount', label: 'Handover Headcount',       hsField: null,                                editable: true,  type: 'text',               minW: '160px' },
  { key: 'mrr',               label: 'MRR',                      hsField: 'amount',                            editable: true,  type: 'currency',           minW: '110px' },
  { key: 'implemFeeAmount',   label: 'Implem Fee Amount',        hsField: 'implemFeeAmount',                   editable: true,  type: 'currency',           minW: '150px' },
  { key: 'implemFeeWaive',    label: 'Implem Fee Waive or Paid', hsField: null,                                editable: true,  type: 'text',               minW: '180px' },
  { key: 'projectStatus',     label: 'Project Status',           hsField: '__status__',                        editable: true,  type: 'status-dropdown',    minW: '140px' },
  { key: 'stage',             label: 'Stage',                    hsField: 'stage',                             editable: false, type: 'text',               minW: '180px' },
  { key: 'milestone',         label: 'Milestone',                hsField: null,                                editable: true,  type: 'milestone-dropdown', minW: '210px' },
  { key: 'proposalDate',      label: 'Proposal Date',            hsField: 'proposalDate',                      editable: true,  type: 'date',               minW: '130px' },
  { key: 'npnDate',           label: 'NPN Date',                 hsField: null,                                editable: true,  type: 'text',               minW: '120px' },
  { key: 'npnMonth',          label: 'NPN Month',                hsField: 'npnMonth',                          editable: true,  type: 'date',               minW: '130px' },
  { key: 'welcomeEmailDate',  label: 'Welcome Email Date',       hsField: null,                                editable: true,  type: 'text',               minW: '160px' },
  { key: 'targetKom',         label: 'Target KOM',               hsField: null,                                editable: true,  type: 'text',               minW: '130px' },
  { key: 'actualKom',         label: 'Actual KOM',               hsField: null,                                editable: true,  type: 'text',               minW: '130px' },
  { key: 'komMonth',          label: 'KOM Month',                hsField: null,                                editable: true,  type: 'text',               minW: '120px' },
  { key: 'komQuarter',        label: 'KOM Quarter',              hsField: null,                                editable: true,  type: 'text',               minW: '120px' },
  { key: 'komYear',           label: 'KOM Year',                 hsField: null,                                editable: true,  type: 'text',               minW: '100px' },
  { key: 'handoverDate',      label: 'Project Handover',         hsField: 'handoverDate',                      editable: true,  type: 'date',               minW: '140px' },
  { key: 'targetHandover',    label: 'Target Project Handover',  hsField: null,                                editable: true,  type: 'text',               minW: '180px' },
  { key: 'handoverMonth',     label: 'Handover Month',           hsField: null,                                editable: true,  type: 'text',               minW: '140px' },
  { key: 'handoverQuarter',   label: 'Handover Quarter',         hsField: null,                                editable: true,  type: 'text',               minW: '140px' },
  { key: 'handoverYear',      label: 'Handover Year',            hsField: null,                                editable: true,  type: 'text',               minW: '100px' },
  { key: 'holidaysOnHold',    label: 'Holidays and On Hold',     hsField: null,                                editable: true,  type: 'text',               minW: '160px' },
  { key: 'targetImplemDays',  label: 'Target Implem Days',       hsField: null,                                editable: true,  type: 'text',               minW: '150px' },
  { key: 'sproutHrUrl',       label: 'Sprout HR URL',            hsField: 'sproutHrUrl',                       editable: true,  type: 'url',                minW: '200px' },
  { key: 'payrollCode',       label: 'Sprout Payroll Code',      hsField: 'payrollCode',                       editable: true,  type: 'text',               minW: '160px' },
  { key: 'onHoldDate',        label: 'On Hold Date',             hsField: null,                                editable: true,  type: 'text',               minW: '120px' },
  { key: 'churnDate',         label: 'Churn Date',               hsField: null,                                editable: true,  type: 'text',               minW: '120px' },
  { key: 'reactivationDate',  label: 'Reactivation Date',        hsField: null,                                editable: true,  type: 'text',               minW: '140px' },
  { key: 'productsAvailed',   label: 'Products Availed',         hsField: 'productsAvailed',                   editable: true,  type: 'text',               minW: '160px' },
  { key: 'industry',          label: 'Industry',                 hsField: 'industry',                          editable: true,  type: 'text',               minW: '130px' },
  { key: 'address',           label: 'Company Address',          hsField: 'address',                           editable: true,  type: 'text',               minW: '200px' },
];

// Get the raw HubSpot value for a column (before any override)
function getHsVal(col, d) {
  if (!col.hsField)                  return '';
  if (col.hsField === '__pm__')      return resolveOwner(d) || '';
  if (col.hsField === '__status__')  return statusLabel(hsStatusToLocal(d.clientStatus, d.stage));
  return d[col.hsField] || '';
}

// Get the effective value for a column (override takes priority over HubSpot)
function getDashEffectiveVal(col, d) {
  const ov = (cachedDashboardOverrides[d.id] || {})[col.key];
  return ov !== undefined ? ov : getHsVal(col, d);
}

async function fetchDashboardOverrides() {
  try {
    const res = await fetch('/api/dashboard-overrides');
    if (res.ok) return await res.json();
  } catch {}
  return {};
}

const fmtDate = v => v ? new Date(isNaN(v) ? v : Number(v)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

// ── Dashboard cell selection & copy-paste ─────────────────────
let _dashSelCells  = new Map(); // key "hsId::field" → td element
let _dashCopyBuf   = null;      // { value, field, colLabel }
let _dashSelAnchor = null;      // { hsId, field }
let _activeDashRender = null;   // reference to whichever table's render fn is active

function _dashClearSel() {
  _dashSelCells.forEach(td => td.classList.remove('dash-cell-selected'));
  _dashSelCells.clear();
  _dashSelAnchor = null;
}

function _dashSelectOne(td) {
  _dashClearSel();
  td.classList.add('dash-cell-selected');
  _dashSelCells.set(td.dataset.hsid + '::' + td.dataset.field, td);
  _dashSelAnchor = { hsId: td.dataset.hsid, field: td.dataset.field };
}

function _dashRangeSelect(clickedTd, tbody) {
  const field = clickedTd.dataset.field;
  if (!_dashSelAnchor || _dashSelAnchor.field !== field) { _dashSelectOne(clickedTd); return; }
  const allTds = [...tbody.querySelectorAll(`td.dash-cell-editable[data-field="${CSS.escape(field)}"]`)];
  const ai = allTds.findIndex(t => t.dataset.hsid === _dashSelAnchor.hsId);
  const ci = allTds.indexOf(clickedTd);
  if (ai === -1 || ci === -1) { _dashSelectOne(clickedTd); return; }
  _dashClearSel();
  _dashSelAnchor = { hsId: allTds[ai].dataset.hsid, field };
  const [from, to] = ai <= ci ? [ai, ci] : [ci, ai];
  for (let i = from; i <= to; i++) {
    allTds[i].classList.add('dash-cell-selected');
    _dashSelCells.set(allTds[i].dataset.hsid + '::' + field, allTds[i]);
  }
}

async function _dashPaste() {
  if (!_dashCopyBuf || _dashSelCells.size === 0) return;
  const { value: newVal, field, colLabel } = _dashCopyBuf;
  const promises = [];
  _dashSelCells.forEach(td => {
    if (td.dataset.field !== field) return;
    const hsId  = td.dataset.hsid;
    const oldVal = td.dataset.editVal || '';
    if (String(oldVal) === String(newVal)) return;
    const ov = cachedDashboardOverrides[hsId] || {};
    if (!newVal) {
      delete ov[field];
      if (!Object.keys(ov).length) delete cachedDashboardOverrides[hsId];
      else cachedDashboardOverrides[hsId] = ov;
    } else {
      ov[field] = newVal;
      cachedDashboardOverrides[hsId] = ov;
    }
    promises.push(fetch(`/api/dashboard-overrides/${encodeURIComponent(hsId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(!newVal ? { field, reset: true } : { field, value: newVal }),
    }).catch(() => {}));
    const companyName = td.closest('tr')?.querySelector('td[data-field="name"]')?.dataset?.editVal || hsId;
    promises.push(logAudit('dashboard.field_edit',
      `[Paste] ${colLabel}: "${oldVal || '—'}" → "${newVal || '—'}" on ${companyName}`,
      { hsId, field, from: oldVal, to: newVal, company: companyName, source: 'paste' }
    ));
  });
  await Promise.all(promises);
  _dashClearSel();
  if (_activeDashRender) _activeDashRender();
}

// Global keyboard handler for copy/paste/escape on dashboard cells
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'c' && _dashSelCells.size > 0) {
    const [, td] = _dashSelCells.entries().next().value;
    const col = DASH_COLS.find(c => c.key === td.dataset.field);
    _dashCopyBuf = { value: td.dataset.editVal || '', field: td.dataset.field, colLabel: col?.label || td.dataset.field };
    _dashSelCells.forEach(t => {
      t.style.outline = '2px dashed var(--primary)';
      setTimeout(() => { t.style.outline = ''; }, 500);
    });
    e.preventDefault();
  }
  if (e.ctrlKey && e.key === 'v' && _dashCopyBuf) {
    e.preventDefault();
    _dashPaste();
  }
  if (e.key === 'Escape') _dashClearSel();
});

// Inject selection highlight style once
if (!document.getElementById('dash-sel-style')) {
  const s = document.createElement('style');
  s.id = 'dash-sel-style';
  s.textContent = '.dash-cell-selected { background: rgba(50,150,255,0.18) !important; outline: 2px solid #3296ff !important; outline-offset: -2px; }';
  document.head.appendChild(s);
}

// Render HTML for a single dashboard table cell — shared by admin dashboard and PM dashboard table
function renderDashCell(col, d, canEdit) {
  const ov          = (cachedDashboardOverrides[d.id] || {})[col.key];
  const isOverridden = ov !== undefined;
  const hsRaw        = getHsVal(col, d);
  const effectiveVal = isOverridden ? ov : hsRaw;

  let displayHtml;
  if (col.type === 'currency') {
    const num = parseFloat(String(effectiveVal).replace(/[^0-9.]/g, ''));
    displayHtml = effectiveVal && !isNaN(num) ? `₱${num.toLocaleString()}` : '—';
  } else if (col.type === 'date') {
    displayHtml = isOverridden ? (effectiveVal || '—') : (effectiveVal ? fmtDate(effectiveVal) : '—');
  } else if (col.type === 'url') {
    displayHtml = effectiveVal
      ? `<a href="${escAttr(effectiveVal)}" target="_blank" rel="noopener" style="color:var(--primary);word-break:break-all">${escAttr(effectiveVal)}</a>`
      : '—';
  } else if (col.type === 'status-dropdown') {
    if (effectiveVal) {
      const key = STATUS_LABEL_TO_KEY[effectiveVal] || hsStatusToLocal(d.clientStatus, d.stage);
      displayHtml = statusBadge(key);
    } else { displayHtml = '—'; }
  } else {
    displayHtml = effectiveVal || '—';
  }

  const editVal = isOverridden ? ov
    : (col.type === 'date' && effectiveVal) ? fmtDate(effectiveVal)
    : effectiveVal;

  const resetBtn = (isOverridden && col.hsField !== null)
    ? `<button class="dash-reset-btn" data-hsid="${escAttr(d.id)}" data-field="${escAttr(col.key)}" title="Reset to HubSpot value">↩</button>`
    : '';

  const cls = [
    'dash-cell',
    isOverridden ? 'dash-cell-overridden' : '',
    (canEdit && col.editable) ? 'dash-cell-editable' : '',
  ].filter(Boolean).join(' ');

  return `<td class="${cls}" data-hsid="${escAttr(d.id)}" data-field="${escAttr(col.key)}" data-col-type="${col.type}" data-edit-val="${escAttr(String(editVal))}">${displayHtml}${resetBtn}</td>`;
}

function syncHubspotAssignedTo(deals) {
  const existing = getProjects();
  let changed = false;
  deals.forEach(deal => {
    const proj = existing.find(p => p.hubspotId === deal.id || p.id === `hs_${deal.id}`);
    if (!proj) return;
    function resolveToLocalUser(raw) {
      if (!raw) return null;
      return cachedUsers.find(u =>
        (u.hubspotOwnerId && u.hubspotOwnerId === raw) ||
        (u.email && u.email.toLowerCase() === raw.toLowerCase())
      ) || null;
    }
    const implUsers = [
      resolveToLocalUser(deal.hrImplementerRaw),
      resolveToLocalUser(deal.payrollImplementerRaw),
      resolveToLocalUser(deal.payrollMasterRaw),
      resolveToLocalUser(deal.softwareImplementerRaw),
    ].filter(Boolean);
    const hsAssigned = [...new Set(implUsers.map(u => u.id))];
    const manuallyAdded = (proj.assignedTo || []).filter(id =>
      !hsAssigned.includes(id) && id !== proj.projectManager
    );
    const newAssignedTo = [...new Set([...hsAssigned, ...manuallyAdded])];
    const prev = JSON.stringify((proj.assignedTo || []).slice().sort());
    const next = JSON.stringify(newAssignedTo.slice().sort());
    if (prev !== next) { proj.assignedTo = newAssignedTo; changed = true; }
  });
  if (changed) saveProjects(existing);
}

function refreshDashboard() {
  const container = document.getElementById('page-container');
  renderAdminDashboard(container, true);
}

async function renderAdminDashboard(container, forceRefresh = false) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Implementation Admin Dashboard</h2><p>Welcome back, ${currentUser.name}! Here's your overview.</p></div>
    </div>
    <div style="padding:2rem;text-align:center;color:var(--txt-muted)">Loading HubSpot data…</div>
  `;

  // Load overrides and HubSpot deals in parallel
  let deals = [];
  let pipelineLabel = 'Implementation Pipeline';
  let hsError = null;

  [cachedDashboardOverrides] = await Promise.all([
    fetchDashboardOverrides(),
    (async () => {
      try {
        const res = await fetch(`/api/hubspot/deals${forceRefresh ? '?refresh=true' : ''}`);
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok) {
            deals = data.deals || [];
            pipelineLabel = data.pipeline || pipelineLabel;
            // Always sync assignedTo from HubSpot implementer fields
            syncHubspotAssignedTo(deals);
          }
          else hsError = data.error || 'Could not load HubSpot data.';
        } else { hsError = 'Server needs to be restarted.'; }
      } catch (e) { hsError = 'Could not reach HubSpot. Check your token or network.'; }
    })(),
  ]);

  const users     = cachedUsers.filter(u => u.role !== 'super_admin');
  const ongoing   = deals.filter(d => !d.isCompleted);
  const completed = deals.filter(d => d.isCompleted);
  const pmSet     = new Set(deals.map(d => resolveOwner(d)).filter(Boolean));

  // Pre-compute segment-aware counts (status Ongoing + stage Customer Onboarding)
  const _psCol  = DASH_COLS.find(c => c.key === 'projectStatus');
  const _stCol  = DASH_COLS.find(c => c.key === 'stage');
  const _segCol = DASH_COLS.find(c => c.key === 'segment');
  const _isOngoingCO = d =>
    getDashEffectiveVal(_psCol, d) === 'Ongoing' &&
    getDashEffectiveVal(_stCol, d) === 'Customer Onboarding';
  const _initOngoing = deals.filter(_isOngoingCO).length;
  const _initSME     = deals.filter(d => _isOngoingCO(d) && ['micro','sme'].includes(String(getDashEffectiveVal(_segCol, d) || '').toLowerCase())).length;
  const _initENT     = deals.filter(d => _isOngoingCO(d) && String(getDashEffectiveVal(_segCol, d) || '').toLowerCase() === 'ent').length;

  const canEdit    = can('edit_dashboard_fields');
  // Default filters: Ongoing projects in Customer Onboarding stage
  const colFilters = {
    projectStatus: new Set(['Ongoing']),
    stage: new Set(['Customer Onboarding']),
  };

  const tableHeaders = DASH_COLS.map(c => `
    <th style="position:sticky;top:0;z-index:2;min-width:${c.minW};padding:0;background:var(--surface);border-bottom:2px solid var(--border)">
      <div style="display:flex;align-items:center;padding:.4rem .55rem;gap:.2rem">
        <span style="flex:1;font-size:.71rem;font-weight:600;font-family:var(--font-sub);text-transform:uppercase;letter-spacing:.04em;color:var(--txt-muted);white-space:nowrap">${c.label}</span>
        <button class="col-filter-btn" data-col="${c.key}" title="Filter" style="background:none;border:none;cursor:pointer;font-size:.6rem;padding:2px 3px;border-radius:3px;line-height:1;flex-shrink:0;color:var(--txt-muted)">&#9660;</button>
      </div>
    </th>`).join('');

  container.innerHTML = `
    <div class="page-header" style="background:linear-gradient(135deg,#092903 0%,#0d3d05 30%,#1a6b0a 60%,#32CE13 100%);border-radius:var(--radius);padding:1.2rem 1.6rem;margin-bottom:1.5rem;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(50,206,19,.07) 0px,rgba(50,206,19,.07) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(0deg,rgba(50,206,19,.07) 0px,rgba(50,206,19,.07) 1px,transparent 1px,transparent 40px);pointer-events:none"></div>
      <div style="position:relative;z-index:1">
        <h2 style="color:#fff;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 12px rgba(255,255,255,.4),0 0 24px rgba(50,206,19,.3);margin:0 0 .2rem">&#9654; Implementation Admin Dashboard</h2>
        <p style="color:rgba(255,255,255,.75);margin:0;font-size:.88rem">Welcome back, ${currentUser.name}! Live data from <strong style="color:#D2F612">${pipelineLabel}</strong>.</p>
      </div>
      <div style="display:flex;gap:.5rem;position:relative;z-index:1">
        <button class="btn btn-ghost btn-sm" onclick="refreshDashboard()" title="Refresh" style="color:#fff;border-color:rgba(255,255,255,.3)">&#8635; Refresh</button>
        <button class="sidekick-dashboard-btn" id="dashboard-ai-btn" title="Sidekick Dashboard Assistant"><img src="/Sidekick.png" alt="Sidekick"> Sidekick</button>
      </div>
    </div>

    ${hsError ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:.9rem 1.2rem;border-radius:8px;margin-bottom:1.5rem;font-size:.9rem">&#9888; HubSpot: ${hsError}</div>` : ''}

    ${announcementBannerHtml()}

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon" style="background:#ede9fe">&#128193;</div><div><div class="stat-label">Ongoing Projects</div><div class="stat-value" id="stat-val-companies">${_initOngoing}</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#d1fae5">&#9889;</div><div><div class="stat-label">Total MRR</div><div class="stat-value" id="stat-val-mrr" style="font-size:1.1rem">₱${deals.reduce((s,d)=>s+(Number(d.amount)||0),0).toLocaleString()}</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#fef9c3">&#127981;</div><div><div class="stat-label">Ongoing SME & Micro</div><div class="stat-value" id="stat-val-sme">${_initSME}</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#fce7f3">&#127970;</div><div><div class="stat-label">Ongoing ENT Projects</div><div class="stat-value" id="stat-val-ent">${_initENT}</div></div></div>
    </div>

    <div class="card">
      <div class="card-header" style="background:linear-gradient(135deg,#092903 0%,#0d3d05 30%,#1a6b0a 60%,#32CE13 100%);border-bottom:none;padding:1.1rem 1.4rem;position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(50,206,19,.07) 0px,rgba(50,206,19,.07) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(0deg,rgba(50,206,19,.07) 0px,rgba(50,206,19,.07) 1px,transparent 1px,transparent 40px);pointer-events:none"></div>
        <h3 style="color:#ffffff;font-size:1rem;font-weight:700;font-family:var(--font-sub);letter-spacing:.08em;text-transform:uppercase;text-shadow:0 0 12px rgba(255,255,255,.4),0 0 24px rgba(50,206,19,.3);position:relative;z-index:1">&#9654; Implementation Projects</h3>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.6rem;padding:.8rem 1.2rem;border-bottom:1px solid var(--border);align-items:center">
        <input id="dash-search" type="text" placeholder="Search company…" style="padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt);min-width:180px" />
        <button id="dash-clear-filters" style="padding:.4rem .9rem;border:1px solid var(--border);border-radius:6px;font-size:.78rem;font-weight:600;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt-muted);cursor:pointer;white-space:nowrap">✕ Clear Filters</button>
        ${currentUser.role === 'super_admin' ? `
        <div class="export-wrap" id="dash-export-wrap" style="position:relative;margin-left:auto">
          <button id="dash-export-btn" class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:.4rem;white-space:nowrap">
            &#8659; Export <span style="font-size:.65rem;opacity:.8">▼</span>
          </button>
          <div id="dash-export-menu" class="export-menu" style="min-width:150px">
            <button id="dash-export-csv-btn"   class="export-menu-item">📄 CSV</button>
            <button id="dash-export-excel-btn" class="export-menu-item">📊 Excel (.xlsx)</button>
            <button id="dash-export-pdf-btn"   class="export-menu-item">📑 PDF</button>
          </div>
        </div>` : ''}
      </div>

      <!-- Analytics charts -->
      <div id="dash-analytics" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;padding:.5rem 1.2rem;border-bottom:1px solid var(--border)">
        <div style="background:var(--bg);border-radius:8px;padding:.5rem">
          <div style="font-size:.68rem;font-weight:700;color:var(--txt-muted);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">By Segment</div>
          <div style="position:relative;height:90px"><canvas id="chart-segment"></canvas></div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:.5rem">
          <div style="font-size:.68rem;font-weight:700;color:var(--txt-muted);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">By Project Manager</div>
          <div style="position:relative;height:90px"><canvas id="chart-pm"></canvas></div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:.5rem">
          <div style="font-size:.68rem;font-weight:700;color:var(--txt-muted);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em">By Milestone</div>
          <div style="position:relative;height:90px"><canvas id="chart-milestone"></canvas></div>
        </div>
      </div>

      ${canEdit ? `<div style="padding:.35rem 1.2rem;font-size:.73rem;color:var(--txt-muted);border-bottom:1px solid var(--border);background:var(--bg)">&#9998; Double-click to edit &nbsp;·&nbsp; Click to select &nbsp;·&nbsp; Shift+Click for range &nbsp;·&nbsp; Ctrl+C / Ctrl+V to copy &amp; paste &nbsp;·&nbsp; <span style="display:inline-block;width:6px;height:6px;background:#32CE13;border-radius:50%;vertical-align:middle;margin-right:2px"></span> = manually updated</div>` : ''}

      <div id="dashboard-tbody-wrap" class="table-wrap" style="max-height:480px;overflow:auto;cursor:grab;user-select:none">
        <table style="white-space:nowrap;min-width:5800px;table-layout:auto;font-size:.73rem">
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody id="dashboard-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const chartInstances = {};
  const CHART_COLORS = ['#32CE13','#8139EE','#1679FA','#FF7F00','#092903','#D2F612','#ef4444','#10b981','#f59e0b','#3b82f6'];

  function buildChart(id, type, labels, data) {
    if (chartInstances[id]) chartInstances[id].destroy();
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    const bgColors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
    chartInstances[id] = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{
          label: '',
          data,
          backgroundColor: bgColors,
          borderWidth: type === 'doughnut' ? 2 : 0,
          borderRadius: type === 'bar' ? 4 : 0,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: type === 'doughnut',
            position: 'right',
            labels: { font: { size: 9 }, boxWidth: 8, padding: 4, color: '#607060' },
          },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed ?? c.parsed.y}` } },
        },
        scales: type === 'bar' ? {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 9 }, color: '#607060' }, grid: { color: '#e8f5e9' } },
          x: { ticks: { font: { size: 9 }, color: '#607060' }, grid: { display: false } },
        } : {},
      },
    });
  }

  function updateColFilterBtns() {
    document.querySelectorAll('.col-filter-btn').forEach(btn => {
      const active = colFilters[btn.dataset.col]?.size > 0;
      btn.style.color      = active ? 'var(--primary)' : 'var(--txt-muted)';
      btn.style.fontWeight = active ? '700' : '';
    });
  }

  function renderDashboardRows() {
    const search = document.getElementById('dash-search')?.value.toLowerCase() || '';
    const filtered = deals.filter(d => {
      if (search && !d.name.toLowerCase().includes(search)) return false;
      return DASH_COLS.every(col => {
        const sel = colFilters[col.key];
        if (!sel || sel.size === 0) return true;
        return sel.has(String(getDashEffectiveVal(col, d) ?? ''));
      });
    });

    // ── Table ──
    const tbody = document.getElementById('dashboard-tbody');
    if (tbody) {
      tbody.innerHTML = filtered.length
        ? filtered.map(d => `<tr>${DASH_COLS.map(col => renderDashCell(col, d, canEdit)).join('')}</tr>`).join('')
        : `<tr><td colspan="${DASH_COLS.length}" class="empty-state">${hsError ? 'Could not load deals.' : 'No results found.'}</td></tr>`;
      // Re-apply cell selection highlights after re-render
      _dashSelCells.forEach((oldTd, key) => {
        const [hId, fld] = key.split('::');
        const newTd = tbody?.querySelector(`td[data-hsid="${hId}"][data-field="${fld}"]`);
        if (newTd) { newTd.classList.add('dash-cell-selected'); _dashSelCells.set(key, newTd); }
        else _dashSelCells.delete(key);
      });
    }

    // Track filtered data for export
    _exportDashboard = filtered.map(d => {
      const row = { _hsId: d.id };
      DASH_COLS.forEach(col => { row[col.key] = getDashEffectiveVal(col, d); });
      return row;
    });

    // ── Stat cards ──
    const totalMRR    = filtered.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const filteredOngoing = filtered.filter(_isOngoingCO).length;
    const filteredSME     = filtered.filter(d => _isOngoingCO(d) && ['micro','sme'].includes(String(getDashEffectiveVal(_segCol, d) || '').toLowerCase())).length;
    const filteredENT     = filtered.filter(d => _isOngoingCO(d) && String(getDashEffectiveVal(_segCol, d) || '').toLowerCase() === 'ent').length;
    const elCompanies = document.getElementById('stat-val-companies');
    const elMRR       = document.getElementById('stat-val-mrr');
    const elSME       = document.getElementById('stat-val-sme');
    const elENT       = document.getElementById('stat-val-ent');
    if (elCompanies) elCompanies.textContent = filteredOngoing;
    if (elMRR)       elMRR.textContent       = `₱${totalMRR.toLocaleString()}`;
    if (elSME)       elSME.textContent       = filteredSME;
    if (elENT)       elENT.textContent       = filteredENT;

    // ── Charts ──
    const count = (arr, keyFn) => arr.reduce((acc, d) => { const k = keyFn(d) || 'Unknown'; acc[k] = (acc[k]||0)+1; return acc; }, {});

    const bySegment = count(filtered, d => {
      const seg = String(getDashEffectiveVal(_segCol, d) || '').toUpperCase();
      return seg || 'Unknown';
    });
    buildChart('chart-segment', 'doughnut', Object.keys(bySegment), Object.values(bySegment));

    const byPM = count(filtered, d => resolveOwner(d) || 'Unassigned');
    buildChart('chart-pm', 'bar', Object.keys(byPM), Object.values(byPM));

    const byMilestone = {};
    filtered.forEach(d => {
      const m = (cachedDashboardOverrides[d.id] || {}).milestone;
      if (m) byMilestone[m] = (byMilestone[m] || 0) + 1;
    });
    if (Object.keys(byMilestone).length) buildChart('chart-milestone', 'bar', Object.keys(byMilestone), Object.values(byMilestone));

    _exportDashboardCharts = { bySegment, byPM };
    updateColFilterBtns();
  }

  _activeDashRender = renderDashboardRows;
  renderDashboardRows();

  // ── Inline cell editing ───────────────────────────────────────
  if (canEdit) {
    let _dashDragged = false;
    const editTbody = document.getElementById('dashboard-tbody');

    document.getElementById('dashboard-tbody-wrap').addEventListener('mousedown', () => { _dashDragged = false; });
    document.getElementById('dashboard-tbody-wrap').addEventListener('mousemove', () => { _dashDragged = true; });

    // Clear selection when clicking outside editable cells
    document.getElementById('dashboard-tbody-wrap').addEventListener('mousedown', e => {
      if (!e.target.closest('td.dash-cell-editable') && !e.target.closest('.dash-reset-btn')) {
        _dashClearSel();
      }
    });

    editTbody.addEventListener('click', e => {
      if (_dashDragged) return;

      // Reset button
      const resetBtn = e.target.closest('.dash-reset-btn');
      if (resetBtn) {
        e.stopPropagation();
        const hsId  = resetBtn.dataset.hsid;
        const field = resetBtn.dataset.field;
        const ov = cachedDashboardOverrides[hsId] || {};
        delete ov[field];
        if (!Object.keys(ov).length) delete cachedDashboardOverrides[hsId];
        else cachedDashboardOverrides[hsId] = ov;
        renderDashboardRows();
        fetch(`/api/dashboard-overrides/${encodeURIComponent(hsId)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, reset: true }),
        }).catch(() => {});
        return;
      }

      // Single click on editable cell → select
      const td = e.target.closest('td.dash-cell-editable');
      if (!td || td.dataset.editing) return;
      if (e.shiftKey) {
        _dashRangeSelect(td, editTbody);
      } else {
        _dashSelectOne(td);
      }
    });

    editTbody.addEventListener('dblclick', e => {
      if (_dashDragged) return;
      const td = e.target.closest('td.dash-cell-editable');
      if (!td || td.dataset.editing) return;
      _dashClearSel();
      td.dataset.editing = '1';

      const hsId    = td.dataset.hsid;
      const field   = td.dataset.field;
      const cType   = td.dataset.colType;
      const curVal  = td.dataset.editVal || '';
      const origHtml = td.innerHTML;
      const dealForAudit = deals.find(d => String(d.id) === String(hsId));

      const cancelEdit = () => { delete td.dataset.editing; td.innerHTML = origHtml; };

      const finishEdit = async (newVal) => {
        delete td.dataset.editing;
        if (newVal === curVal) { td.innerHTML = origHtml; return; }
        const ov = cachedDashboardOverrides[hsId] || {};
        if (newVal === '') {
          delete ov[field];
          if (!Object.keys(ov).length) delete cachedDashboardOverrides[hsId];
          else cachedDashboardOverrides[hsId] = ov;
        } else {
          ov[field] = newVal;
          cachedDashboardOverrides[hsId] = ov;
        }
        renderDashboardRows();
        const col = DASH_COLS.find(c => c.key === field);
        logAudit('dashboard.field_edit',
          `${col?.label || field}: "${curVal || '—'}" → "${newVal || '—'}" on ${dealForAudit?.name || hsId}`,
          { hsId, field, from: curVal, to: newVal, company: dealForAudit?.name || hsId }
        );
        fetch(`/api/dashboard-overrides/${encodeURIComponent(hsId)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newVal === '' ? { field, reset: true } : { field, value: newVal }),
        }).catch(() => {});
      };

      if (cType === 'status-dropdown' || cType === 'milestone-dropdown') {
        const sel = document.createElement('select');
        sel.style.cssText = 'width:100%;font-size:.82rem;font-family:inherit;border:1px solid var(--primary);border-radius:3px;background:var(--bg);color:var(--txt);padding:1px 2px';
        const options = cType === 'status-dropdown' ? DASH_STATUS_OPTIONS : ['', ...MILESTONES];
        options.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s; opt.textContent = s || '— None —';
          if (s === curVal || (!s && !curVal)) opt.selected = true;
          sel.appendChild(opt);
        });
        let saved = false;
        sel.addEventListener('change', () => { saved = true; finishEdit(sel.value); });
        sel.addEventListener('blur',   () => { if (!saved) cancelEdit(); });
        sel.addEventListener('keydown', ev => { if (ev.key === 'Escape') { saved = true; cancelEdit(); } });
        td.innerHTML = ''; td.appendChild(sel); sel.focus();
      } else {
        const inp = document.createElement('input');
        inp.type  = 'text';
        inp.value = curVal === '—' ? '' : curVal;
        inp.style.cssText = 'width:100%;border:1px solid var(--primary);border-radius:3px;padding:1px 4px;font-size:.82rem;font-family:inherit;background:var(--bg);color:var(--txt);box-sizing:border-box';
        inp.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
          if (ev.key === 'Escape') { cancelEdit(); inp.removeEventListener('blur', blurHandler); }
        });
        const blurHandler = () => finishEdit(inp.value.trim());
        inp.addEventListener('blur', blurHandler);
        td.innerHTML = ''; td.appendChild(inp); inp.focus(); inp.select();
      }
    });
  }

  // ── Drag-to-scroll ────────────────────────────────────────────
  const scroller = document.getElementById('dashboard-tbody-wrap');
  if (scroller) {
    let isDown = false, startX, startY, scrollLeft, scrollTop;
    scroller.addEventListener('mousedown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      isDown = true;
      startX = e.pageX - scroller.offsetLeft; scrollLeft = scroller.scrollLeft;
      startY = e.pageY - scroller.offsetTop;  scrollTop  = scroller.scrollTop;
      scroller.style.cursor = 'grabbing';
    });
    scroller.addEventListener('mouseleave', () => { isDown = false; scroller.style.cursor = 'grab'; });
    scroller.addEventListener('mouseup',    () => { isDown = false; scroller.style.cursor = 'grab'; });
    scroller.addEventListener('mousemove',  e => {
      if (!isDown) return;
      e.preventDefault();
      scroller.scrollLeft = scrollLeft - (e.pageX - scroller.offsetLeft - startX);
      scroller.scrollTop  = scrollTop  - (e.pageY - scroller.offsetTop  - startY);
    });
  }

  // Search
  document.getElementById('dash-search').addEventListener('input', renderDashboardRows);

  // Clear all filters
  document.getElementById('dash-clear-filters').addEventListener('click', () => {
    document.getElementById('dash-search').value = '';
    Object.keys(colFilters).forEach(k => delete colFilters[k]);
    closeColFilterPopup();
    renderDashboardRows();
  });

  // ── Column filter popup ───────────────────────────────────────
  let activeColKey = null;

  function closeColFilterPopup() {
    const existing = document.getElementById('col-filter-popup');
    if (existing) existing.remove();
    activeColKey = null;
  }

  function openColFilterPopup(btn, colKey) {
    if (activeColKey === colKey) { closeColFilterPopup(); return; }
    closeColFilterPopup();

    const col = DASH_COLS.find(c => c.key === colKey);
    if (!col) return;
    activeColKey = colKey;

    // Values available given all OTHER column filters + search
    const search = document.getElementById('dash-search')?.value.toLowerCase() || '';
    const otherDeals = deals.filter(d => {
      if (search && !d.name.toLowerCase().includes(search)) return false;
      return DASH_COLS.every(c => {
        if (c.key === colKey) return true;
        const sel = colFilters[c.key];
        if (!sel || sel.size === 0) return true;
        return sel.has(String(getDashEffectiveVal(c, d) ?? ''));
      });
    });

    const allValues = [...new Set(otherDeals.map(d => String(getDashEffectiveVal(col, d) ?? '')).filter(v => v))].sort();
    const selected  = colFilters[colKey] || new Set();

    const popup = document.createElement('div');
    popup.id = 'col-filter-popup';
    popup.style.cssText = 'position:fixed;z-index:99999;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);min-width:220px;padding:.4rem 0;font-family:Rubik,sans-serif';

    popup.innerHTML = `
      <div style="padding:.35rem .7rem .3rem;border-bottom:1px solid var(--border)">
        <div style="font-size:.72rem;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.3rem">${col.label}</div>
        <input id="cfd-search" placeholder="Search values…" autocomplete="off" style="width:100%;box-sizing:border-box;padding:.28rem .5rem;border:1px solid var(--border);border-radius:5px;font-size:.78rem;background:var(--bg);color:var(--txt);font-family:Rubik,sans-serif">
      </div>
      <div style="padding:.25rem .7rem;display:flex;align-items:center;border-bottom:1px solid var(--border)">
        <label style="font-size:.75rem;color:var(--txt-muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;user-select:none">
          <input type="checkbox" id="cfd-select-all" style="accent-color:var(--primary)"> Select All
        </label>
      </div>
      <div id="cfd-list" style="max-height:200px;overflow-y:auto;padding:.2rem 0"></div>
      <div style="padding:.4rem .7rem;border-top:1px solid var(--border);display:flex;gap:.4rem">
        <button id="cfd-clear" style="flex:1;padding:.3rem;border:1px solid var(--border);border-radius:5px;font-size:.75rem;background:var(--bg);color:var(--txt-muted);cursor:pointer;font-family:Rubik,sans-serif">Clear</button>
        <button id="cfd-done"  style="flex:1;padding:.3rem;border:none;border-radius:5px;font-size:.75rem;background:var(--primary);color:#fff;cursor:pointer;font-weight:600;font-family:Rubik,sans-serif">Done</button>
      </div>`;

    document.body.appendChild(popup);

    function renderList(searchTerm = '') {
      const list = document.getElementById('cfd-list');
      if (!list) return;
      const vals = searchTerm ? allValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase())) : allValues;
      if (!vals.length) {
        list.innerHTML = `<div style="padding:.4rem .7rem;font-size:.78rem;color:var(--txt-muted);font-style:italic">No values</div>`;
        return;
      }
      list.innerHTML = vals.map(v => `
        <label style="display:flex;align-items:center;gap:.5rem;padding:.28rem .7rem;font-size:.78rem;cursor:pointer;white-space:nowrap;user-select:none">
          <input type="checkbox" class="cfd-cb" value="${v.replace(/"/g,'&quot;')}" ${selected.has(v) ? 'checked' : ''} style="accent-color:var(--primary)">
          <span style="overflow:hidden;text-overflow:ellipsis;max-width:170px" title="${v}">${v || '(blank)'}</span>
        </label>`).join('');
    }

    renderList();

    // Position popup below the button, keep on screen
    const rect = btn.getBoundingClientRect();
    popup.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
    popup.style.top  = (rect.bottom + 4) + 'px';

    // Select All initial state
    const selectAllCb = document.getElementById('cfd-select-all');
    selectAllCb.checked = selected.size === 0 || selected.size === allValues.length;

    document.getElementById('cfd-search').addEventListener('input', e => {
      renderList(e.target.value);
    });

    selectAllCb.addEventListener('change', () => {
      document.querySelectorAll('#cfd-list .cfd-cb').forEach(cb => { cb.checked = selectAllCb.checked; });
    });

    document.getElementById('cfd-list').addEventListener('change', () => {
      const checkedCount = document.querySelectorAll('#cfd-list .cfd-cb:checked').length;
      selectAllCb.checked = checkedCount === allValues.length;
    });

    document.getElementById('cfd-clear').addEventListener('click', () => {
      delete colFilters[colKey];
      closeColFilterPopup();
      renderDashboardRows();
    });

    document.getElementById('cfd-done').addEventListener('click', () => {
      const checked = [...document.querySelectorAll('#cfd-list .cfd-cb:checked')].map(cb => cb.value);
      if (checked.length === 0 || checked.length === allValues.length) {
        delete colFilters[colKey];
      } else {
        colFilters[colKey] = new Set(checked);
      }
      closeColFilterPopup();
      renderDashboardRows();
    });

    popup.addEventListener('click', e => e.stopPropagation());
  }

  // Delegate col-filter-btn clicks via the thead row
  document.querySelector('#dashboard-tbody-wrap thead').addEventListener('click', e => {
    const btn = e.target.closest('.col-filter-btn');
    if (!btn) return;
    e.stopPropagation();
    openColFilterPopup(btn, btn.dataset.col);
  });

  document.addEventListener('click', closeColFilterPopup);

  // Export button wiring (super_admin only)
  if (currentUser.role === 'super_admin') {
    const exportBtn  = document.getElementById('dash-export-btn');
    const exportMenu = document.getElementById('dash-export-menu');
    exportBtn?.addEventListener('click', e => {
      e.stopPropagation();
      exportMenu.classList.toggle('open');
    });
    document.getElementById('page-container').addEventListener('click', e => {
      if (!e.target.closest('#dash-export-wrap')) exportMenu?.classList.remove('open');
    });
    document.getElementById('dash-export-csv-btn')  ?.addEventListener('click', () => { exportDashboardCSV();   exportMenu.classList.remove('open'); });
    document.getElementById('dash-export-excel-btn')?.addEventListener('click', () => { exportDashboardExcel(); exportMenu.classList.remove('open'); });
    document.getElementById('dash-export-pdf-btn')  ?.addEventListener('click', () => { exportDashboardPDF();   exportMenu.classList.remove('open'); });
  }

  const aiBtn = document.getElementById('dashboard-ai-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => openDashboardChatModal({
      total: deals.length, ongoing: ongoing.length, completed: completed.length,
      teamMembers: users.length, projectManagers: pmSet.size,
      projects: deals.map(d => ({
        title: d.name, status: hsStatusToLocal(d.clientStatus, d.stage),
        pm: resolveOwner(d) || 'Unassigned', stage: d.stage, mrr: d.amount,
      })),
    }));
  }

  // Attach announcement dismiss handlers
  attachAnnouncementDismiss(container);

  // Daily briefing card (uses localStorage projects for risk analysis)
  const localProjects = getProjects();
  const briefingTarget = document.querySelector('#page-container .page-header');
  if (briefingTarget) {
    await renderDailyBriefingCard(
      briefingTarget.parentElement,
      localProjects.map(p => ({
        title:     p.title,
        status:    p.status,
        dueDate:   p.dueDate || null,
        milestones: p.milestones || {},
      })),
      { total: deals.length, ongoing: ongoing.length, completed: completed.length }
    );
  }
}

// ── ADMIN PROJECTS ────────────────────────────────────────────
async function renderAdminProjects(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>Implementation Projects</h2><p>Manage all projects across your team.</p></div>
      <div class="flex-gap">
        <button class="btn btn-primary" id="new-project-btn">+ New Project</button>
      </div>
    </div>
    <div style="padding:2rem;text-align:center;color:var(--txt-muted)">Loading projects…</div>
  `;

  // Pull HubSpot deals and auto-add any with a matched PM that aren't in localStorage yet

  try {
    const res = await fetch('/api/hubspot/deals');
    if (res.ok) {
      const data = await res.json();
      const deals = data.deals || [];
      const existing = getProjects();
      let changed = false;
      deals.forEach(deal => {
        const matchedUser = deal.ownerHubspotId
          ? cachedUsers.find(u => u.hubspotOwnerId && u.hubspotOwnerId === deal.ownerHubspotId)
          : null;
        const mappedStatus = hsStatusToLocal(deal.clientStatus, deal.stage);
        const proj = existing.find(p => p.hubspotId === deal.id);
        const coPmUser = deal.coProjectManagerHsId
          ? cachedUsers.find(u => u.hubspotOwnerId && u.hubspotOwnerId === deal.coProjectManagerHsId)
          : null;

        // Resolve implementer fields (HubSpot ID or email) to local user IDs
        function resolveToLocalUser(raw) {
          if (!raw) return null;
          return cachedUsers.find(u =>
            (u.hubspotOwnerId && u.hubspotOwnerId === raw) ||
            (u.email && u.email.toLowerCase() === raw.toLowerCase())
          ) || null;
        }
        const hrsiUser   = resolveToLocalUser(deal.hrImplementerRaw);
        const psiUser    = resolveToLocalUser(deal.payrollImplementerRaw);
        const pmasterUser = resolveToLocalUser(deal.payrollMasterRaw);
        const softImplUser = resolveToLocalUser(deal.softwareImplementerRaw);
        const implUsers = [hrsiUser, psiUser, pmasterUser, softImplUser].filter(Boolean);

        const assignedTo = [...new Set([
          ...(coPmUser ? [coPmUser.id] : []),
          ...implUsers.map(u => u.id),
        ])];

        const teamRoles = {
          hrsi:         { id: hrsiUser?.id    || null, name: deal.hrImplementer    || null },
          psi:          { id: psiUser?.id     || null, name: deal.payrollImplementer || null },
          payrollMaster:{ id: pmasterUser?.id || null, name: deal.payrollMaster    || null },
          softwareImpl: { id: softImplUser?.id|| null, name: deal.softwareImplementer || null },
        };

        if (!proj) {
          existing.push({
            id:                   `hs_${deal.id}`,
            title:                deal.name,
            description:          `Synced from HubSpot — ${deal.stage}`,
            status:               mappedStatus,
            priority:             'medium',
            projectType:          'client',
            projectManager:       matchedUser ? matchedUser.id : null,
            hubspotOwnerId:       deal.ownerHubspotId,
            coProjectManagerHsId: deal.coProjectManagerHsId || null,
            assignedTo,
            teamRoles,
            dueDate:              '',
            progress:             0,
            createdBy:            'hubspot',
            hubspotId:            deal.id,
            hubspotStage:         deal.stage,
            syncedAt:             new Date().toISOString(),
          });
          changed = true;
        } else {
          // Always update status, PM, assignedTo, and teamRoles to stay in sync with HubSpot
          const newPmId = matchedUser ? matchedUser.id : (proj.projectManager || null);
          // Implementers from HubSpot fields (always recalculate)
          const hsAssigned = [...new Set(implUsers.map(u => u.id))];
          // Preserve manually-added team members that aren't HubSpot-driven
          const manuallyAdded = (proj.assignedTo || []).filter(id =>
            !hsAssigned.includes(id) && id !== newPmId
          );
          const newAssignedTo = [...new Set([...hsAssigned, ...manuallyAdded])];
          proj.status         = mappedStatus;
          proj.projectManager = newPmId;
          if (!proj.syncedAt) proj.syncedAt = new Date().toISOString();
          proj.assignedTo     = newAssignedTo;
          proj.teamRoles      = teamRoles;
          changed = true;
        }
      });
      if (changed) saveProjects(existing);
      // Also re-resolve PMs on existing HubSpot projects
      applyHubspotOwnerMappings();
    }
  } catch (e) { /* HubSpot unreachable — show local projects only */ }

  const projects = getProjects().filter(p => p.projectManager || p.createdBy === 'hubspot');

  // Load hubs map for hub indicator badges
  try {
    const hubsRes = await fetch('/api/resource-hub');
    if (hubsRes.ok) {
      _hubsMap = {};
      (await hubsRes.json()).forEach(h => { _hubsMap[h.projectId] = h; });
    }
  } catch (e) { /* non-fatal */ }

  // Build unique PM options
  const pmMap = {};
  projects.forEach(p => { pmMap[p.projectManager] = projectManagerDisplay(p.projectManager); });
  const pmOptions = Object.entries(pmMap).sort((a,b) => a[1].localeCompare(b[1]))
    .map(([k,v]) => `<option value="${k}">${v}</option>`).join('');

  // Build unique Assigned To options
  const assigneeMap = {};
  projects.forEach(p => (p.assignedTo || []).forEach(uid => {
    assigneeMap[uid] = projectManagerDisplay(uid);
  }));
  const statusItems    = STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }));
  const typeItems      = [{ value: 'client', label: 'Client' }, { value: 'internal', label: 'Internal' }];
  const pmItems        = Object.entries(pmMap).sort((a,b) => a[1].localeCompare(b[1])).map(([v,l]) => ({ value: v, label: l }));
  const assigneeItems  = Object.entries(assigneeMap).sort((a,b) => a[1].localeCompare(b[1])).map(([v,l]) => ({ value: v, label: l }));
  const milestoneItems = [...MILESTONES.map(m => ({ value: m, label: m })), { value: '__complete__', label: 'Complete' }];
  const filterTitleStyle = 'padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)';

  _exportProjects = projects;
  _selectedProjectIds.clear();

  container.innerHTML = `
    <div class="page-header">
      <div><h2>Implementation Projects</h2><p>Manage all projects across your team.</p></div>
      <div class="flex-gap">
        <div class="export-wrap">
          <button class="btn btn-ghost" id="export-toggle-btn">&#8615; Export &#9660;</button>
          <div class="export-menu" id="export-menu">
            <button id="export-csv-btn">&#128196; CSV</button>
            <button id="export-excel-btn">&#128200; Excel (.xlsx)</button>
            <button id="export-pdf-btn">&#128247; PDF</button>
          </div>
        </div>
        <button class="btn btn-ghost" onclick="openBulkImportProjectsModal()">&#8679; Import Projects</button>
        <button class="btn btn-primary" id="new-project-btn">+ New Project</button>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem;align-items:center">
      <input id="filter-title" type="text" placeholder="Search title…" style="${filterTitleStyle};min-width:160px">
      ${buildMultiSelect('proj-filter-status',    'Statuses',         statusItems)}
      ${buildMultiSelect('proj-filter-type',      'Type',             typeItems)}
      ${buildMultiSelect('proj-filter-pm',        'Project Managers', pmItems)}
      ${buildMultiSelect('proj-filter-assignee',  'Assigned To',      assigneeItems)}
      ${buildMultiSelect('proj-filter-milestone', 'Milestones',       milestoneItems)}
      <button class="btn btn-ghost btn-sm" id="clear-proj-filters">&#10005; Clear</button>
    </div>
    <div class="bulk-bar" id="bulk-bar">
      <span><span class="bulk-count" id="bulk-count">0</span> row(s) selected — use Export &#8615; above to download</span>
      <button class="btn btn-danger btn-sm" id="bulk-delete-btn">&#128465; Delete Selected</button>
      <button class="btn btn-ghost btn-sm" id="bulk-clear-btn" style="color:rgba(255,255,255,.7)">&#10005; Clear</button>
    </div>
    <div class="table-wrap card">
      <table>
        <thead><tr>
          <th style="width:36px"><input type="checkbox" id="select-all-projects" title="Select all"></th>
          <th>Title</th><th>Status</th><th>Type</th><th>Project Manager</th><th>Assigned To</th><th>Due Date</th><th>Progress</th><th>Hours</th><th>Actions</th>
        </tr></thead>
        <tbody id="projects-tbody">
          ${projectRows(projects)}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('new-project-btn').addEventListener('click', () => openProjectModal());


  const projFilterIds    = ['proj-filter-status','proj-filter-type','proj-filter-pm','proj-filter-assignee','proj-filter-milestone'];
  const projFilterLabels = { 'proj-filter-status': 'Statuses', 'proj-filter-type': 'Type', 'proj-filter-pm': 'Project Managers', 'proj-filter-assignee': 'Assigned To', 'proj-filter-milestone': 'Milestones' };

  function applyProjectFilters() {
    const title      = document.getElementById('filter-title').value.trim().toLowerCase();
    const statuses   = getMultiChecked('proj-filter-status');
    const types      = getMultiChecked('proj-filter-type');
    const pms        = getMultiChecked('proj-filter-pm');
    const assignees  = getMultiChecked('proj-filter-assignee');
    const milestones = getMultiChecked('proj-filter-milestone');

    const filtered = projects.filter(p => {
      if (title       && !p.title.toLowerCase().includes(title)) return false;
      if (statuses.length   && !statuses.includes(p.status)) return false;
      if (types.length      && !types.includes(p.projectType || 'internal')) return false;
      if (pms.length        && !pms.includes(p.projectManager)) return false;
      if (assignees.length  && !(p.assignedTo || []).some(id => assignees.includes(id))) return false;
      if (milestones.length) {
        const cur = getCurrentMilestone(p);
        const isComplete = cur === null;
        if (milestones.includes('__complete__') && milestones.length === 1 && !isComplete) return false;
        if (!milestones.includes('__complete__') && !milestones.includes(cur)) return false;
        if (milestones.includes('__complete__') && milestones.length > 1 && !isComplete && !milestones.includes(cur)) return false;
      }
      return true;
    });

    _exportProjects = filtered;
    _selectedProjectIds.clear();
    updateBulkBar();
    document.getElementById('select-all-projects').checked = false;
    document.getElementById('projects-tbody').innerHTML = projectRows(filtered);
    attachProjectRowHandlers();
  }

  document.getElementById('filter-title').addEventListener('input', applyProjectFilters);
  wireMultiSelects(projFilterIds, projFilterLabels, applyProjectFilters);

  document.getElementById('clear-proj-filters').addEventListener('click', () => {
    document.getElementById('filter-title').value = '';
    projFilterIds.forEach(id => {
      document.querySelectorAll(`.ms-cb[data-filter="${id}"]`).forEach(cb => cb.checked = false);
      updateMultiLabel(id, projFilterLabels[id]);
    });
    applyProjectFilters();
  });

  // Bulk bar setup
  function updateBulkBar() {
    const count = _selectedProjectIds.size;
    document.getElementById('bulk-bar').classList.toggle('visible', count > 0);
    document.getElementById('bulk-count').textContent = count;
    // Update export button label to reflect selection state
    const exportBtn = document.getElementById('export-toggle-btn');
    if (exportBtn) {
      exportBtn.innerHTML = count > 0
        ? `&#8615; Export (${count} selected) &#9660;`
        : `&#8615; Export &#9660;`;
    }
  }

  document.getElementById('select-all-projects').addEventListener('change', function () {
    document.querySelectorAll('.proj-checkbox').forEach(cb => {
      cb.checked = this.checked;
      this.checked ? _selectedProjectIds.add(cb.dataset.id) : _selectedProjectIds.delete(cb.dataset.id);
    });
    updateBulkBar();
  });

  document.getElementById('bulk-clear-btn').addEventListener('click', () => {
    _selectedProjectIds.clear();
    document.querySelectorAll('.proj-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('select-all-projects').checked = false;
    updateBulkBar();
  });

  document.getElementById('bulk-delete-btn').addEventListener('click', () => {
    const count = _selectedProjectIds.size;
    const modal = createModal(`
      <h3>&#128465; Delete ${count} Project${count > 1 ? 's' : ''}?</h3>
      <p style="color:var(--txt-muted);margin:.5rem 0 1.2rem">This cannot be undone.</p>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-danger" id="confirm-bulk-delete">Delete ${count}</button>
        <button class="btn btn-ghost" id="cancel-bulk-delete">Cancel</button>
      </div>`);
    document.getElementById('confirm-bulk-delete').addEventListener('click', () => {
      const deletedTitles = getProjects().filter(p => _selectedProjectIds.has(p.id)).map(p => p.title);
      const remaining = getProjects().filter(p => !_selectedProjectIds.has(p.id));
      saveProjects(remaining);
      logAudit('project.bulk_deleted', `Bulk deleted ${deletedTitles.length} project(s)`, { count: deletedTitles.length, titles: deletedTitles });
      _selectedProjectIds.clear();
      modal.remove();
      renderAdminProjects(document.getElementById('page-container'));
    });
    document.getElementById('cancel-bulk-delete').addEventListener('click', () => modal.remove());
  });

  // Export: use selected rows if any, otherwise all filtered
  function exportList() {
    return _selectedProjectIds.size > 0
      ? _exportProjects.filter(p => _selectedProjectIds.has(p.id))
      : _exportProjects;
  }

  document.getElementById('export-toggle-btn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('export-menu').classList.toggle('open');
  });
  document.getElementById('page-container').addEventListener('click', e => {
    if (!e.target.closest('.export-wrap')) document.getElementById('export-menu')?.classList.remove('open');
  });
  document.getElementById('export-csv-btn').addEventListener('click',   () => { exportProjectsCSV(exportList());   document.getElementById('export-menu').classList.remove('open'); });
  document.getElementById('export-excel-btn').addEventListener('click', () => { exportProjectsExcel(exportList()); document.getElementById('export-menu').classList.remove('open'); });
  document.getElementById('export-pdf-btn').addEventListener('click',   () => { exportProjectsPDF(exportList());   document.getElementById('export-menu').classList.remove('open'); });

  attachProjectRowHandlers();
}

function attachProjectRowHandlers() {
  document.querySelectorAll('.open-full-modal-link').forEach(b =>
    b.addEventListener('click', () => openProjectFullModal(b.dataset.id)));
  document.querySelectorAll('.proj-hub-badge').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); openResourceHubModal(b.dataset.id); }));
  document.querySelectorAll('.edit-project-btn').forEach(b =>
    b.addEventListener('click', () => openProjectModal(b.dataset.id)));
  document.querySelectorAll('.delete-project-btn').forEach(b =>
    b.addEventListener('click', () => deleteProject(b.dataset.id)));
  document.querySelectorAll('.proj-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? _selectedProjectIds.add(cb.dataset.id) : _selectedProjectIds.delete(cb.dataset.id);
      const count    = _selectedProjectIds.size;
      const bulkBar  = document.getElementById('bulk-bar');
      const exportBtn = document.getElementById('export-toggle-btn');
      if (bulkBar)  { bulkBar.classList.toggle('visible', count > 0); document.getElementById('bulk-count').textContent = count; }
      if (exportBtn) exportBtn.innerHTML = count > 0 ? `&#8615; Export (${count} selected) &#9660;` : `&#8615; Export &#9660;`;
      // Update select-all checkbox state
      const all = document.querySelectorAll('.proj-checkbox');
      const checked = document.querySelectorAll('.proj-checkbox:checked');
      const selectAll = document.getElementById('select-all-projects');
      if (selectAll) { selectAll.indeterminate = checked.length > 0 && checked.length < all.length; selectAll.checked = checked.length === all.length && all.length > 0; }
    });
  });
}

function projectRows(projects) {
  if (!projects.length) return '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">&#128193;</div>No projects found. Create one!</div></td></tr>';
  return projects.map(p => `
    <tr>
      <td><input type="checkbox" class="proj-checkbox" data-id="${p.id}" ${_selectedProjectIds.has(p.id) ? 'checked' : ''}></td>
      <td>
        <span class="open-full-modal-link" data-id="${p.id}" style="cursor:pointer;font-weight:700;color:var(--primary)">${p.title}</span>
        <div style="font-size:.78rem;color:var(--txt-muted);margin-top:.2rem">${p.description.slice(0,60)}${p.description.length>60?'…':''}</div>
        ${riskBadge(p)}
        ${(() => { const h = _hubsMap[p.id]; if (!h) return ''; return `<span class="proj-hub-badge ${h.isPublic ? 'proj-hub-active' : 'proj-hub-private'}" data-id="${p.id}" title="${h.isPublic ? 'Resource Hub: Active — click to manage' : 'Resource Hub: Private — click to manage'}">&#127760; Hub${h.isPublic ? '' : ' (Private)'}</span>`; })()}
      </td>
      <td>${statusBadge(p.status)}</td>
      <td>${projectTypeBadge(p.projectType)}</td>
      <td style="font-size:.75rem">${projectManagerDisplay(p.projectManager)}</td>
      <td>${userNames(p.assignedTo) || '<span style="color:var(--txt-muted)">Unassigned</span>'}</td>
      <td>${p.dueDate || '—'}</td>
      <td>
        <div class="flex-gap">
          <div class="progress-bar-wrap" style="width:80px"><div class="progress-bar" style="width:${getMilestoneProgress(p)}%"></div></div>
          <span style="font-size:.78rem;color:var(--txt-muted)">${getMilestoneProgress(p)}%</span>
        </div>
        <div style="font-size:.72rem;color:var(--txt-muted);margin-top:.2rem">
          ${(() => { const ms = getCurrentMilestone(p); return ms ? `&#9654; ${ms}` : '<span style="color:#16a34a">&#10003; Complete</span>'; })()}
        </div>
      </td>
      <td style="font-size:.82rem;font-weight:600;color:var(--txt-muted)">
        ${formatHours(getTimeEntries().filter(e => e.projectId === p.id).reduce((s, e) => s + e.hours, 0))}
      </td>
      <td>
        <div class="flex-gap">
          <button class="btn btn-ghost btn-sm open-milestones-btn" data-id="${p.id}" title="Milestones">&#9873;</button>
          <button class="btn btn-ghost btn-sm view-timelog-btn" data-id="${p.id}" title="View Time Log">&#128336;</button>
          <button class="sidekick-btn ai-chat-btn" data-id="${p.id}" title="Sidekick AI Assistant"><img src="/Sidekick.png" alt="Sidekick"> Sidekick</button>
          <button class="btn btn-ghost btn-sm edit-project-btn" data-id="${p.id}">&#9998; Edit</button>
          <button class="btn btn-danger btn-sm delete-project-btn" data-id="${p.id}">&#128465;</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── ADMIN USERS ───────────────────────────────────────────────
function renderAdminUsers(container) {
  const projects = getProjects();

  container.innerHTML = `
    <div class="page-header">
      <div><h2>Team Members</h2><p>Manage users and their access.</p></div>
      <div style="display:flex;gap:.6rem">
        <button class="btn btn-ghost" onclick="openBulkImportUsersModal()">&#8679; Import Users</button>
        <button class="btn btn-ghost" id="bulk-edit-profiles-btn" style="border-color:var(--primary);color:var(--primary)">&#9998; Bulk Edit Profiles</button>
        <button class="btn btn-primary" id="new-user-btn">+ Add User</button>
      </div>
    </div>
    <div id="bulk-profile-panel" style="display:none;margin-bottom:1.2rem">
      <div class="card" style="padding:1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
          <div style="font-size:.85rem;font-weight:700;color:var(--txt)">Edit Name, Email, Phone &amp; Job Title for all users</div>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-ghost btn-sm" id="bulk-profile-cancel">Cancel</button>
            <button class="btn btn-primary btn-sm" id="bulk-profile-save">&#10003; Save All Changes</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.82rem" id="bulk-profile-table">
            <thead>
              <tr style="background:var(--surface);text-align:left">
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border);min-width:160px">Name</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Role</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border);min-width:200px">Job Title</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border);min-width:200px">Email</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border);min-width:140px">Phone</th>
              </tr>
            </thead>
            <tbody>
              ${cachedUsers.map(u => `
                <tr data-uid="${u.id}">
                  <td style="padding:.3rem .4rem"><input type="text" value="${(u.name||'').replace(/"/g,'&quot;')}" data-field="name" style="width:100%;padding:.25rem .4rem;border:1px solid var(--border);border-radius:5px;font-size:.82rem;background:var(--bg);color:var(--txt)" /></td>
                  <td style="padding:.3rem .4rem;color:var(--txt-muted);font-size:.78rem;white-space:nowrap">${u.role||''}</td>
                  <td style="padding:.3rem .4rem"><input type="text" value="${(u.jobTitle||'').replace(/"/g,'&quot;')}" data-field="jobTitle" placeholder="e.g. HR Software Implementation Officer" style="width:100%;padding:.25rem .4rem;border:1px solid var(--border);border-radius:5px;font-size:.82rem;background:var(--bg);color:var(--txt)" /></td>
                  <td style="padding:.3rem .4rem"><input type="email" value="${(u.email||'').replace(/"/g,'&quot;')}" data-field="email" style="width:100%;padding:.25rem .4rem;border:1px solid var(--border);border-radius:5px;font-size:.82rem;background:var(--bg);color:var(--txt)" /></td>
                  <td style="padding:.3rem .4rem"><input type="tel" value="${(u.phone||'').replace(/"/g,'&quot;')}" data-field="phone" placeholder="09171234567" style="width:100%;padding:.25rem .4rem;border:1px solid var(--border);border-radius:5px;font-size:.82rem;background:var(--bg);color:var(--txt)" /></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Projects</th><th>Actions</th>
          </tr></thead>
          <tbody id="users-tbody">
            ${userRows(cachedUsers, projects)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function userRows(users, projects) {
  return users.map(u => {
    const count = projects.filter(p => p.assignedTo.includes(u.id)).length;
    return `
      <tr>
        <td>
          <div class="flex-gap">
            ${avatarHtml(u, 32)}
            <strong>${u.name}</strong>
          </div>
        </td>
        <td><code style="background:#f1f5f9;padding:.15rem .4rem;border-radius:4px">${u.username}</code></td>
        <td style="color:var(--txt-muted);font-size:.85rem">${u.email || '—'}</td>
        <td>${roleBadge(u.role)}</td>
        <td>${count} project${count !== 1 ? 's' : ''}</td>
        <td>
          <div class="flex-gap">
            ${can('manage_users') ? `<button class="btn btn-ghost btn-sm edit-user-btn" data-id="${u.id}">&#9998; Edit</button>` : ''}
            ${u.id !== currentUser.id ? `
              ${permissionsMatrix[currentUser.role]?.act_as_user ? `<button class="btn btn-ghost btn-sm act-as-btn" data-id="${u.id}" title="Act as this user" style="color:var(--accent-orange);border-color:var(--accent-orange)">&#128100; Act as</button>` : ''}
              ${can('manage_users') ? `<button class="btn btn-danger btn-sm delete-user-btn" data-id="${u.id}">&#128465;</button>` : ''}
            ` : '<span style="font-size:.78rem;color:var(--txt-muted)">(You)</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── USER DASHBOARD ────────────────────────────────────────────
function renderUserDashboard() {
  const all   = getProjects();
  const mine  = all.filter(p => isMyProject(p, effectiveUser()));

  // Ongoing = matches My Projects default filter (Customer Onboarding HubSpot + all internal)
  const ongoing     = mine.filter(p => p.status === 'ongoing' && (p.createdBy !== 'hubspot' || p.hubspotStage === 'Customer Onboarding')).length;
  const onHold      = mine.filter(p => p.status === 'on-hold').length;
  const onHoldSales = mine.filter(p => p.status === 'on-hold-sales').length;
  const churn       = mine.filter(p => p.status === 'churn').length;

  return `
    <div class="page-header">
      <div>
        <h2>My Dashboard</h2>
        <p>Welcome back, ${effectiveUser().name}!</p>
      </div>
      <button class="sidekick-dashboard-btn" id="dashboard-ai-btn" title="Sidekick Dashboard Assistant"><img src="/Sidekick.png" alt="Sidekick"> Sidekick</button>
    </div>

    ${announcementBannerHtml()}

    <div class="stats-grid">
      <div class="stat-card" style="border-bottom-color:#32CE13">
        <div class="stat-icon" style="background:#E1F6CB;color:#092903">&#9889;</div>
        <div><div class="stat-label">Ongoing</div><div class="stat-value">${ongoing}</div></div>
      </div>
      <div class="stat-card" style="border-bottom-color:#FF7F00">
        <div class="stat-icon" style="background:#ffe8cc;color:#FF7F00">&#9208;</div>
        <div><div class="stat-label">On Hold</div><div class="stat-value">${onHold}</div></div>
      </div>
      <div class="stat-card" style="border-bottom-color:#8139EE">
        <div class="stat-icon" style="background:#ede3ff;color:#8139EE">&#8617;</div>
        <div><div class="stat-label">On Hold - Returned to Sales</div><div class="stat-value">${onHoldSales}</div></div>
      </div>
      <div class="stat-card" style="border-bottom-color:#ef4444">
        <div class="stat-icon" style="background:#fee2e2;color:#ef4444">&#128683;</div>
        <div><div class="stat-label">Churn</div><div class="stat-value">${churn}</div></div>
      </div>
    </div>

    ${toolsHubHtml()}

    ${can('view_pm_dashboard_table') ? `
    <div id="pm-project-table-wrap" style="margin-top:1.5rem">
      <div style="padding:1.5rem;text-align:center;color:var(--txt-muted);font-size:.85rem">Loading your Customer Onboarding projects…</div>
    </div>` : ''}
  `;
}

async function renderPMProjectTable() {
  const wrap = document.getElementById('pm-project-table-wrap');
  if (!wrap) return;

  let allDeals = [];
  try {
    const res = await fetch('/api/hubspot/my-deals');
    if (res.ok) { const data = await res.json(); allDeals = data.deals || []; }
  } catch {}

  const myDeals = allDeals.filter(d => d.stage === 'Customer Onboarding');

  if (!myDeals.length) {
    wrap.innerHTML = `<div class="empty-state" style="margin-top:1rem">No Customer Onboarding projects assigned to you.</div>`;
    return;
  }

  const pmColFilters = {};

  // Load overrides if not already cached
  if (!Object.keys(cachedDashboardOverrides).length) {
    cachedDashboardOverrides = await fetchDashboardOverrides();
  }

  const tableHeaders = DASH_COLS.map(c => `
    <th style="position:sticky;top:0;z-index:2;min-width:${c.minW};padding:0;background:var(--surface);border-bottom:2px solid var(--border)">
      <div style="display:flex;align-items:center;padding:.4rem .55rem;gap:.2rem">
        <span style="flex:1;font-size:.71rem;font-weight:600;font-family:var(--font-sub);text-transform:uppercase;letter-spacing:.04em;color:var(--txt-muted);white-space:nowrap">${c.label}</span>
        <button class="pm-col-filter-btn" data-col="${c.key}" title="Filter" style="background:none;border:none;cursor:pointer;font-size:.6rem;padding:2px 3px;border-radius:3px;line-height:1;flex-shrink:0;color:var(--txt-muted)">&#9660;</button>
      </div>
    </th>`).join('');

  wrap.innerHTML = `
    <div class="card">
      <div class="card-header" style="background:linear-gradient(135deg,#092903 0%,#0d3d05 30%,#1a6b0a 60%,#32CE13 100%);border-bottom:none;padding:1.1rem 1.4rem;position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(50,206,19,.07) 0px,rgba(50,206,19,.07) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(0deg,rgba(50,206,19,.07) 0px,rgba(50,206,19,.07) 1px,transparent 1px,transparent 40px);pointer-events:none"></div>
        <h3 style="color:#ffffff;font-size:1rem;font-weight:700;font-family:var(--font-sub);letter-spacing:.08em;text-transform:uppercase;text-shadow:0 0 12px rgba(255,255,255,.4),0 0 24px rgba(50,206,19,.3);position:relative;z-index:1">&#9654; My Customer Onboarding Projects</h3>
      </div>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:.8rem 1.2rem;border-bottom:1px solid var(--border)">
        <input id="pm-dash-search" type="text" placeholder="Search company…" style="padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt);min-width:180px" />
        <button id="pm-clear-filters" style="padding:.4rem .9rem;border:1px solid var(--border);border-radius:6px;font-size:.78rem;font-weight:600;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt-muted);cursor:pointer;white-space:nowrap">✕ Clear Filters</button>
      </div>
      <div style="padding:.35rem 1.2rem;font-size:.73rem;color:var(--txt-muted);border-bottom:1px solid var(--border);background:var(--bg)">&#9998; Double-click to edit &nbsp;·&nbsp; Click to select &nbsp;·&nbsp; Shift+Click for range &nbsp;·&nbsp; Ctrl+C / Ctrl+V to copy &amp; paste &nbsp;·&nbsp; <span style="display:inline-block;width:6px;height:6px;background:#32CE13;border-radius:50%;vertical-align:middle;margin-right:2px"></span> = manually updated</div>
      <div style="overflow:auto;max-height:480px;cursor:grab;user-select:none" id="pm-table-scroller">
        <table style="white-space:nowrap;min-width:5800px;table-layout:auto;font-size:.73rem;border-collapse:collapse;width:100%">
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody id="pm-table-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function updatePMColFilterBtns() {
    document.querySelectorAll('.pm-col-filter-btn').forEach(btn => {
      const active = pmColFilters[btn.dataset.col]?.size > 0;
      btn.style.color      = active ? 'var(--primary)' : 'var(--txt-muted)';
      btn.style.fontWeight = active ? '700' : '';
    });
  }

  function renderPMRows() {
    const search   = document.getElementById('pm-dash-search')?.value.toLowerCase() || '';
    const filtered = myDeals.filter(d => {
      if (search && !d.name.toLowerCase().includes(search)) return false;
      return DASH_COLS.every(col => {
        const sel = pmColFilters[col.key];
        if (!sel || sel.size === 0) return true;
        return sel.has(String(getDashEffectiveVal(col, d) ?? ''));
      });
    });
    const tbody = document.getElementById('pm-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = filtered.length
      ? filtered.map(d => `<tr>${DASH_COLS.map(col => renderDashCell(col, d, true)).join('')}</tr>`).join('')
      : `<tr><td colspan="${DASH_COLS.length}" class="empty-state">No results found.</td></tr>`;
    // Re-apply cell selection highlights after re-render
    _dashSelCells.forEach((oldTd, key) => {
      const [hId, fld] = key.split('::');
      const newTd = tbody?.querySelector(`td[data-hsid="${hId}"][data-field="${fld}"]`);
      if (newTd) { newTd.classList.add('dash-cell-selected'); _dashSelCells.set(key, newTd); }
      else _dashSelCells.delete(key);
    });
    updatePMColFilterBtns();
  }

  _activeDashRender = renderPMRows;
  renderPMRows();

  document.getElementById('pm-dash-search').addEventListener('input', renderPMRows);

  document.getElementById('pm-clear-filters').addEventListener('click', () => {
    document.getElementById('pm-dash-search').value = '';
    Object.keys(pmColFilters).forEach(k => delete pmColFilters[k]);
    closePMFilterPopup();
    renderPMRows();
  });

  // ── Column filter popup ───────────────────────────────────────
  let activePMColKey = null;

  function closePMFilterPopup() {
    const existing = document.getElementById('col-filter-popup');
    if (existing) existing.remove();
    activePMColKey = null;
  }

  function openPMFilterPopup(btn, colKey) {
    if (activePMColKey === colKey) { closePMFilterPopup(); return; }
    closePMFilterPopup();
    const col = DASH_COLS.find(c => c.key === colKey);
    if (!col) return;
    activePMColKey = colKey;

    const search = document.getElementById('pm-dash-search')?.value.toLowerCase() || '';
    const otherDeals = myDeals.filter(d => {
      if (search && !d.name.toLowerCase().includes(search)) return false;
      return DASH_COLS.every(c => {
        if (c.key === colKey) return true;
        const sel = pmColFilters[c.key];
        if (!sel || sel.size === 0) return true;
        return sel.has(String(getDashEffectiveVal(c, d) ?? ''));
      });
    });

    const allValues = [...new Set(otherDeals.map(d => String(getDashEffectiveVal(col, d) ?? '')).filter(v => v))].sort();
    const selected  = pmColFilters[colKey] || new Set();

    const popup = document.createElement('div');
    popup.id = 'col-filter-popup';
    popup.style.cssText = 'position:fixed;z-index:99999;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);min-width:220px;padding:.4rem 0;font-family:Rubik,sans-serif';
    popup.innerHTML = `
      <div style="padding:.35rem .7rem .3rem;border-bottom:1px solid var(--border)">
        <div style="font-size:.72rem;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.3rem">${col.label}</div>
        <input id="cfd-search" placeholder="Search values…" autocomplete="off" style="width:100%;box-sizing:border-box;padding:.28rem .5rem;border:1px solid var(--border);border-radius:5px;font-size:.78rem;background:var(--bg);color:var(--txt);font-family:Rubik,sans-serif">
      </div>
      <div style="padding:.25rem .7rem;display:flex;align-items:center;border-bottom:1px solid var(--border)">
        <label style="font-size:.75rem;color:var(--txt-muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;user-select:none">
          <input type="checkbox" id="cfd-select-all" style="accent-color:var(--primary)"> Select All
        </label>
      </div>
      <div id="cfd-list" style="max-height:200px;overflow-y:auto;padding:.2rem 0"></div>
      <div style="padding:.4rem .7rem;border-top:1px solid var(--border);display:flex;gap:.4rem">
        <button id="cfd-clear" style="flex:1;padding:.3rem;border:1px solid var(--border);border-radius:5px;font-size:.75rem;background:var(--bg);color:var(--txt-muted);cursor:pointer;font-family:Rubik,sans-serif">Clear</button>
        <button id="cfd-done"  style="flex:1;padding:.3rem;border:none;border-radius:5px;font-size:.75rem;background:var(--primary);color:#fff;cursor:pointer;font-weight:600;font-family:Rubik,sans-serif">Done</button>
      </div>`;
    document.body.appendChild(popup);

    function renderList(term = '') {
      const list = document.getElementById('cfd-list');
      if (!list) return;
      const vals = term ? allValues.filter(v => v.toLowerCase().includes(term.toLowerCase())) : allValues;
      list.innerHTML = vals.length
        ? vals.map(v => `<label style="display:flex;align-items:center;gap:.5rem;padding:.28rem .7rem;font-size:.78rem;cursor:pointer;white-space:nowrap;user-select:none"><input type="checkbox" class="cfd-cb" value="${v.replace(/"/g,'&quot;')}" ${selected.has(v)?'checked':''} style="accent-color:var(--primary)"><span style="overflow:hidden;text-overflow:ellipsis;max-width:170px" title="${v}">${v}</span></label>`).join('')
        : `<div style="padding:.4rem .7rem;font-size:.78rem;color:var(--txt-muted);font-style:italic">No values</div>`;
    }
    renderList();

    const rect = btn.getBoundingClientRect();
    popup.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
    popup.style.top  = (rect.bottom + 4) + 'px';

    const selectAllCb = document.getElementById('cfd-select-all');
    selectAllCb.checked = selected.size === 0 || selected.size === allValues.length;
    document.getElementById('cfd-search').addEventListener('input', e => renderList(e.target.value));
    selectAllCb.addEventListener('change', () => { document.querySelectorAll('#cfd-list .cfd-cb').forEach(cb => { cb.checked = selectAllCb.checked; }); });
    document.getElementById('cfd-list').addEventListener('change', () => { selectAllCb.checked = document.querySelectorAll('#cfd-list .cfd-cb:checked').length === allValues.length; });
    document.getElementById('cfd-clear').addEventListener('click', () => { delete pmColFilters[colKey]; closePMFilterPopup(); renderPMRows(); });
    document.getElementById('cfd-done').addEventListener('click', () => {
      const checked = [...document.querySelectorAll('#cfd-list .cfd-cb:checked')].map(cb => cb.value);
      if (!checked.length || checked.length === allValues.length) delete pmColFilters[colKey];
      else pmColFilters[colKey] = new Set(checked);
      closePMFilterPopup();
      renderPMRows();
    });
    popup.addEventListener('click', e => e.stopPropagation());
  }

  document.querySelector('#pm-table-scroller thead').addEventListener('click', e => {
    const btn = e.target.closest('.pm-col-filter-btn');
    if (!btn) return;
    e.stopPropagation();
    openPMFilterPopup(btn, btn.dataset.col);
  });
  document.addEventListener('click', closePMFilterPopup);

  // ── Inline cell editing ───────────────────────────────────────
  const pmEditTbody = document.getElementById('pm-table-tbody');
  let _pmDragged = false;
  document.getElementById('pm-table-scroller').addEventListener('mousedown', () => { _pmDragged = false; });
  document.getElementById('pm-table-scroller').addEventListener('mousemove', () => { _pmDragged = true; });

  // Clear selection when clicking outside
  document.getElementById('pm-table-scroller').addEventListener('mousedown', e => {
    if (!e.target.closest('td.dash-cell-editable') && !e.target.closest('.dash-reset-btn')) {
      _dashClearSel();
    }
  });

  pmEditTbody.addEventListener('click', e => {
    if (_pmDragged) return;

    const resetBtn = e.target.closest('.dash-reset-btn');
    if (resetBtn) {
      e.stopPropagation();
      const hsId  = resetBtn.dataset.hsid;
      const field = resetBtn.dataset.field;
      const ov = cachedDashboardOverrides[hsId] || {};
      delete ov[field];
      if (!Object.keys(ov).length) delete cachedDashboardOverrides[hsId];
      else cachedDashboardOverrides[hsId] = ov;
      renderPMRows();
      fetch(`/api/dashboard-overrides/${encodeURIComponent(hsId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, reset: true }),
      }).catch(() => {});
      return;
    }

    const td = e.target.closest('td.dash-cell-editable');
    if (!td || td.dataset.editing) return;
    if (e.shiftKey) {
      _dashRangeSelect(td, pmEditTbody);
    } else {
      _dashSelectOne(td);
    }
  });

  pmEditTbody.addEventListener('dblclick', e => {
    if (_pmDragged) return;
    const td = e.target.closest('td.dash-cell-editable');
    if (!td || td.dataset.editing) return;
    _dashClearSel();
    td.dataset.editing = '1';

    const hsId     = td.dataset.hsid;
    const field    = td.dataset.field;
    const cType    = td.dataset.colType;
    const curVal   = td.dataset.editVal || '';
    const origHtml = td.innerHTML;
    const dealForAudit = myDeals.find(d => String(d.id) === String(hsId));

    const cancelEdit = () => { delete td.dataset.editing; td.innerHTML = origHtml; };

    const finishEdit = async (newVal) => {
      delete td.dataset.editing;
      if (newVal === curVal) { td.innerHTML = origHtml; return; }
      const ov = cachedDashboardOverrides[hsId] || {};
      if (newVal === '') {
        delete ov[field];
        if (!Object.keys(ov).length) delete cachedDashboardOverrides[hsId];
        else cachedDashboardOverrides[hsId] = ov;
      } else {
        ov[field] = newVal;
        cachedDashboardOverrides[hsId] = ov;
      }
      renderPMRows();
      const col = DASH_COLS.find(c => c.key === field);
      logAudit('dashboard.field_edit',
        `${col?.label || field}: "${curVal || '—'}" → "${newVal || '—'}" on ${dealForAudit?.name || hsId}`,
        { hsId, field, from: curVal, to: newVal, company: dealForAudit?.name || hsId }
      );
      fetch(`/api/dashboard-overrides/${encodeURIComponent(hsId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVal === '' ? { field, reset: true } : { field, value: newVal }),
      }).catch(() => {});
    };

    if (cType === 'status-dropdown' || cType === 'milestone-dropdown') {
      const sel = document.createElement('select');
      sel.style.cssText = 'width:100%;font-size:.82rem;font-family:inherit;border:1px solid var(--primary);border-radius:3px;background:var(--bg);color:var(--txt);padding:1px 2px';
      const options = cType === 'status-dropdown' ? DASH_STATUS_OPTIONS : ['', ...MILESTONES];
      options.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s || '— None —';
        if (s === curVal || (!s && !curVal)) opt.selected = true;
        sel.appendChild(opt);
      });
      let saved = false;
      sel.addEventListener('change', () => { saved = true; finishEdit(sel.value); });
      sel.addEventListener('blur',   () => { if (!saved) cancelEdit(); });
      sel.addEventListener('keydown', ev => { if (ev.key === 'Escape') { saved = true; cancelEdit(); } });
      td.innerHTML = ''; td.appendChild(sel); sel.focus();
    } else {
      const inp = document.createElement('input');
      inp.type  = 'text';
      inp.value = curVal === '—' ? '' : curVal;
      inp.style.cssText = 'width:100%;border:1px solid var(--primary);border-radius:3px;padding:1px 4px;font-size:.82rem;font-family:inherit;background:var(--bg);color:var(--txt);box-sizing:border-box';
      inp.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
        if (ev.key === 'Escape') { cancelEdit(); inp.removeEventListener('blur', blurHandler); }
      });
      const blurHandler = () => finishEdit(inp.value.trim());
      inp.addEventListener('blur', blurHandler);
      td.innerHTML = ''; td.appendChild(inp); inp.focus(); inp.select();
    }
  });

  // Drag-to-scroll
  const scroller = document.getElementById('pm-table-scroller');
  if (scroller) {
    let isDown = false, startX, startY, scrollLeft, scrollTop;
    scroller.addEventListener('mousedown', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return; isDown = true; startX = e.pageX - scroller.offsetLeft; scrollLeft = scroller.scrollLeft; startY = e.pageY - scroller.offsetTop; scrollTop = scroller.scrollTop; scroller.style.cursor = 'grabbing'; });
    scroller.addEventListener('mouseleave', () => { isDown = false; scroller.style.cursor = 'grab'; });
    scroller.addEventListener('mouseup',    () => { isDown = false; scroller.style.cursor = 'grab'; });
    scroller.addEventListener('mousemove',  e => { if (!isDown) return; e.preventDefault(); scroller.scrollLeft = scrollLeft - (e.pageX - scroller.offsetLeft - startX); scroller.scrollTop = scrollTop - (e.pageY - scroller.offsetTop - startY); });
  }
}

function userProjectCard(p) {
  const timer        = getActiveTimer();
  const isRunning    = timer && timer.projectId === p.id;
  const myEntries    = getTimeEntries().filter(e => e.projectId === p.id && e.userId === effectiveUser().id);
  const totalHours   = myEntries.reduce((s, e) => s + e.hours, 0);
  const progress     = getMilestoneProgress(p);
  const completedCount = p.milestones ? MILESTONES.filter(m => p.milestones[m]).length : 0;
  const currentMs    = getCurrentMilestone(p);

  return `
    <div class="project-card status-${p.status}">
      <div>
        <div class="project-card-title">${p.title}</div>
        <div class="project-card-desc">${p.description}</div>
      </div>
      <div class="flex-gap">${statusBadge(p.status)} ${priorityLabel(p.priority)}</div>
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
          <span style="font-size:.78rem;color:var(--txt-muted)">Milestones</span>
          <span style="font-size:.78rem;font-weight:600">${completedCount}/${MILESTONES.length} &nbsp;${progress}%</span>
        </div>
        <div class="progress-bar-wrap"><div class="progress-bar" style="width:${progress}%"></div></div>
        ${currentMs ? `<div style="font-size:.75rem;color:var(--txt-muted);margin-top:.3rem">&#9654; ${currentMs}</div>` : `<div style="font-size:.75rem;color:#16a34a;margin-top:.3rem;font-weight:600">&#10003; All milestones complete</div>`}
      </div>
      <div class="project-card-meta">
        <span>Due: ${p.dueDate || 'No date'}</span>
        <span style="font-size:.78rem;color:var(--txt-muted)">&#128336; ${formatHours(totalHours)} logged</span>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:.75rem;color:var(--txt-muted);font-weight:600">Status:</span>
        <select class="card-status-select" data-id="${p.id}"
          style="font-size:.78rem;padding:.3rem .55rem;border:1.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--txt);flex:1;cursor:pointer">
          ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${p.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      ${p.projectManager ? `<div style="font-size:.78rem;color:var(--txt-muted)">PM: <strong>${projectManagerDisplay(p.projectManager)}</strong></div>` : ''}
      <div class="project-card-actions">
        <button class="btn btn-primary btn-sm open-milestones-btn" data-id="${p.id}">&#9873; Milestones</button>
        ${isRunning ? `
          <button class="btn btn-danger btn-sm stop-timer-btn" data-id="${p.id}">
            &#9209; Stop &nbsp;<span id="timer-elapsed-${p.id}" class="timer-elapsed">${formatElapsed(timer.startTime)}</span>
          </button>
        ` : `
          <button class="btn btn-ghost btn-sm start-timer-btn" data-id="${p.id}">&#9654; Timer</button>
        `}
        <button class="btn btn-ghost btn-sm log-hours-btn" data-id="${p.id}">&#9997; Log</button>
        <button class="sidekick-btn ai-chat-btn" data-id="${p.id}" title="Sidekick AI Assistant"><img src="/Sidekick.png" alt="Sidekick"> Sidekick</button>
      </div>
    </div>
  `;
}

// ── TOOLS HUB ─────────────────────────────────────────────────
// ── EXPORT ────────────────────────────────────────────────────
let _exportProjects      = []; // updated whenever the projects filter changes
let _selectedProjectIds  = new Set();
let _hubsMap             = {}; // projectId → hub object, populated in renderAdminProjects
let _exportDashboard       = []; // updated whenever the admin dashboard filter changes
let _exportDashboardCharts = { byStatus: {}, byStage: {}, byPM: {} };

function projectsToExportRows(list) {
  return list.map(p => ({
    'Title':            p.title,
    'Status':           statusLabel(p.status),
    'Project Manager':  projectManagerDisplay(p.projectManager),
    'Assigned To':      userNames(p.assignedTo) || 'Unassigned',
    'Due Date':         p.dueDate || '—',
    'Current Milestone': getCurrentMilestone(p) || 'Complete',
    'Progress %':       getMilestoneProgress(p) + '%',
    'Hours Logged':     formatHours(getTimeEntries().filter(e => e.projectId === p.id).reduce((s,e) => s + e.hours, 0)),
  }));
}

function exportProjectsCSV(list) {
  const rows  = projectsToExportRows(list || _exportProjects);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r =>
    headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(',')
  )].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'implementation-projects.csv' });
  a.click();
}

function exportProjectsExcel(list) {
  const rows = projectsToExportRows(list || _exportProjects);
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  XLSX.writeFile(wb, 'implementation-projects.xlsx');
}

function exportProjectsPDF(list) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  const src = list || _exportProjects;
  doc.setFontSize(14);
  doc.text('Implementation Projects', 14, 15);
  doc.setFontSize(9);
  doc.text(`Exported: ${new Date().toLocaleDateString()}  |  ${src.length} project(s)`, 14, 22);
  const rows = projectsToExportRows(src);
  const headers = Object.keys(rows[0] || {});
  doc.autoTable({
    startY: 27,
    head: [headers],
    body: rows.map(r => headers.map(h => r[h])),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [9, 41, 3], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 240] },
  });
  doc.save('implementation-projects.pdf');
}

// ── DASHBOARD EXPORT ──────────────────────────────────────────
function dashboardToExportRows(list) {
  const fmtDate = v => v ? new Date(isNaN(v) ? v : Number(v)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  return list.map(row => {
    const out = {};
    DASH_COLS.forEach(col => {
      const rawVal = row[col.key] || '';
      const isOv   = !!(cachedDashboardOverrides[row._hsId] || {})[col.key];
      let val;
      if (col.type === 'date' && !isOv) {
        val = fmtDate(rawVal);
      } else if (col.type === 'currency' && rawVal) {
        const num = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
        val = !isNaN(num) ? `₱${num.toLocaleString()}` : rawVal;
      } else {
        val = rawVal || '—';
      }
      out[col.label] = val;
    });
    return out;
  });
}

function exportDashboardCSV() {
  const rows = dashboardToExportRows(_exportDashboard);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r =>
    headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(',')
  )].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'dashboard-report.csv' });
  a.click();
}

function exportDashboardExcel() {
  const rows = dashboardToExportRows(_exportDashboard);
  if (!rows.length) return;

  const wb = XLSX.utils.book_new();

  // Sheet 1 — main data
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = DASH_COLS.map(c => ({ wch: Math.max(c.label.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Sheet 2 — By Status
  const statusRows = Object.entries(_exportDashboardCharts.byStatus)
    .sort((a,b) => b[1]-a[1])
    .map(([k,v]) => ({ 'Status': k, 'Count': v }));
  if (statusRows.length) {
    const ws2 = XLSX.utils.json_to_sheet(statusRows);
    ws2['!cols'] = [{ wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'By Status');
  }

  // Sheet 3 — By Stage
  const stageRows = Object.entries(_exportDashboardCharts.byStage)
    .sort((a,b) => b[1]-a[1])
    .map(([k,v]) => ({ 'Stage': k, 'Count': v }));
  if (stageRows.length) {
    const ws3 = XLSX.utils.json_to_sheet(stageRows);
    ws3['!cols'] = [{ wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'By Stage');
  }

  // Sheet 4 — By Project Manager
  const pmRows = Object.entries(_exportDashboardCharts.byPM)
    .sort((a,b) => b[1]-a[1])
    .map(([k,v]) => ({ 'Project Manager': k, 'Count': v }));
  if (pmRows.length) {
    const ws4 = XLSX.utils.json_to_sheet(pmRows);
    ws4['!cols'] = [{ wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'By PM');
  }

  XLSX.writeFile(wb, 'dashboard-report.xlsx');
}

function exportDashboardPDF() {
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(9, 41, 3);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Implementation Dashboard Report', 14, 12);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(180, 230, 170);
  doc.text(`Exported: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}   |   ${_exportDashboard.length} record(s) shown`, 14, 18);

  // Charts — embed canvas images side by side
  const chartDefs = [
    { id: 'chart-segment',   label: 'BY SEGMENT'          },
    { id: 'chart-pm',        label: 'BY PROJECT MANAGER'  },
    { id: 'chart-milestone', label: 'BY MILESTONE'        },
  ];
  const chartAreaW = (pageW - 28) / 3;
  const chartH     = 48;
  const chartTop   = 28;

  chartDefs.forEach((c, i) => {
    const canvas = document.getElementById(c.id);
    const x = 14 + i * (chartAreaW + 4);
    // Chart background box
    doc.setFillColor(245, 250, 240);
    doc.roundedRect(x, chartTop, chartAreaW, chartH + 7, 2, 2, 'F');
    // Label
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(90, 110, 90);
    doc.text(c.label, x + 3, chartTop + 5);
    if (canvas) {
      try {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', x + 2, chartTop + 7, chartAreaW - 4, chartH - 3);
      } catch { /* canvas tainted — skip */ }
    }
  });

  // Data table
  doc.setFont(undefined, 'normal');
  const rows    = dashboardToExportRows(_exportDashboard);
  const headers = Object.keys(rows[0] || {});
  doc.autoTable({
    startY: chartTop + chartH + 13,
    head:   [headers],
    body:   rows.map(r => headers.map(h => r[h])),
    styles:           { fontSize: 7.5, cellPadding: 2 },
    headStyles:       { fillColor: [9, 41, 3], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 240] },
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Sprout Solutions · Page ${data.pageNumber}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' }
      );
    },
  });

  doc.save('dashboard-report.pdf');
}

const TOOL_DEFAULTS = [
  { id: 'gmail',      name: 'Gmail',                    url: '', domain: 'gmail.com',           color: '#EA4335', custom: false },
  { id: 'gcal',       name: 'Google Calendar',          url: '', domain: 'calendar.google.com', color: '#4285F4', custom: false },
  { id: 'gdrive',     name: 'Google Drive',             url: '', domain: 'drive.google.com',    color: '#34A853', custom: false },
  { id: 'hubspot',    name: 'HubSpot',                  url: '', domain: 'hubspot.com',         color: '#FF7A59', custom: false },
  { id: 'collateral', name: 'PM Collateral Automation', url: '', domain: null,                  color: '#32CE13', custom: false },
];

// ── Server-backed tools cache (per user) ─────────────────────
let _toolsCache = null; // null = not yet loaded

function getMyTools() {
  if (_toolsCache !== null) return _toolsCache;
  // Fallback to defaults if cache not yet populated (should not happen after boot)
  return TOOL_DEFAULTS.map(t => ({ ...t }));
}

function saveMyTools(tools) {
  _toolsCache = tools;
  fetch('/api/tools', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(tools),
  }).catch(err => console.error('[PMT] Failed to save tools:', err));
}

async function fetchMyTools() {
  try {
    const res = await fetch('/api/tools');
    if (res.ok) {
      const tools = await res.json();
      // If server has no tools yet for this user, use defaults
      _toolsCache = tools.length > 0 ? tools : TOOL_DEFAULTS.map(t => ({ ...t }));
      // Ensure any new defaults are present without overwriting existing ones
      TOOL_DEFAULTS.forEach(d => {
        if (!_toolsCache.find(t => t.id === d.id)) _toolsCache.unshift({ ...d });
      });
    } else {
      _toolsCache = TOOL_DEFAULTS.map(t => ({ ...t }));
    }
  } catch (e) { _toolsCache = TOOL_DEFAULTS.map(t => ({ ...t })); }
}

async function migrateToolsFromLocalStorage() {
  const localKey = `pmt_tools_${effectiveUser()?.id}`;
  const local = localStorage.getItem(localKey);
  if (!local) return;
  try {
    const tools = JSON.parse(local);
    const res = await fetch('/api/tools/migrate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(tools),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.migrated) {
        _toolsCache = tools;
        localStorage.removeItem(localKey);
      }
    }
  } catch (e) { /* keep localStorage as fallback */ }
}

function extractDomain(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname; }
  catch { return null; }
}

function toolInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function toolLogoHtml(tool) {
  const domain = tool.domain || (tool.url ? extractDomain(tool.url) : null);
  if (domain) {
    return `
      <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64"
           class="tool-tile-logo-img" alt="${tool.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="tool-tile-logo-fallback" style="display:none;background:${tool.color || '#607060'}">${toolInitials(tool.name)}</div>`;
  }
  return `<div class="tool-tile-logo-fallback" style="background:${tool.color || '#607060'}">${toolInitials(tool.name)}</div>`;
}

function toolTileHtml(tool) {
  const hasUrl = !!tool.url;
  return `
    <div class="tool-tile ${hasUrl ? 'tool-tile-set' : 'tool-tile-unset'}"
         data-tool-id="${tool.id}" ${hasUrl ? `data-url="${tool.url}"` : ''}>
      <div class="tool-tile-logo">${toolLogoHtml(tool)}</div>
      <div class="tool-tile-name">${tool.name}</div>
      <div>${hasUrl
        ? `<span class="tool-tile-url-label">&#128279; Open</span>`
        : `<span class="tool-tile-no-url">+ Set Link</span>`}
      </div>
      <button class="btn btn-ghost tool-tile-edit-btn" data-tool-id="${tool.id}" title="Edit">&#9998;</button>
    </div>`;
}

function toolsHubHtml() {
  return `
    <div class="tools-hub-section">
      <div class="tools-hub-header">
        <div>
          <h3>&#128736; Tools Hub</h3>
          <p>Your quick-access launchpad. Click a tile to open, or set a link first.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="add-tool-btn">+ Add Tool</button>
      </div>
      <div class="tools-hub-grid" id="tools-hub-grid">
        ${getMyTools().map(t => toolTileHtml(t)).join('')}
      </div>
    </div>`;
}

function renderToolsHub(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h2>&#128736; Tools Hub</h2><p>Your quick-access launchpad for all tools.</p></div>
      <button class="btn btn-primary" id="add-tool-btn">+ Add Tool</button>
    </div>
    <div class="tools-hub-grid" id="tools-hub-grid">
      ${getMyTools().map(t => toolTileHtml(t)).join('')}
    </div>`;
  attachToolsHandlers();
}

function attachToolsHandlers() {
  document.querySelectorAll('.tool-tile-set').forEach(tile => {
    tile.addEventListener('click', e => {
      if (e.target.closest('.tool-tile-edit-btn')) return;
      const url = tile.dataset.url;
      if (url) window.open(url.startsWith('http') ? url : 'https://' + url, '_blank');
    });
  });
  document.querySelectorAll('.tool-tile-unset').forEach(tile => {
    tile.addEventListener('click', e => {
      if (e.target.closest('.tool-tile-edit-btn')) return;
      openToolEditModal(tile.dataset.toolId);
    });
  });
  document.querySelectorAll('.tool-tile-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openToolEditModal(btn.dataset.toolId);
    });
  });
  document.getElementById('add-tool-btn')?.addEventListener('click', openAddToolModal);
}

function rerenderToolsHub() {
  const grid = document.getElementById('tools-hub-grid');
  if (!grid) return;
  grid.innerHTML = getMyTools().map(t => toolTileHtml(t)).join('');
  attachToolsHandlers();
}

function openToolEditModal(toolId) {
  const tools = getMyTools();
  const tool  = tools.find(t => t.id === toolId);
  if (!tool) return;

  const modal = createModal(`
    <h3>&#9998; ${tool.name}</h3>
    <div class="form-group">
      <label>URL</label>
      <input type="url" id="tool-url-input" placeholder="https://..." value="${tool.url || ''}">
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn btn-primary" id="save-tool-btn">Save</button>
      ${tool.custom ? `<button class="btn btn-danger" id="delete-tool-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="cancel-tool-btn">Cancel</button>
    </div>`);

  document.getElementById('save-tool-btn').addEventListener('click', () => {
    const url = document.getElementById('tool-url-input').value.trim();
    const idx = tools.findIndex(t => t.id === toolId);
    tools[idx].url = url;
    if (tools[idx].custom && url) tools[idx].domain = extractDomain(url);
    saveMyTools(tools);
    modal.remove();
    rerenderToolsHub();
  });
  document.getElementById('delete-tool-btn')?.addEventListener('click', () => {
    saveMyTools(tools.filter(t => t.id !== toolId));
    modal.remove();
    rerenderToolsHub();
  });
  document.getElementById('cancel-tool-btn').addEventListener('click', () => modal.remove());
}

function openAddToolModal() {
  const modal = createModal(`
    <h3>&#10010; Add Tool</h3>
    <div class="form-group">
      <label>Tool Name</label>
      <input type="text" id="new-tool-name" placeholder="e.g. Slack">
    </div>
    <div class="form-group">
      <label>URL</label>
      <input type="url" id="new-tool-url" placeholder="https://...">
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn btn-primary" id="save-new-tool-btn">Add Tool</button>
      <button class="btn btn-ghost" id="cancel-new-tool-btn">Cancel</button>
    </div>`);

  document.getElementById('save-new-tool-btn').addEventListener('click', () => {
    const name = document.getElementById('new-tool-name').value.trim();
    const url  = document.getElementById('new-tool-url').value.trim();
    if (!name) return;
    const tools = getMyTools();
    tools.push({ id: 'custom_' + Date.now(), name, url, domain: url ? extractDomain(url) : null, color: '#607060', custom: true });
    saveMyTools(tools);
    modal.remove();
    rerenderToolsHub();
  });
  document.getElementById('cancel-new-tool-btn').addEventListener('click', () => modal.remove());
}

// ── USER PROJECTS PAGE (KANBAN) ───────────────────────────────
function renderUserProjects(container) {
  const allMine = getProjects().filter(p => isMyProject(p, effectiveUser()));

  // Default filters: ongoing + Customer Onboarding
  let filterStatus = 'ongoing';
  let filterStage  = 'Customer Onboarding';

  const uniqueStatuses = [...new Set(allMine.map(p => p.status).filter(Boolean))].sort();
  const uniqueStages   = [...new Set(allMine.map(p => p.hubspotStage).filter(Boolean))].sort();

  function getFiltered() {
    return allMine.filter(p => {
      const isInternal = p.createdBy !== 'hubspot';
      if (filterStatus && p.status !== filterStatus) return false;
      if (isInternal) return true; // internal projects bypass the stage filter
      if (filterStage && p.hubspotStage !== filterStage) return false;
      return true;
    });
  }

  function renderKanban() {
    const projects = getFiltered();
    const cols = [...MILESTONES, 'Complete'];
    const colsHtml = cols.map((label, colIdx) => {
      const isComplete = colIdx === MILESTONES.length;
      const colProjects = projects.filter(p =>
        isComplete ? getCurrentMilestone(p) === null : getCurrentMilestone(p) === MILESTONES[colIdx]
      );
      return `
        <div class="kanban-col">
          <div class="kanban-col-header ${isComplete ? 'kanban-col-complete' : ''}">
            <span>${label}</span>
            <span class="kanban-col-count">${colProjects.length}</span>
          </div>
          <div class="kanban-col-body" data-col="${colIdx}">
            ${colProjects.map(p => kanbanCard(p)).join('') || '<div class="kanban-empty">Drop projects here</div>'}
          </div>
        </div>
      `;
    }).join('');

    const board = document.getElementById('kanban-board-wrap');
    if (!board) return;
    board.innerHTML = projects.length
      ? `<div class="kanban-board">${colsHtml}</div>`
      : '<div class="empty-state"><div class="empty-icon">&#128193;</div>No projects match the current filters.</div>';

    attachKanbanHandlers(container);
  }

  const statusOptions = [
    { value: '',             label: 'All Statuses' },
    { value: 'ongoing',      label: 'Ongoing' },
    { value: 'completed',    label: 'Completed' },
    { value: 'on-hold',      label: 'On Hold' },
    { value: 'on-hold-sales',label: 'On Hold - Sales' },
    { value: 'churn',        label: 'Churn' },
  ].filter(o => o.value === '' || uniqueStatuses.includes(o.value));

  const stageOptions = [
    { value: '', label: 'All Stages' },
    ...uniqueStages.map(s => ({ value: s, label: s })),
  ];

  container.innerHTML = `
    <div class="page-header">
      <div><h2>My Projects</h2><p>Drag a project card to move it to a new milestone.</p></div>
    </div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">
      <select id="proj-filter-status" style="padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt);cursor:pointer">
        ${statusOptions.map(o => `<option value="${o.value}" ${o.value === filterStatus ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      <select id="proj-filter-stage" style="padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt);cursor:pointer">
        ${stageOptions.map(o => `<option value="${o.value}" ${o.value === filterStage ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      <button id="proj-filter-clear" style="padding:.4rem .9rem;border:1px solid var(--border);border-radius:6px;font-size:.78rem;font-weight:600;font-family:'Rubik',sans-serif;background:var(--bg);color:var(--txt-muted);cursor:pointer">✕ Show All</button>
      <span id="proj-filter-count" style="font-size:.8rem;color:var(--txt-muted)"></span>
    </div>
    <div id="kanban-board-wrap"></div>
  `;

  renderKanban();

  // Update count label
  function updateCount() {
    const el = document.getElementById('proj-filter-count');
    if (el) el.textContent = `${getFiltered().length} of ${allMine.length} projects`;
  }
  updateCount();

  document.getElementById('proj-filter-status').addEventListener('change', e => {
    filterStatus = e.target.value;
    renderKanban();
    updateCount();
  });

  document.getElementById('proj-filter-stage').addEventListener('change', e => {
    filterStage = e.target.value;
    renderKanban();
    updateCount();
  });

  document.getElementById('proj-filter-clear').addEventListener('click', () => {
    filterStatus = '';
    filterStage  = '';
    document.getElementById('proj-filter-status').value = '';
    document.getElementById('proj-filter-stage').value  = '';
    renderKanban();
    updateCount();
  });
}

function kanbanCard(p) {
  const timer     = getActiveTimer();
  const isRunning = timer && timer.projectId === p.id;
  const milestone = getCurrentMilestone(p) || 'Completed';
  const docCount  = p.docs?.[milestone]?.length || 0;
  const today     = new Date().toISOString().slice(0, 10);
  const isOverdue = p.dueDate && p.dueDate < today && p.status !== 'completed' && p.status !== 'churn';
  const dueLbl    = p.dueDate ? `Due ${new Date(p.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';

  return `
    <div class="kanban-card status-${p.status}" draggable="true" data-id="${p.id}">
      <div class="kanban-card-title">${p.title}</div>
      <div class="kanban-card-meta">
        ${statusBadge(p.status)}
        <span class="toggle-type-btn" data-id="${p.id}" title="Click to change type" style="cursor:pointer">${projectTypeBadge(p.projectType)}</span>
        ${dueLbl ? `<span class="kanban-card-due${isOverdue ? ' overdue' : ''}">${dueLbl}</span>` : ''}
      </div>
      <div class="kanban-card-actions">
        <button class="btn btn-primary btn-sm open-milestones-btn" data-id="${p.id}" style="flex:1">&#9873; Milestones</button>
        <div class="kcard-more-wrap">
          <button class="btn btn-ghost btn-sm kcard-more-btn" data-id="${p.id}" title="More actions">&#8943;</button>
          <div class="kcard-dropdown" data-id="${p.id}">
            ${isRunning
              ? `<button class="kcard-drop-item item-danger stop-timer-btn" data-id="${p.id}">&#9209; Stop Timer &nbsp;<span id="timer-elapsed-${p.id}" class="timer-elapsed">${formatElapsed(timer.startTime)}</span></button>`
              : `<button class="kcard-drop-item start-timer-btn" data-id="${p.id}">&#9654; Timer</button>`
            }
            <button class="kcard-drop-item log-hours-btn" data-id="${p.id}">&#128336; Log Hours</button>
            <button class="kcard-drop-item open-docs-btn" data-id="${p.id}">&#128196; Documentation${docCount ? ` <span class="docs-count">${docCount}</span>` : ''}</button>
            ${can('view_project_details') ? `<button class="kcard-drop-item open-contacts-btn" data-id="${p.id}">&#128101; Contacts</button>` : ''}
            ${can('manage_recordings') ? `<button class="kcard-drop-item open-recordings-btn" data-id="${p.id}">&#127909; Recordings</button>` : ''}
            ${can('manage_files') ? `<button class="kcard-drop-item open-files-btn" data-id="${p.id}">&#128193; Files</button>` : ''}
            ${can('view_resource_hub') ? `<button class="kcard-drop-item resource-hub-btn" data-id="${p.id}">&#127760; Hub</button>` : ''}
            <button class="kcard-drop-item ai-chat-btn" data-id="${p.id}"><img src="/Sidekick.png" alt="Sidekick"> Sidekick</button>
            <button class="kcard-drop-item survey-form-btn" data-id="${p.id}">&#128221; Survey Form</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachKanbanHandlers(container) {
  let draggedId = null;

  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      draggedId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  // ── ⋯ dropdown toggle ─────────────────────────────────────────
  container.querySelectorAll('.kcard-more-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const dropdown = btn.closest('.kcard-more-wrap').querySelector('.kcard-dropdown');
      const isOpen   = dropdown.classList.contains('open');
      // Close all open dropdowns first
      document.querySelectorAll('.kcard-dropdown.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) {
        // Show first so we can measure its height
        dropdown.classList.add('open');
        const btnRect = btn.getBoundingClientRect();
        const ddRect  = dropdown.getBoundingClientRect();
        // Open above if there's room, otherwise below
        const top = btnRect.top - ddRect.height - 4 > 0
          ? btnRect.top - ddRect.height - 4
          : btnRect.bottom + 4;
        dropdown.style.top  = top + 'px';
        dropdown.style.left = btnRect.left + 'px';
      }
    });
  });
  // Close dropdown when clicking anywhere outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.kcard-dropdown.open').forEach(d => d.classList.remove('open'));
  });
  container.querySelectorAll('.kcard-dropdown').forEach(dd => {
    dd.addEventListener('click', e => e.stopPropagation());
  });

  container.querySelectorAll('.toggle-type-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const list = getProjects();
      const idx  = list.findIndex(p => p.id === btn.dataset.id);
      if (idx === -1) return;
      list[idx].projectType = list[idx].projectType === 'client' ? 'internal' : 'client';
      saveProjects(list);
      btn.innerHTML = projectTypeBadge(list[idx].projectType);
    });
  });

  container.querySelectorAll('.open-docs-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openDocsModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.open-contacts-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openContactsModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.open-recordings-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openRecordingsModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.open-files-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openFilesModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.resource-hub-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openResourceHubModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.survey-form-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      // TODO: generate project survey form
    });
  });

  container.querySelectorAll('.kanban-col-body').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!draggedId) return;

      const colIdx     = parseInt(col.dataset.col);
      const isComplete = colIdx === MILESTONES.length;

      const list = getProjects();
      const idx  = list.findIndex(p => p.id === draggedId);
      if (idx === -1) return;

      const p = list[idx];
      if (!p.milestones) p.milestones = {};
      if (!p.timeline)   p.timeline   = {};

      const dropDate = new Date().toISOString().split('T')[0];
      MILESTONES.forEach((m, i) => {
        const willBeDone = isComplete ? true : i < colIdx;
        p.milestones[m] = willBeDone;
        if (willBeDone && !p.timeline[m]?.actualDate) {
          p.timeline[m] = { ...(p.timeline[m] || {}), actualDate: dropDate };
        } else if (!willBeDone) {
          if (p.timeline[m]) p.timeline[m] = { ...(p.timeline[m] || {}), actualDate: '' };
        }
      });
      p.progress = getMilestoneProgress(p);
      saveProjects(list);

      renderUserProjects(container);
      attachPageHandlers('my-projects');
      draggedId = null;
    });
  });
}

// ── RESOURCE HUB MODAL ───────────────────────────────────────
async function openResourceHubModal(projectId) {
  const p = getProjects().find(x => x.id === projectId);
  if (!p) return;

  const canGenerate = can('generate_resource_hub');

  // Show loading state immediately
  let backdrop = createModal(`
    <h3 style="margin-bottom:.5rem">&#127760; Resource Hub</h3>
    <div style="color:var(--txt-muted);font-size:.85rem;padding:1rem 0;text-align:center">Loading…</div>
  `);

  let hub = null;
  try {
    const r = await fetch(`/api/resource-hub/project/${projectId}`);
    hub = await r.json();
  } catch (e) {
    backdrop.remove();
    alert('Failed to load resource hub data.');
    return;
  }

  backdrop.remove();

  // ── No hub yet ──────────────────────────────────────────────
  if (!hub) {
    if (!canGenerate) {
      createModal(`
        <h3 style="margin-bottom:.75rem">&#127760; Resource Hub</h3>
        <div style="padding:1.5rem 0;text-align:center;color:var(--txt-muted)">
          <div style="font-size:2.5rem;margin-bottom:.6rem">🌐</div>
          <p style="font-size:.88rem">No resource hub has been generated for <strong>${p.title}</strong> yet.</p>
          <p style="font-size:.8rem;margin-top:.4rem">Contact a Super Admin or Project Manager to set one up.</p>
        </div>
        <div class="modal-actions"><button class="btn btn-ghost rh-close-btn">Close</button></div>
      `).querySelector('.rh-close-btn').onclick = function() { this.closest('.modal-backdrop').remove(); };
      return;
    }

    // Generate Hub screen
    const contacts   = p.details?.contacts || [];
    const withEmail  = contacts.filter(c => c.email?.trim());
    const noEmail    = contacts.filter(c => !c.email?.trim());

    const accessPreview = withEmail.length === 0
      ? `<p style="font-size:.82rem;color:var(--txt-muted);padding:.5rem 0">No contacts with email found in the Details tab. You can add them manually after generating.</p>`
      : withEmail.map(c => `
          <div style="display:flex;align-items:center;gap:.6rem;padding:.45rem .65rem;border:1px solid var(--border);border-radius:8px;background:var(--surface)">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#8139EE,#32CE13);color:#fff;font-size:.75rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(c.name||'?')[0].toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:.83rem;font-weight:600;color:var(--txt)">${c.name}</div>
              <div style="font-size:.74rem;color:var(--txt-muted)">${c.email}</div>
            </div>
            <span style="font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:20px;background:${c.access==='full'?'#d1fae5':'#fef3c7'};color:${c.access==='full'?'#065f46':'#92400e'}">${c.access==='full'?'Full':'Limited'}</span>
          </div>`).join('');

    const noEmailNote = noEmail.length > 0
      ? `<p style="font-size:.76rem;color:var(--txt-muted);margin-top:.5rem">&#9888; ${noEmail.length} contact(s) have no email and won't be added to the access list.</p>`
      : '';

    const m = createModal(`
      <h3 style="margin-bottom:.3rem">&#127760; Generate Resource Hub</h3>
      <p style="font-size:.82rem;color:var(--txt-muted);margin-bottom:1.2rem">${p.title}</p>

      <div style="background:#f0f8ff;border:1px solid #c0d8f0;border-radius:10px;padding:1rem 1.1rem;margin-bottom:1.2rem;font-size:.83rem;color:#1a3a5a;line-height:1.55">
        &#9432; &nbsp;This will create a <strong>publicly accessible, email-gated page</strong> for your client. They'll enter their email to gain access. The page auto-syncs milestone and timeline data from this project on every visit.
      </div>

      <div style="margin-bottom:1rem">
        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.6rem">Access List — Auto-populated from Details tab</div>
        <div style="display:flex;flex-direction:column;gap:.35rem;max-height:180px;overflow-y:auto">${accessPreview}</div>
        ${noEmailNote}
      </div>

      <div style="margin-bottom:1.2rem">
        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.6rem">Default Sections Enabled</div>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem">
          <span style="background:#eafce6;color:#065f46;font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">🏁 Milestones</span>
          <span style="background:#eafce6;color:#065f46;font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">📅 Timeline</span>
          <span style="background:#eafce6;color:#065f46;font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">📄 Documents</span>
          <span style="background:#eafce6;color:#065f46;font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">📞 Contacts</span>
          <span style="background:#f3f4f6;color:#6b7280;font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">🎬 Recordings (off)</span>
          <span style="background:#f3f4f6;color:#6b7280;font-size:.76rem;font-weight:700;padding:4px 10px;border-radius:20px">🎫 Ticketing (off)</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost rh-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="rh-generate-btn">&#127760; Generate Hub</button>
      </div>
    `);

    m.querySelector('.rh-cancel-btn').onclick = () => m.remove();
    m.querySelector('#rh-generate-btn').onclick = async function() {
      this.disabled = true; this.textContent = 'Generating…';
      try {
        const r    = await fetch('/api/resource-hub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }) });
        const data = await r.json();
        if (!r.ok) { alert(data.error || 'Failed to generate hub.'); this.disabled = false; this.textContent = '🌐 Generate Hub'; return; }
        m.remove();
        openResourceHubModal(projectId); // reopen with hub data
      } catch (e) { alert('Network error.'); this.disabled = false; this.textContent = '🌐 Generate Hub'; }
    };
    return;
  }

  // ── Hub exists — Management Modal ──────────────────────────
  function buildHubModal(activeTab) {
    activeTab = activeTab || 'overview';
    const isReadOnly = !canGenerate;

    const hubUrl = `${window.location.origin}/hub/${hub.slug}`;

    // ── Tab: Overview ──
    const overviewHtml = `
      <div id="rh-tab-overview" style="display:${activeTab==='overview'?'block':'none'}">
        <div style="margin-bottom:1.2rem">
          <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.5rem">Hub URL</div>
          <div style="display:flex;gap:.5rem;align-items:center">
            <input type="text" value="${hubUrl}" readonly style="flex:1;padding:.5rem .75rem;border:1.5px solid var(--border);border-radius:8px;font-size:.82rem;background:var(--surface);color:var(--txt);outline:none" />
            <button class="btn btn-ghost btn-sm" id="rh-copy-btn">&#128203; Copy</button>
            <a href="${hubUrl}" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none">&#128065; Preview</a>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.9rem 1rem">
            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.4rem">Status</div>
            <div style="display:flex;align-items:center;gap:.6rem">
              <span style="font-size:.88rem;font-weight:600;color:var(--txt)">${hub.isPublic ? '🟢 Active' : '🔴 Private'}</span>
              ${!isReadOnly ? `<button class="btn btn-ghost btn-sm" id="rh-toggle-public-btn" style="font-size:.75rem;padding:.2rem .55rem">${hub.isPublic ? 'Make Private' : 'Make Public'}</button>` : ''}
            </div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.9rem 1rem">
            <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.4rem">Created By</div>
            <div style="font-size:.88rem;font-weight:600;color:var(--txt)">${hub.createdByName || '—'}</div>
            <div style="font-size:.74rem;color:var(--txt-muted)">${hub.createdAt ? new Date(hub.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : ''}</div>
          </div>
        </div>

        ${!isReadOnly ? `<div style="display:flex;justify-content:flex-end">
          <button class="btn btn-danger btn-sm" id="rh-delete-btn" style="font-size:.78rem">&#128465; Delete Hub</button>
        </div>` : '<div style="padding:.6rem .8rem;background:#fef9e7;border:1px solid #fce08a;border-radius:8px;font-size:.8rem;color:#92400e">&#128274; You have read-only access to this hub.</div>'}
      </div>`;

    // ── Tab: Sections ──
    const sectionDefs = [
      { key: 'milestones', icon: '🏁', label: 'Milestones',       desc: 'Progress checklist of all 10 milestones' },
      { key: 'timeline',   icon: '📅', label: 'Timeline',          desc: 'Target & actual dates per milestone' },
      { key: 'documents',  icon: '📄', label: 'Documents',         desc: 'Links from the Documents tab' },
      { key: 'recordings', icon: '🎬', label: 'Recordings',        desc: 'Meeting recordings — Full access only' },
      { key: 'contacts',   icon: '📞', label: 'Key Contacts',      desc: 'Project contacts — Full access only' },
      { key: 'ticketing',  icon: '🎫', label: 'Ticketing',         desc: 'Link for clients to submit tickets' },
    ];

    if (!hub.limitedSections) hub.limitedSections = { milestones: true, timeline: true, documents: true, recordings: false, contacts: false, ticketing: false };

    const sectionsHtml = `
      <div id="rh-tab-sections" style="display:${activeTab==='sections'?'block':'none'}">
        <div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.2rem">
          ${sectionDefs.map(s => `
            <div style="display:flex;align-items:center;gap:.8rem;padding:.75rem 1rem;border:1.5px solid ${hub.sections[s.key]?'#86efac':'var(--border)'};border-radius:10px;background:${hub.sections[s.key]?'#f0fdf4':'var(--surface)'}">
              <span style="font-size:1.2rem;flex-shrink:0">${s.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:.88rem;font-weight:600;color:var(--txt)">${s.label}</div>
                <div style="font-size:.74rem;color:var(--txt-muted)">${s.desc}</div>
                ${s.key==='ticketing'&&hub.sections.ticketing&&!isReadOnly?`<input type="text" id="rh-ticketing-url" value="${(hub.ticketingUrl||'').replace(/"/g,'&quot;')}" placeholder="Paste ticketing URL…" style="margin-top:.45rem;width:100%;padding:.38rem .6rem;border:1.5px solid var(--border);border-radius:6px;font-size:.8rem;outline:none" />
                  <input type="text" id="rh-ticketing-note" value="${(hub.ticketingNote||'').replace(/"/g,'&quot;')}" placeholder="Optional note for clients…" style="margin-top:.3rem;width:100%;padding:.38rem .6rem;border:1.5px solid var(--border);border-radius:6px;font-size:.8rem;outline:none" />`:''}
                ${s.key==='ticketing'&&hub.sections.ticketing&&isReadOnly&&hub.ticketingUrl?`<div style="font-size:.78rem;color:var(--txt-muted);margin-top:.3rem">${hub.ticketingUrl}</div>`:''}
                ${!isReadOnly && hub.sections[s.key] ? `
                <div style="margin-top:.45rem;display:flex;align-items:center;gap:.45rem">
                  <span style="font-size:.71rem;color:var(--txt-muted)">Visible to Limited users:</span>
                  <label style="display:flex;align-items:center;cursor:pointer">
                    <input type="checkbox" class="rh-limited-toggle" data-key="${s.key}" ${hub.limitedSections[s.key]?'checked':''} style="display:none" />
                    <span class="rh-limited-track" data-key="${s.key}" style="display:inline-block;width:30px;height:17px;border-radius:20px;background:${hub.limitedSections[s.key]?'#8139EE':'#d1d5db'};position:relative;cursor:pointer;transition:background .2s">
                      <span style="position:absolute;top:2px;left:${hub.limitedSections[s.key]?'15px':'2px'};width:13px;height:13px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
                    </span>
                  </label>
                  <span style="font-size:.71rem;font-weight:600;color:${hub.limitedSections[s.key]?'#8139EE':'#9ca3af'}">${hub.limitedSections[s.key]?'Yes':'No'}</span>
                </div>` : ''}
              </div>
              ${!isReadOnly?`<label class="rh-toggle" style="flex-shrink:0">
                <input type="checkbox" class="rh-section-toggle" data-key="${s.key}" ${hub.sections[s.key]?'checked':''} style="display:none" />
                <span class="rh-toggle-track" style="display:inline-block;width:38px;height:22px;border-radius:20px;background:${hub.sections[s.key]?'#32CE13':'#d1d5db'};position:relative;cursor:pointer;transition:background .2s;flex-shrink:0">
                  <span style="position:absolute;top:3px;left:${hub.sections[s.key]?'19px':'3px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)"></span>
                </span>
              </label>`:'<span style="font-size:.78rem;font-weight:700;color:'+(hub.sections[s.key]?'#16a34a':'#9ca3af')+'">'+( hub.sections[s.key]?'ON':'OFF')+'</span>'}
            </div>`).join('')}
        </div>
        ${!isReadOnly?`<div class="modal-actions"><button class="btn btn-ghost rh-close-btn">Close</button><button class="btn btn-primary" id="rh-save-sections-btn">Save Sections</button></div>`:'<div class="modal-actions"><button class="btn btn-ghost rh-close-btn">Close</button></div>'}
      </div>`;

    // ── Tab: Access Control ──
    const accessHtml = `
      <div id="rh-tab-access" style="display:${activeTab==='access'?'block':'none'}">
        ${!isReadOnly?`<div style="background:#f8f4ff;border:1px solid #ddd0f5;border-radius:10px;padding:.9rem 1rem;margin-bottom:1rem">
          <div style="font-size:.82rem;font-weight:700;color:#5a1aaa;margin-bottom:.6rem">&#43; Add Access</div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end">
            <input type="text" id="rh-ac-name" placeholder="Name" style="flex:1;min-width:110px;padding:.42rem .6rem;border:1.5px solid #d0c0f0;border-radius:7px;font-size:.83rem;outline:none" />
            <input type="email" id="rh-ac-email" placeholder="Email address" style="flex:1.5;min-width:160px;padding:.42rem .6rem;border:1.5px solid #d0c0f0;border-radius:7px;font-size:.83rem;outline:none" />
            <select id="rh-ac-level" style="padding:.42rem .6rem;border:1.5px solid #d0c0f0;border-radius:7px;font-size:.83rem;outline:none">
              <option value="full">Full Access</option>
              <option value="limited">Limited Access</option>
            </select>
            <button class="btn btn-primary btn-sm" id="rh-ac-add-btn">Add</button>
          </div>
          <div style="font-size:.73rem;color:#7a6a9a;margin-top:.5rem">
            <strong>Full</strong> — all enabled sections &nbsp;|&nbsp; <strong>Limited</strong> — sections configured in the Sections tab
          </div>
        </div>`:''}

        <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.5rem">
          Authorized Users <span style="font-weight:400;text-transform:none;font-size:.78rem">(${hub.accessList.length})</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.4rem;max-height:220px;overflow-y:auto" id="rh-ac-list">
          ${hub.accessList.length===0
    ? '<div style="text-align:center;padding:1.2rem;color:var(--txt-muted);font-size:.84rem;border:2px dashed var(--border);border-radius:8px">No users have been granted access yet.</div>'
    : hub.accessList.map((a,i) => `
                <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .75rem;border:1px solid var(--border);border-radius:9px;background:var(--surface)">
                  <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#8139EE,#32CE13);color:#fff;font-size:.8rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(a.name||a.email||'?')[0].toUpperCase()}</div>
                  <div style="flex:1;min-width:0">
                    ${a.name?`<div style="font-size:.83rem;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}${a.isPM?` <span style="font-size:.68rem;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:10px;font-weight:700">PM</span>`:''}</div>`:''}
                    <div style="font-size:.74rem;color:var(--txt-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.email}</div>
                    <div style="font-size:.7rem;margin-top:1px">${a.hasPassword?'<span style="color:#059669">🔒 Password set</span>':'<span style="color:#d97706">⚠️ No password set</span>'}</div>
                  </div>
                  ${!isReadOnly
    ? `<button class="btn btn-ghost btn-sm rh-set-pw-btn" data-idx="${i}" data-email="${a.email}" title="${a.hasPassword?'Reset password':'Set password'}" style="font-size:.72rem;padding:.2rem .45rem;white-space:nowrap">${a.hasPassword?'🔑 Reset':'🔑 Set PW'}</button>
                    <select class="rh-ac-level-select" data-idx="${i}" style="padding:.28rem .5rem;border:1.5px solid var(--border);border-radius:6px;font-size:.78rem;outline:none">
                      <option value="full" ${a.accessLevel==='full'?'selected':''}>Full</option>
                      <option value="limited" ${a.accessLevel==='limited'?'selected':''}>Limited</option>
                    </select>
                    <button class="btn btn-danger btn-sm rh-ac-remove-btn" data-idx="${i}" style="padding:.2rem .45rem;font-size:.72rem">&#10005;</button>`
    : `<span style="font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:20px;background:${a.accessLevel==='full'?'#d1fae5':'#fef3c7'};color:${a.accessLevel==='full'?'#065f46':'#92400e'}">${a.accessLevel==='full'?'Full':'Limited'}</span>`}
                </div>`).join('')}
        </div>
        ${!isReadOnly?`<div class="modal-actions" style="margin-top:.8rem"><button class="btn btn-ghost rh-close-btn">Close</button><button class="btn btn-primary" id="rh-save-access-btn">Save Access List</button></div>`:'<div class="modal-actions" style="margin-top:.8rem"><button class="btn btn-ghost rh-close-btn">Close</button></div>'}

        ${(hub.accessLog && hub.accessLog.length > 0) ? `
        <div style="margin-top:1.2rem">
          <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.5rem">
            Access Log <span style="font-weight:400;text-transform:none">(last ${Math.min(hub.accessLog.length,20)})</span>
            ${hub.accessLog.some(l=>!l.success)?'<span style="margin-left:.5rem;font-size:.72rem;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:10px;font-weight:700">⚠ Failed attempts detected</span>':''}
          </div>
          <div style="display:flex;flex-direction:column;gap:.25rem;max-height:180px;overflow-y:auto;font-size:.74rem">
            ${hub.accessLog.slice(0,20).map(l=>`
              <div style="display:flex;align-items:center;gap:.5rem;padding:.3rem .55rem;border-radius:6px;background:${l.success?'var(--bg)':'#fef2f2'};border:1px solid ${l.success?'var(--border)':'#fecaca'}">
                <span>${l.success?'✅':'❌'}</span>
                <span style="flex:1;color:var(--txt)">${l.email}</span>
                <span style="color:var(--txt-muted)">${new Date(l.timestamp).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                ${!l.success?`<span style="color:#dc2626;font-size:.7rem">${l.reason==='wrong_password'?'Wrong password':'Not authorized'}</span>`:''}
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;

    // ── Tab: Recordings ──
    const recHtml = `
      <div id="rh-tab-recordings" style="display:${activeTab==='recordings'?'block':'none'}">
        ${!hub.sections.recordings?`<div style="padding:.9rem 1rem;background:#fef9e7;border:1px solid #fce08a;border-radius:8px;font-size:.83rem;color:#92400e;margin-bottom:1rem">&#9888; The Recordings section is currently disabled. Enable it in the <strong>Sections</strong> tab first.</div>`:''}
        ${!isReadOnly?`<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.9rem 1rem;margin-bottom:1rem">
          <div style="font-size:.82rem;font-weight:700;color:var(--txt);margin-bottom:.6rem">&#43; Add Recording (Google Drive Link)</div>
          <div style="display:flex;flex-direction:column;gap:.4rem">
            <input type="text" id="rh-rec-name" placeholder="Display name (e.g. KOM Meeting — March 10)" style="padding:.42rem .7rem;border:1.5px solid var(--border);border-radius:7px;font-size:.83rem;outline:none" />
            <input type="url" id="rh-rec-url" placeholder="Google Drive URL" style="padding:.42rem .7rem;border:1.5px solid var(--border);border-radius:7px;font-size:.83rem;outline:none" />
            <button class="btn btn-primary btn-sm" id="rh-rec-add-btn" style="align-self:flex-start">Add Recording</button>
          </div>
        </div>`:''}
        <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);margin-bottom:.5rem">
          Recordings (${hub.recordings.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:.4rem;max-height:220px;overflow-y:auto" id="rh-rec-list">
          ${hub.recordings.length===0
    ? '<div style="text-align:center;padding:1.2rem;color:var(--txt-muted);font-size:.84rem;border:2px dashed var(--border);border-radius:8px">No recordings added yet.</div>'
    : hub.recordings.map((r,i) => `
              <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .75rem;border:1px solid var(--border);border-radius:9px;background:var(--surface)">
                <span style="font-size:1.2rem;flex-shrink:0">🎬</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.84rem;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
                  <div style="font-size:.74rem;color:var(--txt-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.driveUrl}</div>
                </div>
                <a href="${r.driveUrl}" target="_blank" class="btn btn-ghost btn-sm" style="font-size:.75rem;padding:.2rem .5rem;text-decoration:none">↗</a>
                ${!isReadOnly?`<button class="btn btn-danger btn-sm rh-rec-remove-btn" data-idx="${i}" style="padding:.2rem .45rem;font-size:.72rem">&#10005;</button>`:''}
              </div>`).join('')}
        </div>
        ${!isReadOnly?`<div class="modal-actions" style="margin-top:.8rem"><button class="btn btn-ghost rh-close-btn">Close</button><button class="btn btn-primary" id="rh-save-rec-btn">Save Recordings</button></div>`:'<div class="modal-actions" style="margin-top:.8rem"><button class="btn btn-ghost rh-close-btn">Close</button></div>'}
      </div>`;

    // ── Tabs ──
    const TAB_S  = 'padding:.52rem 1rem;font-size:.83rem;font-weight:600;font-family:var(--font-sub);border:none;background:none;cursor:pointer;margin-bottom:-2px;color:var(--txt-muted);border-bottom:2.5px solid transparent';
    const TAB_SA = TAB_S.replace('var(--txt-muted)','var(--txt)').replace('transparent','var(--primary)');
    const tabs   = [
      { key: 'overview',    label: '&#127760; Overview' },
      { key: 'sections',    label: '&#9776; Sections' },
      { key: 'access',      label: '&#128274; Access' },
      { key: 'recordings',  label: '&#127909; Recordings' },
    ];

    const m = createModal(`
      <h3 style="margin-bottom:.3rem">&#127760; Resource Hub</h3>
      <p style="font-size:.82rem;color:var(--txt-muted);margin-bottom:.9rem">${p.title}</p>

      <div style="display:flex;gap:0;margin-bottom:1.1rem;border-bottom:2px solid var(--border)">
        ${tabs.map(t => `<button class="rh-tab" data-tab="${t.key}" style="${t.key===activeTab?TAB_SA:TAB_S}">${t.label}</button>`).join('')}
      </div>

      ${overviewHtml}
      ${sectionsHtml}
      ${accessHtml}
      ${recHtml}

      ${activeTab==='overview'?`<div class="modal-actions" style="margin-top:1rem"><button class="btn btn-ghost rh-close-btn">Close</button></div>`:''}
    `);

    // Close handlers
    m.querySelectorAll('.rh-close-btn').forEach(b => b.onclick = () => m.remove());

    // Tab switching
    m.querySelectorAll('.rh-tab').forEach(btn => {
      btn.onclick = () => { m.remove(); buildHubModal(btn.dataset.tab); };
    });

    // Copy URL
    m.querySelector('#rh-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(hubUrl).then(() => {
        const btn = m.querySelector('#rh-copy-btn');
        btn.textContent = '✓ Copied!'; setTimeout(() => { btn.innerHTML = '&#128203; Copy'; }, 2000);
      });
    });

    // Toggle public/private
    m.querySelector('#rh-toggle-public-btn')?.addEventListener('click', async function() {
      this.disabled = true;
      const updated = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ isPublic: !hub.isPublic }) });
      hub = await updated.json();
      m.remove(); buildHubModal('overview');
    });

    // Delete hub
    m.querySelector('#rh-delete-btn')?.addEventListener('click', async function() {
      if (!confirm(`Delete the resource hub for "${p.title}"? This cannot be undone.`)) return;
      await fetch(`/api/resource-hub/${hub.id}`, { method: 'DELETE' });
      m.remove();
    });

    // Limited-access toggles live update
    m.querySelectorAll('.rh-limited-toggle').forEach(cb => {
      cb.addEventListener('change', () => {
        hub.limitedSections[cb.dataset.key] = cb.checked;
        const track = cb.nextElementSibling;
        if (track) {
          track.style.background = cb.checked ? '#8139EE' : '#d1d5db';
          const knob = track.querySelector('span');
          if (knob) knob.style.left = cb.checked ? '15px' : '2px';
        }
        const lbl = cb.parentElement?.parentElement?.querySelector('span:last-child');
        if (lbl && lbl.style) { lbl.textContent = cb.checked ? 'Yes' : 'No'; lbl.style.color = cb.checked ? '#8139EE' : '#9ca3af'; }
      });
    });

    // Section toggles live update
    m.querySelectorAll('.rh-section-toggle').forEach(cb => {
      cb.addEventListener('change', () => {
        hub.sections[cb.dataset.key] = cb.checked;
        const track = cb.nextElementSibling;
        if (track) {
          track.style.background = cb.checked ? '#32CE13' : '#d1d5db';
          const knob = track.querySelector('span');
          if (knob) knob.style.left = cb.checked ? '19px' : '3px';
        }
      });
    });

    // Save sections
    m.querySelector('#rh-save-sections-btn')?.addEventListener('click', async function() {
      this.disabled = true; this.textContent = 'Saving…';
      const tickUrl  = m.querySelector('#rh-ticketing-url')?.value.trim()  || hub.ticketingUrl;
      const tickNote = m.querySelector('#rh-ticketing-note')?.value.trim() || hub.ticketingNote;
      const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sections: hub.sections, limitedSections: hub.limitedSections, ticketingUrl: tickUrl, ticketingNote: tickNote }) });
      hub = await r.json();
      m.remove(); buildHubModal('sections');
    });

    // Add access
    m.querySelector('#rh-ac-add-btn')?.addEventListener('click', async function() {
      const name  = m.querySelector('#rh-ac-name')?.value.trim();
      const email = m.querySelector('#rh-ac-email')?.value.trim().toLowerCase();
      const level = m.querySelector('#rh-ac-level')?.value;
      if (!email) { alert('Email is required.'); return; }
      if (hub.accessList.find(a => a.email === email)) { alert('This email is already in the access list.'); return; }
      hub.accessList.push({ name: name || '', email, accessLevel: level, addedAt: new Date().toISOString() });
      const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ accessList: hub.accessList }) });
      hub = await r.json();
      m.remove(); buildHubModal('access');
    });

    // Set / Reset password for a contact
    m.querySelectorAll('.rh-set-pw-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const email = btn.dataset.email;
        const idx   = parseInt(btn.dataset.idx);
        const entry = hub.accessList[idx];
        const hasExisting = entry.hasPassword;
        const pw = prompt(
          `${hasExisting ? 'Reset' : 'Set'} password for ${entry.name || email}:\n\nLeave blank to remove the password.`
        );
        if (pw === null) return; // cancelled
        const r = await fetch(`/api/resource-hub/${hub.id}/set-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pw.trim() }),
        });
        if (r.ok) {
          const updated = await fetch(`/api/resource-hub/${hub.id}`);
          hub = await updated.json();
          m.remove();
          buildHubModal('access');
        } else {
          alert('Failed to set password. Please try again.');
        }
      });
    });

    // Access level change
    m.querySelectorAll('.rh-ac-level-select').forEach(sel => {
      sel.addEventListener('change', () => { hub.accessList[parseInt(sel.dataset.idx)].accessLevel = sel.value; });
    });

    // Save access list
    m.querySelector('#rh-save-access-btn')?.addEventListener('click', async function() {
      this.disabled = true; this.textContent = 'Saving…';
      const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ accessList: hub.accessList }) });
      hub = await r.json();
      m.remove(); buildHubModal('access');
    });

    // Remove access
    m.querySelectorAll('.rh-ac-remove-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        hub.accessList.splice(parseInt(btn.dataset.idx), 1);
        const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ accessList: hub.accessList }) });
        hub = await r.json();
        m.remove(); buildHubModal('access');
      });
    });

    // Add recording
    m.querySelector('#rh-rec-add-btn')?.addEventListener('click', async function() {
      const name = m.querySelector('#rh-rec-name')?.value.trim();
      const url  = m.querySelector('#rh-rec-url')?.value.trim();
      if (!name || !url) { alert('Both name and URL are required.'); return; }
      hub.recordings.push({ id: Date.now().toString(36), name, driveUrl: url, addedAt: new Date().toISOString(), addedBy: effectiveUser()?.name || '' });
      const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ recordings: hub.recordings }) });
      hub = await r.json();
      m.remove(); buildHubModal('recordings');
    });

    // Remove recording
    m.querySelectorAll('.rh-rec-remove-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!confirm('Remove this recording?')) return;
        hub.recordings.splice(parseInt(btn.dataset.idx), 1);
        const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ recordings: hub.recordings }) });
        hub = await r.json();
        m.remove(); buildHubModal('recordings');
      });
    });
  }

  buildHubModal('overview');
}

// ── MILESTONE DOCUMENTATION MODAL ────────────────────────────
function openDocsModal(projectId) {
  const p = getProjects().find(x => x.id === projectId);
  if (!p) return;

  const milestone = getCurrentMilestone(p) || 'Completed';

  function buildModal() {
    const proj    = getProjects().find(x => x.id === projectId);
    const entries = proj?.docs?.[milestone] || [];

    const entriesHtml = entries.length === 0
      ? `<div style="text-align:center;padding:1.5rem 0;color:var(--txt-muted);font-size:.85rem">No notes yet for this milestone.</div>`
      : [...entries].reverse().map(d => `
          <div style="border:1px solid var(--border);border-radius:8px;padding:.65rem .85rem;margin-bottom:.5rem;background:var(--surface)">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
              <span style="font-size:.7rem;color:var(--txt-muted)">
                ${new Date(d.createdAt).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
              </span>
              <span style="font-size:.7rem;font-weight:600;color:var(--primary)">&#183; ${d.createdByName}</span>
            </div>
            <div style="font-size:.84rem;color:var(--txt);line-height:1.55">${d.html || d.text?.replace(/\n/g,'<br>') || ''}</div>
          </div>`).join('');

    const toolbarBtn = (cmd, icon, title) =>
      `<button type="button" class="doc-fmt-btn" data-cmd="${cmd}" title="${title}"
        style="padding:.2rem .5rem;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--txt);cursor:pointer;font-size:.8rem;line-height:1;font-family:inherit">${icon}</button>`;

    const modal = createModal(`
      <h3>&#128196; Documentation</h3>
      <div style="font-size:.78rem;color:var(--txt-muted);margin-bottom:.85rem;font-weight:500">
        &#9873; ${milestone} &nbsp;&mdash;&nbsp; ${proj.title}
      </div>
      <div style="max-height:240px;overflow-y:auto;margin-bottom:1rem;padding-right:.2rem">${entriesHtml}</div>
      <div style="margin-bottom:.4rem">
        <div style="font-size:.75rem;font-weight:600;color:var(--txt-muted);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.05em">Add a Note</div>
        <div style="display:flex;gap:.3rem;margin-bottom:.35rem;flex-wrap:wrap">
          ${toolbarBtn('bold',      '<b>B</b>',  'Bold')}
          ${toolbarBtn('italic',    '<i>I</i>',  'Italic')}
          ${toolbarBtn('underline', '<u>U</u>',  'Underline')}
          ${toolbarBtn('insertUnorderedList', '&#8226; List', 'Bullet List')}
          ${toolbarBtn('insertOrderedList',   '1. List',      'Numbered List')}
        </div>
        <div id="docs-editor" contenteditable="true"
          style="min-height:90px;max-height:180px;overflow-y:auto;border:1.5px solid var(--border);border-radius:6px;padding:.55rem .75rem;font-size:.84rem;line-height:1.55;background:var(--bg);color:var(--txt);outline:none;font-family:inherit"
          data-placeholder="What happened at this milestone?..."></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="docs-cancel">Close</button>
        <button class="btn btn-primary" id="docs-add">Add Note</button>
      </div>
    `);

    // Placeholder behaviour
    const editor = modal.querySelector('#docs-editor');
    editor.addEventListener('focus', () => { if (!editor.textContent.trim()) editor.innerHTML = ''; });

    // Format toolbar
    modal.querySelectorAll('.doc-fmt-btn').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault(); // keep focus in editor
        editor.focus();
        document.execCommand(btn.dataset.cmd, false, null);
      });
    });

    modal.querySelector('#docs-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#docs-add').addEventListener('click', () => {
      const html = editor.innerHTML.trim();
      if (!html || html === '<br>') return;
      const list = getProjects();
      const idx  = list.findIndex(x => x.id === projectId);
      if (idx === -1) return;
      if (!list[idx].docs) list[idx].docs = {};
      if (!list[idx].docs[milestone]) list[idx].docs[milestone] = [];
      list[idx].docs[milestone].push({
        id:            genId(),
        html,
        text:          editor.innerText,
        createdAt:     new Date().toISOString(),
        createdByName: effectiveUser()?.name || 'Unknown',
      });
      saveProjects(list);
      modal.remove();
      buildModal();
    });
  }

  buildModal();
}

// ── CONTACTS MODAL ────────────────────────────────────────────
function openContactsModal(projectId) {
  async function buildModal() {
    const p = getProjects().find(x => x.id === projectId);
    if (!p) return;
    const contacts  = p.details?.contacts || [];
    let teamRoles   = p.teamRoles || {};

    // If teamRoles not yet saved (project existed before this feature), fetch from live deal cache
    const hasTeamData = Object.values(teamRoles).some(r => r?.name || r?.id);
    if (!hasTeamData && p.hubspotId) {
      try {
        const r = await fetch(`/api/hubspot/deal-team/${encodeURIComponent(p.hubspotId)}`);
        if (r.ok) {
          const live = await r.json();
          // Convert text-only format to the { id, name } shape
          teamRoles = {
            hrsi:          { id: null, name: live.hrsi          || null },
            psi:           { id: null, name: live.psi           || null },
            payrollMaster: { id: null, name: live.payrollMaster || null },
            softwareImpl:  { id: null, name: live.softwareImpl  || null },
          };
        }
      } catch {}
    }

    // ── Sprout Team ──
    const pm = p.projectManager ? cachedUsers.find(u => u.id === p.projectManager) : null;

    function resolveTeamMember(role) {
      if (!role) return null;
      let u = role.id ? cachedUsers.find(u => u.id === role.id) : null;
      if (!u && role.name) u = cachedUsers.find(u => u.name?.trim().toLowerCase() === role.name.trim().toLowerCase());
      const name = u?.name || role.name;
      if (!name) return null;
      return { name, jobTitle: u?.jobTitle || null, email: u?.email || null, phone: u?.phone || null };
    }

    function teamRow(label, member) {
      if (!member) return '';
      const displayLabel = member.jobTitle || label;
      return `<tr>
        <td style="padding:.4rem .6rem;font-size:.78rem;font-weight:700;color:#065f46;white-space:nowrap">${displayLabel}</td>
        <td style="padding:.4rem .6rem;font-size:.8rem;font-weight:600">${member.name}</td>
        <td style="padding:.4rem .6rem;font-size:.8rem;color:var(--txt-muted)">${member.phone || '—'}</td>
        <td style="padding:.4rem .6rem;font-size:.8rem">${member.email ? `<a href="mailto:${member.email}" style="color:var(--primary)">${member.email}</a>` : '—'}</td>
      </tr>`;
    }

    const sproutTeamRows = [
      pm ? `<tr>
        <td style="padding:.4rem .6rem;font-size:.78rem;font-weight:700;color:#065f46;white-space:nowrap">${pm.jobTitle || 'Project Manager'}</td>
        <td style="padding:.4rem .6rem;font-size:.8rem;font-weight:600">${pm.name}</td>
        <td style="padding:.4rem .6rem;font-size:.8rem;color:var(--txt-muted)">${pm.phone || '—'}</td>
        <td style="padding:.4rem .6rem;font-size:.8rem">${pm.email ? `<a href="mailto:${pm.email}" style="color:var(--primary)">${pm.email}</a>` : '—'}</td>
      </tr>` : '',
      teamRow('HRSI',          resolveTeamMember(teamRoles.hrsi)),
      teamRow('PSI',           resolveTeamMember(teamRoles.psi)),
      teamRow('Payroll Master',resolveTeamMember(teamRoles.payrollMaster)),
      teamRow('SI',            resolveTeamMember(teamRoles.softwareImpl)),
    ].join('');

    const hasSproutTeam = pm || Object.values(teamRoles).some(r => r?.name || r?.id);

    // ── Client Contacts ──
    const contactRows = contacts.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:.75rem;color:var(--txt-muted);font-size:.83rem">No client contacts added yet.</td></tr>`
      : contacts.map((c, i) => `
          <tr>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.name}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.phone || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.email || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.position || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.projectRole || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem"><span class="badge" style="background:${c.access === 'full' ? '#d1fae5' : '#fef3c7'};color:${c.access === 'full' ? '#065f46' : '#92400e'}">${c.access === 'full' ? 'Full' : 'Limited'}</span></td>
            <td style="padding:.4rem .6rem"><button class="btn btn-danger btn-sm remove-contact-btn" data-idx="${i}" style="padding:.15rem .4rem;font-size:.72rem">&#10005;</button></td>
          </tr>`).join('');

    const modal = createModal(`
      <h3>&#128101; Contacts &mdash; <span style="font-weight:400;font-size:.95rem">${p.title}</span></h3>

      ${hasSproutTeam ? `
      <div style="font-size:.72rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#065f46;margin:1rem 0 .4rem;display:flex;align-items:center;gap:.5rem">
        <span style="display:inline-block;width:3px;height:14px;background:#16a34a;border-radius:2px"></span>
        Sprout Project Team
      </div>
      <div style="overflow-x:auto;margin-bottom:1rem">
        <table style="width:100%;border-collapse:collapse;font-size:.8rem">
          <thead>
            <tr style="background:#f0fdf4;text-align:left">
              <th style="padding:.4rem .6rem;border-bottom:1px solid #bbf7d0;font-size:.75rem">Role</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid #bbf7d0;font-size:.75rem">Name</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid #bbf7d0;font-size:.75rem">Phone</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid #bbf7d0;font-size:.75rem">Email</th>
            </tr>
          </thead>
          <tbody>${sproutTeamRows}</tbody>
        </table>
      </div>` : ''}

      <div style="font-size:.72rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--txt-muted);margin:.5rem 0 .4rem;display:flex;align-items:center;gap:.5rem">
        <span style="display:inline-block;width:3px;height:14px;background:#f59e0b;border-radius:2px"></span>
        Client Contact
      </div>
      <div style="overflow-x:auto;margin-bottom:.75rem">
        <table style="width:100%;border-collapse:collapse;font-size:.8rem">
          <thead>
            <tr style="background:var(--surface);text-align:left">
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Name</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Phone</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Email</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Position</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Project Role</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Access</th>
              <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)"></th>
            </tr>
          </thead>
          <tbody id="pd-contacts-body">${contactRows}</tbody>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.6rem">
        <input type="text"  id="pd-c-name"     placeholder="Name *"       style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <input type="tel"   id="pd-c-phone"    placeholder="Phone"        style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <input type="email" id="pd-c-email"    placeholder="Email"        style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <input type="text"  id="pd-c-position" placeholder="Position"     style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <input type="text"  id="pd-c-role"     placeholder="Project Role" style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <select id="pd-c-access" style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)">
          <option value="full">Full</option>
          <option value="limited">Limited</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" id="pd-add-contact" style="margin-top:.5rem">&#43; Add Client Contact</button>

      <div class="modal-actions" style="margin-top:.75rem">
        <button class="btn btn-ghost" id="pd-close">Close</button>
      </div>
    `);

    document.getElementById('pd-close').addEventListener('click', () => modal.remove());

    document.getElementById('pd-add-contact').addEventListener('click', () => {
      const name = document.getElementById('pd-c-name').value.trim();
      if (!name) { alert('Name is required.'); return; }
      const contact = {
        id:          genId(),
        name,
        phone:       document.getElementById('pd-c-phone').value.trim(),
        email:       document.getElementById('pd-c-email').value.trim(),
        position:    document.getElementById('pd-c-position').value.trim(),
        projectRole: document.getElementById('pd-c-role').value.trim(),
        access:      document.getElementById('pd-c-access').value,
      };
      const list = getProjects();
      const idx  = list.findIndex(x => x.id === projectId);
      if (idx === -1) return;
      if (!list[idx].details) list[idx].details = {};
      if (!list[idx].details.contacts) list[idx].details.contacts = [];
      list[idx].details.contacts.push(contact);
      saveProjects(list);
      modal.remove();
      buildModal();
    });

    modal.querySelectorAll('.remove-contact-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Remove this contact?')) return;
        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        if (idx === -1) return;
        list[idx].details.contacts.splice(parseInt(btn.dataset.idx), 1);
        saveProjects(list);
        modal.remove();
        buildModal();
      });
    });
  }
  buildModal();
}

// ── RECORDINGS MODAL ──────────────────────────────────────────
async function openRecordingsModal(projectId) {
  const p = getProjects().find(x => x.id === projectId);
  if (!p) return;

  // Load hub
  let hub = null;
  try {
    const r = await fetch(`/api/resource-hub/project/${projectId}`);
    if (r.ok) hub = await r.json();
  } catch {}

  function buildModal() {
    const recordings = hub?.recordings || [];
    const recListHtml = recordings.length === 0
      ? `<div style="text-align:center;padding:1.2rem 0;color:var(--txt-muted);font-size:.85rem;border:2px dashed var(--border);border-radius:8px">No recordings yet.</div>`
      : recordings.map((r, i) => `
          <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .75rem;border:1px solid var(--border);border-radius:9px;background:var(--surface);margin-bottom:.4rem">
            <span style="font-size:1.1rem;flex-shrink:0">&#127909;</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.83rem;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
              <div style="font-size:.72rem;color:var(--txt-muted)">${r.addedAt ? new Date(r.addedAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : ''}</div>
            </div>
            <a href="${r.driveUrl}" target="_blank" rel="noopener" style="font-size:.78rem;color:var(--primary);text-decoration:none;font-weight:600;white-space:nowrap">Open ↗</a>
            <button class="btn btn-danger btn-sm remove-rec-btn" data-idx="${i}" style="padding:.1rem .35rem;font-size:.7rem;line-height:1">&#10005;</button>
          </div>`).join('');

    const modal = createModal(`
      <h3>&#127909; Recordings &mdash; <span style="font-weight:400;font-size:.95rem">${p.title}</span></h3>
      ${!hub ? `<div style="padding:1rem;text-align:center;color:var(--txt-muted);font-size:.85rem;background:var(--surface);border-radius:8px;margin:.75rem 0">
        Resource Hub not set up yet. Generate one first via the Hub button.
      </div>` : `
      <div style="max-height:260px;overflow-y:auto;margin:.75rem 0;padding-right:.2rem">${recListHtml}</div>
      <div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.5rem">
        <input type="text" id="rec-name" placeholder="Recording title (e.g. KOM Recording – March 2026)"
          style="padding:.38rem .65rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <input type="url" id="rec-url" placeholder="Google Drive link"
          style="padding:.38rem .65rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
      </div>`}
      <div class="modal-actions" style="margin-top:.75rem">
        <button class="btn btn-ghost" id="rec-close">Close</button>
        ${hub ? `<button class="btn btn-primary" id="rec-add">&#43; Add Recording</button>` : ''}
      </div>
    `);

    modal.querySelector('#rec-close').addEventListener('click', () => modal.remove());

    modal.querySelector('#rec-add')?.addEventListener('click', async () => {
      const name = modal.querySelector('#rec-name').value.trim();
      const url  = modal.querySelector('#rec-url').value.trim();
      if (!name) { alert('Please enter a title.'); return; }
      if (!url)  { alert('Please paste a Google Drive link.'); return; }
      const newRec = { id: genId(), name, driveUrl: url, addedAt: new Date().toISOString(), addedBy: effectiveUser()?.name || '' };
      hub.recordings = [...(hub.recordings || []), newRec];
      try {
        const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ recordings: hub.recordings }) });
        hub = await r.json();
      } catch { alert('Failed to save recording.'); return; }
      modal.remove();
      buildModal();
    });

    modal.querySelectorAll('.remove-rec-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this recording?')) return;
        hub.recordings.splice(parseInt(btn.dataset.idx), 1);
        try {
          const r = await fetch(`/api/resource-hub/${hub.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ recordings: hub.recordings }) });
          hub = await r.json();
        } catch { alert('Failed to remove recording.'); return; }
        modal.remove();
        buildModal();
      });
    });
  }

  buildModal();
}

// ── FILES MODAL ───────────────────────────────────────────────
function openFilesModal(projectId) {
  function buildModal() {
    const p = getProjects().find(x => x.id === projectId);
    if (!p) return;
    const salesDocs = p.details?.salesDocs || (p.details?.salesDriveLink ? [{ id: genId(), name: 'Project Link', url: p.details.salesDriveLink }] : []);

    const filesHtml = salesDocs.length === 0
      ? `<div style="text-align:center;padding:1.2rem 0;color:var(--txt-muted);font-size:.85rem;border:2px dashed var(--border);border-radius:8px">No files added yet.</div>`
      : salesDocs.map((d, i) => `
          <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .75rem;border:1px solid var(--border);border-radius:9px;background:var(--surface);margin-bottom:.4rem">
            <span style="font-size:1.1rem;flex-shrink:0">&#128193;</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.83rem;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</div>
            </div>
            <a href="${d.url}" target="_blank" rel="noopener" style="font-size:.78rem;color:var(--primary);text-decoration:none;font-weight:600;white-space:nowrap">Open ↗</a>
            <button class="btn btn-danger btn-sm remove-file-btn" data-idx="${i}" style="padding:.1rem .35rem;font-size:.7rem;line-height:1">&#10005;</button>
          </div>`).join('');

    const modal = createModal(`
      <h3>&#128193; Files &mdash; <span style="font-weight:400;font-size:.95rem">${p.title}</span></h3>
      <div style="font-size:.77rem;color:var(--txt-muted);margin-bottom:.75rem">Files are visible to the client on the Resource Hub under "Project Documents".</div>
      <div style="max-height:260px;overflow-y:auto;margin-bottom:.85rem;padding-right:.2rem">${filesHtml}</div>
      <div style="display:flex;gap:.5rem;align-items:center">
        <input type="text" id="file-name" placeholder="Label (e.g. SOW, Proposal…)"
          style="flex:0 0 180px;padding:.38rem .65rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <input type="url" id="file-url" placeholder="Google Drive link"
          style="flex:1;padding:.38rem .65rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        <button id="file-add" title="Add file" style="flex-shrink:0;width:32px;height:32px;border-radius:50%;border:2px solid var(--primary);background:var(--primary);color:#fff;font-size:1.1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
      </div>
      <div class="modal-actions" style="margin-top:.75rem">
        <button class="btn btn-ghost" id="file-close">Close</button>
      </div>
    `);

    modal.querySelector('#file-close').addEventListener('click', () => modal.remove());

    modal.querySelector('#file-add').addEventListener('click', () => {
      const name = modal.querySelector('#file-name').value.trim();
      const url  = modal.querySelector('#file-url').value.trim();
      if (!name) { alert('Please enter a label.'); return; }
      if (!url)  { alert('Please paste a Google Drive link.'); return; }
      const list = getProjects();
      const idx  = list.findIndex(x => x.id === projectId);
      if (idx === -1) return;
      if (!list[idx].details) list[idx].details = {};
      if (!list[idx].details.salesDocs) list[idx].details.salesDocs = salesDocs.slice();
      list[idx].details.salesDocs.push({ id: genId(), name, url, addedAt: new Date().toISOString() });
      delete list[idx].details.salesDriveLink;
      saveProjects(list);
      modal.remove();
      buildModal();
    });

    modal.querySelectorAll('.remove-file-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        if (idx === -1) return;
        if (!list[idx].details.salesDocs) list[idx].details.salesDocs = salesDocs.slice();
        list[idx].details.salesDocs.splice(parseInt(btn.dataset.idx), 1);
        saveProjects(list);
        modal.remove();
        buildModal();
      });
    });
  }

  buildModal();
}

// ── PROJECT FULL DETAILS MODAL (4 tabs: Milestones, Timeline, Documents, Details) ──
function openProjectFullModal(projectId, initialTab = 'milestones') {
  function buildModal(activeTab) {
    activeTab = activeTab || initialTab;
    const p = getProjects().find(x => x.id === projectId);
    if (!p) return;

    const milestones = p.milestones || {};
    const timeline   = p.timeline   || {};
    const details    = p.details    || {};
    const contacts   = details.contacts || [];
    const salesDocs  = details.salesDocs || (details.salesDriveLink ? [{ id: genId(), name: 'Project Link', url: details.salesDriveLink }] : []);
    const isReadOnly = !can('edit_milestones');
    const today      = new Date().toISOString().split('T')[0];
    const completedCount = MILESTONES.filter(m => milestones[m]).length;
    const progress       = Math.round((completedCount / MILESTONES.length) * 100);

    // Milestones tab rows
    const canEditActual = can('edit_actual_dates');
    function buildProgressRowsHtml(tl) {
      return MILESTONES.map((m, i) => {
        const done        = !!milestones[m];
        const locked      = !isReadOnly && i > 0 && !milestones[MILESTONES[i - 1]];
        const disabled    = isReadOnly || locked;
        const targetStart = tl[m]?.startDate || '';
        const targetEnd   = tl[m]?.endDate || tl[m]?.targetDate || '';
        const actualDate  = tl[m]?.actualDate || (done ? today : '');
        const actualCell  = canEditActual
          ? `<input type="date" class="ms-actual" data-milestone="${m}" value="${actualDate}" style="font-size:.75rem;border:1px solid var(--border);border-radius:4px;padding:1px 4px;background:var(--bg);color:${done ? '#16a34a' : 'var(--txt)'};width:118px" />`
          : `<span class="ms-actual-display" style="color:${done ? '#16a34a' : 'var(--txt-muted)'}">${actualDate || '—'}</span><input type="hidden" class="ms-actual" data-milestone="${m}" value="${actualDate}" />`;
        return `
          <div class="ms-row" data-index="${i}" style="display:grid;grid-template-columns:20px 1fr 100px 100px 130px 50px;gap:.6rem;align-items:center;padding:.55rem .9rem;border-radius:8px;border:1.5px solid ${done ? '#86efac' : 'var(--border)'};background:${done ? '#f0fdf4' : locked ? '#fafafa' : 'var(--bg)'};opacity:${locked ? '.5' : '1'};transition:all .15s">
            <input type="checkbox" class="ms-check" data-index="${i}" data-milestone="${m}"
              ${done ? 'checked' : ''} ${disabled ? 'disabled' : ''}
              style="width:15px;height:15px;accent-color:var(--primary);cursor:${disabled ? 'not-allowed' : 'pointer'}" />
            <div>
              <span style="font-size:.72rem;color:var(--txt-muted);font-weight:600;margin-right:.3rem">${i + 1}.</span>
              <span class="ms-label" style="font-size:.85rem;${done ? 'text-decoration:line-through;color:var(--txt-muted)' : 'font-weight:500'}">${m}</span>
            </div>
            <div style="font-size:.78rem;color:var(--txt-muted);text-align:center">${targetStart || '—'}</div>
            <div style="font-size:.78rem;color:var(--txt-muted);text-align:center">${targetEnd || '—'}</div>
            <div style="font-size:.78rem;text-align:center">${actualCell}</div>
            <div style="text-align:center;font-size:.85rem">
              ${locked ? '&#128274;' : done ? '<span style="color:#16a34a;font-weight:700">&#10003;</span>' : i === completedCount ? '<span style="color:var(--accent-orange)">&#9654;</span>' : ''}
            </div>
          </div>`;
      }).join('');
    }
    const progressRows = buildProgressRowsHtml(timeline);

    // Timeline tab rows — use active template if set
    const pfActiveTplId  = p.timelineTemplate || '';
    const pfActiveTpl    = cachedTemplates.find(t => t.id === pfActiveTplId);
    const pfActivePhases = pfActiveTpl ? pfActiveTpl.phases : null;
    const pfTplSelectorHtml = cachedTemplates.length > 0 ? `
      <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.85rem;padding:.55rem .85rem;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
        <span style="font-size:.83rem;font-weight:600;color:var(--txt);white-space:nowrap">&#128203; Template:</span>
        <select id="pf-tpl-selector" style="flex:1;padding:.32rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.83rem;background:var(--bg);color:var(--txt)">
          <option value="">Standard (Built-in)</option>
          ${cachedTemplates.map(t => `<option value="${t.id}" ${pfActiveTplId === t.id ? 'selected' : ''}>${escAttr(t.name)}</option>`).join('')}
        </select>
      </div>` : '';
    const planningRows = buildPlanningRows(timeline, milestones, isReadOnly, pfActivePhases);

    // Timeline versions
    const versions = p.timelineVersions || [];
    const versionSelectorHtml = versions.length > 0 ? `
      <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem;padding:.5rem .85rem;background:#f0fdf4;border-radius:8px;border:1px solid #86efac">
        <span style="font-size:.78rem;font-weight:700;color:#065f46;white-space:nowrap">&#128203; History:</span>
        <select id="pf-version-selector" style="flex:1;padding:.3rem .55rem;border:1px solid #86efac;border-radius:6px;font-size:.8rem;background:#fff;color:var(--txt)">
          <option value="">&#9989; Active (Current)</option>
          ${[...versions].reverse().map(v => `<option value="${v.id}">v${v.versionNumber} &mdash; ${v.name} (${new Date(v.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})})</option>`).join('')}
        </select>
      </div>` : '';

    // Documents tab
    const docsHtml = salesDocs.length > 0
      ? `<div style="display:flex;flex-direction:column;gap:.35rem;margin-bottom:.75rem">
          ${salesDocs.map((d, i) => `
            <div style="display:flex;align-items:center;gap:.6rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.45rem .75rem">
              <span style="font-size:.82rem;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d.url}">&#128193; ${d.name}</span>
              <a href="${d.url}" target="_blank" style="font-size:.78rem;color:var(--primary);text-decoration:none;white-space:nowrap;font-weight:600">Open ↗</a>
              <button class="btn btn-danger btn-sm remove-doc-btn" data-idx="${i}" style="padding:.1rem .35rem;font-size:.7rem;line-height:1">&#10005;</button>
            </div>`).join('')}
        </div>`
      : `<p style="font-size:.82rem;color:var(--txt-muted);margin:0 0 .75rem">No links added yet.</p>`;

    // Details tab contacts
    const contactRows = contacts.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:.75rem;color:var(--txt-muted);font-size:.83rem">No contacts added yet.</td></tr>`
      : contacts.map((c, i) => `
          <tr>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.name}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.phone || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.email || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.position || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem">${c.projectRole || '—'}</td>
            <td style="padding:.4rem .6rem;font-size:.8rem"><span class="badge" style="background:${c.access === 'full' ? '#d1fae5' : '#fef3c7'};color:${c.access === 'full' ? '#065f46' : '#92400e'}">${c.access === 'full' ? 'Full' : 'Limited'}</span></td>
            <td style="padding:.4rem .6rem"><button class="btn btn-danger btn-sm remove-contact-btn" data-idx="${i}" style="padding:.15rem .4rem;font-size:.72rem">&#10005;</button></td>
          </tr>`).join('');

    const TAB_STYLE       = 'padding:.55rem 1.1rem;font-size:.85rem;font-weight:600;font-family:var(--font-sub);border:none;background:none;cursor:pointer;margin-bottom:-2px;color:var(--txt-muted);border-bottom:2.5px solid transparent';
    const TAB_STYLE_ACTIVE = TAB_STYLE.replace('var(--txt-muted)', 'var(--txt)').replace('transparent', 'var(--primary)');

    const tabs = [
      { key: 'milestones', label: '&#9873; Milestones' },
      { key: 'timeline',   label: '&#128197; Timeline' },
      { key: 'documents',  label: '&#128193; Documents' },
      { key: 'details',    label: '&#128101; Details' },
    ];

    const modal = createModal(`
      <h3 style="margin-bottom:.8rem">&#128196; ${p.title}</h3>

      <div style="display:flex;gap:0;margin-bottom:1.2rem;border-bottom:2px solid var(--border)">
        ${tabs.map(t => `<button class="pf-tab" data-tab="${t.key}" style="${t.key === activeTab ? TAB_STYLE_ACTIVE : TAB_STYLE}">${t.label}</button>`).join('')}
      </div>

      <!-- Milestones Tab -->
      <div id="pf-tab-milestones" style="display:${activeTab === 'milestones' ? 'block' : 'none'}">
        <div style="margin-bottom:1rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
            <span style="font-size:.82rem;color:var(--txt-muted)">Overall Progress</span>
            <span style="font-size:.82rem;font-weight:700" id="pf-ms-progress-label">${completedCount}/${MILESTONES.length} &nbsp; ${progress}%</span>
          </div>
          <div class="progress-bar-wrap" style="height:10px"><div class="progress-bar" id="pf-ms-progress-bar" style="width:${progress}%"></div></div>
        </div>
        <div style="display:grid;grid-template-columns:20px 1fr 100px 100px 130px 50px;gap:.5rem;padding:.3rem .9rem;font-size:.7rem;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.05em">
          <div></div><div>Milestone</div><div style="text-align:center">Target Start</div><div style="text-align:center">Target End</div><div style="text-align:center">Actual</div><div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.35rem" id="pf-ms-list">${progressRows}</div>
        <div class="modal-actions" style="margin-top:1.2rem">
          <button class="btn btn-ghost pf-close-btn">Close</button>
          <button class="btn btn-ghost" id="pf-download-btn">&#11123; Download Timeline</button>
          ${!isReadOnly ? `<button class="btn btn-primary" id="pf-ms-save-btn">Save Progress</button>` : ''}
        </div>
      </div>

      <!-- Timeline Tab -->
      <div id="pf-tab-timeline" style="display:${activeTab === 'timeline' ? 'block' : 'none'}">
        <p style="font-size:.82rem;color:var(--txt-muted);margin-bottom:.9rem">Set target dates per phase. Save first, then download to share with your client.</p>
        ${versionSelectorHtml}
        ${pfTplSelectorHtml}
        <div id="pf-planning-rows-wrap" style="display:flex;flex-direction:column;gap:.2rem">${planningRows}</div>
        <div class="modal-actions" style="margin-top:1.2rem">
          <button class="btn btn-ghost pf-close-btn">Close</button>
          <button class="btn btn-ghost" id="pf-tl-download-btn">&#11123; Download Timeline</button>
          ${!isReadOnly ? `<button class="btn btn-secondary" id="pf-tl-version-btn" style="background:#f0fdf4;border:1.5px solid #86efac;color:#065f46">&#128203; Save as New Version</button><button class="btn btn-primary" id="pf-tl-save-btn">Save Dates</button>` : ''}
        </div>
      </div>

      <!-- Documents Tab -->
      <div id="pf-tab-documents" style="display:${activeTab === 'documents' ? 'block' : 'none'}">
        <div style="font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);margin-bottom:.6rem">&#128279; Project Links</div>
        ${docsHtml}
        <div style="display:flex;gap:.5rem;align-items:center">
          <input type="text" id="pf-doc-name" placeholder="Label (e.g. Proposal, SOW…)"
            style="flex:0 0 180px;padding:.38rem .65rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <input type="url" id="pf-doc-url" placeholder="Paste link (Drive, Notion, SharePoint…)"
            style="flex:1;padding:.38rem .65rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <button id="pf-add-doc" style="flex-shrink:0;width:32px;height:32px;border-radius:50%;border:2px solid var(--primary);background:var(--primary);color:#fff;font-size:1.1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
        </div>
        <div class="modal-actions" style="margin-top:1.2rem">
          <button class="btn btn-ghost pf-close-btn">Close</button>
        </div>
      </div>

      <!-- Details Tab -->
      <div id="pf-tab-details" style="display:${activeTab === 'details' ? 'block' : 'none'}">
        <div style="font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);margin-bottom:.6rem">&#128101; Project Contacts</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.8rem">
            <thead>
              <tr style="background:var(--surface);text-align:left">
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Name</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Phone</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Email</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Position</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Project Role</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)">Access</th>
                <th style="padding:.4rem .6rem;border-bottom:1px solid var(--border)"></th>
              </tr>
            </thead>
            <tbody>${contactRows}</tbody>
          </table>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-top:.85rem">
          <input type="text"  id="pf-c-name"     placeholder="Name *"       style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <input type="tel"   id="pf-c-phone"    placeholder="Phone"        style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <input type="email" id="pf-c-email"    placeholder="Email"        style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <input type="text"  id="pf-c-position" placeholder="Position"     style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <input type="text"  id="pf-c-role"     placeholder="Project Role" style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
          <select id="pf-c-access" style="padding:.38rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)">
            <option value="full">Full</option>
            <option value="limited">Limited</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="pf-add-contact" style="margin-top:.5rem">&#43; Add Contact</button>
        <div class="modal-actions" style="margin-top:.75rem">
          <button class="btn btn-ghost pf-close-btn">Close</button>
        </div>
      </div>
    `);

    const pfBox = modal.querySelector('.modal');
    pfBox.style.maxWidth  = '860px';
    pfBox.style.width     = '96%';
    pfBox.style.maxHeight = '90vh';
    pfBox.style.overflowY = 'auto';

    // Tab switching
    modal.querySelectorAll('.pf-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.pf-tab').forEach(b => {
          b.style.borderBottomColor = 'transparent';
          b.style.color = 'var(--txt-muted)';
        });
        btn.style.borderBottomColor = 'var(--primary)';
        btn.style.color = 'var(--txt)';
        ['milestones','timeline','documents','details'].forEach(t => {
          modal.querySelector(`#pf-tab-${t}`).style.display = btn.dataset.tab === t ? 'block' : 'none';
        });
        // Re-render progress rows with live planning dates on every switch to milestones
        if (btn.dataset.tab === 'milestones') {
          const liveTimeline = collectTimeline();
          syncTemplateToMilestones(liveTimeline, getPfActivePhases());
          modal.querySelector('#pf-ms-list').innerHTML = buildProgressRowsHtml(liveTimeline);
          attachMsCheckListeners();
          refreshProgressRows();
        }
      });
    });

    // Close buttons
    modal.querySelectorAll('.pf-close-btn').forEach(b => b.addEventListener('click', () => modal.remove()));

    // Milestone: sequential lock logic
    function refreshProgressRows() {
      const checkboxes = [...modal.querySelectorAll('.ms-check')];
      checkboxes.forEach((cb, i) => {
        const row      = cb.closest('.ms-row');
        const done     = cb.checked;
        const prevDone = i === 0 || checkboxes[i - 1].checked;
        const locked   = !prevDone && !done;
        cb.disabled           = locked;
        row.style.opacity     = locked ? '.5' : '1';
        row.style.background  = done ? '#f0fdf4' : locked ? '#fafafa' : 'var(--bg)';
        row.style.borderColor = done ? '#86efac' : 'var(--border)';
        const label = row.querySelector('.ms-label');
        if (label) {
          label.style.textDecoration = done ? 'line-through' : 'none';
          label.style.color          = done ? 'var(--txt-muted)' : 'var(--txt)';
        }
        const actualInput   = row.querySelector('.ms-actual');
        const actualDisplay = row.querySelector('.ms-actual-display');
        if (actualInput && done && !actualInput.value) {
          actualInput.value = today;
          if (actualDisplay) actualDisplay.textContent = today;
        }
      });
      const checkedCount = checkboxes.filter(c => c.checked).length;
      const pct          = Math.round((checkedCount / MILESTONES.length) * 100);
      modal.querySelector('#pf-ms-progress-bar').style.width   = pct + '%';
      modal.querySelector('#pf-ms-progress-label').textContent = `${checkedCount}/${MILESTONES.length}   ${pct}%`;
    }

    function attachMsCheckListeners() {
      if (isReadOnly) return;
      modal.querySelectorAll('.ms-check').forEach((cb, i) => {
        cb.addEventListener('change', () => {
          if (!cb.checked) {
            [...modal.querySelectorAll('.ms-check')].slice(i + 1).forEach(next => { next.checked = false; });
          }
          refreshProgressRows();
        });
      });
    }
    attachMsCheckListeners();

    // Timeline helpers
    function collectTimeline() {
      const updated = { ...timeline };
      modal.querySelectorAll('.plan-start').forEach(input => {
        const m = input.dataset.milestone;
        updated[m] = { ...(updated[m] || {}), startDate: input.value };
      });
      modal.querySelectorAll('.plan-end').forEach(input => {
        const m = input.dataset.milestone;
        updated[m] = { ...(updated[m] || {}), endDate: input.value, targetDate: input.value };
      });
      return updated;
    }

    function getPfActivePhases() {
      const tplId = modal.querySelector('#pf-tpl-selector')?.value || '';
      if (!tplId) return null;
      const tpl = cachedTemplates.find(t => t.id === tplId);
      return tpl ? tpl.phases : null;
    }

    // Template selector → re-render planning rows
    modal.querySelector('#pf-tpl-selector')?.addEventListener('change', () => {
      const phases = getPfActivePhases();
      const wrap   = modal.querySelector('#pf-planning-rows-wrap');
      if (wrap) wrap.innerHTML = buildPlanningRows(timeline, milestones, isReadOnly, phases);
      const tplId = modal.querySelector('#pf-tpl-selector').value || null;
      const list  = getProjects();
      const idx   = list.findIndex(x => x.id === projectId);
      if (idx !== -1) { list[idx].timelineTemplate = tplId; saveProjects(list); }
    });

    function handleDownload() {
      const latest = getProjects().find(x => x.id === projectId);
      downloadTimeline(latest, latest.milestones || {}, collectTimeline(), getPfActivePhases());
    }

    modal.querySelector('#pf-download-btn')?.addEventListener('click', handleDownload);
    modal.querySelector('#pf-tl-download-btn')?.addEventListener('click', handleDownload);

    if (!isReadOnly) {
      // Save milestone progress
      modal.querySelector('#pf-ms-save-btn')?.addEventListener('click', () => {
        const updatedMilestones = {};
        const updatedTimeline   = { ...timeline };
        modal.querySelectorAll('.ms-check').forEach(cb => {
          const m    = cb.dataset.milestone;
          const done = cb.checked;
          updatedMilestones[m] = done;
          const actualInput = modal.querySelector(`.ms-actual[data-milestone="${m}"]`);
          updatedTimeline[m] = {
            startDate:  timeline[m]?.startDate  || '',
            endDate:    timeline[m]?.endDate    || '',
            targetDate: timeline[m]?.targetDate || '',
            actualDate: done ? (actualInput?.value || timeline[m]?.actualDate || today) : '',
          };
        });
        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        list[idx].milestones = updatedMilestones;
        list[idx].timeline   = updatedTimeline;
        list[idx].progress   = Math.round((Object.values(updatedMilestones).filter(Boolean).length / MILESTONES.length) * 100);
        saveProjects(list);
        const done = Object.values(updatedMilestones).filter(Boolean).length;
        logAudit('milestone.saved', `Saved milestones for "${list[idx].title}" (${done}/${MILESTONES.length} complete)`, { projectId, progress: list[idx].progress });
        modal.remove();
        buildModal('milestones');
      });

      // Save timeline dates
      modal.querySelector('#pf-tl-save-btn')?.addEventListener('click', () => {
        const updatedTimeline = collectTimeline();
        syncTemplateToMilestones(updatedTimeline, getPfActivePhases());
        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        list[idx].timeline         = updatedTimeline;
        list[idx].timelineTemplate = modal.querySelector('#pf-tpl-selector')?.value || null;
        saveProjects(list);
        alert('Target dates saved!');
      });

      // Save as new version
      modal.querySelector('#pf-tl-version-btn')?.addEventListener('click', () => {
        const name = prompt('Version name (e.g. "Q1 Revision", "After Kickoff"):')?.trim();
        if (!name) return;
        const reason = prompt('Revision reason (required — this will be auto-documented internally):')?.trim();
        if (!reason) return;

        const newTimeline = collectTimeline();
        syncTemplateToMilestones(newTimeline, getPfActivePhases());

        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        if (idx === -1) return;
        const proj = list[idx];

        if (!proj.timelineVersions) proj.timelineVersions = [];
        const versionNumber = proj.timelineVersions.length + 1;
        const oldSnapshot   = { ...(proj.timeline || {}) };

        proj.timelineVersions.push({
          id:             `tv_${Date.now()}`,
          versionNumber,
          name,
          snapshot:       oldSnapshot,
          createdAt:      new Date().toISOString(),
          createdBy:      effectiveUser()?.name || 'Unknown',
          revisionReason: reason,
        });

        proj.timeline         = newTimeline;
        proj.timelineTemplate = modal.querySelector('#pf-tpl-selector')?.value || null;

        // Auto-create internal documentation entry
        if (!proj.docs) proj.docs = {};
        const revKey = '_timeline_revisions';
        if (!proj.docs[revKey]) proj.docs[revKey] = [];
        proj.docs[revKey].push({
          id:            `td_${Date.now()}`,
          html:          `<strong>Timeline Version ${versionNumber}: ${name}</strong><br><em>Reason:</em> ${reason}<br><em>By:</em> ${effectiveUser()?.name || 'Unknown'} &mdash; ${new Date().toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}`,
          text:          `Timeline Version ${versionNumber}: ${name}\nReason: ${reason}`,
          createdAt:     new Date().toISOString(),
          createdByName: effectiveUser()?.name || 'Unknown',
          isInternal:    true,
        });

        saveProjects(list);
        logAudit('timeline.version_saved', `Saved timeline version "${name}" for "${proj.title}" — Reason: ${reason}`, { projectId });
        modal.remove();
        buildModal('timeline');
      });
    }

    // Version selector — switch between historical snapshots
    modal.querySelector('#pf-version-selector')?.addEventListener('change', function() {
      const versionId = this.value;
      const wrap = modal.querySelector('#pf-planning-rows-wrap');
      const saveBtn    = modal.querySelector('#pf-tl-save-btn');
      const verBtn     = modal.querySelector('#pf-tl-version-btn');
      const tplWrap    = modal.querySelector('#pf-tpl-selector')?.closest('div[style*="Template"]') || null;
      if (!versionId) {
        // Active timeline — editable
        wrap.innerHTML = buildPlanningRows(timeline, milestones, isReadOnly, getPfActivePhases());
        if (saveBtn) saveBtn.style.display = '';
        if (verBtn)  verBtn.style.display  = '';
      } else {
        const ver = versions.find(v => v.id === versionId);
        if (!ver) return;
        // Historical snapshot — read-only
        wrap.innerHTML = buildPlanningRows(ver.snapshot, milestones, true, getPfActivePhases());
        // Append reason banner
        if (ver.revisionReason) {
          const banner = document.createElement('div');
          banner.style.cssText = 'font-size:.8rem;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:.45rem .75rem;margin-top:.6rem';
          banner.innerHTML = `&#128203; <strong>Reason:</strong> ${ver.revisionReason} &mdash; <em>${new Date(ver.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})} by ${ver.createdBy}</em>`;
          wrap.appendChild(banner);
        }
        if (saveBtn) saveBtn.style.display = 'none';
        if (verBtn)  verBtn.style.display  = 'none';
      }
    });

    // Documents: add
    modal.querySelector('#pf-add-doc').addEventListener('click', () => {
      const name = modal.querySelector('#pf-doc-name').value.trim();
      const url  = modal.querySelector('#pf-doc-url').value.trim();
      if (!name) { alert('Please enter a link name.'); return; }
      if (!url)  { alert('Please paste a link.'); return; }
      const list = getProjects();
      const idx  = list.findIndex(x => x.id === projectId);
      if (idx === -1) return;
      if (!list[idx].details) list[idx].details = {};
      if (!list[idx].details.salesDocs) list[idx].details.salesDocs = salesDocs.slice();
      list[idx].details.salesDocs.push({ id: genId(), name, url, addedAt: new Date().toISOString() });
      delete list[idx].details.salesDriveLink;
      saveProjects(list);
      modal.remove();
      buildModal('documents');
    });

    // Documents: remove
    modal.querySelectorAll('.remove-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        if (idx === -1) return;
        if (!list[idx].details) list[idx].details = {};
        if (!list[idx].details.salesDocs) list[idx].details.salesDocs = salesDocs.slice();
        list[idx].details.salesDocs.splice(parseInt(btn.dataset.idx), 1);
        saveProjects(list);
        modal.remove();
        buildModal('documents');
      });
    });

    // Details: add contact
    modal.querySelector('#pf-add-contact').addEventListener('click', () => {
      const name = modal.querySelector('#pf-c-name').value.trim();
      if (!name) { alert('Name is required.'); return; }
      const contact = {
        id:          genId(),
        name,
        phone:       modal.querySelector('#pf-c-phone').value.trim(),
        email:       modal.querySelector('#pf-c-email').value.trim(),
        position:    modal.querySelector('#pf-c-position').value.trim(),
        projectRole: modal.querySelector('#pf-c-role').value.trim(),
        access:      modal.querySelector('#pf-c-access').value,
      };
      const list = getProjects();
      const idx  = list.findIndex(x => x.id === projectId);
      if (idx === -1) return;
      if (!list[idx].details) list[idx].details = {};
      if (!list[idx].details.contacts) list[idx].details.contacts = [];
      list[idx].details.contacts.push(contact);
      saveProjects(list);
      modal.remove();
      buildModal('details');
    });

    // Details: remove contact
    modal.querySelectorAll('.remove-contact-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Remove this contact?')) return;
        const list = getProjects();
        const idx  = list.findIndex(x => x.id === projectId);
        if (idx === -1) return;
        list[idx].details.contacts.splice(parseInt(btn.dataset.idx), 1);
        saveProjects(list);
        modal.remove();
        buildModal('details');
      });
    });
  }

  buildModal();
}

// ── PAGE HANDLERS ─────────────────────────────────────────────
function attachPageHandlers(page) {
  if (page === 'my-dashboard' || page === 'tools-hub') {
    attachToolsHandlers();
  }
  if (page === 'users') {
    document.getElementById('new-user-btn')?.addEventListener('click', () => openUserModal());
    document.querySelectorAll('.edit-user-btn').forEach(b =>
      b.addEventListener('click', () => openUserModal(b.dataset.id)));
    document.querySelectorAll('.delete-user-btn').forEach(b =>
      b.addEventListener('click', () => deleteUser(b.dataset.id)));

    // Bulk Edit Profiles panel
    document.getElementById('bulk-edit-profiles-btn')?.addEventListener('click', () => {
      const panel = document.getElementById('bulk-profile-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('bulk-profile-cancel')?.addEventListener('click', () => {
      document.getElementById('bulk-profile-panel').style.display = 'none';
    });
    document.getElementById('bulk-profile-save')?.addEventListener('click', async () => {
      const rows = [...document.querySelectorAll('#bulk-profile-table tbody tr')].map(tr => ({
        id:       tr.dataset.uid,
        name:     tr.querySelector('[data-field="name"]').value.trim(),
        email:    tr.querySelector('[data-field="email"]').value.trim(),
        phone:    tr.querySelector('[data-field="phone"]').value.trim(),
        jobTitle: tr.querySelector('[data-field="jobTitle"]').value.trim(),
      }));
      const res = await fetch('/api/users/bulk-profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(rows),
      });
      if (!res.ok) { alert('Save failed.'); return; }
      await fetchUsers();
      document.getElementById('bulk-profile-panel').style.display = 'none';
      renderAdminUsers(document.getElementById('main-content'));
    });
  }
  if (page === 'users' && permissionsMatrix[currentUser.role]?.act_as_user) {
    document.querySelectorAll('.act-as-btn').forEach(b =>
      b.addEventListener('click', () => startActingAs(b.dataset.id)));
  }
  document.querySelectorAll('.update-progress-btn').forEach(b =>
    b.addEventListener('click', () => openProgressModal(b.dataset.id)));

  document.querySelectorAll('.start-timer-btn').forEach(b =>
    b.addEventListener('click', () => startTimer(b.dataset.id)));
  document.querySelectorAll('.stop-timer-btn').forEach(b =>
    b.addEventListener('click', () => {
      if (appSettings.timerPopupEnabled) {
        // When popup is enabled, clicking Stop from the row opens/focuses the popup
        openTimerPopup();
      } else {
        stopTimer();
      }
    }));
  document.querySelectorAll('.log-hours-btn').forEach(b =>
    b.addEventListener('click', () => openLogHoursModal(b.dataset.id)));
  document.querySelectorAll('.view-timelog-btn').forEach(b =>
    b.addEventListener('click', () => openTimeLogModal(b.dataset.id)));
  document.querySelectorAll('.open-milestones-btn').forEach(b =>
    b.addEventListener('click', () => openMilestonesModal(b.dataset.id)));
  document.querySelectorAll('.ai-chat-btn').forEach(b =>
    b.addEventListener('click', () => openProjectChatModal(b.dataset.id)));

  document.querySelectorAll('.card-status-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const list = getProjects();
      const idx  = list.findIndex(p => p.id === sel.dataset.id);
      if (idx === -1) return;
      list[idx].status = sel.value;
      saveProjects(list);
      // Update card border color without full re-render
      const card = sel.closest('.project-card');
      if (card) {
        card.className = `project-card status-${sel.value}`;
      }
    });
  });

  if (getActiveTimer()) startTimerTick();
}

// ── PROJECT MODAL ─────────────────────────────────────────────
async function openProjectModal(id) {
  await fetchUsers();
  const projects = getProjects();
  const users    = cachedUsers;
  const p        = id ? projects.find(x => x.id === id) : null;
  const title    = p ? 'Edit Project' : 'New Project';

  const userOptions = users.map(u =>
    `<option value="${u.id}" ${p?.assignedTo.includes(u.id) ? 'selected' : ''}>${u.name}</option>`
  ).join('');

  const modal = createModal(`
    <h3>${title}</h3>
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="m-title" value="${p?.title || ''}" placeholder="Project title" required />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="m-desc" placeholder="Brief description...">${p?.description || ''}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>Status</label>
        <select id="m-status">
          ${STATUS_OPTIONS.map(s =>
            `<option value="${s.value}" ${p?.status === s.value ? 'selected' : ''}>${s.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Priority</label>
        <select id="m-priority">
          ${['high','medium','low'].map(s =>
            `<option value="${s}" ${p?.priority === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
          ).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Project Type</label>
      <select id="m-type">
        <option value="internal" ${(!p || p.projectType !== 'client') ? 'selected' : ''}>Internal</option>
        <option value="client"   ${p?.projectType === 'client'        ? 'selected' : ''}>Client</option>
      </select>
    </div>
    <div class="form-group">
      <label>Project Manager</label>
      <select id="m-pm">
        <option value="">— None —</option>
        ${users.map(u =>
          `<option value="${u.id}" ${p?.projectManager === u.id ? 'selected' : ''}>${u.name}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Assign To</label>
      <select id="m-assigned" multiple style="height:90px">${userOptions}</select>
    </div>
    <div class="form-group">
      <label>Due Date</label>
      <input type="date" id="m-due" value="${p?.dueDate || ''}" />
    </div>
    <div class="form-group">
      <label>Progress (${p?.progress || 0}%)</label>
      <input type="range" id="m-progress" min="0" max="100" value="${p?.progress || 0}"
        style="width:100%" oninput="this.previousElementSibling.textContent='Progress ('+this.value+'%)'" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save">Save Project</button>
    </div>
  `);

  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('modal-save').addEventListener('click', () => {
    const t = document.getElementById('m-title').value.trim();
    if (!t) return alert('Title is required.');
    const assigned = [...document.getElementById('m-assigned').selectedOptions].map(o => o.value);
    const data = {
      id:             p?.id || genId(),
      title:          t,
      description:    document.getElementById('m-desc').value.trim(),
      status:         document.getElementById('m-status').value,
      priority:       document.getElementById('m-priority').value,
      projectType:    document.getElementById('m-type').value,
      projectManager: document.getElementById('m-pm').value || null,
      assignedTo:     assigned,
      dueDate:        document.getElementById('m-due').value,
      progress:       parseInt(document.getElementById('m-progress').value),
      createdBy:      p?.createdBy || currentUser.id,
    };
    const isNew = !p;
    const list = getProjects();
    if (p) { const i = list.findIndex(x => x.id === p.id); list[i] = data; }
    else   { list.push(data); }
    saveProjects(list);
    modal.remove();
    logAudit(
      isNew ? 'project.created' : 'project.updated',
      isNew ? `Created project "${data.title}"` : `Updated project "${data.title}"`,
      { projectId: data.id, projectTitle: data.title, status: data.status }
    );
    navigate('projects');
  });
}

// ── USER BADGE POPUP MENU ────────────────────────────────────
function openUserBadgeMenu(anchorEl) {
  document.getElementById('user-badge-menu')?.remove();

  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'user-badge-menu';
  menu.className = 'user-badge-menu';
  menu.style.cssText = `bottom:${window.innerHeight - rect.top + 8}px;left:${rect.left}px;width:${rect.width}px`;
  menu.innerHTML = `
    <button class="ubm-item" id="ubm-profile">
      <span class="ubm-icon">&#128100;</span>My Profile
    </button>
    <button class="ubm-item" id="ubm-password">
      <span class="ubm-icon">&#128274;</span>Change Password
    </button>
    <div class="ubm-divider"></div>
    <button class="ubm-item" id="ubm-settings">
      <span class="ubm-icon">&#9881;</span>Settings
    </button>`;

  document.body.appendChild(menu);

  menu.querySelector('#ubm-profile').addEventListener('click', () => { menu.remove(); openMyProfileModal(); });
  menu.querySelector('#ubm-password').addEventListener('click', () => { menu.remove(); openChangePasswordModal(); });
  menu.querySelector('#ubm-settings').addEventListener('click', () => { menu.remove(); openUserSettingsModal(); });

  const close = (e) => { if (!menu.contains(e.target) && e.target !== anchorEl) { menu.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
}

// ── USER SETTINGS MODAL ──────────────────────────────────────
function openUserSettingsModal() {
  const prefs = getUserPrefs();

  // Build role-appropriate default page options
  const allPages = [
    { id: 'dashboard',    label: 'Dashboard (Admin)',      perm: 'view_admin_dashboard' },
    { id: 'my-dashboard', label: 'My Dashboard',           perm: 'view_my_dashboard'    },
    { id: 'projects',     label: 'Implementation Projects',perm: 'view_all_projects'    },
    { id: 'my-projects',  label: 'My Projects',            perm: 'view_my_projects'     },
  ];
  const pageOptions = allPages.filter(p => can(p.perm));
  const currentDefault = prefs.defaultPage || pageOptions[0]?.id || 'dashboard';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="width:480px;max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:1.6rem">&#9881; Settings</h3>

      <!-- Navigation -->
      <div class="settings-section">
        <div class="settings-section-title">Navigation</div>
        <div class="form-group" style="margin-bottom:0">
          <label>Default Landing Page</label>
          <select id="us-defaultpage" style="margin-top:.35rem">
            ${pageOptions.map(p => `<option value="${p.id}"${currentDefault === p.id ? ' selected' : ''}>${p.label}</option>`).join('')}
          </select>
          <div style="font-size:.78rem;color:var(--txt-muted);margin-top:.3rem">Which page opens first after you log in.</div>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-label">Dark Mode</div>
            <div class="settings-toggle-hint">Switch between light and dark interface theme.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="us-darkmode" ${(localStorage.getItem('pmt_theme') || 'light') === 'dark' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div style="margin-top:.8rem">
          <label style="font-size:.85rem;font-weight:600;color:var(--txt);display:block;margin-bottom:.5rem">Table Density</label>
          <div style="display:flex;gap:1rem">
            <label class="settings-radio-opt${!prefs.tableDensity || prefs.tableDensity === 'comfortable' ? ' active' : ''}">
              <input type="radio" name="us-density" value="comfortable" ${!prefs.tableDensity || prefs.tableDensity === 'comfortable' ? 'checked' : ''} style="accent-color:var(--primary)">
              <span>Comfortable</span>
              <span class="settings-radio-hint">Default row height</span>
            </label>
            <label class="settings-radio-opt${prefs.tableDensity === 'compact' ? ' active' : ''}">
              <input type="radio" name="us-density" value="compact" ${prefs.tableDensity === 'compact' ? 'checked' : ''} style="accent-color:var(--primary)">
              <span>Compact</span>
              <span class="settings-radio-hint">Tighter rows, more data</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Project Table -->
      <div class="settings-section">
        <div class="settings-section-title">Project Table</div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-label">Show Risk Indicators</div>
            <div class="settings-toggle-hint">Display risk badges (Critical / At Risk / On Track) next to project names.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="us-risk" ${prefs.hideRiskBadges ? '' : 'checked'}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Kanban Board -->
      <div class="settings-section">
        <div class="settings-section-title">Kanban Board</div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-label">Show Due Date on Cards</div>
            <div class="settings-toggle-hint">Displays the project due date on each kanban card.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="us-kanban-due" ${prefs.kanbanShowDueDate ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-toggle-row">
          <div>
            <div class="settings-toggle-label">Compact Card Actions</div>
            <div class="settings-toggle-hint">Hide action buttons until you hover over a card.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="us-kanban-compact" ${prefs.kanbanCompactActions ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" id="us-cancel">Cancel</button>
        <button class="btn btn-primary" id="us-save">Save Settings</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);

  // Highlight active density radio
  backdrop.querySelectorAll('input[name="us-density"]').forEach(radio => {
    radio.addEventListener('change', () => {
      backdrop.querySelectorAll('.settings-radio-opt').forEach(l => l.classList.remove('active'));
      radio.closest('.settings-radio-opt').classList.add('active');
    });
  });

  backdrop.querySelector('#us-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#us-save').addEventListener('click', () => {
    // Apply dark mode immediately
    const darkMode = backdrop.querySelector('#us-darkmode').checked;
    localStorage.setItem('pmt_theme', darkMode ? 'dark' : 'light');
    applyTheme(darkMode ? 'dark' : 'light');

    const newPrefs = {
      defaultPage:         backdrop.querySelector('#us-defaultpage').value,
      tableDensity:        backdrop.querySelector('input[name="us-density"]:checked').value,
      hideRiskBadges:      !backdrop.querySelector('#us-risk').checked,
      kanbanShowDueDate:   backdrop.querySelector('#us-kanban-due').checked,
      kanbanCompactActions:backdrop.querySelector('#us-kanban-compact').checked,
    };
    saveUserPrefs(newPrefs);
    applyUserPrefs(newPrefs);
    backdrop.remove();
  });
}

// ── MY PROFILE MODAL ─────────────────────────────────────────
function openMyProfileModal() {
  const u = currentUser;
  const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899'];

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="width:460px;max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:1.4rem">&#128100; My Profile</h3>

      <div style="display:flex;align-items:center;gap:1.1rem;margin-bottom:1.6rem;padding-bottom:1.2rem;border-bottom:1px solid var(--border)">
        <div id="mp-photo-preview" style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--bg-soft);border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${u.photoUrl
            ? `<img src="${u.photoUrl}" style="width:100%;height:100%;object-fit:cover">`
            : `<div class="user-avatar" style="background:${u.color||'#ccc'};width:72px;height:72px;font-size:28px">${u.name.charAt(0)}</div>`}
        </div>
        <div>
          <div style="font-weight:700;font-size:1.05rem;margin-bottom:.2rem">${u.name}</div>
          <div style="font-size:.83rem;color:var(--txt-muted)">${getRoleLabel(u.role)}</div>
          <div style="font-size:.78rem;color:var(--txt-muted);margin-top:.15rem;font-family:var(--font-sub)">@${u.username}</div>
        </div>
      </div>

      <div class="form-group">
        <label>Display Name</label>
        <input id="mp-name" type="text" value="${u.name}" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="mp-email" type="email" value="${u.email || ''}" placeholder="your@email.com" />
      </div>

      <div class="form-group">
        <label>Profile Photo</label>
        <div style="margin-top:.4rem">
          <label class="btn btn-ghost" style="font-size:.82rem;padding:.4rem .85rem;cursor:pointer;margin:0;display:inline-flex;align-items:center;gap:.4rem">
            &#128247; Choose Photo
            <input type="file" id="mp-photo" accept="image/*" style="display:none" />
          </label>
          <span id="mp-photo-name" style="font-size:.8rem;color:var(--txt-muted);margin-left:.6rem">No file chosen</span>
          ${u.photoUrl ? `<div style="margin-top:.5rem"><label style="font-size:.82rem;cursor:pointer;color:var(--danger);display:inline-flex;align-items:center;gap:.35rem"><input type="checkbox" id="mp-photo-remove"> Remove current photo</label></div>` : ''}
        </div>
      </div>

      <div class="form-group">
        <label>Avatar Color <span style="font-size:.78rem;font-weight:400;color:var(--txt-muted)">(shown when no photo)</span></label>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem" id="mp-colors">
          ${colors.map(c => `<div class="color-swatch${(u.color||'#4f46e5')===c?' selected':''}" style="background:${c}" data-color="${c}" title="${c}"></div>`).join('')}
        </div>
      </div>

      <div id="mp-error" style="color:var(--danger);font-size:.85rem;margin-top:.4rem;display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mp-cancel">Cancel</button>
        <button class="btn btn-primary" id="mp-save">Save Changes</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);

  let selectedColor = u.color || '#4f46e5';
  backdrop.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      backdrop.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedColor = sw.dataset.color;
    });
  });

  backdrop.querySelector('#mp-photo').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    backdrop.querySelector('#mp-photo-name').textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => {
      backdrop.querySelector('#mp-photo-preview').innerHTML =
        `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  });

  backdrop.querySelector('#mp-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#mp-save').addEventListener('click', async () => {
    const name        = backdrop.querySelector('#mp-name').value.trim();
    const email       = backdrop.querySelector('#mp-email').value.trim();
    const removePhoto = backdrop.querySelector('#mp-photo-remove')?.checked || false;
    const photoFile   = backdrop.querySelector('#mp-photo').files[0] || null;
    const errEl       = backdrop.querySelector('#mp-error');

    errEl.style.display = 'none';
    if (!name) { errEl.textContent = 'Display name is required.'; errEl.style.display = 'block'; return; }

    let photoUrl = u.photoUrl ?? null;
    if (removePhoto)    photoUrl = null;
    else if (photoFile) photoUrl = await getBase64(photoFile);

    const saveBtn = backdrop.querySelector('#mp-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

    const res  = await fetch('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, color: selectedColor, photoUrl }) });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to save.';
      errEl.style.display = 'block';
      saveBtn.disabled = false; saveBtn.textContent = 'Save Changes';
      return;
    }

    currentUser.name = data.name; currentUser.email = data.email;
    currentUser.color = data.color; currentUser.photoUrl = data.photoUrl;
    const idx = cachedUsers.findIndex(x => x.id === data.id);
    if (idx !== -1) cachedUsers[idx] = { ...cachedUsers[idx], ...data };
    renderSidebar();
    backdrop.remove();
  });
}

// ── CHANGE PASSWORD MODAL ────────────────────────────────────
function openChangePasswordModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="width:400px">
      <h3 style="margin-bottom:1.4rem">&#128274; Change Password</h3>

      <div style="background:var(--bg-soft);border-radius:8px;padding:.8rem 1rem;margin-bottom:1.2rem;font-size:.84rem;color:var(--txt-muted)">
        Password must be at least 6 characters.
      </div>

      <div class="form-group">
        <label>Current Password</label>
        <input id="cp-current" type="password" placeholder="Enter your current password" />
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input id="cp-new" type="password" placeholder="New password" />
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input id="cp-confirm" type="password" placeholder="Repeat new password" />
      </div>

      <div id="cp-error" style="color:var(--danger);font-size:.85rem;margin-top:.4rem;display:none"></div>
      <div id="cp-success" style="color:#10b981;font-size:.85rem;margin-top:.4rem;display:none">&#10003; Password changed successfully!</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cp-cancel">Cancel</button>
        <button class="btn btn-primary" id="cp-save">Update Password</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);

  backdrop.querySelector('#cp-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#cp-save').addEventListener('click', async () => {
    const curPass     = backdrop.querySelector('#cp-current').value;
    const newPass     = backdrop.querySelector('#cp-new').value;
    const confirmPass = backdrop.querySelector('#cp-confirm').value;
    const errEl       = backdrop.querySelector('#cp-error');
    const okEl        = backdrop.querySelector('#cp-success');

    errEl.style.display = 'none'; okEl.style.display = 'none';

    if (!curPass) { errEl.textContent = 'Please enter your current password.'; errEl.style.display = 'block'; return; }
    if (!newPass) { errEl.textContent = 'Please enter a new password.'; errEl.style.display = 'block'; return; }
    if (newPass.length < 6) { errEl.textContent = 'New password must be at least 6 characters.'; errEl.style.display = 'block'; return; }
    if (newPass !== confirmPass) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; return; }

    const saveBtn = backdrop.querySelector('#cp-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Updating…';

    const res  = await fetch('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: curPass, newPassword: newPass }) });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to update password.';
      errEl.style.display = 'block';
      saveBtn.disabled = false; saveBtn.textContent = 'Update Password';
      return;
    }

    okEl.style.display = 'block';
    saveBtn.textContent = 'Done';
    backdrop.querySelector('#cp-current').value = '';
    backdrop.querySelector('#cp-new').value = '';
    backdrop.querySelector('#cp-confirm').value = '';
    setTimeout(() => backdrop.remove(), 1400);
  });
}

// ── BULK IMPORT PROJECTS MODAL ────────────────────────────────
function openBulkImportProjectsModal() {
  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const exPm = cachedUsers[0]?.name || '';
    const headers = ['Title *', 'Description', 'Status', 'Priority', 'Project Manager', 'Due Date (YYYY-MM-DD)'];
    const examples = [
      ['Example Project Alpha', 'Migration and onboarding support', 'ongoing',  'high',   exPm, '2026-06-30'],
      ['Example Project Beta',  'Integration setup and testing',   'on-hold',  'medium', exPm, '2026-12-31'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws1['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 16 }, { wch: 12 }, { wch: 24 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Projects');

    const statuses   = STATUS_OPTIONS.map(s => s.value + '  →  ' + s.label);
    const priorities = ['high', 'medium', 'low'];
    const pmNames    = cachedUsers.map(u => u.name);
    const maxRows    = Math.max(statuses.length, priorities.length, pmNames.length);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Valid Statuses', 'Valid Priorities', 'Project Manager Names (must match exactly)'],
      ...Array.from({ length: maxRows }, (_, i) => [statuses[i] || '', priorities[i] || '', pmNames[i] || '']),
    ]);
    ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Reference');
    XLSX.writeFile(wb, 'sprout-pmt-projects-template.xlsx');
  }

  function parseFile(file, callback) {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = e => {
      try {
        let rows = [];
        if (ext === 'csv') {
          const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) return callback([]);
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
          rows = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
            return obj;
          });
        } else {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map(r => {
            const norm = {};
            Object.entries(r).forEach(([k, v]) => { norm[k.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = String(v).trim(); });
            return norm;
          });
        }
        callback(rows);
      } catch (err) { callback([]); }
    };
    if (ext === 'csv') reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }

  function rowsToProjects(rows) {
    const getField = (row, ...keys) => { for (const k of keys) { if (row[k]) return row[k]; } return ''; };
    const validStatuses = STATUS_OPTIONS.map(s => s.value);
    return rows
      .filter(r => getField(r, 'title', 'projecttitle', 'name'))
      .map(r => {
        const rawStatus   = getField(r, 'status').toLowerCase().replace(/\s/g, '-');
        const rawPriority = getField(r, 'priority').toLowerCase();
        const pmName      = getField(r, 'projectmanager', 'pm', 'manager');
        const pmUser      = pmName ? cachedUsers.find(u => u.name.trim().toLowerCase() === pmName.trim().toLowerCase()) : null;
        return {
          id:             genId(),
          title:          getField(r, 'title', 'projecttitle', 'name'),
          description:    getField(r, 'description', 'desc'),
          status:         validStatuses.includes(rawStatus) ? rawStatus : 'ongoing',
          priority:       ['high','medium','low'].includes(rawPriority) ? rawPriority : 'medium',
          projectType:    'internal',
          projectManager: pmUser ? pmUser.id : null,
          assignedTo:     [],
          dueDate:        getField(r, 'duedate', 'due'),
          progress:       0,
          createdBy:      currentUser.id,
        };
      });
  }

  let parsedProjects = [];

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:750px;width:95%">
      <h3 style="margin-bottom:1.2rem">&#8679; Import Projects</h3>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.9rem 1.1rem;margin-bottom:1rem">
        <p style="margin:0 0 .5rem;font-weight:600;font-size:.9rem">&#128196; How to use:</p>
        <ol style="margin:0;padding-left:1.2rem;font-size:.83rem;color:var(--txt-muted);line-height:1.7">
          <li>Download the Excel template below — it includes a Reference sheet with valid values</li>
          <li>Title is required; Status defaults to ongoing, Priority to medium if left blank</li>
          <li>Project Manager name must match exactly as it appears in the system</li>
          <li>Upload your completed CSV or Excel file and review the preview</li>
          <li>Click Import to add the projects</li>
        </ol>
      </div>
      <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:1rem">
        <button class="btn btn-ghost" id="proj-dl-template-btn">&#8615; Download Template</button>
        <label class="btn btn-ghost" style="cursor:pointer">
          &#128194; Choose File (CSV or Excel)
          <input type="file" id="proj-bulk-file" accept=".csv,.xlsx,.xls" style="display:none">
        </label>
        <span id="proj-bulk-filename" style="font-size:.82rem;color:var(--txt-muted)">No file selected</span>
      </div>
      <div id="proj-bulk-preview"></div>
      <div id="proj-bulk-result" style="margin-top:.75rem"></div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.2rem">
        <button class="btn btn-ghost" id="proj-bulk-cancel">Cancel</button>
        <button class="btn btn-primary" id="proj-bulk-import" disabled>Import Projects</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  backdrop.querySelector('#proj-bulk-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#proj-dl-template-btn').addEventListener('click', downloadTemplate);

  backdrop.querySelector('#proj-bulk-file').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    backdrop.querySelector('#proj-bulk-filename').textContent = file.name;
    parseFile(file, rows => {
      parsedProjects = rowsToProjects(rows);
      const previewEl = backdrop.querySelector('#proj-bulk-preview');
      if (!parsedProjects.length) {
        previewEl.innerHTML = '<p style="color:#dc2626;font-size:.85rem">No valid rows found. Make sure your file has a Title column.</p>';
        backdrop.querySelector('#proj-bulk-import').disabled = true;
        return;
      }
      previewEl.innerHTML = `
        <div class="table-wrap" style="max-height:280px;overflow-y:auto;margin-top:.5rem">
          <table style="font-size:.82rem">
            <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Project Manager</th><th>Due Date</th></tr></thead>
            <tbody>
              ${parsedProjects.map(p => `<tr>
                <td>${p.title}</td>
                <td>${statusBadge(p.status)}</td>
                <td style="text-transform:capitalize">${p.priority}</td>
                <td>${p.projectManager ? projectManagerDisplay(p.projectManager) : '<span style="color:var(--txt-muted)">—</span>'}</td>
                <td>${p.dueDate || '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p style="font-size:.78rem;color:var(--txt-muted);margin-top:.4rem">${parsedProjects.length} project(s) ready to import.</p>`;
      backdrop.querySelector('#proj-bulk-import').disabled = false;
    });
  });

  backdrop.querySelector('#proj-bulk-import').addEventListener('click', () => {
    const list = getProjects();
    parsedProjects.forEach(p => list.push(p));
    saveProjects(list);
    logAudit('project.bulkUploaded', `Bulk imported ${parsedProjects.length} project(s)`, { count: parsedProjects.length });
    backdrop.querySelector('#proj-bulk-result').innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.75rem 1rem;font-size:.85rem">
        ✅ <strong>${parsedProjects.length} project(s) imported successfully.</strong>
      </div>`;
    backdrop.querySelector('#proj-bulk-import').disabled = true;
    setTimeout(() => { backdrop.remove(); navigate('projects'); }, 1200);
  });
}

// ── BULK IMPORT USERS MODAL ───────────────────────────────────
function openBulkImportUsersModal() {
  const ROLES = ['super_admin','lead','project_manager','implementer'];

  function downloadTemplate() {
    const headers = ['name','username','email','role','password'];
    const example = ['Juan dela Cruz','jdelacruz','jdelacruz@sprout.ph','project_manager','Welcome@123'];
    const csv = [headers, example].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sprout-pmt-users-template.csv';
    a.click();
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });
  }

  function previewHtml(rows) {
    if (!rows.length) return '<p style="color:var(--txt-muted);text-align:center;padding:1rem">No rows found.</p>';
    return `
      <div class="table-wrap" style="max-height:260px;overflow-y:auto;margin-top:.75rem">
        <table style="font-size:.82rem">
          <thead><tr>
            <th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Password</th><th>Valid?</th>
          </tr></thead>
          <tbody>
            ${rows.map((r, i) => {
              const missing = !r.name || !r.username || !r.password;
              const badRole = r.role && !ROLES.includes(r.role);
              const ok = !missing && !badRole;
              return `<tr style="background:${ok ? '' : '#fef2f2'}">
                <td>${r.name || '<span style="color:#dc2626">missing</span>'}</td>
                <td>${r.username || '<span style="color:#dc2626">missing</span>'}</td>
                <td style="color:var(--txt-muted)">${r.email || '—'}</td>
                <td>${r.role || '<span style="color:var(--txt-muted)">project_manager</span>'}</td>
                <td>${r.password ? '••••••••' : '<span style="color:#dc2626">missing</span>'}</td>
                <td>${ok ? '✅' : '⚠️'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p style="font-size:.78rem;color:var(--txt-muted);margin-top:.5rem">${rows.length} row(s) found. Rows with missing required fields will be skipped.</p>`;
  }

  let parsedRows = [];

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:700px;width:95%">
      <h3 style="margin-bottom:1.2rem">&#8679; Bulk Import Users</h3>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.9rem 1.1rem;margin-bottom:1rem">
        <p style="margin:0 0 .5rem;font-weight:600;font-size:.9rem">&#128196; How to use:</p>
        <ol style="margin:0;padding-left:1.2rem;font-size:.83rem;color:var(--txt-muted);line-height:1.7">
          <li>Download the CSV template below</li>
          <li>Fill in user details — name, username, password are required</li>
          <li>Role: super_admin, lead, project_manager, implementer (defaults to project_manager if blank)</li>
          <li>Upload your completed CSV and review the preview</li>
          <li>Click Import to create the users</li>
        </ol>
      </div>
      <div style="display:flex;gap:.6rem;align-items:center;margin-bottom:1rem">
        <button class="btn btn-ghost" id="dl-template-btn">&#8615; Download Template</button>
        <label class="btn btn-ghost" style="cursor:pointer">
          &#128194; Choose CSV File
          <input type="file" id="bulk-users-file" accept=".csv" style="display:none">
        </label>
        <span id="bulk-users-filename" style="font-size:.82rem;color:var(--txt-muted)">No file selected</span>
      </div>
      <div id="bulk-users-preview"></div>
      <div id="bulk-users-result" style="margin-top:.75rem"></div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.2rem">
        <button class="btn btn-ghost" id="bulk-users-cancel">Cancel</button>
        <button class="btn btn-primary" id="bulk-users-import" disabled>Import Users</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  backdrop.querySelector('#bulk-users-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#dl-template-btn').addEventListener('click', downloadTemplate);

  backdrop.querySelector('#bulk-users-file').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    backdrop.querySelector('#bulk-users-filename').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => {
      parsedRows = parseCSV(e.target.result);
      backdrop.querySelector('#bulk-users-preview').innerHTML = previewHtml(parsedRows);
      backdrop.querySelector('#bulk-users-import').disabled = parsedRows.length === 0;
    };
    reader.readAsText(file);
  });

  backdrop.querySelector('#bulk-users-import').addEventListener('click', async () => {
    const btn = backdrop.querySelector('#bulk-users-import');
    btn.disabled = true;
    btn.textContent = 'Importing…';
    const resultEl = backdrop.querySelector('#bulk-users-result');

    try {
      const res = await fetch('/api/users/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(parsedRows),
      });
      const data = await res.json();

      let html = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.75rem 1rem;font-size:.85rem">
        ✅ <strong>${data.created} user(s) imported successfully.</strong>`;
      if (data.errors?.length) {
        html += `<ul style="margin:.5rem 0 0;padding-left:1.2rem;color:#dc2626">
          ${data.errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
      }
      html += '</div>';
      resultEl.innerHTML = html;

      // Refresh users list
      await fetchUsers();
      document.getElementById('users-tbody').innerHTML = userRows(cachedUsers, getProjects());
      attachPageHandlers('users');
    } catch (e) {
      resultEl.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.75rem 1rem;color:#dc2626;font-size:.85rem">❌ Import failed. Please try again.</div>`;
      btn.disabled = false;
      btn.textContent = 'Import Users';
    }
  });
}

// ── USER MODAL (API-backed) ───────────────────────────────────
function openUserModal(id) {
  const u      = id ? cachedUsers.find(x => x.id === id) : null;
  const title  = u ? 'Edit User' : 'Add User';
  const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899'];

  const modal = createModal(`
    <h3>${title}</h3>
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" id="m-name" value="${u?.name || ''}" placeholder="Full name" />
    </div>
    <div class="form-group">
      <label>Email <span style="color:var(--txt-muted);font-size:.8rem">(used for password reset)</span></label>
      <input type="email" id="m-email" value="${u?.email || ''}" placeholder="user@example.com" />
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="m-uname" value="${u?.username || ''}" placeholder="username" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="m-pass" placeholder="${u ? 'Leave blank to keep' : 'Password'}" />
      </div>
    </div>
    <div class="form-group">
      <label>Role</label>
      <select id="m-role">
        ${cachedRoles.map(r =>
          `<option value="${r.id}" ${u?.role === r.id ? 'selected' : ''}>${r.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>Job Title <span style="color:var(--txt-muted);font-size:.8rem">(shown on Resource Hub & Contacts)</span></label>
        <input type="text" id="m-job-title" value="${u?.jobTitle || ''}" placeholder="e.g. HR Software Implementation Officer" />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="tel" id="m-phone" value="${u?.phone || ''}" placeholder="e.g. 09171234567" />
      </div>
    </div>
    <div class="form-group">
      <label>HubSpot Owner ID <span style="color:var(--txt-muted);font-size:.8rem">(optional — links this user to a HubSpot owner)</span></label>
      <input type="text" id="m-hs-owner-id" value="${u?.hubspotOwnerId || ''}" placeholder="e.g. 12345678" />
    </div>
    <div class="form-group">
      <label>Profile Photo <span style="color:var(--txt-muted);font-size:.8rem">(optional)</span></label>
      <div style="display:flex;align-items:center;gap:1rem">
        <div id="m-photo-preview" style="width:56px;height:56px;border-radius:50%;overflow:hidden;background:var(--bg-soft);border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${u?.photoUrl
            ? `<img src="${u.photoUrl}" style="width:100%;height:100%;object-fit:cover">`
            : `<span style="font-size:1.4rem;color:var(--txt-muted)">&#128247;</span>`}
        </div>
        <div>
          <input type="file" id="m-photo" accept="image/*" style="font-size:.82rem" />
          ${u?.photoUrl ? `<div style="margin-top:.3rem"><label style="font-size:.78rem;cursor:pointer;color:var(--danger)"><input type="checkbox" id="m-photo-remove" style="margin-right:.3rem">Remove photo</label></div>` : ''}
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>Avatar Color <span style="color:var(--txt-muted);font-size:.8rem">(used when no photo is set)</span></label>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        ${colors.map(c => `
          <div onclick="selectColor(this,'${c}')" data-color="${c}"
            style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;
                   border:3px solid ${u?.color===c?'#1e1b4b':'transparent'};transition:border .15s">
          </div>
        `).join('')}
      </div>
      <input type="hidden" id="m-color" value="${u?.color || colors[0]}" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save">Save User</button>
    </div>
  `);

  // Live photo preview
  document.getElementById('m-photo').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('m-photo-preview').innerHTML =
        `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('modal-save').addEventListener('click', async () => {
    const name  = document.getElementById('m-name').value.trim();
    const email = document.getElementById('m-email').value.trim();
    const uname = document.getElementById('m-uname').value.trim();
    const pass  = document.getElementById('m-pass').value;
    const role  = document.getElementById('m-role').value;
    const color = document.getElementById('m-color').value;

    if (!name || !uname) return alert('Name and username are required.');
    if (!u && !pass)     return alert('Password is required for new users.');

    // Resolve photo — new upload, remove, or keep existing
    const photoFile   = document.getElementById('m-photo').files[0];
    const removePhoto = document.getElementById('m-photo-remove')?.checked;
    const hsOwnerId   = document.getElementById('m-hs-owner-id').value.trim();

    const getBase64 = file => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

    let photoUrl = u?.photoUrl ?? null;
    if (removePhoto)      photoUrl = null;
    else if (photoFile)   photoUrl = await getBase64(photoFile);

    const jobTitle = document.getElementById('m-job-title').value.trim();
    const phone    = document.getElementById('m-phone').value.trim();
    const body = { name, email, username: uname, role, color, hubspotOwnerId: hsOwnerId || null, photoUrl, jobTitle: jobTitle || null, phone: phone || null };
    if (pass) body.password = pass;

    const res = await fetch(u ? `/api/users/${u.id}` : '/api/users', {
      method:  u ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      return alert(data.error || 'Failed to save user.');
    }

    await fetchUsers(); // refresh cachedUsers with the saved hubspotOwnerId
    applyHubspotOwnerMappings(); // update any HubSpot projects now that user mappings changed
    modal.remove();
    navigate('users');
  });
}

window.selectColor = function(el, color) {
  document.querySelectorAll('[data-color]').forEach(d => d.style.border = '3px solid transparent');
  el.style.border = '3px solid #1e1b4b';
  document.getElementById('m-color').value = color;
};

// ── PROGRESS MODAL ────────────────────────────────────────────
function openProgressModal(id) {
  const projects = getProjects();
  const p = projects.find(x => x.id === id);
  if (!p) return;

  const modal = createModal(`
    <h3>Update Progress — ${p.title}</h3>
    <div class="form-group">
      <label>Progress: <strong id="progress-display">${p.progress}%</strong></label>
      <input type="range" id="m-progress" min="0" max="100" value="${p.progress}"
        style="width:100%;margin-top:.5rem"
        oninput="document.getElementById('progress-display').textContent=this.value+'%'" />
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="m-status">
        ${STATUS_OPTIONS.map(s =>
          `<option value="${s.value}" ${p.status === s.value ? 'selected' : ''}>${s.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-success" id="modal-save">Save</button>
    </div>
  `);

  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('modal-save').addEventListener('click', () => {
    const list = getProjects();
    const idx  = list.findIndex(x => x.id === id);
    list[idx].progress = parseInt(document.getElementById('m-progress').value);
    list[idx].status   = document.getElementById('m-status').value;
    saveProjects(list);
    modal.remove();
    navigate(can('view_all_projects') ? 'projects' : 'my-projects');
  });
}

// ── DELETE ACTIONS ────────────────────────────────────────────
function deleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const proj = getProjects().find(p => p.id === id);
  saveProjects(getProjects().filter(p => p.id !== id));
  logAudit('project.deleted', `Deleted project "${proj?.title || id}"`, { projectId: id, projectTitle: proj?.title });
  navigate('projects');
}

async function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    return alert(data.error || 'Failed to delete user.');
  }
  navigate('users');
}

// ── MODAL FACTORY ─────────────────────────────────────────────
function createModal(html) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${html}</div>`;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
  backdrop.querySelector('input, textarea, select')?.focus();
  return backdrop;
}

// ── HUBSPOT PAGE ──────────────────────────────────────────────
async function renderHubSpotPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>HubSpot Projects</h2>
        <p>Live companies from HubSpot.</p>
      </div>
      <div class="flex-gap">
        <button class="btn btn-ghost btn-sm hs-filter active-filter" data-filter="all">All</button>
        <button class="btn btn-ghost btn-sm hs-filter" data-filter="ongoing">Ongoing</button>
        <button class="btn btn-ghost btn-sm hs-filter" data-filter="completed">Completed</button>
        <button class="btn btn-ghost btn-sm" id="hs-fix-pms-btn" title="Resolve any project managers stored as raw IDs back to user names">&#128295; Fix Project Managers</button>
        <button class="btn btn-primary" id="hs-sync-btn" disabled>&#8635; Sync Selected</button>
      </div>
    </div>
    <div class="card">
      <div id="hs-content" style="padding:2rem;text-align:center;color:var(--txt-muted)">
        Loading from HubSpot…
      </div>
    </div>

    <div class="card" id="hs-mappings-card" style="display:none;margin-top:1.5rem">
      <div class="card-header">
        <h3>&#128101; Owner → User Mappings</h3>
        <button class="btn btn-primary btn-sm" id="save-mappings-btn">Save Mappings</button>
      </div>
      <div id="hs-mappings-body" style="padding:1.3rem"></div>
    </div>
  `;

  let allDeals   = [];
  let activeFilter = 'all';

  // Fetch deals from backend
  try {
    const res = await fetch('/api/hubspot/deals');

    // Check if response is JSON (old server returns HTML)
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      document.getElementById('hs-content').innerHTML =
        `<div class="empty-state" style="color:var(--danger)">
          Server needs to be restarted.<br>
          <span style="font-size:.8rem">Stop the server (Ctrl+C) and run <code>npm start</code> again.</span>
        </div>`;
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      document.getElementById('hs-content').innerHTML =
        `<div class="empty-state" style="color:var(--danger)">${data.error || 'Failed to load HubSpot data.'}</div>`;
      return;
    }

    allDeals = data.deals;

    // Auto-match HubSpot owner names to local users by name
    const existingMappings = getHSMappings();
    let autoMatched = 0;
    allDeals.forEach(deal => {
      if (!deal.owner || deal.owner === 'Unassigned') return;
      if (existingMappings[deal.owner]) return; // already mapped
      const match = cachedUsers.find(u => u.name.trim().toLowerCase() === deal.owner.trim().toLowerCase());
      if (match) { existingMappings[deal.owner] = match.id; autoMatched++; }
    });
    if (autoMatched > 0) saveHSMappings(existingMappings);

    renderDealsTable(allDeals, 'all');
    renderMappingsCard(allDeals);

  } catch (err) {
    document.getElementById('hs-content').innerHTML =
      `<div class="empty-state" style="color:var(--danger)">Error: ${err.message}</div>`;
    return;
  }

  // Filter buttons
  container.querySelectorAll('.hs-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.hs-filter').forEach(b => b.classList.remove('active-filter'));
      btn.classList.add('active-filter');
      activeFilter = btn.dataset.filter;
      renderDealsTable(allDeals, activeFilter);
    });
  });

  // Sync button
  document.getElementById('hs-sync-btn').addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('.hs-check:checked')];
    if (!checked.length) return alert('Select at least one deal to sync.');

    const selected = checked.map(cb => allDeals.find(d => d.id === cb.dataset.id)).filter(Boolean);

    const mappings = getHSMappings();
    const res  = await fetch('/api/hubspot/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ deals: selected, mappings }),
    });
    const data = await res.json();

    if (!res.ok) return alert(data.error || 'Sync failed.');

    // Merge into localStorage projects (skip or update duplicates)
    const existing = getProjects();
    let added = 0, updated = 0;

    data.projects.forEach(incoming => {
      const idx = existing.findIndex(p => p.id === incoming.id);
      if (idx === -1) { existing.push({ ...incoming, projectType: 'client', syncedAt: new Date().toISOString() }); added++; }
      else            { existing[idx] = { ...existing[idx], ...incoming, projectType: 'client', progress: existing[idx].progress, syncedAt: existing[idx].syncedAt || new Date().toISOString() }; updated++; }
    });

    saveProjects(existing);

    // Re-resolve all HubSpot project managers based on current user hubspotOwnerId mappings
    applyHubspotOwnerMappings();

    // Refresh table so synced badges update
    renderDealsTable(allDeals, activeFilter);

    logAudit('hubspot.synced', `HubSpot sync: ${added} added, ${updated} updated`, { added, updated });
    alert(`Done! ${added} added, ${updated} updated in Projects.`);
  });

  // Fix Project Managers button — resolves raw HubSpot owner IDs/names to local user IDs
  document.getElementById('hs-fix-pms-btn').addEventListener('click', async () => {
    const btn = document.getElementById('hs-fix-pms-btn');
    btn.disabled = true;
    btn.textContent = 'Fixing…';

    try {
      const res = await fetch('/api/hubspot/owners');
      if (!res.ok) throw new Error('Could not fetch HubSpot owners.');
      const ownerMap = await res.json(); // { hsOwnerId: 'Full Name', ... }

      const users    = cachedUsers;
      const projects = getProjects();
      const byId     = new Set(users.map(u => u.id));

      const findUserByHsId   = hsId => users.find(u => u.hubspotOwnerId && u.hubspotOwnerId === hsId);
      const findUserByName   = name  => users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());

      let fixed = 0, cleared = 0;

      projects.forEach(p => {
        if (!p.projectManager || byId.has(p.projectManager)) return; // already valid or empty

        // Try: match raw value against hubspotOwnerId stored on local users (most reliable)
        let localUser = findUserByHsId(p.projectManager);

        // Try: raw value is a HubSpot owner ID → resolve to name → match local user by name
        if (!localUser && ownerMap[p.projectManager])
          localUser = findUserByName(ownerMap[p.projectManager]);

        // Try: raw value is already a name string → match local user directly
        if (!localUser) localUser = findUserByName(p.projectManager);

        if (localUser) {
          p.projectManager = localUser.id;
          fixed++;
        } else {
          p.projectManager = null;
          cleared++;
        }
      });

      saveProjects(projects);

      const msg = fixed || cleared
        ? `Fixed ${fixed} project(s). ${cleared > 0 ? `${cleared} could not be matched and were cleared.` : ''}`
        : 'No unresolved project managers found — everything looks good!';
      alert(msg);

      // Refresh the admin projects table if it's open
      if (document.getElementById('projects-tbody')) {
        const container = document.getElementById('page-container');
        if (container) await renderAdminProjects(container);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '&#128295; Fix Project Managers';
    }
  });

  function renderDealsTable(deals, filter) {
    const filtered = filter === 'all'      ? deals
                   : filter === 'ongoing'  ? deals.filter(d => !d.isCompleted)
                   : deals.filter(d => d.isCompleted);

    const projects = getProjects();

    const syncBtn = document.getElementById('hs-sync-btn');
    if (syncBtn) syncBtn.disabled = true;

    if (!filtered.length) {
      document.getElementById('hs-content').innerHTML =
        `<div class="empty-state"><div class="empty-icon">&#128279;</div>No deals found.</div>`;
      return;
    }

    document.getElementById('hs-content').innerHTML = `
      <div class="table-wrap">
        <table style="white-space:nowrap">
          <thead><tr>
            <th style="width:36px">
              <input type="checkbox" id="hs-check-all" title="Select all" />
            </th>
            <th>Company Name</th>
            <th>Implem Package</th>
            <th>Project Manager</th>
            <th>Co Project Manager</th>
            <th>HR Implementer</th>
            <th>Payroll Implementer</th>
            <th>Status</th>
            <th>Stage</th>
            <th>MRR</th>
            <th>Onboarding Start</th>
            <th>Synced</th>
            <th>Segment</th>
            <th>Salesperson</th>
            <th>Headcount</th>
            <th>Implem Fee</th>
            <th>Proposal Date</th>
            <th>NPN Month</th>
            <th>Project Handover</th>
            <th>Sprout HR URL</th>
            <th>Payroll Code</th>
            <th>Products Availed</th>
            <th>Industry</th>
            <th>Company Address</th>
          </tr></thead>
          <tbody>
            ${filtered.map(deal => {
              const syncedProj  = projects.find(p => p.hubspotId === deal.id);
              const isSynced    = !!syncedProj;
              const hsMatchUser = deal.ownerHubspotId
                ? cachedUsers.find(u => u.hubspotOwnerId && u.hubspotOwnerId === deal.ownerHubspotId)
                : null;
              const pmName      = hsMatchUser ? hsMatchUser.name
                                : deal.owner !== 'Unassigned' ? deal.owner
                                : '<span style="color:var(--txt-muted)">Unassigned</span>';
              const status      = hsStatusToLocal(deal.clientStatus, deal.stage);
              const mrr         = deal.amount ? `₱${Number(deal.amount).toLocaleString()}` : '—';
              const coPmUser = deal.coProjectManagerHsId
                ? cachedUsers.find(u => u.hubspotOwnerId && u.hubspotOwnerId === deal.coProjectManagerHsId)
                : null;
              const coPmName = coPmUser ? coPmUser.name : (deal.coProjectManager || '—');
              const fmtDate = v => v ? new Date(isNaN(v) ? v : Number(v)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
              const fee     = deal.implemFeeAmount ? `₱${Number(deal.implemFeeAmount).toLocaleString()}` : '—';
              const hrLink  = deal.sproutHrUrl ? `<a href="${deal.sproutHrUrl}" target="_blank" style="color:var(--primary);word-break:break-all">${deal.sproutHrUrl}</a>` : '—';
              return `
                <tr>
                  <td><input type="checkbox" class="hs-check" data-id="${deal.id}" /></td>
                  <td><strong>${deal.name}</strong></td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.implemPackage || '—'}</td>
                  <td>${pmName}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${coPmName}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.hrImplementer || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.payrollImplementer || '—'}</td>
                  <td style="text-align:center">${deal.clientStatus || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.stage}</td>
                  <td style="font-weight:600">${mrr}</td>
                  <td style="color:var(--txt-muted);font-size:.8rem">${deal.onboardingDate ? formatSyncedAt(deal.onboardingDate) : '—'}</td>
                  <td>${isSynced
                    ? `<span style="color:#16a34a;font-size:.8rem">&#10003; ${formatSyncedAt(syncedProj.syncedAt)}</span>`
                    : '<span style="color:var(--txt-muted);font-size:.8rem">—</span>'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.segment || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.salesperson || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.headcount || '—'}</td>
                  <td style="font-weight:600">${fee}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${fmtDate(deal.proposalDate)}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${fmtDate(deal.npnMonth)}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${fmtDate(deal.handoverDate)}</td>
                  <td>${hrLink}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.payrollCode || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.productsAvailed || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.industry || '—'}</td>
                  <td style="color:var(--txt-muted);font-size:.85rem">${deal.address || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Select all checkbox
    document.getElementById('hs-check-all').addEventListener('change', e => {
      document.querySelectorAll('.hs-check').forEach(cb => cb.checked = e.target.checked);
      if (syncBtn) syncBtn.disabled = !e.target.checked;
    });

    // Individual checkboxes → enable sync button
    document.querySelectorAll('.hs-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const anyChecked = [...document.querySelectorAll('.hs-check')].some(c => c.checked);
        if (syncBtn) syncBtn.disabled = !anyChecked;
      });
    });
  }

  function renderMappingsCard(deals) {
    const card = document.getElementById('hs-mappings-card');
    const body = document.getElementById('hs-mappings-body');
    if (!card || !body) return;

    // Collect unique owners
    const owners = [...new Set(deals.map(d => d.owner).filter(o => o && o !== 'Unassigned'))].sort();
    if (!owners.length) {
      card.style.display = 'block';
      body.innerHTML = `<p style="font-size:.85rem;color:var(--txt-muted)">No named owners found in HubSpot — all companies show as Unassigned. Check that the <strong>project_manager</strong> or <strong>hubspot_owner_id</strong> field is populated in HubSpot, then refresh this page.</p>`;
      return;
    }

    const mappings  = getHSMappings();
    const localUsers = cachedUsers;

    body.innerHTML = `
      <p style="font-size:.85rem;color:var(--txt-muted);margin-bottom:1rem">
        Map each HubSpot owner to a local user account. Synced projects will be assigned to the mapped user as Project Manager.
      </p>
      <div style="display:flex;flex-direction:column;gap:.6rem">
        ${owners.map(owner => {
          const currentMapping = mappings[owner] || '';
          return `
            <div style="display:flex;align-items:center;gap:1rem;padding:.6rem .8rem;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
              <div style="flex:1;font-size:.88rem;font-weight:600">${owner}</div>
              <div style="color:var(--txt-muted);font-size:.8rem">&#8594;</div>
              <select class="hs-mapping-select" data-owner="${owner}"
                style="padding:.4rem .7rem;border:1.5px solid var(--border);border-radius:6px;font-size:.85rem;background:var(--surface);color:var(--txt);min-width:180px">
                <option value="">— Not mapped —</option>
                ${localUsers.map(u =>
                  `<option value="${u.id}" ${currentMapping === u.id ? 'selected' : ''}>${u.name} (${getRoleLabel(u.role)})</option>`
                ).join('')}
              </select>
              <div style="font-size:.75rem;min-width:80px;text-align:right">
                ${currentMapping
                  ? `<span style="color:#16a34a;font-weight:600">&#10003; Mapped</span>`
                  : `<span style="color:var(--txt-muted)">Unmapped</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    card.style.display = 'block';

    // Save mappings button
    document.getElementById('save-mappings-btn').onclick = () => {
      const updated = {};
      document.querySelectorAll('.hs-mapping-select').forEach(sel => {
        if (sel.value) updated[sel.dataset.owner] = sel.value;
      });
      saveHSMappings(updated);
      // Re-render to update status indicators
      renderMappingsCard(deals);
      renderDealsTable(allDeals, activeFilter);
      alert('Mappings saved! They will apply on next sync.');
    };
  }
}

// ── INTEGRATION CONNECTOR HELPERS ────────────────────────────
async function addIntegrationConnector(connector) {
  const res = await fetch('/api/integrations', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ connectors: [...integrationsData.connectors, connector] }),
  });
  if (res.ok) await fetchIntegrations();
}

async function removeIntegrationConnector(id) {
  const res = await fetch('/api/integrations', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ connectors: integrationsData.connectors.filter(c => c.id !== id) }),
  });
  if (res.ok) await fetchIntegrations();
}

function openAddIntegrationModal(onSaved) {
  const modal = createModal(`
    <h3>&#43; Add Integration</h3>
    <p style="font-size:.83rem;color:var(--txt-muted);margin-bottom:1rem">
      This creates the config entry. A developer will need to wire up the actual data sync logic for new integrations.
    </p>

    <div class="form-group">
      <label>Name <span style="color:var(--danger)">*</span></label>
      <input type="text" id="ni-name" placeholder="e.g. Salesforce, Pipedrive…" />
    </div>

    <div class="form-group">
      <label>Type</label>
      <select id="ni-type">
        <option value="api">API — key only (no field mapping)</option>
        <option value="sync">Sync — pulls data into projects (field mappings required)</option>
      </select>
      <div style="font-size:.78rem;color:var(--txt-muted);margin-top:.3rem" id="ni-type-hint">
        Use <strong>API</strong> for tools like AI services where you just store a key.
      </div>
    </div>

    <div class="form-group">
      <label>API Key <span style="font-size:.78rem;color:var(--txt-muted)">(optional — can add later)</span></label>
      <input type="password" id="ni-key" placeholder="Paste key here…" autocomplete="new-password" />
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" id="ni-cancel">Cancel</button>
      <button class="btn btn-primary" id="ni-save">Add Integration</button>
    </div>
  `);

  document.getElementById('ni-type').addEventListener('change', e => {
    document.getElementById('ni-type-hint').innerHTML = e.target.value === 'api'
      ? 'Use <strong>API</strong> for tools like AI services where you just store a key.'
      : 'Use <strong>Sync</strong> for CRMs or project tools that push data into PMT. You can configure field mappings after adding.';
  });

  document.getElementById('ni-cancel').addEventListener('click', () => modal.remove());

  document.getElementById('ni-save').addEventListener('click', async () => {
    const name = document.getElementById('ni-name').value.trim();
    if (!name) { alert('Name is required.'); return; }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (integrationsData.connectors.find(c => c.id === id)) {
      alert(`An integration named "${name}" already exists.`); return;
    }

    const apiKey = document.getElementById('ni-key').value.trim();
    const type   = document.getElementById('ni-type').value;

    const connector = { id, name, type, enabled: true, apiKey, mappings: [] };

    document.getElementById('ni-save').disabled = true;
    await addIntegrationConnector(connector);
    modal.remove();
    if (onSaved) onSaved();
  });
}

// ── MILESTONE SETTINGS HELPERS ────────────────────────────────
async function saveMilestonesToAPI() {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestones: MILESTONES }),
  });
  if (res.ok) appSettings = await res.json();
}

async function handleAddMilestone(container, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (MILESTONES.map(m => m.toLowerCase()).includes(trimmed.toLowerCase())) {
    alert('A milestone with that name already exists.'); return;
  }
  MILESTONES = [...MILESTONES, trimmed];
  // Ensure all existing projects have the new milestone key set to false
  const list = getProjects();
  list.forEach(p => {
    if (!p.milestones) p.milestones = {};
    if (!(trimmed in p.milestones)) p.milestones[trimmed] = false;
    p.progress = getMilestoneProgress(p);
  });
  saveProjects(list);
  await saveMilestonesToAPI();
  renderAppSettings(container);
}

async function handleDeleteMilestone(container, idx) {
  const milestoneToDelete = MILESTONES[idx];
  if (!milestoneToDelete) return;
  if (MILESTONES.length <= 1) { alert('You must keep at least one milestone.'); return; }
  if (!confirm(`Delete "${milestoneToDelete}"? Projects currently in this column will be moved back to the previous milestone.`)) return;

  const prevMilestone = idx > 0 ? MILESTONES[idx - 1] : null;

  // Update projects before changing the array so getCurrentMilestone still works
  const list = getProjects();
  list.forEach(p => {
    if (!p.milestones) p.milestones = {};
    // If project is sitting in the deleted column, bump it back to the previous milestone
    if (getCurrentMilestone(p) === milestoneToDelete && prevMilestone) {
      p.milestones[prevMilestone] = false;
    }
    delete p.milestones[milestoneToDelete];
  });

  MILESTONES = MILESTONES.filter((_, i) => i !== idx);

  // Recalculate progress with the updated MILESTONES
  list.forEach(p => { p.progress = getMilestoneProgress(p); });
  saveProjects(list);
  await saveMilestonesToAPI();
  renderAppSettings(container);
}

// ── APP SETTINGS ──────────────────────────────────────────────
async function renderAppSettings(container) {
  // Always fetch fresh settings so the page reflects the saved state
  await fetchAppSettings();

  // Load all announcements for management
  let allAnnouncements = [];
  try {
    const r = await fetch('/api/announcements/all');
    if (r.ok) allAnnouncements = await r.json();
  } catch (e) {}

  await fetchIntegrations();

  const now = new Date().toISOString();
  const announcementRows = allAnnouncements.length === 0
    ? `<div style="text-align:center;padding:1.5rem;color:var(--txt-muted);font-size:.88rem">No announcements yet.</div>`
    : allAnnouncements.map(a => {
        const expired  = a.expiresAt && a.expiresAt < now;
        const statusBadge = expired
          ? `<span style="background:#fef2f2;color:#dc2626;font-size:.72rem;padding:.2rem .55rem;border-radius:20px;font-weight:600">Expired</span>`
          : a.active
            ? `<span style="background:#d1fae5;color:#065f46;font-size:.72rem;padding:.2rem .55rem;border-radius:20px;font-weight:600">Active</span>`
            : `<span style="background:#f3f4f6;color:#6b7280;font-size:.72rem;padding:.2rem .55rem;border-radius:20px;font-weight:600">Inactive</span>`;
        const expiryText = a.expiresAt
          ? new Date(a.expiresAt).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})
          : 'No expiry';
        return `
          <div class="settings-row" style="align-items:flex-start">
            <div class="settings-row-info" style="flex:1">
              <div class="settings-row-label" style="display:flex;align-items:center;gap:.5rem">
                ${a.title} ${statusBadge}
              </div>
              <div class="settings-row-sub" style="margin-top:.2rem">${a.message}</div>
              <div style="font-size:.75rem;color:var(--txt-muted);margin-top:.3rem">&#128337; ${expiryText} &nbsp;&middot;&nbsp; Posted by ${a.createdByName}</div>
            </div>
            <div style="display:flex;gap:.4rem;flex-shrink:0;margin-top:.1rem">
              <button class="btn btn-ghost btn-sm ann-toggle-btn" data-id="${a.id}" data-active="${a.active}">${a.active ? 'Deactivate' : 'Activate'}</button>
              <button class="btn btn-ghost btn-sm ann-edit-btn" data-id="${a.id}">&#9998; Edit</button>
              <button class="btn btn-danger btn-sm ann-delete-btn" data-id="${a.id}">&#128465;</button>
            </div>
          </div>`;
      }).join('');

  container.innerHTML = `
    <div class="page-header">
      <div><h2>&#9881; App Settings</h2><p>Configure platform-wide behaviour for all users.</p></div>
    </div>

    <div class="settings-section settings-section--announcements">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">
        <div>
          <div class="settings-section-title">&#128226; Company Announcements</div>
          <div class="settings-section-desc">Post announcements visible to all users on their dashboard. Set an optional expiry time.</div>
        </div>
        <button class="btn btn-primary btn-sm" id="ann-new-btn">&#43; New Announcement</button>
      </div>
      <div id="ann-list">${announcementRows}</div>
    </div>

    <div class="settings-section settings-section--timer">
      <div class="settings-section-title">&#9201; Timer</div>
      <div class="settings-section-desc">Control how the timer works for your team.</div>

      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Timer Popup</div>
          <div class="settings-row-sub">When enabled, clicking the Timer button opens a floating popup where users can see which project the timer is running on, enter what they are working on, and pause or stop the timer. When disabled, the timer starts and stops directly from the project row with no popup.</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-timer-popup" ${appSettings.timerPopupEnabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section settings-section--onboarding" style="margin-top:1.2rem">
      <div class="settings-section-title">&#127775; User Onboarding</div>
      <div class="settings-section-desc">When enabled, Sprout Sidekick will guide new users through the platform based on their role. The tour runs once and is marked complete after the user finishes or skips it.</div>

      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Enable Onboarding Tour</div>
          <div class="settings-row-sub">Show the Sidekick-powered onboarding experience to users who haven't completed it yet.</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-onboarding-enabled" ${appSettings.onboardingEnabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-row" style="margin-top:.5rem">
        <div class="settings-row-info">
          <div class="settings-row-label">Show Tour To</div>
          <div class="settings-row-sub">Choose whether the onboarding tour appears for all users who haven't completed it, or only users added after this setting is enabled.</div>
        </div>
        <select id="setting-onboarding-target" style="padding:.4rem .75rem;border:1px solid var(--border);border-radius:6px;font-size:.84rem;background:var(--bg);color:var(--txt);cursor:pointer">
          <option value="new" ${appSettings.onboardingTarget === 'new' ? 'selected' : ''}>Newly Added Users Only</option>
          <option value="all" ${appSettings.onboardingTarget === 'all' ? 'selected' : ''}>All Users</option>
        </select>
      </div>

      <div style="margin-top:.75rem;display:flex;gap:.6rem;align-items:center">
        <button class="btn btn-ghost btn-sm" id="reset-onboarding-btn">&#8635; Reset All Users' Onboarding</button>
        <span style="font-size:.78rem;color:var(--txt-muted)">This lets all users see the tour again regardless of completion status.</span>
      </div>
    </div>

    <div style="display:flex;gap:.7rem;margin-top:.5rem">
      <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
    </div>
    <div id="settings-save-msg" style="margin-top:.75rem;font-size:.85rem;color:var(--primary);font-weight:600;display:none">&#10003; Settings saved!</div>

    <div class="settings-section settings-section--kanban" style="margin-top:1.2rem">
      <div class="settings-section-title">&#9776; Kanban Milestone Columns</div>
      <div class="settings-section-desc">Define the stages shown as columns on the Kanban board. All users see these columns in order. Deleting a column moves any projects sitting in it back to the previous stage.</div>
      <div id="milestone-col-list" style="display:flex;flex-direction:column;gap:.35rem;margin-top:.85rem">
        ${MILESTONES.map((m, i) => `
          <div class="settings-row" style="padding:.45rem .75rem;align-items:center">
            <div class="settings-row-info" style="display:flex;align-items:center;gap:.6rem">
              <span style="font-size:.78rem;color:var(--txt-muted);min-width:1.4rem;text-align:right">${i + 1}.</span>
              <span style="font-weight:500">${m}</span>
            </div>
            ${MILESTONES.length > 1
              ? `<button class="btn btn-danger btn-sm ms-delete-btn" data-idx="${i}" title="Delete this milestone">&#128465;</button>`
              : `<span style="font-size:.75rem;color:var(--txt-muted)">Last column — cannot delete</span>`}
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.85rem;align-items:center">
        <input type="text" id="new-milestone-input" placeholder="New milestone name…"
          style="flex:1;padding:.4rem .75rem;border:1px solid var(--border);border-radius:6px;font-size:.85rem;background:var(--bg);color:var(--txt)" />
        <button class="btn btn-primary btn-sm" id="add-milestone-btn">&#43; Add Milestone</button>
      </div>
    </div>

    <div class="settings-section settings-section--timeline-tpl" style="margin-top:1.2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">
        <div>
          <div class="settings-section-title">&#128203; Timeline Templates</div>
          <div class="settings-section-desc">Build named timeline structures for different project types. Project Managers select a template in the Timeline Planning tab — the phases and tasks appear exactly as defined here. Upload an Excel file to copy its structure.</div>
        </div>
        <div style="display:flex;gap:.5rem;flex-shrink:0;margin-left:1rem">
          <button class="btn btn-ghost btn-sm" id="tpl-dl-format-btn">&#11123; Import Format</button>
          <button class="btn btn-primary btn-sm" id="tpl-add-btn">&#43; Add Template</button>
        </div>
      </div>

      <!-- Built-in Standard (always shown, read-only) -->
      <div class="settings-row" style="align-items:center;margin-top:.85rem">
        <div class="settings-row-info">
          <div class="settings-row-label" style="display:flex;align-items:center;gap:.5rem">
            Standard Payroll Implementation
            <span style="background:#d1fae5;color:#065f46;font-size:.7rem;padding:.15rem .5rem;border-radius:10px;font-weight:600">Built-in</span>
          </div>
          <div class="settings-row-sub">${TIMELINE_PHASES.length} phases &middot; ${TIMELINE_PHASES.reduce((a,p) => a + p.tasks.length, 0)} tasks &middot; Default when no template is selected</div>
        </div>
        <span style="font-size:.78rem;color:var(--txt-muted);flex-shrink:0">Cannot be modified</span>
      </div>

      <!-- Custom templates -->
      <div id="tpl-settings-list">
        ${cachedTemplates.length === 0
          ? `<div style="text-align:center;padding:1rem;color:var(--txt-muted);font-size:.85rem">No custom templates yet. Click <strong>+ Add Template</strong> to create one.</div>`
          : cachedTemplates.map(t => {
              const taskCount = (t.phases || []).reduce((a, p) => a + (p.tasks || []).length, 0);
              return `
                <div class="settings-row" style="align-items:center">
                  <div class="settings-row-info">
                    <div class="settings-row-label">${escAttr(t.name)}</div>
                    <div class="settings-row-sub">${(t.phases||[]).length} phases &middot; ${taskCount} tasks</div>
                  </div>
                  <div style="display:flex;gap:.4rem;flex-shrink:0">
                    <button class="btn btn-ghost btn-sm tpl-rename-btn" data-id="${t.id}">&#9998; Rename</button>
                    <button class="btn btn-danger btn-sm tpl-delete-btn" data-id="${t.id}">&#128465;</button>
                  </div>
                </div>`;
            }).join('')
        }
      </div>
    </div>

    <div class="settings-section settings-section--integrations">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">
        <div>
          <div class="settings-section-title">&#128279; Integrations</div>
          <div class="settings-section-desc" style="margin-bottom:0">Connect external tools. API keys are stored securely on the server and never shown in full after saving. Field mappings tell the system which source fields to pull into which PMT project fields.</div>
        </div>
        <button class="btn btn-primary btn-sm" id="add-integration-btn" style="flex-shrink:0;margin-left:1rem">&#43; Add Integration</button>
      </div>
      <div style="margin-bottom:1rem"></div>
      <div id="integrations-list">
        ${(() => {
          const HS_FIELDS = [
            { value: 'name',                         label: 'Company Name' },
            { value: 'client_stage',                 label: 'Client Stage' },
            { value: 'client_status',                label: 'Client Status' },
            { value: 'project_manager',              label: 'Project Manager' },
            { value: 'co_project_manager',           label: 'Co Project Manager' },
            { value: 'hubspot_owner_id',             label: 'HubSpot Owner' },
            { value: 'hr_software_implementer',      label: 'HR Implementer' },
            { value: 'payroll_software_implementer', label: 'Payroll Implementer' },
            { value: 'mrr',                          label: 'MRR' },
            { value: 'implem_package',               label: 'Implementation Package' },
          ];
          const PMT_FIELDS = [
            { value: 'title',       label: 'Project Title' },
            { value: 'description', label: 'Description' },
            { value: 'status',      label: 'Status' },
            { value: 'priority',    label: 'Priority' },
            { value: 'dueDate',     label: 'Due Date' },
          ];
          return (integrationsData.connectors || []).map(c => {
            const mappingRows = c.mappings.map((m, i) => `
              <tr>
                <td style="padding:.35rem .5rem;font-size:.82rem">${m.sourceLabel || m.source}</td>
                <td style="padding:.35rem .5rem;text-align:center;color:var(--txt-muted);font-size:.85rem">&#8594;</td>
                <td style="padding:.35rem .5rem;font-size:.82rem">${m.targetLabel || m.target}</td>
                <td style="padding:.35rem .5rem;text-align:right">
                  <button class="btn btn-danger btn-sm int-remove-mapping" data-connector="${c.id}" data-idx="${i}" style="padding:.15rem .4rem;font-size:.7rem">&#10005;</button>
                </td>
              </tr>`).join('') ||
              `<tr><td colspan="4" style="text-align:center;color:var(--txt-muted);font-size:.82rem;padding:.6rem">No mappings yet.</td></tr>`;

            const srcOptions  = HS_FIELDS.map(f  => `<option value="${f.value}">${f.label}</option>`).join('');
            const tgtOptions  = PMT_FIELDS.map(f => `<option value="${f.value}">${f.label}</option>`).join('');

            const BUILTIN_IDS = ['hubspot', 'anthropic'];
            const statusBg    = c.apiKeySet ? '#d1fae5' : '#f3f4f6';
            const statusColor = c.apiKeySet ? '#065f46' : '#6b7280';
            const statusLabel = !c.apiKeySet
              ? 'Not connected'
              : c.keySource === 'env'
                ? '&#10003; Connected <span style="font-size:.7rem;opacity:.75">(via .env)</span>'
                : '&#10003; Connected';

            return `
              <div class="integration-card" data-connector="${c.id}">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem">
                  <div style="display:flex;align-items:center;gap:.6rem;flex:1;min-width:0">
                    <span style="font-weight:700;font-size:.97rem">${c.name}</span>
                    <span class="badge" style="background:${c.type === 'sync' ? '#ede9fe' : '#dbeafe'};color:${c.type === 'sync' ? '#5b21b6' : '#1e40af'};font-size:.7rem">${c.type === 'sync' ? 'Sync' : 'API'}</span>
                    <span class="badge int-status-badge" data-connector="${c.id}"
                      style="background:${statusBg};color:${statusColor}">
                      ${statusLabel}
                    </span>
                  </div>
                  <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
                    ${!BUILTIN_IDS.includes(c.id) ? `<button class="btn btn-danger btn-sm int-delete-connector" data-connector="${c.id}" style="padding:.2rem .5rem;font-size:.75rem">&#128465; Remove</button>` : ''}
                    <label class="toggle-switch" title="Enable / disable this integration">
                      <input type="checkbox" class="int-enabled-toggle" data-connector="${c.id}" ${c.enabled ? 'checked' : ''} />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div style="margin-bottom:1rem">
                  <div style="font-size:.8rem;font-weight:600;margin-bottom:.4rem;color:var(--txt)">API Key</div>
                  <div style="display:flex;gap:.45rem;align-items:center;flex-wrap:wrap">
                    <input type="password" class="int-api-key-input" data-connector="${c.id}"
                      placeholder="${c.apiKeySet ? 'Key saved — paste new key to replace' : 'Paste your API key here…'}"
                      autocomplete="new-password"
                      style="flex:1;min-width:200px;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.83rem;background:var(--bg);color:var(--txt)" />
                    <button class="btn btn-ghost btn-sm int-test-btn" data-connector="${c.id}">&#128268; Test</button>
                    <button class="btn btn-primary btn-sm int-save-key-btn" data-connector="${c.id}">Save Key</button>
                    <span class="int-test-msg" data-connector="${c.id}" style="font-size:.8rem;font-weight:600"></span>
                  </div>
                </div>

                ${c.type !== 'api' ? `
                <div>
                  <div style="font-size:.8rem;font-weight:600;margin-bottom:.5rem;color:var(--txt)">Field Mappings
                    <span style="font-weight:400;color:var(--txt-muted);font-size:.76rem;margin-left:.4rem">Source field &#8594; PMT field</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:.5rem">
                    <thead>
                      <tr style="background:var(--surface)">
                        <th style="padding:.3rem .5rem;text-align:left;font-size:.76rem;color:var(--txt-muted);border-bottom:1px solid var(--border)">${c.name} Field</th>
                        <th style="border-bottom:1px solid var(--border)"></th>
                        <th style="padding:.3rem .5rem;text-align:left;font-size:.76rem;color:var(--txt-muted);border-bottom:1px solid var(--border)">PMT Field</th>
                        <th style="border-bottom:1px solid var(--border)"></th>
                      </tr>
                    </thead>
                    <tbody class="int-mapping-rows" data-connector="${c.id}">${mappingRows}</tbody>
                  </table>
                  <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
                    <select class="int-new-src" data-connector="${c.id}"
                      style="padding:.35rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.8rem;background:var(--bg);color:var(--txt)">
                      ${srcOptions}
                    </select>
                    <span style="color:var(--txt-muted)">&#8594;</span>
                    <select class="int-new-tgt" data-connector="${c.id}"
                      style="padding:.35rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.8rem;background:var(--bg);color:var(--txt)">
                      ${tgtOptions}
                    </select>
                    <button class="btn btn-primary btn-sm int-add-mapping-btn" data-connector="${c.id}">&#43; Add Mapping</button>
                  </div>
                </div>` : `
                <div style="font-size:.8rem;color:var(--txt-muted);margin-top:.25rem">
                  Used for AI features across the platform. No field mapping required.
                </div>`}
              </div>`;
          }).join('') || `<div style="color:var(--txt-muted);font-size:.85rem">No integrations configured.</div>`;
        })()}
      </div>
    </div>

  `;

  // Settings save
  document.getElementById('save-settings-btn').addEventListener('click', async () => {
    const timerPopupEnabled = document.getElementById('setting-timer-popup').checked;
    const onboardingEnabled = document.getElementById('setting-onboarding-enabled').checked;
    const onboardingTarget  = document.getElementById('setting-onboarding-target').value;
    try {
      const res = await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ timerPopupEnabled, onboardingEnabled, onboardingTarget }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || `Save failed (HTTP ${res.status}). Please try again.`);
      appSettings = data;
      const msg = document.getElementById('settings-save-msg');
      if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 2500); }
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });

  // Reset all onboarding
  document.getElementById('reset-onboarding-btn').addEventListener('click', async () => {
    if (!confirm('This will reset the onboarding tour for ALL users so they see it again. Continue?')) return;
    const res = await fetch('/api/users/onboarding-reset', { method: 'POST' });
    if (res.ok) alert('Done! All users will see the onboarding tour again.');
  });

  // ── Timeline Templates handlers ───────────────────────────────
  document.getElementById('tpl-dl-format-btn').addEventListener('click', downloadTimelineTemplateFormat);

  document.getElementById('tpl-add-btn').addEventListener('click', () => {
    openAddTimelineTemplateModal(() => renderAppSettings(container));
  });

  container.querySelectorAll('.tpl-rename-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl     = cachedTemplates.find(t => t.id === btn.dataset.id);
      if (!tpl) return;
      const newName = prompt('Rename template:', tpl.name);
      if (!newName || newName.trim() === tpl.name) return;
      await fetch(`/api/timeline-templates/${btn.dataset.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName.trim() }),
      });
      await fetchTimelineTemplates();
      renderAppSettings(container);
    });
  });

  container.querySelectorAll('.tpl-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl = cachedTemplates.find(t => t.id === btn.dataset.id);
      if (!confirm(`Delete template "${tpl?.name}"? This cannot be undone.`)) return;
      await fetch(`/api/timeline-templates/${btn.dataset.id}`, { method: 'DELETE' });
      await fetchTimelineTemplates();
      renderAppSettings(container);
    });
  });

  // Add integration
  document.getElementById('add-integration-btn').addEventListener('click', () => {
    openAddIntegrationModal(() => renderAppSettings(container));
  });

  // Delete custom connector
  container.querySelectorAll('.int-delete-connector').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = integrationsData.connectors.find(c => c.id === btn.dataset.connector)?.name || btn.dataset.connector;
      if (!confirm(`Remove the "${name}" integration? This cannot be undone.`)) return;
      await removeIntegrationConnector(btn.dataset.connector);
      renderAppSettings(container);
    });
  });

  // ── Integration handlers ──────────────────────────────────────
  async function saveConnector(connectorId, patch) {
    const updated = integrationsData.connectors.map(c =>
      c.id === connectorId ? { ...c, ...patch } : c
    );
    const res = await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectors: updated }),
    });
    if (res.ok) await fetchIntegrations();
  }

  // Enable/disable toggle
  container.querySelectorAll('.int-enabled-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      await saveConnector(toggle.dataset.connector, { enabled: toggle.checked });
    });
  });

  // Test connection
  container.querySelectorAll('.int-test-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id      = btn.dataset.connector;
      const keyInput = container.querySelector(`.int-api-key-input[data-connector="${id}"]`);
      const msgEl    = container.querySelector(`.int-test-msg[data-connector="${id}"]`);
      btn.disabled   = true;
      btn.textContent = 'Testing…';
      msgEl.textContent = '';
      try {
        const res  = await fetch(`/api/integrations/${id}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyInput.value }),
        });
        const data = await res.json();
        if (data.ok) {
          msgEl.style.color   = 'var(--primary)';
          msgEl.textContent   = '✓ Connected';
          const badge = container.querySelector(`.int-status-badge[data-connector="${id}"]`);
          if (badge) { badge.textContent = '✓ Connected'; badge.style.background = '#d1fae5'; badge.style.color = '#065f46'; }
        } else {
          msgEl.style.color = 'var(--danger)';
          msgEl.textContent = `✗ ${data.error || 'Failed'}`;
        }
      } catch { msgEl.style.color = 'var(--danger)'; msgEl.textContent = '✗ Network error'; }
      btn.disabled = false;
      btn.innerHTML = '&#128268; Test';
    });
  });

  // Save API key
  container.querySelectorAll('.int-save-key-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id       = btn.dataset.connector;
      const keyInput = container.querySelector(`.int-api-key-input[data-connector="${id}"]`);
      const msgEl    = container.querySelector(`.int-test-msg[data-connector="${id}"]`);
      const key      = keyInput.value.trim();
      if (!key) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = 'Enter a key first.'; return; }
      btn.disabled = true;
      await saveConnector(id, { apiKey: key });
      keyInput.value = '';
      keyInput.placeholder = 'Key saved — paste new key to replace';
      msgEl.style.color = 'var(--primary)';
      msgEl.textContent = '✓ Saved';
      btn.disabled = false;
      const badge = container.querySelector(`.int-status-badge[data-connector="${id}"]`);
      if (badge) { badge.innerHTML = '&#10003; Connected'; badge.style.background = '#d1fae5'; badge.style.color = '#065f46'; }
    });
  });

  // Add mapping
  container.querySelectorAll('.int-add-mapping-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id  = btn.dataset.connector;
      const src = container.querySelector(`.int-new-src[data-connector="${id}"]`);
      const tgt = container.querySelector(`.int-new-tgt[data-connector="${id}"]`);
      const HS_FIELD_LABELS = {
        name:'Company Name', client_stage:'Client Stage', client_status:'Client Status',
        project_manager:'Project Manager', co_project_manager:'Co Project Manager',
        hubspot_owner_id:'HubSpot Owner', hr_software_implementer:'HR Implementer',
        payroll_software_implementer:'Payroll Implementer', mrr:'MRR', implem_package:'Implementation Package',
      };
      const PMT_FIELD_LABELS = {
        title:'Project Title', description:'Description', status:'Status', priority:'Priority', dueDate:'Due Date',
      };
      const connector = integrationsData.connectors.find(c => c.id === id);
      if (!connector) return;
      const newMapping = {
        source:      src.value,
        sourceLabel: HS_FIELD_LABELS[src.value] || src.value,
        target:      tgt.value,
        targetLabel: PMT_FIELD_LABELS[tgt.value] || tgt.value,
      };
      await saveConnector(id, { mappings: [...connector.mappings, newMapping] });
      renderAppSettings(container);
    });
  });

  // Remove mapping
  container.querySelectorAll('.int-remove-mapping').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id        = btn.dataset.connector;
      const idx       = parseInt(btn.dataset.idx);
      const connector = integrationsData.connectors.find(c => c.id === id);
      if (!connector) return;
      const mappings  = connector.mappings.filter((_, i) => i !== idx);
      await saveConnector(id, { mappings });
      renderAppSettings(container);
    });
  });

  // Milestone: add
  document.getElementById('add-milestone-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-milestone-input');
    await handleAddMilestone(container, input.value);
  });
  document.getElementById('new-milestone-input').addEventListener('keydown', async e => {
    if (e.key === 'Enter') await handleAddMilestone(container, e.target.value);
  });

  // Milestone: delete
  container.querySelectorAll('.ms-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleDeleteMilestone(container, parseInt(btn.dataset.idx));
    });
  });

  // New announcement
  document.getElementById('ann-new-btn').addEventListener('click', () => openAnnouncementModal(null, () => renderAppSettings(container)));

  // Edit buttons
  container.querySelectorAll('.ann-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = allAnnouncements.find(x => x.id === btn.dataset.id);
      if (a) openAnnouncementModal(a, () => renderAppSettings(container));
    });
  });

  // Toggle active
  container.querySelectorAll('.ann-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active === 'true';
      await fetch(`/api/announcements/${btn.dataset.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      renderAppSettings(container);
    });
  });

  // Delete buttons
  container.querySelectorAll('.ann-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this announcement?')) return;
      await fetch(`/api/announcements/${btn.dataset.id}`, { method: 'DELETE' });
      renderAppSettings(container);
    });
  });
}

// ── ANNOUNCEMENT MODAL ────────────────────────────────────────
function openAnnouncementModal(existing, onSaved) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  // Format existing expiresAt for datetime-local input
  let expiresVal = '';
  if (existing?.expiresAt) {
    // datetime-local expects "YYYY-MM-DDTHH:MM"
    expiresVal = existing.expiresAt.slice(0, 16);
  }

  backdrop.innerHTML = `
    <div class="modal" style="width:500px">
      <h3 style="margin-bottom:1.4rem">${existing ? '&#9998; Edit Announcement' : '&#128226; New Announcement'}</h3>
      <div class="form-group">
        <label>Title</label>
        <input id="ann-title" type="text" value="${existing?.title || ''}" placeholder="e.g. Office Closure Notice" maxlength="120" />
      </div>
      <div class="form-group">
        <label>Message</label>
        <textarea id="ann-message" rows="4" placeholder="Write your announcement here…" style="resize:vertical">${existing?.message || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Expires At <span style="color:var(--txt-muted);font-size:.8rem">(optional — leave blank for no expiry)</span></label>
        <input id="ann-expires" type="datetime-local" value="${expiresVal}" />
      </div>
      <div id="ann-error" style="color:var(--danger);font-size:.85rem;margin-top:.4rem;display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="ann-cancel">Cancel</button>
        <button class="btn btn-primary" id="ann-save">${existing ? 'Save Changes' : 'Post Announcement'}</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  backdrop.querySelector('#ann-title').focus();

  backdrop.querySelector('#ann-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#ann-save').addEventListener('click', async () => {
    const title     = backdrop.querySelector('#ann-title').value.trim();
    const message   = backdrop.querySelector('#ann-message').value.trim();
    const expiresAt = backdrop.querySelector('#ann-expires').value
      ? new Date(backdrop.querySelector('#ann-expires').value).toISOString()
      : null;
    const errEl     = backdrop.querySelector('#ann-error');

    errEl.style.display = 'none';
    if (!title)   { errEl.textContent = 'Title is required.';   errEl.style.display = 'block'; return; }
    if (!message) { errEl.textContent = 'Message is required.'; errEl.style.display = 'block'; return; }

    const saveBtn = backdrop.querySelector('#ann-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

    const url    = existing ? `/api/announcements/${existing.id}` : '/api/announcements';
    const method = existing ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message, expiresAt }) });
    const data   = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to save.';
      errEl.style.display = 'block';
      saveBtn.disabled = false; saveBtn.textContent = existing ? 'Save Changes' : 'Post Announcement';
      return;
    }

    backdrop.remove();
    if (onSaved) onSaved();
  });
}

// ── AUDIT TRAIL ───────────────────────────────────────────────
async function renderAuditTrail(container) {
  const isSuperAdmin = effectiveUser()?.role === 'super_admin';
  container.innerHTML = `
    <div class="page-header">
      <div><h2>&#128203; Audit Trail</h2><p>A record of all activity across the system.</p></div>
      <div class="flex-gap">
        ${isSuperAdmin ? `<button class="btn btn-danger btn-sm" id="audit-clear-btn">&#128465; Clear Log</button>` : ''}
        <button class="btn btn-ghost btn-sm" id="audit-refresh-btn">&#8635; Refresh</button>
        <button class="btn btn-ghost btn-sm" id="audit-export-btn">&#8615; Export CSV</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem;padding:1rem 1.2rem">
      <div style="display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end">
        <div>
          <div style="font-size:.75rem;color:var(--txt-muted);margin-bottom:.25rem;font-weight:600;text-transform:uppercase">Category</div>
          <select id="audit-filter-category" style="padding:.38rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt);font-family:var(--font-sub)">
            <option value="">All Categories</option>
            <option value="auth">Auth</option>
            <option value="user">Users</option>
            <option value="project">Projects</option>
            <option value="milestone">Milestones</option>
            <option value="permissions">Permissions</option>
            <option value="hubspot">HubSpot</option>
          </select>
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--txt-muted);margin-bottom:.25rem;font-weight:600;text-transform:uppercase">From</div>
          <input type="date" id="audit-filter-from" style="padding:.38rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--txt-muted);margin-bottom:.25rem;font-weight:600;text-transform:uppercase">To</div>
          <input type="date" id="audit-filter-to" style="padding:.38rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt)" />
        </div>
        <div>
          <div style="font-size:.75rem;color:var(--txt-muted);margin-bottom:.25rem;font-weight:600;text-transform:uppercase">User</div>
          <input type="text" id="audit-filter-user" placeholder="Filter by user…" style="padding:.38rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--bg);color:var(--txt);min-width:160px" />
        </div>
        <button class="btn btn-ghost btn-sm" id="audit-reset-filters">Reset</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="audit-table-wrap" style="overflow-x:auto">
        <div style="padding:2rem;text-align:center;color:var(--txt-muted)">Loading audit log…</div>
      </div>
      <div id="audit-footer" style="padding:.6rem 1.2rem;border-top:1px solid var(--border);font-size:.78rem;color:var(--txt-muted)"></div>
    </div>
  `;

  const ACTION_META = {
    'auth.login':            { label: 'Login',            color: '#3b82f6', bg: '#eff6ff' },
    'auth.logout':           { label: 'Logout',           color: '#64748b', bg: '#f1f5f9' },
    'user.created':          { label: 'User Created',     color: '#8b5cf6', bg: '#f5f3ff' },
    'user.updated':          { label: 'User Updated',     color: '#7c3aed', bg: '#ede9fe' },
    'user.deleted':          { label: 'User Deleted',     color: '#dc2626', bg: '#fef2f2' },
    'project.created':       { label: 'Project Created',  color: '#10b981', bg: '#f0fdf4' },
    'project.updated':       { label: 'Project Updated',  color: '#059669', bg: '#ecfdf5' },
    'project.deleted':       { label: 'Project Deleted',  color: '#ef4444', bg: '#fef2f2' },
    'project.bulk_deleted':  { label: 'Bulk Deleted',     color: '#dc2626', bg: '#fef2f2' },
    'milestone.saved':       { label: 'Milestones',       color: '#0891b2', bg: '#ecfeff' },
    'permissions.updated':   { label: 'Permissions',      color: '#f59e0b', bg: '#fffbeb' },
    'hubspot.synced':        { label: 'HubSpot Sync',     color: '#f97316', bg: '#fff7ed' },
    'project.bulkUploaded':  { label: 'Bulk Upload',      color: '#0ea5e9', bg: '#f0f9ff' },
    'role.created':          { label: 'Role Created',     color: '#8b5cf6', bg: '#f5f3ff' },
    'role.renamed':          { label: 'Role Renamed',     color: '#8b5cf6', bg: '#f5f3ff' },
    'role.deleted':          { label: 'Role Deleted',     color: '#dc2626', bg: '#fef2f2' },
  };

  const ROLE_COLORS = {
    super_admin:     '#d97706',
    lead:            '#7c3aed',
    project_manager: '#2563eb',
    implementer:     '#16a34a',
  };

  let allEntries = [];

  async function loadLog() {
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) throw new Error('Failed');
      allEntries = await res.json();
    } catch (e) {
      allEntries = [];
    }
    applyFilters();
  }

  function applyFilters() {
    const cat    = document.getElementById('audit-filter-category')?.value || '';
    const from   = document.getElementById('audit-filter-from')?.value || '';
    const to     = document.getElementById('audit-filter-to')?.value || '';
    const user   = (document.getElementById('audit-filter-user')?.value || '').toLowerCase();

    let filtered = allEntries.filter(e => {
      if (cat  && !e.action.startsWith(cat)) return false;
      if (from && e.timestamp.slice(0, 10) < from) return false;
      if (to   && e.timestamp.slice(0, 10) > to)   return false;
      if (user && !e.userName.toLowerCase().includes(user)) return false;
      return true;
    });

    renderTable(filtered);
  }

  function formatTs(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function renderTable(entries) {
    const wrap   = document.getElementById('audit-table-wrap');
    const footer = document.getElementById('audit-footer');
    if (!wrap) return;

    if (!entries.length) {
      wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--txt-muted)">No audit entries found.</div>`;
      if (footer) footer.textContent = '0 entries';
      return;
    }

    const rows = entries.map(e => {
      const meta   = ACTION_META[e.action] || { label: e.action, color: '#64748b', bg: '#f8fafc' };
      const roleColor = ROLE_COLORS[e.userRole] || '#64748b';
      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:.6rem .9rem;font-size:.78rem;color:var(--txt-muted);white-space:nowrap">${formatTs(e.timestamp)}</td>
          <td style="padding:.6rem .9rem">
            <div style="font-size:.84rem;font-weight:500">${e.userName}</div>
            <span style="font-size:.72rem;font-weight:600;color:${roleColor};text-transform:uppercase;letter-spacing:.04em">${getRoleLabel(e.userRole)}</span>
          </td>
          <td style="padding:.6rem .9rem">
            <span style="display:inline-block;padding:.2rem .6rem;border-radius:20px;font-size:.74rem;font-weight:600;background:${meta.bg};color:${meta.color};white-space:nowrap">${meta.label}</span>
          </td>
          <td style="padding:.6rem .9rem;font-size:.84rem;color:var(--txt)">${e.details}</td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--bg);border-bottom:2px solid var(--border)">
            <th style="padding:.6rem .9rem;text-align:left;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted);white-space:nowrap">Timestamp</th>
            <th style="padding:.6rem .9rem;text-align:left;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted)">User</th>
            <th style="padding:.6rem .9rem;text-align:left;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted)">Action</th>
            <th style="padding:.6rem .9rem;text-align:left;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--txt-muted)">Details</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    if (footer) footer.textContent = `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}${entries.length < allEntries.length ? ` (filtered from ${allEntries.length} total)` : ''}`;
  }

  // Wire up filters
  ['audit-filter-category','audit-filter-from','audit-filter-to','audit-filter-user'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });

  document.getElementById('audit-reset-filters')?.addEventListener('click', () => {
    document.getElementById('audit-filter-category').value = '';
    document.getElementById('audit-filter-from').value     = '';
    document.getElementById('audit-filter-to').value       = '';
    document.getElementById('audit-filter-user').value     = '';
    applyFilters();
  });

  document.getElementById('audit-refresh-btn')?.addEventListener('click', () => loadLog());

  document.getElementById('audit-export-btn')?.addEventListener('click', () => {
    const cat  = document.getElementById('audit-filter-category')?.value || '';
    const from = document.getElementById('audit-filter-from')?.value || '';
    const to   = document.getElementById('audit-filter-to')?.value || '';
    const user = (document.getElementById('audit-filter-user')?.value || '').toLowerCase();
    const filtered = allEntries.filter(e => {
      if (cat  && !e.action.startsWith(cat)) return false;
      if (from && e.timestamp.slice(0, 10) < from) return false;
      if (to   && e.timestamp.slice(0, 10) > to)   return false;
      if (user && !e.userName.toLowerCase().includes(user)) return false;
      return true;
    });
    const header = 'Timestamp,User,Role,Action,Details';
    const rows   = filtered.map(e => [
      `"${new Date(e.timestamp).toLocaleString('en-PH')}"`,
      `"${e.userName}"`,
      `"${getRoleLabel(e.userRole)}"`,
      `"${e.action}"`,
      `"${e.details.replace(/"/g, '""')}"`,
    ].join(','));
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  });

  if (isSuperAdmin) {
    document.getElementById('audit-clear-btn')?.addEventListener('click', async () => {
      if (!confirm('Clear the entire audit log? This cannot be undone.')) return;
      const res = await fetch('/api/audit', { method: 'DELETE' });
      if (res.ok) { allEntries = []; renderTable([]); }
      else alert('Failed to clear audit log.');
    });
  }

  await loadLog();
}

// ── ACCESS MATRIX PAGE ────────────────────────────────────────
function renderAccessMatrix(container) {
  const FLAG_GROUPS = [
    {
      group: 'Dashboard',
      flags: [
        { key: 'view_admin_dashboard',    label: 'View Admin Dashboard' },
        { key: 'view_my_dashboard',       label: 'View My Dashboard' },
        { key: 'view_pm_dashboard_table', label: 'View PM Dashboard Table' },
        { key: 'edit_dashboard_fields',   label: 'Edit Dashboard Fields' },
      ],
    },
    {
      group: 'Projects',
      flags: [
        { key: 'view_all_projects',      label: 'View All Projects' },
        { key: 'view_my_projects',       label: 'View My Projects' },
        { key: 'create_delete_projects', label: 'Create / Delete Projects' },
        { key: 'edit_projects',          label: 'Edit Projects' },
        { key: 'edit_milestones',        label: 'Edit Milestones' },
        { key: 'edit_actual_dates',      label: 'Edit Actual Completion Dates' },
        { key: 'manage_recordings',      label: 'Manage Recordings (add/remove)' },
        { key: 'manage_files',           label: 'Manage Files & Project Links' },
        { key: 'log_time',               label: 'Log Time' },
        { key: 'view_project_details',   label: 'View Project Details (Docs & Contacts)' },
        { key: 'view_resource_hub',      label: 'View Resource Hub (read-only)' },
        { key: 'generate_resource_hub',  label: 'Generate & Manage Resource Hub' },
      ],
    },
    {
      group: 'Administration',
      flags: [
        { key: 'view_users',       label: 'View Users' },
        { key: 'manage_users',     label: 'Manage Users (Add/Edit/Delete)' },
        { key: 'view_hubspot',     label: 'View HubSpot' },
        { key: 'act_as_user',      label: 'Act As User' },
        { key: 'view_audit_trail', label: 'View Audit Trail' },
        { key: 'view_tools_hub',   label: 'View Tools Hub' },
      ],
    },
  ];
  const FLAGS = FLAG_GROUPS.flatMap(g => g.flags);

  function buildTable() {
    const roles = cachedRoles;
    return `
      <table class="permissions-table">
        <thead><tr>
          <th style="text-align:left;min-width:220px">Permission</th>
          ${roles.map(r => `
            <th>
              <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem">
                <span class="role-col-label" data-id="${r.id}">${r.label}</span>
                <div style="display:flex;gap:.25rem;justify-content:center">
                  <button class="btn btn-ghost btn-sm rename-role-btn" data-id="${r.id}" title="Rename role" style="font-size:.72rem;padding:.15rem .45rem">&#9998;</button>
                  ${r.id !== 'super_admin' ? `<button class="btn btn-danger btn-sm delete-role-btn" data-id="${r.id}" title="Delete role" style="font-size:.72rem;padding:.15rem .45rem">&#128465;</button>` : ''}
                </div>
              </div>
            </th>
          `).join('')}
        </tr></thead>
        <tbody>
          ${FLAG_GROUPS.map(g => `
            <tr>
              <td colspan="${roles.length + 1}" style="padding:.5rem 1rem;background:#092903;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#32CE13;border-bottom:1px solid #0d3d05">
                ${g.group}
              </td>
            </tr>
            ${g.flags.map(f => `
              <tr>
                <td class="perm-label">${f.label}</td>
                ${roles.map(r => `
                  <td class="perm-cell">
                    <input type="checkbox" class="perm-cb" data-role="${r.id}" data-flag="${f.key}"
                      ${permissionsMatrix[r.id]?.[f.key] ? 'checked' : ''} />
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          `).join('')}
        </tbody>
      </table>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div><h2>&#128275; Access Matrix</h2><p>Configure what each role can see and do.</p></div>
      <div class="flex-gap">
        <button class="btn btn-ghost" id="add-role-btn">+ Add Role</button>
        <button class="btn btn-primary" id="save-matrix-btn">Save Changes</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap" id="matrix-table-wrap">
        ${buildTable()}
      </div>
    </div>
  `;

  function rebuildTable() {
    document.getElementById('matrix-table-wrap').innerHTML = buildTable();
    wireRoleButtons();
  }

  function wireRoleButtons() {
    // Rename buttons
    container.querySelectorAll('.rename-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const roleId = btn.dataset.id;
        const role   = cachedRoles.find(r => r.id === roleId);
        if (!role) return;
        const modal = createModal(`
          <h3>&#9998; Rename Role</h3>
          <div class="form-group" style="margin-top:.8rem">
            <label>New display name</label>
            <input type="text" id="rename-role-input" value="${role.label}" style="width:100%" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" id="rename-cancel">Cancel</button>
            <button class="btn btn-primary" id="rename-confirm">Save</button>
          </div>`);
        const input = document.getElementById('rename-role-input');
        input.focus(); input.select();
        document.getElementById('rename-cancel').addEventListener('click', () => modal.remove());
        document.getElementById('rename-confirm').addEventListener('click', async () => {
          const newLabel = input.value.trim();
          if (!newLabel) return alert('Name cannot be empty.');
          const res = await fetch(`/api/roles/${roleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: newLabel }),
          });
          if (!res.ok) { const d = await res.json(); return alert(d.error || 'Failed to rename.'); }
          const updated = await res.json();
          const idx = cachedRoles.findIndex(r => r.id === roleId);
          if (idx !== -1) cachedRoles[idx].label = updated.label;
          modal.remove();
          rebuildTable();
          renderSidebar();
        });
      });
    });

    // Delete buttons (custom roles only)
    container.querySelectorAll('.delete-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const roleId = btn.dataset.id;
        const role   = cachedRoles.find(r => r.id === roleId);
        if (!role) return;
        const modal = createModal(`
          <h3>&#128465; Delete Role: ${role.label}?</h3>
          <p style="color:var(--txt-muted);margin:.5rem 0 1.2rem">This will remove all permissions for this role. Any users currently assigned to it must be reassigned first.</p>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-danger" id="del-role-confirm">Delete</button>
            <button class="btn btn-ghost" id="del-role-cancel">Cancel</button>
          </div>`);
        document.getElementById('del-role-cancel').addEventListener('click', () => modal.remove());
        document.getElementById('del-role-confirm').addEventListener('click', async () => {
          const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
          if (!res.ok) { const d = await res.json(); return alert(d.error || 'Failed to delete.'); }
          cachedRoles = cachedRoles.filter(r => r.id !== roleId);
          delete permissionsMatrix[roleId];
          modal.remove();
          rebuildTable();
          renderSidebar();
        });
      });
    });
  }

  wireRoleButtons();

  // Add Role button
  document.getElementById('add-role-btn').addEventListener('click', () => {
    const modal = createModal(`
      <h3>+ Add New Role</h3>
      <p style="color:var(--txt-muted);margin:.3rem 0 .8rem;font-size:.88rem">Give the role a display name. You can set its permissions below after saving.</p>
      <div class="form-group">
        <label>Role Name</label>
        <input type="text" id="new-role-input" placeholder="e.g. Consultant, Viewer, Analyst…" style="width:100%" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="add-role-cancel">Cancel</button>
        <button class="btn btn-primary" id="add-role-confirm">Create Role</button>
      </div>`);
    const input = document.getElementById('new-role-input');
    input.focus();
    document.getElementById('add-role-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('add-role-confirm').addEventListener('click', async () => {
      const label = input.value.trim();
      if (!label) return alert('Role name is required.');
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) { const d = await res.json(); return alert(d.error || 'Failed to create role.'); }
      const newRole = await res.json();
      cachedRoles.push(newRole);
      // Add default-all-false entry to local permissionsMatrix
      permissionsMatrix[newRole.id] = {};
      FLAGS.forEach(f => { permissionsMatrix[newRole.id][f.key] = false; });
      modal.remove();
      rebuildTable();
    });
  });

  // Save Matrix button
  document.getElementById('save-matrix-btn').addEventListener('click', async () => {
    const updated = {};
    cachedRoles.forEach(r => { updated[r.id] = {}; });
    container.querySelectorAll('.perm-cb').forEach(cb => {
      updated[cb.dataset.role][cb.dataset.flag] = cb.checked;
    });

    const res = await fetch('/api/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });

    if (!res.ok) {
      const data = await res.json();
      return alert(data.error || 'Failed to save permissions.');
    }

    permissionsMatrix = updated;
    renderSidebar();
    alert('Access Matrix saved!');
  });
}

// ── MILESTONES MODAL ──────────────────────────────────────────
function openMilestonesModal(projectId) {
  const projects = getProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;

  const milestones     = p.milestones || {};
  const timeline       = p.timeline   || {};
  const completedCount = MILESTONES.filter(m => milestones[m]).length;
  const progress       = Math.round((completedCount / MILESTONES.length) * 100);
  const isReadOnly     = !can('edit_milestones');
  const today          = new Date().toISOString().split('T')[0];

  // ── Active template ───────────────────────────────────────────
  const activeTplId  = p.timelineTemplate || '';
  const activeTpl    = cachedTemplates.find(t => t.id === activeTplId);
  const activePhases = activeTpl ? activeTpl.phases : null;

  // Template selector HTML (only if custom templates exist)
  const tplSelectorHtml = cachedTemplates.length > 0 ? `
    <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.85rem;padding:.55rem .85rem;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
      <span style="font-size:.83rem;font-weight:600;color:var(--txt);white-space:nowrap">&#128203; Template:</span>
      <select id="ms-tpl-selector" style="flex:1;padding:.32rem .6rem;border:1px solid var(--border);border-radius:6px;font-size:.83rem;background:var(--bg);color:var(--txt)">
        <option value="">Standard (Built-in)</option>
        ${cachedTemplates.map(t => `<option value="${t.id}" ${activeTplId === t.id ? 'selected' : ''}>${escAttr(t.name)}</option>`).join('')}
      </select>
    </div>` : '';

  // ── Tab 1: Timeline Planning rows ─────────────────────────────
  const planningRows = buildPlanningRows(timeline, milestones, isReadOnly, activePhases);

  // ── Tab 2: Progress Tracking rows ─────────────────────────────
  const canEditActual = can('edit_actual_dates');
  function buildProgressRowsHtml(tl) {
    return MILESTONES.map((m, i) => {
      const done        = !!milestones[m];
      const locked      = !isReadOnly && i > 0 && !milestones[MILESTONES[i - 1]];
      const disabled    = isReadOnly || locked;
      const targetStart = tl[m]?.startDate || '';
      const targetEnd   = tl[m]?.endDate || tl[m]?.targetDate || '';
      const actualDate  = tl[m]?.actualDate || (done ? today : '');
      const actualCell  = canEditActual
        ? `<input type="date" class="ms-actual" data-milestone="${m}" value="${actualDate}" style="font-size:.75rem;border:1px solid var(--border);border-radius:4px;padding:1px 4px;background:var(--bg);color:${done ? '#16a34a' : 'var(--txt)'};width:118px" />`
        : `<span class="ms-actual-display" style="color:${done ? '#16a34a' : 'var(--txt-muted)'}">${actualDate || '—'}</span><input type="hidden" class="ms-actual" data-milestone="${m}" value="${actualDate}" />`;
      return `
        <div class="ms-row" data-index="${i}" style="display:grid;grid-template-columns:20px 1fr 100px 100px 130px 50px;gap:.6rem;align-items:center;padding:.55rem .9rem;border-radius:8px;border:1.5px solid ${done ? '#86efac' : 'var(--border)'};background:${done ? '#f0fdf4' : locked ? '#fafafa' : 'var(--bg)'};opacity:${locked ? '.5' : '1'};transition:all .15s">
          <input type="checkbox" class="ms-check" data-index="${i}" data-milestone="${m}"
            ${done ? 'checked' : ''} ${disabled ? 'disabled' : ''}
            style="width:15px;height:15px;accent-color:var(--primary);cursor:${disabled ? 'not-allowed' : 'pointer'}" />
          <div>
            <span style="font-size:.72rem;color:var(--txt-muted);font-weight:600;margin-right:.3rem">${i + 1}.</span>
            <span class="ms-label" style="font-size:.85rem;${done ? 'text-decoration:line-through;color:var(--txt-muted)' : 'font-weight:500'}">${m}</span>
          </div>
          <div style="font-size:.78rem;color:var(--txt-muted);text-align:center">${targetStart || '—'}</div>
          <div style="font-size:.78rem;color:var(--txt-muted);text-align:center">${targetEnd || '—'}</div>
          <div style="font-size:.78rem;text-align:center">${actualCell}</div>
          <div style="text-align:center;font-size:.85rem">
            ${locked ? '&#128274;' : done ? '<span style="color:#16a34a;font-weight:700">&#10003;</span>' : i === completedCount ? '<span style="color:var(--accent-orange)">&#9654;</span>' : ''}
          </div>
        </div>`;
    }).join('');
  }
  const progressRows = buildProgressRowsHtml(timeline);

  const modal = createModal(`
    <h3>&#9873; ${p.title}</h3>

    <!-- Tabs -->
    <div style="display:flex;gap:0;margin-bottom:1.2rem;border-bottom:2px solid var(--border)">
      <button id="tab-plan-btn" class="ms-tab active-tab" data-tab="plan"
        style="padding:.55rem 1.1rem;font-size:.85rem;font-weight:600;font-family:var(--font-sub);border:none;background:none;cursor:pointer;border-bottom:2.5px solid var(--primary);margin-bottom:-2px;color:var(--txt)">
        &#128197; Timeline Planning
      </button>
      <button id="tab-prog-btn" class="ms-tab" data-tab="progress"
        style="padding:.55rem 1.1rem;font-size:.85rem;font-weight:600;font-family:var(--font-sub);border:none;background:none;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-2px;color:var(--txt-muted)">
        &#9873; Progress Tracking
      </button>
    </div>

    <!-- Tab 1: Planning -->
    <div id="tab-plan">
      <p style="font-size:.82rem;color:var(--txt-muted);margin-bottom:.9rem">Set target dates per phase. Save first, then download to present to your client.</p>
      ${tplSelectorHtml}
      <div id="ms-planning-rows-wrap" style="display:flex;flex-direction:column;gap:.2rem">${planningRows}</div>
      <div class="modal-actions" style="margin-top:1.2rem">
        <button class="btn btn-ghost" id="modal-cancel">Close</button>
        <button class="btn btn-ghost" id="plan-download-btn">&#11123; Download Timeline</button>
        ${!isReadOnly ? `<button class="btn btn-primary" id="plan-save-btn">Save Dates</button>` : ''}
      </div>
    </div>

    <!-- Tab 2: Progress -->
    <div id="tab-progress" style="display:none">
      <div style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
          <span style="font-size:.82rem;color:var(--txt-muted)">Overall Progress</span>
          <span style="font-size:.82rem;font-weight:700" id="ms-progress-label">${completedCount}/${MILESTONES.length} &nbsp; ${progress}%</span>
        </div>
        <div class="progress-bar-wrap" style="height:10px">
          <div class="progress-bar" id="ms-progress-bar" style="width:${progress}%"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:20px 1fr 100px 100px 130px 50px;gap:.5rem;padding:.3rem .9rem;font-size:.7rem;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.05em">
        <div></div><div>Milestone</div><div style="text-align:center">Target Start</div><div style="text-align:center">Target End</div><div style="text-align:center">Actual</div><div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.35rem" id="ms-list">${progressRows}</div>
      <div class="modal-actions" style="margin-top:1.2rem">
        <button class="btn btn-ghost" id="modal-cancel-2">Close</button>
        <button class="btn btn-ghost" id="prog-download-btn">&#11123; Download Timeline</button>
        ${!isReadOnly ? `<button class="btn btn-primary" id="prog-save-btn">Save Progress</button>` : ''}
      </div>
    </div>
  `);

  const mBox = modal.querySelector('.modal');
  mBox.style.maxWidth  = '860px';
  mBox.style.width     = '96%';
  mBox.style.maxHeight = '90vh';
  mBox.style.overflowY = 'auto';

  // ── Tab switching ──────────────────────────────────────────────
  modal.querySelectorAll('.ms-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.ms-tab').forEach(b => {
        b.style.borderBottomColor = 'transparent';
        b.style.color = 'var(--txt-muted)';
      });
      btn.style.borderBottomColor = 'var(--primary)';
      btn.style.color = 'var(--txt)';
      document.getElementById('tab-plan').style.display      = btn.dataset.tab === 'plan'     ? 'block' : 'none';
      document.getElementById('tab-progress').style.display  = btn.dataset.tab === 'progress' ? 'block' : 'none';
      // Re-render progress rows with live planning dates on every switch
      if (btn.dataset.tab === 'progress') {
        const liveTimeline = collectTimeline();
        syncTemplateToMilestones(liveTimeline, getMsActivePhases());
        modal.querySelector('#ms-list').innerHTML = buildProgressRowsHtml(liveTimeline);
        attachMsCheckListeners();
        refreshProgressRows();
      }
    });
  });

  // ── Progress tab: sequential lock logic ───────────────────────
  function refreshProgressRows() {
    const checkboxes = [...modal.querySelectorAll('.ms-check')];
    checkboxes.forEach((cb, i) => {
      const row      = cb.closest('.ms-row');
      const done     = cb.checked;
      const prevDone = i === 0 || checkboxes[i - 1].checked;
      const locked   = !prevDone && !done;

      cb.disabled           = locked;
      row.style.opacity     = locked ? '.5' : '1';
      row.style.background  = done ? '#f0fdf4' : locked ? '#fafafa' : 'var(--bg)';
      row.style.borderColor = done ? '#86efac' : 'var(--border)';

      const label = row.querySelector('.ms-label');
      if (label) {
        label.style.textDecoration = done ? 'line-through' : 'none';
        label.style.color          = done ? 'var(--txt-muted)' : 'var(--txt)';
      }

      // Auto-fill actual date when checked
      const actualInput   = row.querySelector('.ms-actual');
      const actualDisplay = row.querySelector('.ms-actual-display');
      if (actualInput && done && !actualInput.value) {
        actualInput.value         = today;
        if (actualDisplay) actualDisplay.textContent = today;
      }
    });

    const checkedCount = checkboxes.filter(c => c.checked).length;
    const pct          = Math.round((checkedCount / MILESTONES.length) * 100);
    document.getElementById('ms-progress-bar').style.width     = pct + '%';
    document.getElementById('ms-progress-label').textContent   = `${checkedCount}/${MILESTONES.length}   ${pct}%`;
  }

  function attachMsCheckListeners() {
    if (isReadOnly) return;
    modal.querySelectorAll('.ms-check').forEach((cb, i) => {
      cb.addEventListener('change', () => {
        if (!cb.checked) {
          [...modal.querySelectorAll('.ms-check')].slice(i + 1).forEach(next => { next.checked = false; });
        }
        refreshProgressRows();
      });
    });
  }
  attachMsCheckListeners();

  // ── Save target dates (Tab 1) ──────────────────────────────────
  function collectTimeline() {
    const updated = { ...timeline };
    modal.querySelectorAll('.plan-start').forEach(input => {
      const m = input.dataset.milestone;
      updated[m] = { ...(updated[m] || {}), startDate: input.value };
    });
    modal.querySelectorAll('.plan-end').forEach(input => {
      const m = input.dataset.milestone;
      updated[m] = { ...(updated[m] || {}), endDate: input.value, targetDate: input.value };
    });
    return updated;
  }

  // ── Active phases helper (reads template selector) ────────────
  function getMsActivePhases() {
    const tplId = modal.querySelector('#ms-tpl-selector')?.value || '';
    if (!tplId) return null;
    const tpl = cachedTemplates.find(t => t.id === tplId);
    return tpl ? tpl.phases : null;
  }

  // Template selector → re-render planning rows
  modal.querySelector('#ms-tpl-selector')?.addEventListener('change', () => {
    const phases = getMsActivePhases();
    const wrap   = modal.querySelector('#ms-planning-rows-wrap');
    if (wrap) wrap.innerHTML = buildPlanningRows(timeline, milestones, isReadOnly, phases);
    // Persist selection immediately
    const tplId = modal.querySelector('#ms-tpl-selector').value || null;
    const list  = getProjects();
    const idx   = list.findIndex(x => x.id === projectId);
    if (idx !== -1) { list[idx].timelineTemplate = tplId; saveProjects(list); }
  });

  // ── Save helpers ───────────────────────────────────────────────
  function savePlanningDates() {
    const updatedTimeline = collectTimeline();
    syncTemplateToMilestones(updatedTimeline, getMsActivePhases());
    const list = getProjects();
    const idx  = list.findIndex(x => x.id === projectId);
    list[idx].timeline         = updatedTimeline;
    list[idx].timelineTemplate = modal.querySelector('#ms-tpl-selector')?.value || null;
    saveProjects(list);
    alert('Target dates saved!');
  }

  function saveProgressData() {
    const updatedMilestones = {};
    const updatedTimeline   = { ...timeline };

    modal.querySelectorAll('.ms-check').forEach(cb => {
      const m    = cb.dataset.milestone;
      const done = cb.checked;
      updatedMilestones[m] = done;
      const actualInput    = modal.querySelector(`.ms-actual[data-milestone="${m}"]`);
      updatedTimeline[m]   = {
        startDate:  timeline[m]?.startDate  || '',
        endDate:    timeline[m]?.endDate    || '',
        targetDate: timeline[m]?.targetDate || '',
        actualDate: done ? (actualInput?.value || timeline[m]?.actualDate || today) : '',
      };
    });

    const list = getProjects();
    const idx  = list.findIndex(x => x.id === projectId);
    list[idx].milestones = updatedMilestones;
    list[idx].timeline   = updatedTimeline;
    list[idx].progress   = Math.round((Object.values(updatedMilestones).filter(Boolean).length / MILESTONES.length) * 100);
    saveProjects(list);
    const completedCount = Object.values(updatedMilestones).filter(Boolean).length;
    logAudit('milestone.saved', `Saved milestones for "${list[idx].title}" (${completedCount}/${MILESTONES.length} complete)`, { projectId, progress: list[idx].progress });
    modal.remove();
    navigate(effectiveUser().role === 'admin' ? 'projects' : 'my-projects');
  }

  // ── Download (both tabs use latest data) ──────────────────────
  function handleDownload() {
    const latestProject  = getProjects().find(x => x.id === projectId);
    const mergedTimeline = collectTimeline();
    downloadTimeline(latestProject, latestProject.milestones || {}, mergedTimeline, getMsActivePhases());
  }

  // ── Wire up buttons ────────────────────────────────────────────
  modal.getElementById?.('modal-cancel')  // won't work on backdrop, use querySelector
  modal.querySelector('#modal-cancel')  ?.addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-cancel-2')?.addEventListener('click', () => modal.remove());
  modal.querySelector('#plan-download-btn')?.addEventListener('click', handleDownload);
  modal.querySelector('#prog-download-btn')?.addEventListener('click', handleDownload);

  if (!isReadOnly) {
    modal.querySelector('#plan-save-btn')?.addEventListener('click', savePlanningDates);
    modal.querySelector('#prog-save-btn')?.addEventListener('click', saveProgressData);
  }
}

// ── AI PROJECT CHAT MODAL ─────────────────────────────────────
const PROACTIVE_PROMPT = 'Hey, give me a quick rundown on this project. What\'s the current situation, anything I should be worried about, and what needs attention soon?';
const DASHBOARD_PROACTIVE_PROMPT = 'Hey, give me a quick read on the overall portfolio. What\'s the current situation across projects — anything standing out, any risks I should know about?';

// ── DASHBOARD AI CHAT MODAL ───────────────────────────────────
function openDashboardChatModal(dashboardData) {
  let chatHistory = [];
  let isStreaming  = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:820px;width:96%;display:flex;flex-direction:column;height:88vh;max-height:820px;padding:0;overflow:hidden">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:.75rem;padding:1rem 1.3rem;border-bottom:1.5px solid var(--border);flex-shrink:0;background:linear-gradient(135deg,#f0fdf4,#fff)">
        <img src="/Sidekick.png" alt="Sidekick" class="sidekick-icon-spin" style="width:44px;height:44px;object-fit:contain;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-family:var(--font-sub);font-size:1rem">Sidekick Report</div>
          <div style="font-size:.72rem;background:linear-gradient(90deg,#8139EE,#32CE13);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700">Portfolio Analysis &bull; Your AI Dashboard Assistant</div>
        </div>
        <button id="dash-ai-close-btn" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--txt-muted);padding:.3rem .5rem;border-radius:6px;line-height:1" title="Close">&#10005;</button>
      </div>

      <!-- Quick Prompts -->
      <div style="padding:.6rem 1.3rem;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;gap:.4rem;flex-wrap:wrap;background:var(--bg-alt)">
        <span style="font-size:.72rem;color:var(--txt-muted);align-self:center;margin-right:.2rem">Quick:</span>
        <button class="dash-quick-btn" style="font-size:.75rem;padding:.3rem .7rem;border:1px solid var(--border);border-radius:20px;background:var(--bg);cursor:pointer;white-space:nowrap">⚠️ At-risk projects</button>
        <button class="dash-quick-btn" style="font-size:.75rem;padding:.3rem .7rem;border:1px solid var(--border);border-radius:20px;background:var(--bg);cursor:pointer;white-space:nowrap">📋 Generate status report</button>
        <button class="dash-quick-btn" style="font-size:.75rem;padding:.3rem .7rem;border:1px solid var(--border);border-radius:20px;background:var(--bg);cursor:pointer;white-space:nowrap">📊 Team workload summary</button>
        <button class="dash-quick-btn" style="font-size:.75rem;padding:.3rem .7rem;border:1px solid var(--border);border-radius:20px;background:var(--bg);cursor:pointer;white-space:nowrap">✅ Completed projects summary</button>
      </div>

      <!-- Messages -->
      <div id="dash-ai-messages" style="flex:1;overflow-y:auto;padding:1rem 1.3rem;display:flex;flex-direction:column;gap:.8rem;scroll-behavior:smooth"></div>

      <!-- Input -->
      <div style="padding:.8rem 1.3rem;border-top:1.5px solid var(--border);flex-shrink:0;background:var(--surface)">
        <div style="display:flex;gap:.5rem;align-items:flex-end">
          <textarea id="dash-ai-input" placeholder="Ask about your projects, request a report, or get insights…" rows="1"
            style="flex:1;padding:.55rem .8rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;font-family:var(--font-main);resize:none;background:var(--bg);color:var(--txt);line-height:1.4;max-height:100px;overflow-y:auto;outline:none;transition:border-color .15s"
            onfocus="this.style.borderColor='#32CE13'" onblur="this.style.borderColor='var(--border)'"></textarea>
          <button id="dash-ai-send-btn" style="flex-shrink:0;padding:.55rem 1rem;background:#32CE13;color:#092903;border:none;border-radius:8px;font-size:.85rem;font-weight:700;font-family:var(--font-sub);cursor:pointer;height:36px;white-space:nowrap;transition:background .15s"
            onmouseover="this.style.background='#25a00f'" onmouseout="this.style.background='#32CE13'">Send &#9654;</button>
        </div>
        <div style="font-size:.68rem;color:var(--txt-muted);margin-top:.35rem;text-align:center">AI can make mistakes — verify important details independently.</div>
      </div>

    </div>
  `;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);

  const messagesEl = document.getElementById('dash-ai-messages');
  const inputEl    = document.getElementById('dash-ai-input');
  const sendBtn    = document.getElementById('dash-ai-send-btn');

  document.getElementById('dash-ai-close-btn').addEventListener('click', () => backdrop.remove());

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', () => sendMessage());

  document.querySelectorAll('.dash-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.textContent.trim()));
  });

  function addMessage(role, text) {
    const isUser = role === 'user';
    const wrap   = document.createElement('div');
    wrap.style.cssText = `display:flex;flex-direction:column;align-items:${isUser ? 'flex-end' : 'flex-start'};gap:.2rem`;

    const label = document.createElement('div');
    label.style.cssText = 'font-size:.68rem;color:var(--txt-muted);padding:0 .35rem';
    label.textContent = isUser ? 'You' : '⚡ Sidekick';

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width:90%;
      padding:.65rem .95rem;
      border-radius:${isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
      font-size:.84rem;
      line-height:1.6;
      word-wrap:break-word;
      ${isUser
        ? 'background:#32CE13;color:#092903;font-weight:600'
        : 'background:var(--bg-soft);color:var(--txt);border:1.5px solid var(--border);'
      }
    `;
    if (isUser) bubble.textContent = text;
    else bubble.innerHTML = renderMarkdown(text);

    wrap.appendChild(label);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function addLoadingDots() {
    const wrap = document.createElement('div');
    wrap.id = 'dash-ai-loading';
    wrap.style.cssText = 'display:flex;align-items:center;gap:.6rem;padding:.2rem 0';
    wrap.innerHTML = `
      <div style="background:linear-gradient(135deg,#32CE13,#092903);border-radius:7px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0">&#129302;</div>
      <div style="display:flex;gap:4px;align-items:center">
        <div class="ai-dot"></div>
        <div class="ai-dot" style="animation-delay:.18s"></div>
        <div class="ai-dot" style="animation-delay:.36s"></div>
      </div>
    `;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  async function sendMessage(userText) {
    if (isStreaming) return;

    const isProactive = chatHistory.length === 0 && !userText;
    const text        = (userText || inputEl.value).trim();

    if (!isProactive && !text) return;

    if (!isProactive) {
      addMessage('user', text);
      inputEl.value = '';
      inputEl.style.height = 'auto';
    }

    const msgToSend   = isProactive ? DASHBOARD_PROACTIVE_PROMPT : text;
    const apiMessages = [...chatHistory, { role: 'user', content: msgToSend }];

    isStreaming       = true;
    sendBtn.disabled  = true;
    inputEl.disabled  = true;

    const loader   = isProactive ? addLoadingDots() : null;
    let fullText   = '';
    let bubble     = null;

    try {
      const res = await fetch('/api/ai/dashboard-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dashboardData, messages: apiMessages }),
      });

      if (loader) loader.remove();

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addMessage('assistant', '⚠️ ' + (data.error || 'Could not reach AI. Check your API key in .env.'));
        isStreaming = sendBtn.disabled = inputEl.disabled = false;
        return;
      }

      bubble = addMessage('assistant', '▋');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) fullText += '\n⚠️ ' + parsed.error;
            else if (parsed.text) fullText += parsed.text;
            bubble.textContent = fullText + '▋';
            messagesEl.scrollTop = messagesEl.scrollHeight;
          } catch { /* ignore malformed */ }
        }
      }

    } catch (err) {
      if (loader) loader.remove();
      addMessage('assistant', '⚠️ Network error: ' + err.message);
    }

    if (bubble) bubble.innerHTML = renderMarkdown(fullText || '(No response)');

    chatHistory.push({ role: 'user', content: msgToSend });
    chatHistory.push({ role: 'assistant', content: fullText });

    isStreaming       = false;
    sendBtn.disabled  = false;
    inputEl.disabled  = false;
    inputEl.focus();
  }

  // Auto-trigger proactive briefing on open
  sendMessage();
}

function openProjectChatModal(projectId) {
  const p = getProjects().find(x => x.id === projectId);
  if (!p) return;

  // Build enriched project data for the AI
  const allEntries  = getTimeEntries().filter(e => e.projectId === projectId);
  const totalHours  = Math.round(allEntries.reduce((s, e) => s + e.hours, 0) * 100) / 100;

  const projectData = {
    title:       p.title,
    status:      statusLabel(p.status || 'Unknown'),
    priority:    p.priority || 'Unknown',
    dueDate:     p.dueDate || null,
    description: p.description || '',
    pm:          projectManagerDisplay(p.projectManager),
    team:        userNames(p.assignedTo) || 'Not specified',
    milestones:  p.milestones || {},
    timeline:    p.timeline   || {},
    totalHours,
  };

  let chatHistory = [];  // full conversation history for multi-turn context
  let isStreaming  = false;

  // Build the modal DOM manually (custom flex layout, not createModal)
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:640px;width:95%;display:flex;flex-direction:column;height:580px;padding:0;overflow:hidden">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:.75rem;padding:1rem 1.3rem;border-bottom:1.5px solid var(--border);flex-shrink:0;background:linear-gradient(135deg,#f4eeff,#fff)">
        <img src="/Sidekick.png" alt="Sidekick" class="sidekick-icon-spin" style="width:42px;height:42px;object-fit:contain;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-family:var(--font-sub);font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</div>
          <div style="font-size:.72rem;background:linear-gradient(90deg,#8139EE,#32CE13);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700">Sidekick &bull; Your AI Project Assistant</div>
        </div>
        <button id="ai-close-btn" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--txt-muted);padding:.3rem .5rem;border-radius:6px;line-height:1" title="Close">&#10005;</button>
      </div>

      <!-- Messages -->
      <div id="ai-messages" style="flex:1;overflow-y:auto;padding:1rem 1.3rem;display:flex;flex-direction:column;gap:.8rem;scroll-behavior:smooth"></div>

      <!-- Input -->
      <div style="padding:.8rem 1.3rem;border-top:1.5px solid var(--border);flex-shrink:0;background:var(--surface)">
        <div style="display:flex;gap:.5rem;align-items:flex-end">
          <textarea id="ai-input" placeholder="Ask a question about this project…" rows="1"
            style="flex:1;padding:.55rem .8rem;border:1.5px solid var(--border);border-radius:8px;font-size:.85rem;font-family:var(--font-main);resize:none;background:var(--bg);color:var(--txt);line-height:1.4;max-height:100px;overflow-y:auto;outline:none;transition:border-color .15s"
            onfocus="this.style.borderColor='#8139EE'" onblur="this.style.borderColor='var(--border)'"></textarea>
          <button id="ai-send-btn" style="flex-shrink:0;padding:.55rem 1rem;background:#8139EE;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:600;font-family:var(--font-sub);cursor:pointer;height:36px;white-space:nowrap;transition:background .15s"
            onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#8139EE'">Send &#9654;</button>
        </div>
        <div style="font-size:.68rem;color:var(--txt-muted);margin-top:.35rem;text-align:center">AI can make mistakes — verify important details independently.</div>
      </div>

    </div>
  `;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);

  const messagesEl = document.getElementById('ai-messages');
  const inputEl    = document.getElementById('ai-input');
  const sendBtn    = document.getElementById('ai-send-btn');

  document.getElementById('ai-close-btn').addEventListener('click', () => backdrop.remove());

  // Auto-grow textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  // Enter = send, Shift+Enter = newline
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', () => sendMessage());

  // ── Helpers ─────────────────────────────────────────────────

  function addMessage(role, text) {
    const isUser = role === 'user';
    const wrap   = document.createElement('div');
    wrap.style.cssText = `display:flex;flex-direction:column;align-items:${isUser ? 'flex-end' : 'flex-start'};gap:.2rem`;

    const label = document.createElement('div');
    label.style.cssText = 'font-size:.68rem;color:var(--txt-muted);padding:0 .35rem';
    label.textContent = isUser ? 'You' : '⚡ Sidekick';

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width:88%;
      padding:.65rem .95rem;
      border-radius:${isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
      font-size:.84rem;
      line-height:1.6;
      word-wrap:break-word;
      ${isUser
        ? 'background:#8139EE;color:#fff;'
        : 'background:var(--bg-soft);color:var(--txt);border:1.5px solid var(--border);'
      }
    `;
    if (isUser) bubble.textContent = text;
    else bubble.innerHTML = renderMarkdown(text);

    wrap.appendChild(label);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function addLoadingDots() {
    const wrap = document.createElement('div');
    wrap.id = 'ai-loading';
    wrap.style.cssText = 'display:flex;align-items:center;gap:.6rem;padding:.2rem 0';
    wrap.innerHTML = `
      <img src="/Sidekick.png" alt="Sidekick" class="sidekick-icon-spin" style="width:26px;height:26px;object-fit:contain;flex-shrink:0">
      <div style="display:flex;gap:4px;align-items:center">
        <div class="ai-dot"></div>
        <div class="ai-dot" style="animation-delay:.18s"></div>
        <div class="ai-dot" style="animation-delay:.36s"></div>
      </div>
    `;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  // ── Main send function ───────────────────────────────────────

  async function sendMessage(userText) {
    if (isStreaming) return;

    const isProactive = chatHistory.length === 0 && !userText;
    const text        = (userText || inputEl.value).trim();

    if (!isProactive && !text) return;

    // Show user message in UI (not for proactive trigger)
    if (!isProactive) {
      addMessage('user', text);
      inputEl.value = '';
      inputEl.style.height = 'auto';
    }

    // Build messages for API: for proactive, use the default prompt
    const msgToSend = isProactive ? PROACTIVE_PROMPT : text;
    const apiMessages = [
      ...chatHistory,
      { role: 'user', content: msgToSend },
    ];

    isStreaming       = true;
    sendBtn.disabled  = true;
    inputEl.disabled  = true;

    const loader    = isProactive ? addLoadingDots() : null;
    let   fullText  = '';
    let   bubble    = null;

    try {
      const res = await fetch('/api/ai/project-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ project: projectData, messages: apiMessages }),
      });

      if (loader) loader.remove();

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addMessage('assistant', '⚠️ ' + (data.error || 'Could not reach AI. Check your API key in .env.'));
        isStreaming = sendBtn.disabled = inputEl.disabled = false;
        return;
      }

      bubble = addMessage('assistant', '▋');   // start with cursor placeholder

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();   // keep partial last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) fullText += '\n⚠️ ' + parsed.error;
            else if (parsed.text) fullText += parsed.text;
            bubble.textContent = fullText + '▋';
            messagesEl.scrollTop = messagesEl.scrollHeight;
          } catch { /* ignore malformed */ }
        }
      }

    } catch (err) {
      if (loader) loader.remove();
      addMessage('assistant', '⚠️ Network error: ' + err.message);
    }

    // Finalise bubble (remove cursor)
    if (bubble) bubble.innerHTML = renderMarkdown(fullText || '(No response)');

    // Update chat history for multi-turn context
    chatHistory.push({ role: 'user', content: msgToSend });
    chatHistory.push({ role: 'assistant', content: fullText });

    isStreaming       = false;
    sendBtn.disabled  = false;
    inputEl.disabled  = false;
    inputEl.focus();
  }

  // Auto-trigger proactive briefing on open
  sendMessage();
}

// ── DOWNLOAD TIMELINE (Excel) ──────────────────────────────────
// Optional `phases` param: custom template phases. Defaults to TIMELINE_PHASES.
function downloadTimeline(p, milestones, timeline, phases) {
  milestones = milestones || p.milestones || {};
  timeline   = timeline   || p.timeline   || {};
  phases     = phases     || TIMELINE_PHASES;

  const pmName = projectManagerDisplay(p.projectManager);
  const today  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Helper: get phase status based on milestone completion (or date-based for custom phases)
  function phaseStatus(phase) {
    if (!phase.milestone) {
      const key       = phase.key || phase.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
      const msData    = timeline[key] || {};
      const endDate   = msData.endDate || msData.targetDate || '';
      const startDate = msData.startDate || '';
      const todayIso  = new Date().toISOString().split('T')[0];
      if (endDate && endDate < todayIso)   return 'done';
      if (startDate && startDate <= todayIso) return 'active';
      return 'pending';
    }
    const done  = !!milestones[phase.milestone];
    const done2 = !phase.milestone2 || !!milestones[phase.milestone2];
    if (done && done2) return 'done';
    const idx     = MILESTONES.indexOf(phase.milestone);
    const prevAll = idx <= 0 || MILESTONES.slice(0, idx).every(m => milestones[m]);
    return prevAll ? 'active' : 'pending';
  }

  // Format date string to MM/DD/YYYY for display
  function fmtXlDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return (dt.getMonth()+1).toString().padStart(2,'0') + '/' + dt.getDate().toString().padStart(2,'0') + '/' + dt.getFullYear();
  }

  const C = 7; // column count
  let rows = '';

  phases.forEach(phase => {
    const key       = phase.milestone || phase.key || phase.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    const st        = phaseStatus(phase);
    const msData    = timeline[key] || {};
    const startDate = fmtXlDate(msData.startDate || '');
    const endDate   = fmtXlDate(msData.endDate || msData.targetDate || '');
    const phaseBg    = '#1a6b08';
    const statusText = st === 'done' ? 'COMPLETED' : st === 'active' ? 'IN PROGRESS' : 'NOT STARTED';
    const statusBg   = st === 'done' ? '#d4f5ca' : st === 'active' ? '#fef3c7' : '#fde8c8';
    const statusFg   = st === 'done' ? '#166534' : st === 'active' ? '#854d0e' : '#9a3412';
    const rowBg      = st === 'done' ? '#f0fdf4' : st === 'active' ? '#fffbeb' : '#ffffff';

    // Phase header row
    rows += `<tr>
      <td colspan="6" style="background:${phaseBg};color:#fff;font-weight:700;padding:7px 12px;font-size:10.5pt;border:1px solid #0f4b05;letter-spacing:.4px">${phase.label}</td>
      <td style="background:${phaseBg};color:#fff;padding:7px;border:1px solid #0f4b05"></td>
    </tr>`;

    const isCustomPhase = !phase.milestone;
    phase.tasks.forEach((task, ti) => {
      const indent   = (task.indent || 0);
      const pl       = 10 + indent * 18;
      const isHeader = !task.duration && !task.assignedTo;
      const taskSt   = (isHeader || (!task.assignedTo && !task.duration)) ? '' : statusText;
      const taskStBg = taskSt ? statusBg : rowBg;
      const taskStFg = taskSt ? statusFg : '#607060';
      // Use per-task dates for custom templates, phase dates for built-in
      const taskData   = isCustomPhase ? (timeline[key + '_t' + ti] || {}) : {};
      const taskStart  = fmtXlDate(taskData.startDate || msData.startDate || '');
      const taskEnd    = fmtXlDate(taskData.endDate || taskData.targetDate || msData.endDate || msData.targetDate || '');
      rows += `<tr>
        <td style="background:${rowBg};padding:5px 6px 5px ${pl}px;border:1px solid #e4ece4;font-weight:${isHeader?'600':'400'};color:#092903">${task.label}</td>
        <td style="background:${rowBg};text-align:center;padding:5px 6px;border:1px solid #e4ece4;color:#607060">${task.duration !== '' && task.duration != null ? task.duration : ''}</td>
        <td style="background:${rowBg};text-align:center;padding:5px 6px;border:1px solid #e4ece4;color:#607060">${task.assignedTo || ''}</td>
        <td style="background:${rowBg};text-align:center;padding:5px 6px;border:1px solid #e4ece4;color:#5a7a5a">${task.assignedTo ? taskStart : ''}</td>
        <td style="background:${rowBg};text-align:center;padding:5px 6px;border:1px solid #e4ece4;color:#5a7a5a">${task.assignedTo ? taskEnd : ''}</td>
        <td style="background:${taskStBg};text-align:center;padding:5px 6px;border:1px solid #e4ece4;font-weight:700;color:${taskStFg};font-size:8.5pt">${taskSt}</td>
        <td style="background:${rowBg};padding:5px 6px;border:1px solid #e4ece4"></td>
      </tr>`;
    });
  });

  // Footer row matching template
  rows += `<tr>
    <td colspan="${C}" style="background:#1a6b08;color:#fff;font-weight:600;padding:8px 12px;border:1px solid #0f4b05;text-align:center;font-size:9.5pt">
      Transition to Your Customer Success Manager upon Project Handover completion.
    </td>
  </tr>`;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Project Timeline</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<table border="0" cellpadding="0" cellspacing="0" style="font-family:Calibri,Arial,sans-serif;font-size:10pt;border-collapse:collapse;min-width:900px">

  <!-- Title -->
  <tr>
    <td colspan="${C}" style="background:#1a6b08;color:#fff;font-size:15pt;font-weight:700;padding:14px 18px;text-align:center;letter-spacing:.5px">
      ${p.title} — PROJECT TIMELINE
    </td>
  </tr>

  <!-- Column headers -->
  <tr>
    <td style="background:#1a6b08;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #0f4b05;width:300px">TASK</td>
    <td style="background:#1a6b08;color:#fff;font-weight:700;text-align:center;padding:8px 6px;border:1px solid #0f4b05;width:80px">DURATION (DAYS)</td>
    <td style="background:#1a6b08;color:#fff;font-weight:700;text-align:center;padding:8px 6px;border:1px solid #0f4b05;width:180px">ASSIGNED TO</td>
    <td style="background:#1a6b08;color:#fff;font-weight:700;text-align:center;padding:8px 6px;border:1px solid #0f4b05;width:110px">TARGET START DATE</td>
    <td style="background:#1a6b08;color:#fff;font-weight:700;text-align:center;padding:8px 6px;border:1px solid #0f4b05;width:110px">TARGET END DATE</td>
    <td style="background:#1a6b08;color:#fff;font-weight:700;text-align:center;padding:8px 6px;border:1px solid #0f4b05;width:100px">STATUS</td>
    <td style="background:#1a6b08;color:#fff;font-weight:700;padding:8px 6px;border:1px solid #0f4b05;width:160px">REMARKS</td>
  </tr>

  ${rows}

  <!-- Footer info -->
  <tr><td colspan="${C}" style="padding:6px"></td></tr>
  <tr>
    <td colspan="2" style="background:#f0fdf4;font-weight:700;color:#092903;padding:5px 10px;border:1px solid #d4f5ca">Project Manager</td>
    <td colspan="5" style="background:#f0fdf4;color:#092903;padding:5px 10px;border:1px solid #d4f5ca">${pmName}</td>
  </tr>
  <tr>
    <td colspan="2" style="background:#f0fdf4;font-weight:700;color:#092903;padding:5px 10px;border:1px solid #d4f5ca">Export Date</td>
    <td colspan="5" style="background:#f0fdf4;color:#092903;padding:5px 10px;border:1px solid #d4f5ca">${today}</td>
  </tr>

</table>
</body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${p.title} - Project Timeline.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── FORGOT PASSWORD ───────────────────────────────────────────
function showForgotForm() {
  document.querySelector('.login-card').innerHTML = `
    <div class="login-logo">
      <img src="Sprout Logo.png" alt="Sprout Solutions" class="login-logo-img" />
    </div>
    <p class="login-subtitle">Reset your password</p>
    <form id="forgot-form">
      <div class="form-group">
        <label for="forgot-email">Email Address</label>
        <input type="email" id="forgot-email" placeholder="Enter your email" required />
      </div>
      <div id="forgot-msg" class="hidden"></div>
      <button type="submit" class="btn btn-primary btn-full">Send Reset Link</button>
    </form>
    <div style="text-align:center;margin-top:1rem">
      <a href="#" id="back-login-link" style="color:var(--primary);font-size:.85rem;text-decoration:none">Back to Login</a>
    </div>
  `;

  document.getElementById('forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn   = e.target.querySelector('button[type=submit]');
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    const res  = await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    const msg  = document.getElementById('forgot-msg');
    msg.textContent = data.message || 'Check your email for a reset link.';
    msg.className   = 'success-msg';
    msg.classList.remove('hidden');
    btn.textContent = 'Sent!';
  });

  document.getElementById('back-login-link').addEventListener('click', e => {
    e.preventDefault();
    window.location.href = '/';
  });
}

// ── RESET PASSWORD ────────────────────────────────────────────
function showResetPasswordScreen(token) {
  showScreen('login-screen');
  document.querySelector('.login-card').innerHTML = `
    <div class="login-logo">
      <img src="Sprout Logo.png" alt="Sprout Solutions" class="login-logo-img" />
    </div>
    <p class="login-subtitle">Set a new password</p>
    <form id="reset-form">
      <div class="form-group">
        <label for="reset-pass">New Password</label>
        <input type="password" id="reset-pass" placeholder="At least 6 characters" required />
      </div>
      <div class="form-group">
        <label for="reset-confirm">Confirm Password</label>
        <input type="password" id="reset-confirm" placeholder="Repeat password" required />
      </div>
      <div id="reset-msg" class="hidden"></div>
      <button type="submit" class="btn btn-primary btn-full">Reset Password</button>
    </form>
  `;

  document.getElementById('reset-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pass    = document.getElementById('reset-pass').value;
    const confirm = document.getElementById('reset-confirm').value;
    const msg     = document.getElementById('reset-msg');
    const btn     = e.target.querySelector('button[type=submit]');

    msg.classList.remove('hidden');
    if (pass !== confirm) {
      msg.textContent = 'Passwords do not match.';
      msg.className   = 'error-msg';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Resetting…';

    const res  = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password: pass }),
    });
    const data = await res.json();

    if (res.ok) {
      msg.textContent = 'Password reset! Redirecting to login…';
      msg.className   = 'success-msg';
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } else {
      msg.textContent = data.error || 'Reset failed. The link may have expired.';
      msg.className   = 'error-msg';
      btn.disabled    = false;
      btn.textContent = 'Reset Password';
    }
  });
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initProjects();

  // Handle password reset link (?token=...)
  const params     = new URLSearchParams(window.location.search);
  const resetToken = params.get('token');
  if (resetToken) {
    showResetPasswordScreen(resetToken);
    return;
  }

  // Restore existing session
  const user = await checkSession();
  if (user) {
    await bootApp(user);
    return;
  }

  // Show login screen
  showScreen('login-screen');

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const user     = await doLogin(username, password);
    if (user) {
      document.getElementById('login-error').classList.add('hidden');
      await bootApp(user);
    } else {
      document.getElementById('login-error').classList.remove('hidden');
    }
  });

  document.getElementById('forgot-link')?.addEventListener('click', e => {
    e.preventDefault();
    showForgotForm();
  });
});
