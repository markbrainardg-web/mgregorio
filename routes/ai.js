const express    = require('express');
const Anthropic  = require('@anthropic-ai/sdk');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

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
];

function buildProjectContext(project) {
  const milestones = project.milestones || {};
  const timeline   = project.timeline   || {};
  const today      = new Date().toISOString().split('T')[0];

  const completedMs = MILESTONES.filter(m => milestones[m]);
  const pendingMs   = MILESTONES.filter(m => !milestones[m]);
  const currentMs   = pendingMs[0] || null;
  const progress    = Math.round((completedMs.length / MILESTONES.length) * 100);

  // Due date analysis
  let dueDateNote = '';
  if (project.dueDate) {
    const msUntilDue = new Date(project.dueDate) - new Date(today);
    const daysLeft   = Math.floor(msUntilDue / 86400000);
    if (daysLeft < 0 && project.status !== 'completed') {
      dueDateNote = ` ⚠️ OVERDUE by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`;
    } else if (daysLeft >= 0) {
      dueDateNote = ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining)`;
    }
  }

  // Find overdue milestones (target passed but not completed)
  const overdueMs = MILESTONES.filter(m =>
    !milestones[m] && timeline[m]?.targetDate && timeline[m].targetDate < today
  );

  // Milestone detail lines
  const milestoneDetail = MILESTONES.map((m, i) => {
    const done   = milestones[m] ? '✓' : '○';
    const target = timeline[m]?.targetDate || '—';
    const actual = timeline[m]?.actualDate || '—';
    const note   = (!milestones[m] && timeline[m]?.targetDate && timeline[m].targetDate < today)
      ? ' ⚠️ OVERDUE' : '';
    return `  ${done} ${i + 1}. ${m} | Target: ${target} | Actual: ${actual}${note}`;
  }).join('\n');

  return `
PROJECT: ${project.title}
Status: ${project.status}
Priority: ${project.priority}
Due Date: ${project.dueDate || 'Not set'}${dueDateNote}
Project Manager: ${project.pm || 'Not assigned'}
Team: ${project.team || 'Not specified'}
Description: ${project.description || 'No description'}
Total Hours Logged: ${project.totalHours || 0}h

MILESTONE PROGRESS: ${completedMs.length}/${MILESTONES.length} complete (${progress}%)
Current Milestone: ${currentMs || '✅ All milestones complete'}
${overdueMs.length ? `⚠️ Overdue Milestones: ${overdueMs.join(', ')}` : 'No overdue milestones.'}

MILESTONE DETAIL:
${milestoneDetail}
`.trim();
}

/* ── POST /api/ai/project-chat ──────────────────────────────── */
router.post('/project-chat', requireAuth, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured. Open your .env file and add your Anthropic API key.',
    });
  }

  const { project, messages = [] } = req.body;
  if (!project) return res.status(400).json({ error: 'Project data required.' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const today   = new Date().toISOString().split('T')[0];
  const context = buildProjectContext(project);

  const systemPrompt = `You are a smart, friendly project assistant at Sprout Solutions. Think of yourself as a knowledgeable colleague who knows this project inside and out — not a formal reporting tool.

Today's Date: ${today}

${context}

How to communicate:
- Talk like a real person, not a system. Use natural, conversational language.
- Be warm but efficient — you respect that managers are busy, so get to the point without being cold or robotic.
- Don't start every response the same way. Vary your opening based on what's actually happening in the project.
- Use plain sentences first, then bullets only when listing multiple things makes it clearer.
- Use ⚠️ for real risks, ✅ for good news, 💡 for suggestions — but don't overload every message with emojis.
- Call out specific milestone names and dates naturally in conversation, not as a data dump.
- If things look good, say so genuinely. If there's a problem, be direct but constructive.
- Never use corporate filler like "Certainly!", "Great question!", or "As an AI language model".`;

  try {
    const stream = client.messages.stream({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('AI chat error:', err);
    const msg = err.message || 'AI error occurred.';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/* ── POST /api/ai/dashboard-chat ────────────────────────────── */
router.post('/dashboard-chat', requireAuth, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured. Open your .env file and add your Anthropic API key.',
    });
  }

  const { dashboardData, messages = [] } = req.body;
  if (!dashboardData) return res.status(400).json({ error: 'Dashboard data required.' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const today = new Date().toISOString().split('T')[0];
  const d = dashboardData;

  const systemPrompt = `You are an AI Dashboard Assistant embedded in Sprout Solutions' Project Management Tool.
You help managers understand their full project portfolio, spot risks, and generate reports.

Today's Date: ${today}

PORTFOLIO OVERVIEW:
Total Projects: ${d.total}
Ongoing: ${d.ongoing}
Completed: ${d.completed}
On Hold: ${d.onHold || 0}
On Hold - Returned to Sales: ${d.onHoldSales || 0}
Churn: ${d.churn || 0}
Team Members: ${d.teamMembers || 0}
Project Managers: ${d.projectManagers || 0}

PROJECTS DETAIL:
${d.projects && d.projects.length ? d.projects.map((p, i) => {
  const completedMs = (p.milestones ? Object.values(p.milestones).filter(Boolean).length : 0);
  const totalMs = 9;
  const progress = Math.round((completedMs / totalMs) * 100);
  return `${i + 1}. ${p.title}
   Status: ${p.status} | Priority: ${p.priority} | Progress: ${progress}% (${completedMs}/${totalMs} milestones)
   PM: ${p.pm || 'Unassigned'} | Assigned To: ${p.team || 'Unassigned'} | Due: ${p.dueDate || 'Not set'}`;
}).join('\n') : 'No project detail available.'}

STAGE BREAKDOWN (HubSpot deals):
${d.byStage && Object.keys(d.byStage).length ? Object.entries(d.byStage).map(([stage, count]) => `  ${stage}: ${count}`).join('\n') : 'No stage data.'}

How to communicate:
- Talk like a sharp, friendly colleague who knows the portfolio well — not a reporting engine.
- Be warm and natural. Get to the point without sounding robotic or formal.
- Vary how you open responses — don't use the same structure every time.
- Use plain sentences first, then bullets only when listing multiple things is genuinely clearer.
- Use ⚠️ for real risks, ✅ for good news, 💡 for suggestions — don't overdo it.
- When asked to generate a report, write it in a clean, readable format — but still sound human.
- Never use filler phrases like "Certainly!", "Great question!", or "As an AI language model".`;

  try {
    const stream = client.messages.stream({
      model:      'claude-opus-4-6',
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('AI dashboard chat error:', err);
    const msg = err.message || 'AI error occurred.';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/* ── POST /api/ai/briefing ──────────────────────────────────── */
// Returns a short, non-streaming JSON briefing for the dashboard.
router.post('/briefing', requireAuth, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    return res.json({ briefing: null, error: 'API key not configured.' });
  }

  const { projects = [], stats = {} } = req.body;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today  = new Date().toISOString().split('T')[0];

  const overdueList = projects
    .filter(p => p.dueDate && p.dueDate < today && p.status !== 'completed' && p.status !== 'churn')
    .map(p => p.title);

  const stalledList = projects
    .filter(p => {
      if (!p.milestones) return false;
      const completed = Object.values(p.milestones).filter(Boolean).length;
      return p.status === 'ongoing' && completed < 9 && completed < 3;
    })
    .map(p => p.title);

  const context = `
Today: ${today}
Portfolio: ${stats.total || projects.length} projects total — ${stats.ongoing || 0} ongoing, ${stats.completed || 0} completed, ${stats.onHold || 0} on hold.
${overdueList.length ? `Overdue projects (${overdueList.length}): ${overdueList.join(', ')}` : 'No overdue projects.'}
${stalledList.length ? `Early-stage/stalled: ${stalledList.join(', ')}` : ''}
`.trim();

  try {
    const response = await client.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 60,
      messages: [{
        role:    'user',
        content: `You are Sprout Sidekick. Write a single sentence (max 20 words) daily status snapshot for the implementation team. Plain text only — no markdown, no asterisks. Lead with the most important thing right now. No preamble.\n\n${context}`,
      }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    res.json({ briefing: text });
  } catch (err) {
    console.error('Briefing error:', err);
    res.json({ briefing: null, error: err.message });
  }
});

module.exports = router;
