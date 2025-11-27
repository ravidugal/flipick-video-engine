// backend/src/config/database.js
// PostgreSQL connection for GCP Cloud SQL

const { Pool } = require('pg');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'flipick_video_studio',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(config);

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text: text.substring(0, 50), error: error.message });
    throw error;
  }
};

const getClient = async () => {
  return await pool.connect();
};

const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now, current_database() as database');
    console.log('✅ Database connection test successful');
    console.log('   Time:', result.rows[0].now);
    console.log('   Database:', result.rows[0].database);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

module.exports = {
  query,
  getClient,
  pool,
  testConnection
};
