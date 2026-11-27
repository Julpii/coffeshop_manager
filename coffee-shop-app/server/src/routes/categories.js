import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, wrap } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { cleanText } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS productCount
     FROM categories c ORDER BY c.name`
  );
  res.json(rows);
}));

function parseName(body) {
  const name = cleanText(body?.name, 80);
  if (!name) throw new HttpError(400, 'Category name is required');
  return name;
}

async function insertOrUpdate(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'A category with this name already exists');
    throw err;
  }
}

router.post('/', requireRole('admin'), wrap(async (req, res) => {
  const name = parseName(req.body);
  const [result] = await insertOrUpdate('INSERT INTO categories (name) VALUES (?)', [name]);
  res.status(201).json({ id: result.insertId, name });
}));

router.put('/:id', requireRole('admin'), wrap(async (req, res) => {
  const name = parseName(req.body);
  const [result] = await insertOrUpdate('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Category not found');
  res.json({ id: Number(req.params.id), name });
}));

// Safe rule: a category that still has products cannot be deleted (move or delete the products first).
router.delete('/:id', requireRole('admin'), wrap(async (req, res) => {
  const [[{ n }]] = await pool.query(
    'SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND deleted_at IS NULL',
    [req.params.id]
  );
  if (n > 0) throw new HttpError(409, `This category still has ${n} product(s). Move or delete them first`);
  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Category not found');
  res.json({ ok: true });
}));

export default router;
