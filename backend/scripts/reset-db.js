import { pool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';

async function resetDatabase() {
  console.log('Resetting Joineazy database...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS submissions CASCADE;
      DROP TABLE IF EXISTS assignment_groups CASCADE;
      DROP TABLE IF EXISTS assignments CASCADE;
      DROP TABLE IF EXISTS group_members CASCADE;
      DROP TABLE IF EXISTS groups CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    await client.query('COMMIT');
    console.log('Tables dropped.');

    console.log('Re-running migrations...');
    await runMigrations();

    console.log('Re-seeding initial dataset...');
    await seedDatabase();

    console.log('Database reset complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

resetDatabase();
