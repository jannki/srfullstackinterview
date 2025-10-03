import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { ChatService } from './chat.service';

type MessageRecord = typeof schema.messages.$inferSelect;
type MessageLikeRecord = typeof schema.messageLikes.$inferSelect;

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

    return this.formatMessage(message, []);
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
    const messageIds = messages.map((message) => message.id);
    const likes =
      messageIds.length > 0
        ? await this.db
            .select()
            .from(schema.messageLikes)
            .where(inArray(schema.messageLikes.messageId, messageIds))
        : [];
    const likesByMessage = new Map<number, MessageLikeRecord[]>();
    for (const like of likes) {
      const bucket = likesByMessage.get(like.messageId) ?? [];
      bucket.push(like);
      likesByMessage.set(like.messageId, bucket);
    }
    return messages.map((message: MessageRecord) =>
      this.formatMessage(message, likesByMessage.get(message.id) ?? []),
    );
  }

  async getMessage(messageId: number) {
    const message = await this.db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    const likes = await this.db.query.messageLikes.findMany({
      where: eq(schema.messageLikes.messageId, messageId),
    });
    return this.formatMessage(message, likes);
  }

  async likeMessage(chatId: number, messageId: number, userId: number) {
    const chat = await this.chatService.assertParticipant(chatId, userId);
    const message = await this.db.query.messages.findFirst({
      where: and(
        eq(schema.messages.id, messageId),
        eq(schema.messages.chatId, chat.id),
      ),
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.db
      .insert(schema.messageLikes)
      .values({
        messageId,
        userId,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoNothing({
        target: [schema.messageLikes.messageId, schema.messageLikes.userId],
      });
    return this.getMessage(messageId);
  }

  private formatMessage(message: MessageRecord, likes: MessageLikeRecord[]) {
    return {
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      likes: likes
        .map((like) => ({
          userId: like.userId,
          createdAt: like.createdAt,
        }))
        .sort((a, b) => a.createdAt - b.createdAt),
    };
  }
}
