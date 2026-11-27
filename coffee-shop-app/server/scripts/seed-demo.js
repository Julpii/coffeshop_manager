// DEMO DATA ONLY: sample users, categories and products so you can try the app.
// Run: npm run db:seed-demo   (safe to run again; it skips things that already exist)
// Set DEMO_PASSWORD in the environment to choose the password, otherwise a random one is printed once.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const password = process.env.DEMO_PASSWORD || crypto.randomBytes(5).toString('hex');
const hash = await bcrypt.hash(password, 10);

const [{ affectedRows: usersAdded }] = await pool.query(
  'INSERT IGNORE INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?), (?,?,?,?)',
  ['admin', hash, 'Demo Admin', 'admin', 'cashier', hash, 'Demo Cashier', 'cashier']
);

const categories = ['Coffee', 'Non-Coffee', 'Pastries', 'Desserts'];
for (const name of categories) await pool.query('INSERT IGNORE INTO categories (name) VALUES (?)', [name]);
const [cats] = await pool.query('SELECT id, name FROM categories');
const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

// Prices are made-up examples in RM.
const products = [
  ['DEMO-001', 'Espresso', 'Coffee', 7.0, 'Double shot'],
  ['DEMO-002', 'Americano', 'Coffee', 8.0, 'Espresso with hot water'],
  ['DEMO-003', 'Cappuccino', 'Coffee', 10.0, 'Equal parts espresso, milk, foam'],
  ['DEMO-004', 'Iced Latte', 'Coffee', 11.0, 'Espresso with cold milk'],
  ['DEMO-005', 'Matcha Latte', 'Non-Coffee', 12.0, 'Matcha with steamed milk'],
  ['DEMO-006', 'Hot Chocolate', 'Non-Coffee', 10.0, 'Rich cocoa with milk'],
  ['DEMO-007', 'Butter Croissant', 'Pastries', 8.0, 'Baked fresh daily'],
  ['DEMO-008', 'Blueberry Muffin', 'Pastries', 7.5, 'Soft and fruity'],
  ['DEMO-009', 'Cheesecake Slice', 'Desserts', 13.0, 'Classic baked cheesecake'],
];
for (const [code, name, category, price, description] of products) {
  await pool.query(
    'INSERT IGNORE INTO products (code, name, category_id, price, description) VALUES (?,?,?,?,?)',
    [code, name, cat[category], price, description]
  );
}

console.log('Demo data ready.');
if (usersAdded > 0) console.log(`Demo logins: admin / cashier  -  password: ${password}  (change or remove these before real use)`);
else console.log('Demo users already existed, so passwords were not changed.');
await pool.end();
