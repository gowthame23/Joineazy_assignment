import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/db/pool.js';

async function verifyEnvironment() {
  console.log('Running pre-flight environment checks...');

  const checks = [
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET },
    { name: 'ADMIN_INVITE_CODE', value: process.env.ADMIN_INVITE_CODE },
    { name: 'PORT', value: process.env.PORT || '4000' },
  ];

  let hasErrors = false;

  for (const check of checks) {
    if (!check.value) {
      console.error(`  FAIL: Missing required environment variable: ${check.name}`);
      hasErrors = true;
    } else {
      console.log(`  PASS: ${check.name} is configured.`);
    }
  }

  try {
    console.log('Testing PostgreSQL connectivity...');
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS current_time');
    client.release();
    console.log(`  PASS: Database connection successful! (DB Time: ${res.rows[0].current_time})`);
  } catch (err) {
    console.error(`  FAIL: Database connection failed:`, err.message);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\nEnvironment verification failed. Please review your configuration.');
    process.exit(1);
  } else {
    console.log('\nAll environment checks passed successfully!');
    process.exit(0);
  }
}

verifyEnvironment();
