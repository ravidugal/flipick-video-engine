import { Pool } from 'pg';
import { config } from './env';

// Database connection pool with improved stability settings
export const pool = new Pool({
  host: '127.0.0.1', // Connect via Cloud SQL Proxy
  port: 5432,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20,
  min: 2, // Keep minimum 2 connections alive
  idleTimeoutMillis: 60000, // Close idle connections after 60 seconds (increased from 30s)
  connectionTimeoutMillis: 10000, // Wait up to 10 seconds for connection (increased from 2s)
  allowExitOnIdle: false, // Don't exit when all connections are idle
  keepAlive: true, // Enable TCP keepalive
  keepAliveInitialDelayMillis: 10000, // Send keepalive after 10 seconds of inactivity
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