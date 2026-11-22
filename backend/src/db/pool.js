import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const config = {
  connectionString,
  connectionTimeoutMillis: 15000, // 15 seconds for serverless wake-up
};

if (connectionString && connectionString.includes('sslmode=require')) {
  config.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(config);

export const query = (text, params) => pool.query(text, params);
