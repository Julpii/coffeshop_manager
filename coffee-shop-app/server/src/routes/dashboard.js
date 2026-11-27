import { Router } from 'express';
import { pool } from '../db.js';
import { wrap } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { attachItems, ORDER_SELECT } from './orders.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// Cancelled orders never count as sales. "Pending" = New Order + Preparing.
// "Week" = the last 7 days including today. "Top sellers" = this calendar month.
router.get('/', wrap(async (req, res) => {
  const [[now]] = await pool.query('SELECT CURDATE() AS today, NOW() AS now');
  const [[today]] = await pool.query(
    "SELECT COALESCE(SUM(total),0) AS sales, COUNT(*) AS transactions FROM orders WHERE DATE(created_at) = CURDATE() AND status <> 'Cancelled'"
  );
  const [[pending]] = await pool.query("SELECT COUNT(*) AS n FROM orders WHERE status IN ('New Order','Preparing')");

  const [weekRows] = await pool.query(
    "SELECT DATE(created_at) AS d, SUM(total) AS s FROM orders WHERE created_at >= CURDATE() - INTERVAL 6 DAY AND status <> 'Cancelled' GROUP BY DATE(created_at)"
  );
  const sales = new Map(weekRows.map((r) => [r.d, Number(r.s)]));
  const weekly = [];
  const base = new Date(`${now.today}T00:00:00Z`);
  for (let i = 6; i >= 0; i--) {
    const day = new Date(base);
    day.setUTCDate(base.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    weekly.push({ date: key, sales: sales.get(key) || 0 });
  }

  const [top] = await pool.query(
    `SELECT oi.product_name AS name, SUM(oi.quantity) AS quantity
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status <> 'Cancelled' AND o.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
     GROUP BY oi.product_name ORDER BY quantity DESC, name LIMIT 5`
  );
  const [recent] = await pool.query(`${ORDER_SELECT} ORDER BY o.created_at DESC, o.id DESC LIMIT 8`);

  res.json({
    now: now.now,
    todaySales: Number(today.sales),
    todayTransactions: today.transactions,
    pendingOrders: pending.n,
    weekly,
    topProducts: top.map((t) => ({ name: t.name, quantity: Number(t.quantity) })),
    recentOrders: await attachItems(recent),
  });
}));

export default router;
