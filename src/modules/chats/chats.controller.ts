import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from '../../services/chat.service';
import { MessageService } from '../../services/message.service';
import { AttachmentService } from '../../services/attachment.service';
import { SurveyService } from '../../services/survey.service';
import { ZodValidationPipe } from '../../common/validators/zod-validation.pipe';

const textOrSurveyMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    textContent: z.string().min(1),
  }),
  z.object({
    type: z.literal('survey'),
    textContent: z.string().optional(),
    metadata: z.record(z.string(), z.any()),
  }),
]);

const imageMessageSchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().optional(),
});

const surveyResponseSchema = z.object({
  answers: z.record(z.string(), z.any()),
});

@Controller('chats')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly attachmentService: AttachmentService,
    private readonly surveyService: SurveyService,
  ) {}

  @Get()
  listChats(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === 'trainer') {
      return this.chatService.listChatsForTrainer(user.id);
    }
    return this.chatService.listChatsForTrainee(user.id);
  }

  @Get(':chatId/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    const safeLimit = parsed && !Number.isNaN(parsed) ? parsed : undefined;
    return this.messageService.listMessages(chatId, user.id, safeLimit);
  }

  @Post(':chatId/messages')
  @UsePipes(new ZodValidationPipe(textOrSurveyMessageSchema))
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: z.infer<typeof textOrSurveyMessageSchema>,
  ) {
    if (body.type === 'text') {
      return this.messageService.sendMessage(chatId, user.id, {
        type: 'text',
        textContent: body.textContent,
      });
    }
    return this.messageService.sendMessage(chatId, user.id, {
      type: 'survey',
      textContent: body.textContent,
      metadata: body.metadata,
    });
  }

  @Post(':chatId/messages/image')
  @UsePipes(new ZodValidationPipe(imageMessageSchema))
  sendImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: z.infer<typeof imageMessageSchema>,
  ) {
    return this.attachmentService.sendImage(chatId, user.id, body.mediaUrl, body.caption);
  }

  @Post(':chatId/messages/:messageId/responses')
  @UsePipes(new ZodValidationPipe(surveyResponseSchema))
  respondSurvey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() body: z.infer<typeof surveyResponseSchema>,
  ) {
    return this.surveyService.recordResponse(messageId, user.id, body.answers);
  }

  @Get(':chatId/messages/:messageId/responses')
  listSurveyResponses(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.surveyService.listResponses(messageId, user.id);
  }
}
