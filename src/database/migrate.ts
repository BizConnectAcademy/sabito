import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../logger.js';

const connection = await mysql.createConnection({
  uri: env.DATABASE_URL,
  multipleStatements: true,
});

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const directory = resolve(process.cwd(), 'migrations');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT name FROM schema_migrations WHERE name = ? LIMIT 1',
      [file],
    );
    if (rows.length > 0) continue;

    const sql = await readFile(resolve(directory, file), 'utf8');
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      await connection.commit();
      logger.info({ migration: file }, 'Database migration applied');
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
