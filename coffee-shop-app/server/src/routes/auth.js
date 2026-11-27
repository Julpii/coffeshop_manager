import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { config } from '../config.js';
import { HttpError, wrap } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Slows down password guessing: 10 tries per 15 minutes per IP address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes' },
});

const publicUser = (u) => ({ id: u.id, username: u.username, name: u.display_name, role: u.role });

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw new HttpError(400, 'Enter your username and password');
  }
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username.trim()]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Wrong username or password');

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h' });
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser({ ...req.user }) });
});

export default router;
