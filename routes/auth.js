const express    = require('express');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { getUsers, saveUsers, appendAuditEntry } = require('../db');

const router = express.Router();

/* ── POST /api/auth/login ─────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  const users = getUsers();
  const user  = users.find(u => u.username === username);
  if (!user)
    return res.status(401).json({ error: 'Invalid username or password.' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match)
    return res.status(401).json({ error: 'Invalid username or password.' });

  req.session.userId = user.id;

  appendAuditEntry({
    id:        crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    userId:    user.id,
    userName:  user.name,
    userRole:  user.role,
    action:    'auth.login',
    details:   `${user.name} logged in`,
    meta:      { username: user.username },
  });

  const { passwordHash, resetToken, resetExpires, ...safeUser } = user;
  res.json({ user: safeUser });
});

/* ── POST /api/auth/logout ────────────────────────────────── */
router.post('/logout', (req, res) => {
  const user = getUsers().find(u => u.id === req.session.userId);
  if (user) {
    appendAuditEntry({
      id:        crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      userId:    user.id,
      userName:  user.name,
      userRole:  user.role,
      action:    'auth.logout',
      details:   `${user.name} logged out`,
      meta:      {},
    });
  }
  req.session.destroy();
  res.json({ ok: true });
});

/* ── GET /api/auth/me ─────────────────────────────────────── */
router.get('/me', (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Not logged in.' });

  const user = getUsers().find(u => u.id === req.session.userId);
  if (!user)
    return res.status(401).json({ error: 'User not found.' });

  const { passwordHash, resetToken, resetExpires, ...safeUser } = user;
  res.json({ user: safeUser });
});

/* ── POST /api/auth/forgot-password ──────────────────────── */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: 'Email is required.' });

  const successMsg = 'If that email is registered, a reset link has been sent.';

  const users = getUsers();
  const user  = users.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return res.json({ ok: true, message: successMsg });

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour

  user.resetToken   = token;
  user.resetExpires = expires;
  saveUsers(users);

  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?token=${token}`;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from:    `"Sprout Solutions PMT" <${process.env.GMAIL_USER}>`,
      to:      user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:2rem;border-radius:8px;border:1px solid #e2e8f0">
          <h2 style="color:#092903">Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>You requested to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
          <p style="text-align:center;margin:2rem 0">
            <a href="${resetUrl}"
               style="display:inline-block;padding:.75rem 2rem;background:#32CE13;color:#092903;border-radius:6px;text-decoration:none;font-weight:700;font-size:1rem">
              Reset My Password
            </a>
          </p>
          <p style="color:#64748b;font-size:.88rem">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0" />
          <p style="color:#94a3b8;font-size:.78rem">Sprout Solutions Project Management Tool</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }

  res.json({ ok: true, message: successMsg });
});

/* ── POST /api/auth/reset-password ───────────────────────── */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const users = getUsers();
  const user  = users.find(u => u.resetToken === token);

  if (!user || !user.resetExpires || Date.now() > user.resetExpires)
    return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetToken   = null;
  user.resetExpires = null;
  saveUsers(users);

  res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
});

module.exports = router;
