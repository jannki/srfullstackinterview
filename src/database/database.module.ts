import { Module, Global } from '@nestjs/common';
import { createDatabase, DatabaseType } from './database';
import { initializeDatabase } from './init';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: async (): Promise<DatabaseType> => {
        return await initializeDatabase();
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}