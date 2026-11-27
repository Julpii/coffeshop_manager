import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // dates come back as plain "YYYY-MM-DD HH:MM:SS" strings (no time zone surprises)
});

// Every connection uses the shop's time zone, so NOW() and CURDATE() mean "shop time".
pool.pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${config.timezone}'`);
});
