import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export const db = mysql.createPool({
  uri: env.DATABASE_URL,
  connectionLimit: 10,
  enableKeepAlive: true,
  timezone: 'Z',
  charset: 'utf8mb4',
});

export async function closeDatabase(): Promise<void> {
  await db.end();
}
