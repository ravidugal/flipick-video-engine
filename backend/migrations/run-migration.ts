import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../src/config/env';

async function runMigration() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
  });

  try {
    console.log('🔄 Connecting to database...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '001_multi_tenant_auth.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration...');
    
    // Run migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nDefault credentials:');
    console.log('Super Admin: admin@flipick.com / Flipick@2025');
    console.log('Demo Admin:  admin@demo.com / Flipick@2025');
    console.log('Demo User:   user@demo.com / Flipick@2025');
    console.log('\n⚠️  IMPORTANT: Change these passwords after first login!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
