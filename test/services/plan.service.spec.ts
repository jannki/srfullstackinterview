import { TestingModule } from '@nestjs/testing';
import { PlanService } from '../../src/services/plan.service';
import { AuthService } from '../../src/services/auth.service';
import { TraineeService } from '../../src/services/trainee.service';
import { createServicesTestingModule } from './test-helpers';

describe('PlanService', () => {
  let moduleRef: TestingModule;
  let planService: PlanService;
  let authService: AuthService;
  let traineeService: TraineeService;

  beforeEach(async () => {
    moduleRef = await createServicesTestingModule();
    planService = moduleRef.get(PlanService);
    authService = moduleRef.get(AuthService);
    traineeService = moduleRef.get(TraineeService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('allows trainers to create and update plans', async () => {
    const trainer = await authService.registerTrainer({
      email: 'plantrainer@example.com',
      password: 'password123',
      fullName: 'Plan Trainer',
      phoneNumber: '1112223333',
    });

    const plan = await planService.createPlan(trainer.user.id, {
      name: 'Premium Coaching',
      description: 'Weekly calls and workouts',
      priceCents: 15000,
      features: ['Weekly call', 'Custom workouts'],
    });

    expect(plan.name).toEqual('Premium Coaching');
    expect(plan.features).toContain('Weekly call');

    const updated = await planService.updatePlan(trainer.user.id, plan.id, {
      priceCents: 20000,
      isActive: false,
    });
    expect(updated.priceCents).toEqual(20000);
    expect(updated.isActive).toEqual(0);
  });

  it('assigns plan to trainee and deactivates previous', async () => {
    const trainer = await authService.registerTrainer({
      email: 'plantrainer2@example.com',
      password: 'password123',
      fullName: 'Plan Trainer Two',
      phoneNumber: '3334445555',
    });
    const trainee = await authService.registerTrainee({
      email: 'plantrainee@example.com',
      password: 'password456',
      fullName: 'Plan Trainee',
      phoneNumber: '4445556666',
    });
    await traineeService.updateTraineeProfile(trainee.user.id, {
      invitedByTrainerId: trainer.user.id,
    });

    const planA = await planService.createPlan(trainer.user.id, {
      name: 'Starter',
      description: 'Base plan',
      priceCents: 5000,
    });
    const planB = await planService.createPlan(trainer.user.id, {
      name: 'Advanced',
      description: 'Advanced coaching',
      priceCents: 12000,
    });

    const selectionA = await planService.assignPlanToTrainee(trainee.user.id, planA.id);
    expect(selectionA.planId).toEqual(planA.id);

    const selectionB = await planService.assignPlanToTrainee(trainee.user.id, planB.id);
    expect(selectionB.planId).toEqual(planB.id);

    const active = await planService.getActivePlanForTrainee(trainee.user.id);
    expect(active?.planId).toEqual(planB.id);
  });
});
