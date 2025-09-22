import { TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/services/auth.service';
import { InvitationService } from '../../src/services/invitation.service';
import { PlanService } from '../../src/services/plan.service';
import { MessageService } from '../../src/services/message.service';
import { SurveyService } from '../../src/services/survey.service';
import { AttachmentService } from '../../src/services/attachment.service';
import { createServicesTestingModule } from './test-helpers';

describe('Chat and Message Services', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let invitationService: InvitationService;
  let planService: PlanService;
  let messageService: MessageService;
  let surveyService: SurveyService;
  let attachmentService: AttachmentService;

  beforeEach(async () => {
    moduleRef = await createServicesTestingModule();
    authService = moduleRef.get(AuthService);
    invitationService = moduleRef.get(InvitationService);
    planService = moduleRef.get(PlanService);
    messageService = moduleRef.get(MessageService);
    surveyService = moduleRef.get(SurveyService);
    attachmentService = moduleRef.get(AttachmentService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  async function setupChat() {
    const trainer = await authService.registerTrainer({
      email: 'chat-trainer@example.com',
      password: 'password123',
      fullName: 'Chat Trainer',
      phoneNumber: '1010101010',
    });
    const trainee = await authService.registerTrainee({
      email: 'chat-trainee@example.com',
      password: 'password456',
      fullName: 'Chat Trainee',
      phoneNumber: '2020202020',
    });
    const plan = await planService.createPlan(trainer.user.id, {
      name: 'Chat Plan',
      description: 'Plan for chat tests',
      priceCents: 5000,
    });
    const invitation = await invitationService.createInvitation(trainer.user.id, '2020202020');
    const acceptance = await invitationService.acceptInvitation(invitation.token, trainee.user.id, plan.id);
    return { trainer, trainee, chatId: acceptance.chat.id };
  }

  it('sends text and image messages', async () => {
    const { trainer, trainee, chatId } = await setupChat();

    const text = await messageService.sendMessage(chatId, trainer.user.id, {
      type: 'text',
      textContent: 'Hello trainee',
    });
    expect(text.textContent).toEqual('Hello trainee');

    const image = await attachmentService.sendImage(chatId, trainee.user.id, 'https://example.com/img.png', 'Progress');
    expect(image.mediaUrl).toContain('img.png');

    const messages = await messageService.listMessages(chatId, trainee.user.id, 10);
    expect(messages.length).toBeGreaterThanOrEqual(2);
  });

  it('handles survey responses in chat', async () => {
    const { trainer, trainee, chatId } = await setupChat();
    const survey = await messageService.sendMessage(chatId, trainer.user.id, {
      type: 'survey',
      textContent: 'Weekly check-in',
      metadata: { questions: ['How was your week?'] },
    });

    const response = await surveyService.recordResponse(survey.id, trainee.user.id, {
      answer: 'Great',
    });
    expect(response.answers.answer).toEqual('Great');

    const responses = await surveyService.listResponses(survey.id, trainer.user.id);
    expect(responses.length).toEqual(1);
  });

  it('allows both participants to like messages and includes likes when listing', async () => {
    const { trainer, trainee, chatId } = await setupChat();

    const text = await messageService.sendMessage(chatId, trainer.user.id, {
      type: 'text',
      textContent: 'Like this message',
    });

    const firstLike = await messageService.likeMessage(chatId, text.id, trainee.user.id);
    expect(firstLike.likes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: trainee.user.id }),
      ]),
    );

    const secondLike = await messageService.likeMessage(chatId, text.id, trainer.user.id);
    expect(secondLike.likes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: trainer.user.id }),
        expect.objectContaining({ userId: trainee.user.id }),
      ]),
    );

    // liking again should not duplicate entries
    await messageService.likeMessage(chatId, text.id, trainee.user.id);

    const messages = await messageService.listMessages(chatId, trainee.user.id, 5);
    const likedMessage = messages.find((message) => message.id === text.id);
    expect(likedMessage).toBeDefined();
    expect(likedMessage?.likes).toHaveLength(2);
    expect(likedMessage?.likes.map((like) => like.userId)).toEqual(
      expect.arrayContaining([trainer.user.id, trainee.user.id]),
    );
  });
});
