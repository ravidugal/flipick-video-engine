import { Pool } from 'pg';
import { config } from './env';

// Database connection pool
export const pool = new Pool({
  host: '127.0.0.1', // Connect via Cloud SQL Proxy
  port: 5432,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

export default pool;
