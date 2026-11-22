import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { runMigrations } from './db/migrate.js';

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    `FATAL: Missing required environment variable(s): ${missingVars.join(', ')}.\n` +
    'Please check your .env configuration.'
  );
  process.exit(1);
}

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // 1. Run migrations idempotently on boot
    await runMigrations();

    // 2. Start Express listener
    app.listen(PORT, () => {
      console.log(`Joineazy API server listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
