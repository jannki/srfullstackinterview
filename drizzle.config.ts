import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './database.sqlite',
  },
} satisfies Config;