import { Router } from 'express';
import { pool } from '../db.js';
import { config } from '../config.js';
import { HttpError, wrap } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { calcTotals, toCents, fromCents } from '../utils/money.js';
import { parseOrderInput, cleanText, PAYMENTS } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

const STATUSES = ['New Order', 'Preparing', 'Ready to Serve', 'Finished', 'Cancelled'];
// Ready to Serve = food is ready. The waiter serves it, then staff mark the order Finished (the last step).
const NEXT_STATUS = { 'New Order': 'Preparing', Preparing: 'Ready to Serve', 'Ready to Serve': 'Finished' };

export const invoiceCode = (id) => `INV-${String(id).padStart(6, '0')}`;

function serializeOrder(o, items = []) {
  return {
    id: o.id,
    invoice: invoiceCode(o.id),
    orderNo: o.order_no,
    customerName: o.customer_name,
    diningMethod: o.dining_method,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentMode: o.payment_mode,
    amountReceived: o.amount_received === null ? null : Number(o.amount_received),
    changeGiven: o.change_given === null ? null : Number(o.change_given),
    subtotal: Number(o.subtotal),
    taxRate: Number(o.tax_rate),
    taxAmount: Number(o.tax_amount),
    total: Number(o.total),
    notes: o.notes,
    cancelReason: o.cancel_reason,
    createdAt: o.created_at,
    completedAt: o.completed_at,
    createdBy: o.created_by_name || null,
    nextStatus: NEXT_STATUS[o.status] || null,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
    })),
  };
}

async function attachItems(orders, db = pool) {
  if (orders.length === 0) return [];
  const [items] = await db.query('SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id', [orders.map((o) => o.id)]);
  return orders.map((o) => serializeOrder(o, items.filter((i) => i.order_id === o.id)));
}

const ORDER_SELECT = `SELECT o.*, u.display_name AS created_by_name
                      FROM orders o LEFT JOIN users u ON u.id = o.created_by`;

async function getOrder(id, db = pool) {
  const [rows] = await db.query(`${ORDER_SELECT} WHERE o.id = ?`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Order not found');
  return (await attachItems(rows, db))[0];
}

function buildFilters(query) {
  const where = [];
  const params = [];
  const search = cleanText(query.search, 100);
  if (search) {
    const digits = search.replace(/\D/g, '');
    if (digits) {
      where.push('(o.customer_name LIKE ? OR o.id = ?)');
      params.push(`%${search}%`, Number(digits));
    } else {
      where.push('o.customer_name LIKE ?');
      params.push(`%${search}%`);
    }
  }
  if (STATUSES.includes(query.status)) {
    where.push('o.status = ?');
    params.push(query.status);
  }
  if (PAYMENTS.includes(query.payment)) {
    where.push('o.payment_method = ?');
    params.push(query.payment);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.date || '')) {
    where.push('DATE(o.created_at) = ?');
    params.push(query.date);
  }
  return { where, params };
}

// Orders screen: every order that is not Finished or Cancelled yet.
router.get('/active', wrap(async (req, res) => {
  const { where, params } = buildFilters(req.query);
  where.unshift(`o.status IN ('New Order','Preparing','Ready to Serve')`);
  const [rows] = await pool.query(`${ORDER_SELECT} WHERE ${where.join(' AND ')} ORDER BY o.created_at ASC`, params);
  res.json(await attachItems(rows));
}));

// History: every order ever made, newest first, with paging.
router.get('/history', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 15;
  const { where, params } = buildFilters(req.query);
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${clause}`, params);
  const [rows] = await pool.query(
    `${ORDER_SELECT} ${clause} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  res.json({ rows: await attachItems(rows), total, page, pageSize });
}));

router.get('/:id', wrap(async (req, res) => {
  res.json(await getOrder(req.params.id));
}));

router.post('/', wrap(async (req, res) => {
  const input = parseOrderInput(req.body);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Same checkout sent twice (double click, retry) returns the first order instead of a duplicate.
      if (input.idempotencyKey) {
        const [dup] = await conn.query('SELECT id FROM orders WHERE idempotency_key = ?', [input.idempotencyKey]);
        if (dup[0]) {
          await conn.commit();
          return res.status(200).json(await getOrder(dup[0].id));
        }
      }

      // Prices always come from the database, never from the browser.
      const [products] = await conn.query(
        'SELECT id, name, price, status FROM products WHERE id IN (?) AND deleted_at IS NULL',
        [input.items.map((i) => i.productId)]
      );
      const byId = new Map(products.map((p) => [p.id, p]));
      const lines = input.items.map((i) => {
        const p = byId.get(i.productId);
        if (!p) throw new HttpError(400, 'A product in this order no longer exists');
        if (p.status !== 'active') throw new HttpError(400, `${p.name} is not available`);
        const unitCents = toCents(p.price);
        return { productId: p.id, name: p.name, unitCents, quantity: i.quantity };
      });

      const totals = calcTotals(lines, config.taxRate);
      let changeCents = null;
      let receivedCents = null;
      if (input.paymentMethod === 'Cash') {
        receivedCents = toCents(input.amountReceived);
        if (receivedCents < totals.totalCents) throw new HttpError(400, 'Cash received is less than the total');
        changeCents = receivedCents - totals.totalCents;
      }

      const [[{ nextNo }]] = await conn.query(
        'SELECT COALESCE(MAX(order_no), 0) + 1 AS nextNo FROM orders WHERE order_date = CURDATE() FOR UPDATE'
      );
      const [result] = await conn.query(
        `INSERT INTO orders (order_date, order_no, customer_name, dining_method, payment_method, payment_mode,
                             amount_received, change_given, subtotal, tax_rate, tax_amount, total, notes,
                             idempotency_key, created_by)
         VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextNo, input.customerName, input.diningMethod, input.paymentMethod,
          input.paymentMethod === 'Cash' ? 'cash' : 'manual_confirmation',
          receivedCents === null ? null : fromCents(receivedCents),
          changeCents === null ? null : fromCents(changeCents),
          fromCents(totals.subtotalCents), config.taxRate, fromCents(totals.taxCents), fromCents(totals.totalCents),
          input.notes, input.idempotencyKey, req.user.id,
        ]
      );
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES ?',
        [lines.map((l) => [result.insertId, l.productId, l.name, fromCents(l.unitCents), l.quantity, fromCents(l.unitCents * l.quantity)])]
      );

      await conn.commit();
      return res.status(201).json(await getOrder(result.insertId));
    } catch (err) {
      await conn.rollback();
      const retryable = err.code === 'ER_DUP_ENTRY' || err.code === 'ER_LOCK_DEADLOCK';
      if (retryable && attempt < 3) continue; // two cashiers got the same queue number: try again
      throw err;
    } finally {
      conn.release();
    }
  }
}));

// Change customer name / notes. Only while the order is still active.
router.patch('/:id', wrap(async (req, res) => {
  const customerName = cleanText(req.body?.customerName, 100) || null;
  const notes = cleanText(req.body?.notes, 500) || null;
  const [result] = await pool.query(
    "UPDATE orders SET customer_name = ?, notes = ? WHERE id = ? AND status IN ('New Order','Preparing')",
    [customerName, notes, req.params.id]
  );
  if (result.affectedRows === 0) throw new HttpError(409, 'Only New Order or Preparing orders can be edited');
  res.json(await getOrder(req.params.id));
}));

router.post('/:id/advance', wrap(async (req, res) => {
  const order = await getOrder(req.params.id);
  // The screen says which status it was looking at, so a stale screen cannot skip a step.
  if (req.body?.from && req.body.from !== order.status) {
    throw new HttpError(409, 'This order was just updated by someone else. Refresh and try again');
  }
  const next = NEXT_STATUS[order.status];
  if (!next) throw new HttpError(409, `An order that is "${order.status}" cannot move forward`);
  // "AND status = ?" makes sure two people clicking at once cannot skip a step.
  const [result] = await pool.query(
    'UPDATE orders SET status = ?, completed_at = IF(? = "Finished", NOW(), NULL) WHERE id = ? AND status = ?',
    [next, next, order.id, order.status]
  );
  if (result.affectedRows === 0) throw new HttpError(409, 'This order was just updated by someone else. Refresh and try again');
  res.json(await getOrder(order.id));
}));

// Admins and cashiers can both cancel. A short reason is required.
router.post('/:id/cancel', wrap(async (req, res) => {
  const reason = cleanText(req.body?.reason, 255);
  if (reason.length < 3) throw new HttpError(400, 'Please enter a reason for cancelling');
  const [result] = await pool.query(
    "UPDATE orders SET status = 'Cancelled', cancel_reason = ?, completed_at = NOW() WHERE id = ? AND status IN ('New Order','Preparing')",
    [reason, req.params.id]
  );
  if (result.affectedRows === 0) throw new HttpError(409, 'Only New Order or Preparing orders can be cancelled');
  res.json(await getOrder(req.params.id));
}));

export { attachItems, ORDER_SELECT };
export default router;
