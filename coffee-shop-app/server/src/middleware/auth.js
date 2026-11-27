import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';
import { HttpError, wrap } from './error.js';

export const requireAuth = wrap(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please sign in');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session expired. Please sign in again');
  }
  // Look the user up every time so a disabled account stops working immediately.
  const [rows] = await pool.query('SELECT id, username, display_name, role FROM users WHERE id = ? AND is_active = 1', [payload.sub]);
  if (!rows[0]) throw new HttpError(401, 'Account not found or disabled');
  req.user = rows[0];
  next();
});

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'You are not allowed to do this'));
