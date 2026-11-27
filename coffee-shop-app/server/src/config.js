import 'dotenv/config';

const missing = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
  process.exit(1);
}

const timezone = process.env.DB_TIMEZONE || '+08:00';
if (!/^[+-]\d{2}:\d{2}$/.test(timezone)) {
  console.error('DB_TIMEZONE must look like +08:00');
  process.exit(1);
}

const taxRate = Number(process.env.TAX_RATE ?? 0);
if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
  console.error('TAX_RATE must be a number between 0 and 100');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  timezone,
  jwtSecret: process.env.JWT_SECRET,
  taxRate,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
