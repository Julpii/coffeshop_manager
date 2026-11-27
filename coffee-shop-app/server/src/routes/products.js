import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, wrap } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { imageUpload, removeUpload } from '../middleware/upload.js';
import { cleanText } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

const SELECT = `SELECT p.id, p.code, p.name, p.category_id AS categoryId, c.name AS categoryName,
                       p.price, p.image_path AS imagePath, p.description, p.status
                FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

const serialize = (p) => ({ ...p, price: Number(p.price), imageUrl: p.imagePath ? `/uploads/${p.imagePath}` : null });

router.get('/', wrap(async (req, res) => {
  const where = ['p.deleted_at IS NULL'];
  const params = [];
  // Cashiers only ever see products they can sell.
  if (req.user.role === 'cashier') where.push("p.status = 'active'");
  if (req.query.search) {
    where.push('(p.name LIKE ? OR p.code LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  if (req.query.categoryId) {
    where.push('p.category_id = ?');
    params.push(Number(req.query.categoryId));
  }
  const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY c.name, p.name`, params);
  res.json(rows.map(serialize));
}));

router.get('/:id', requireRole('admin'), wrap(async (req, res) => {
  const [rows] = await pool.query(`${SELECT} WHERE p.id = ? AND p.deleted_at IS NULL`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Product not found');
  res.json(serialize(rows[0]));
}));

async function parseProduct(body) {
  const code = cleanText(body.code, 30);
  const name = cleanText(body.name, 120);
  const description = cleanText(body.description, 255) || null;
  const categoryId = Number(body.categoryId);
  const price = Number(body.price);
  const status = body.status === 'inactive' ? 'inactive' : 'active';

  const errors = {};
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(code)) errors.code = 'Use 2-30 letters, numbers, dashes or underscores';
  if (!name) errors.name = 'Product name is required';
  if (!Number.isFinite(price) || price < 0 || price > 9999.99) errors.price = 'Enter a price between 0 and 9999.99';
  else if (Math.round(price * 100) !== Number((price * 100).toFixed(0))) errors.price = 'Use at most 2 decimal places';
  const [cat] = await pool.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
  if (!cat[0]) errors.categoryId = 'Choose a category';
  if (Object.keys(errors).length) {
    const err = new HttpError(400, 'Please fix the highlighted fields');
    err.fields = errors;
    throw err;
  }
  return { code, name, description, categoryId, price: price.toFixed(2), status };
}

function dupHandler(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    const e = new HttpError(409, 'Please fix the highlighted fields');
    e.fields = { code: 'This product code is already used' };
    return e;
  }
  return err;
}

router.post('/', requireRole('admin'), imageUpload.single('image'), wrap(async (req, res) => {
  try {
    const p = await parseProduct(req.body);
    const [result] = await pool.query(
      'INSERT INTO products (code, name, category_id, price, image_path, description, status) VALUES (?,?,?,?,?,?,?)',
      [p.code, p.name, p.categoryId, p.price, req.file?.filename || null, p.description, p.status]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (req.file) removeUpload(req.file.filename);
    throw dupHandler(err);
  }
}));

router.put('/:id', requireRole('admin'), imageUpload.single('image'), wrap(async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT image_path FROM products WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!existing[0]) throw new HttpError(404, 'Product not found');
    const p = await parseProduct(req.body);
    const image = req.file?.filename || existing[0].image_path;
    await pool.query(
      'UPDATE products SET code=?, name=?, category_id=?, price=?, image_path=?, description=?, status=? WHERE id=?',
      [p.code, p.name, p.categoryId, p.price, image, p.description, p.status, req.params.id]
    );
    if (req.file) removeUpload(existing[0].image_path);
    res.json({ ok: true });
  } catch (err) {
    if (req.file) removeUpload(req.file.filename);
    throw dupHandler(err);
  }
}));

// "Delete" archives the product: it disappears from the app but old orders keep their data.
router.delete('/:id', requireRole('admin'), wrap(async (req, res) => {
  const [result] = await pool.query(
    "UPDATE products SET deleted_at = NOW(), status = 'inactive' WHERE id = ? AND deleted_at IS NULL",
    [req.params.id]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Product not found');
  res.json({ ok: true });
}));

export default router;
