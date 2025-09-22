import { Injectable, Inject } from '@nestjs/common';
import { DatabaseType, schema } from '../database/database';
import { DATABASE_CONNECTION } from '../database/database.module';

export interface HelloResponse {
  message: string;
  timestamp: Date;
}

@Injectable()
export class HelloService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: DatabaseType) {}

  async getHello(): Promise<HelloResponse> {
    const message = 'Hello, World!';
    const timestamp = new Date();

    // Store greeting in database
    await this.db.insert(schema.greetings).values({
      message,
      createdAt: timestamp,
    });

    return {
      message,
      timestamp,
    };
  }

  async getGreetingsCount(): Promise<number> {
    const result = await this.db.select().from(schema.greetings);
    return result.length;
  }
}