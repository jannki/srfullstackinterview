import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { and, eq, or } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';

@Injectable()
export class ChatService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: DatabaseType) {}

  async ensureChat(trainerId: number, traineeId: number) {
    const existing = await this.db.query.chats.findFirst({
      where: and(eq(schema.chats.trainerId, trainerId), eq(schema.chats.traineeId, traineeId)),
    });
    if (existing) {
      return existing;
    }
    const now = Math.floor(Date.now() / 1000);
    const [chat] = await this.db
      .insert(schema.chats)
      .values({
        trainerId,
        traineeId,
        status: 'active',
        createdAt: now,
        lastMessageAt: now,
      })
      .returning();
    return chat;
  }

  async listChatsForTrainer(trainerId: number) {
    return this.db.query.chats.findMany({
      where: eq(schema.chats.trainerId, trainerId),
    });
  }

  async listChatsForTrainee(traineeId: number) {
    return this.db.query.chats.findMany({
      where: eq(schema.chats.traineeId, traineeId),
    });
  }

  async assertParticipant(chatId: number, userId: number) {
    const chat = await this.db.query.chats.findFirst({ where: eq(schema.chats.id, chatId) });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (chat.trainerId !== userId && chat.traineeId !== userId) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  async getChat(chatId: number) {
    const chat = await this.db.query.chats.findFirst({ where: eq(schema.chats.id, chatId) });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  async isParticipant(chatId: number, userId: number) {
    const chat = await this.db.query.chats.findFirst({
      where: and(
        eq(schema.chats.id, chatId),
        or(eq(schema.chats.trainerId, userId), eq(schema.chats.traineeId, userId)),
      ),
    });
    return Boolean(chat);
  }
}
