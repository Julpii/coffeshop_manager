// Creates a login. Run: npm run create-user -- <username> <admin|cashier> "<Display Name>"
// The password is asked for after you press Enter (so it does not stay in your shell history).
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const [username, role, displayName] = process.argv.slice(2);
if (!username || !['admin', 'cashier'].includes(role) || !displayName) {
  console.error('Usage: npm run create-user -- <username> <admin|cashier> "<Display Name>"');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Password (at least 8 characters): ');
rl.close();
if (password.length < 8) {
  console.error('Password is too short.');
  process.exit(1);
}

try {
  await pool.query('INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)', [
    username, await bcrypt.hash(password, 10), displayName, role,
  ]);
  console.log(`Created ${role} "${username}".`);
} catch (err) {
  console.error(err.code === 'ER_DUP_ENTRY' ? 'That username already exists.' : err.message);
  process.exitCode = 1;
}
await pool.end();
