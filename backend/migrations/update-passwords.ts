import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env';

async function updatePasswords() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
  });

  try {
    console.log('🔄 Generating password hash...');
    
    // Hash the password "Flipick@2025"
    const password = 'Flipick@2025';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('🔄 Updating passwords in database...');
    
    // Update all three users with the correct hash
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email IN ($2, $3, $4)',
      [hash, 'admin@flipick.com', 'admin@demo.com', 'user@demo.com']
    );
    
    console.log('✅ Passwords updated successfully!');
    console.log('\nYou can now login with:');
    console.log('Email: admin@flipick.com');
    console.log('Password: Flipick@2025');
    
  } catch (error) {
    console.error('❌ Failed to update passwords:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updatePasswords();
