// Creates the database (if needed) and all tables. Run: npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';

const schema = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../sql/schema.sql'), 'utf8');
const { database, ...connection } = config.db;

const conn = await mysql.createConnection({ ...connection, multipleStatements: true });
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE \`${database}\``);
await conn.query(schema);
await conn.query(
  "ALTER TABLE orders MODIFY status ENUM('New Order','Preparing','Ready to Serve','Finished','Cancelled') NOT NULL DEFAULT 'New Order'"
);
await conn.end();
console.log(`Database "${database}" is ready.`);
