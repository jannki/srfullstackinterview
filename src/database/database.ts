import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

export const createDatabase = (path: string = './database.sqlite') => {
  const sqlite = new Database(path);
  return drizzle(sqlite, { schema });
};

export type DatabaseType = ReturnType<typeof createDatabase>;
export { schema };