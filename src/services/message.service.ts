import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { ChatService } from './chat.service';

type MessageRecord = typeof schema.messages.$inferSelect;

export type MessageInput = {
  type: 'text' | 'image' | 'survey';
  textContent?: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class MessageService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DatabaseType,
    private readonly chatService: ChatService,
  ) {}

  async sendMessage(chatId: number, senderUserId: number, input: MessageInput) {
    const chat = await this.chatService.assertParticipant(chatId, senderUserId);
    if (input.type === 'text' && !input.textContent) {
      throw new BadRequestException('Text message requires content');
    }
    if (input.type === 'image' && !input.mediaUrl) {
      throw new BadRequestException('Image message requires media url');
    }
    if (input.type === 'survey' && !input.metadata) {
      throw new BadRequestException('Survey message requires metadata');
    }
    const now = Math.floor(Date.now() / 1000);
    const [message] = await this.db
      .insert(schema.messages)
      .values({
        chatId,
        senderUserId,
        type: input.type,
        textContent: input.textContent ?? null,
        mediaUrl: input.mediaUrl ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt: now,
      })
      .returning();

    await this.db
      .update(schema.chats)
      .set({ lastMessageAt: now })
      .where(eq(schema.chats.id, chat.id));

    return {
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
    };
  }

  async listMessages(chatId: number, userId: number, limit = 50) {
    const isParticipant = await this.chatService.isParticipant(chatId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('Not allowed to view messages');
    }
    const messages = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.chatId, chatId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);
    return messages.map((message: MessageRecord) => ({
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
    }));
  }

  async getMessage(messageId: number) {
    const message = await this.db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return {
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
    };
  }
}
