require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) { console.log('NO DATABASE_URL set'); process.exit(1); }

console.log('Host:', new URL(url).hostname);

const isCloud = url.match(/neon|supabase|railway|render|cockroach/i);
const pool = new Pool({
  connectionString: url,
  ssl: isCloud ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT 1 AS ok')
  .then(r => { console.log('DB connection OK:', r.rows[0]); pool.end(); })
  .catch(e => { console.error('DB connection FAILED:', e.message); pool.end(); });
