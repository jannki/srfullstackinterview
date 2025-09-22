import { TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/services/auth.service';
import { InvitationService } from '../../src/services/invitation.service';
import { PlanService } from '../../src/services/plan.service';
import { ChatService } from '../../src/services/chat.service';
import { TraineeService } from '../../src/services/trainee.service';
import { createServicesTestingModule } from './test-helpers';

describe('InvitationService', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let invitationService: InvitationService;
  let planService: PlanService;
  let chatService: ChatService;
  let traineeService: TraineeService;

  beforeEach(async () => {
    moduleRef = await createServicesTestingModule();
    authService = moduleRef.get(AuthService);
    invitationService = moduleRef.get(InvitationService);
    planService = moduleRef.get(PlanService);
    chatService = moduleRef.get(ChatService);
    traineeService = moduleRef.get(TraineeService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates invitation and accepts flow linking trainee to trainer', async () => {
    const trainer = await authService.registerTrainer({
      email: 'invite-trainer@example.com',
      password: 'password123',
      fullName: 'Invite Trainer',
      phoneNumber: '1111111111',
    });
    const trainee = await authService.registerTrainee({
      email: 'invite-trainee@example.com',
      password: 'password456',
      fullName: 'Invite Trainee',
      phoneNumber: '2222222222',
    });
    const plan = await planService.createPlan(trainer.user.id, {
      name: 'Invite Plan',
      description: 'Invitation based plan',
      priceCents: 8000,
    });

    const invitation = await invitationService.createInvitation(trainer.user.id, '2222222222');
    const acceptance = await invitationService.acceptInvitation(invitation.token, trainee.user.id, plan.id);

    expect(acceptance.invitation.status).toEqual('accepted');
    expect(acceptance.invitation.selectedPlanId).toEqual(plan.id);

    const chats = await chatService.listChatsForTrainer(trainer.user.id);
    expect(chats.length).toBeGreaterThan(0);

    const traineeProfile = await traineeService.getTraineeProfile(trainee.user.id);
    expect(traineeProfile.invitedByTrainerId).toEqual(trainer.user.id);
  });
});
