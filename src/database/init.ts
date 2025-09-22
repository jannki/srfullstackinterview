import { createDatabase, schema } from './database';
import { sql } from 'drizzle-orm';

export async function initializeDatabase() {
  const db = createDatabase();
  
  // Create tables if they don't exist
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS greetings (
      id INTEGER PRIMARY KEY,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  
  return db;
}