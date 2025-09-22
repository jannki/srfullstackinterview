import { TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/services/auth.service';
import { PlanService } from '../../src/services/plan.service';
import { InvitationService } from '../../src/services/invitation.service';
import { createServicesTestingModule } from './test-helpers';

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let planService: PlanService;
  let invitationService: InvitationService;

  beforeEach(async () => {
    moduleRef = await createServicesTestingModule();
    authService = moduleRef.get(AuthService);
    planService = moduleRef.get(PlanService);
    invitationService = moduleRef.get(InvitationService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('registers trainer and creates default plan', async () => {
    const result = await authService.registerTrainer({
      email: 'trainer@example.com',
      password: 'password123',
      fullName: 'Test Trainer',
      phoneNumber: '1234567890',
    });

    expect(result.user.id).toBeDefined();
    expect(result.user.role).toEqual('trainer');
    const plans = await planService.listPlansForTrainer(result.user.id);
    expect(plans.length).toBeGreaterThan(0);
  });

  it('registers trainee and supports login + refresh', async () => {
    await authService.registerTrainer({
      email: 'trainer@example.com',
      password: 'password123',
      fullName: 'Test Trainer',
      phoneNumber: '1234567890',
    });
    const trainee = await authService.registerTrainee({
      email: 'trainee@example.com',
      password: 'password456',
      fullName: 'Trainee User',
      phoneNumber: '5550000000',
    });

    const login = await authService.login('trainee@example.com', 'password456');
    expect(login.tokens.accessToken).toBeDefined();

    const refreshed = await authService.refresh(trainee.user.id, login.tokens.refreshToken);
    expect(refreshed.tokens.accessToken).toBeDefined();
    expect(refreshed.tokens.refreshToken).not.toEqual(login.tokens.refreshToken);
  });

  it('accepts invitation during registration flow', async () => {
    const trainer = await authService.registerTrainer({
      email: 'trainer2@example.com',
      password: 'password123',
      fullName: 'Trainer Two',
      phoneNumber: '9876543210',
    });
    const invitation = await invitationService.createInvitation(trainer.user.id, '5551112222');

    const trainee = await authService.registerTrainee({
      email: 'trainee2@example.com',
      password: 'password789',
      fullName: 'Trainee Two',
      phoneNumber: '5551112222',
      invitationToken: invitation.token,
    });

    expect(trainee.user.role).toEqual('trainee');
  });
});
