import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { and, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { ChatService } from './chat.service';

type SurveyResponseRecord = typeof schema.surveyResponses.$inferSelect;

@Injectable()
export class SurveyService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DatabaseType,
    private readonly chatService: ChatService,
  ) {}

  async recordResponse(messageId: number, responderId: number, answers: Record<string, unknown>) {
    const message = await this.db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
    });
    if (!message) {
      throw new NotFoundException('Survey message not found');
    }
    if (message.type !== 'survey') {
      throw new ForbiddenException('Cannot respond to non-survey message');
    }
    const isParticipant = await this.chatService.isParticipant(message.chatId, responderId);
    if (!isParticipant) {
      throw new ForbiddenException('Not allowed to respond to this survey');
    }
    await this.db
      .delete(schema.surveyResponses)
      .where(
        and(
          eq(schema.surveyResponses.messageId, messageId),
          eq(schema.surveyResponses.responderUserId, responderId),
        ),
      );
    const [response] = await this.db
      .insert(schema.surveyResponses)
      .values({
        messageId,
        responderUserId: responderId,
        answers: JSON.stringify(answers),
        submittedAt: Math.floor(Date.now() / 1000),
      })
      .returning();
    return {
      ...response,
      answers: JSON.parse(response.answers),
    };
  }

  async listResponses(messageId: number, requesterId: number) {
    const message = await this.db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
    });
    if (!message) {
      throw new NotFoundException('Survey message not found');
    }
    const chat = await this.db.query.chats.findFirst({
      where: eq(schema.chats.id, message.chatId),
    });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (chat.trainerId !== requesterId && chat.traineeId !== requesterId) {
      throw new ForbiddenException('Not allowed to view survey responses');
    }
    const responses = await this.db.query.surveyResponses.findMany({
      where: eq(schema.surveyResponses.messageId, messageId),
    });
    return responses.map((response: SurveyResponseRecord) => ({
      ...response,
      answers: JSON.parse(response.answers),
    }));
  }
}
