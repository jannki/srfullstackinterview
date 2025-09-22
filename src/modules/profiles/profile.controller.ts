import { Body, Controller, Get, Patch, UseGuards, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, AuthenticatedUser } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../../services/users.service';
import { TrainerService } from '../../services/trainer.service';
import { TraineeService } from '../../services/trainee.service';
import { PlanService } from '../../services/plan.service';
import { ZodValidationPipe } from '../../common/validators/zod-validation.pipe';

const baseProfileSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phoneNumber: z.string().min(5).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .partial();

const trainerProfileSchema = z
  .object({
    bio: z.string().optional(),
    experienceYears: z.number().int().nonnegative().optional(),
    timezone: z.string().optional(),
    specialties: z.array(z.string()).optional(),
  })
  .partial();

const traineeProfileSchema = z
  .object({
    goals: z.string().optional(),
    injuries: z.string().optional(),
    preferredSchedule: z.string().optional(),
  })
  .partial();

const updateProfileSchema = z.object({
  ...baseProfileSchema.shape,
  trainerProfile: trainerProfileSchema.optional(),
  traineeProfile: traineeProfileSchema.optional(),
});

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(
    private readonly usersService: UsersService,
    private readonly trainerService: TrainerService,
    private readonly traineeService: TraineeService,
    private readonly planService: PlanService,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const record = await this.usersService.findById(user.id);
    if (!record) {
      return null;
    }
    const { passwordHash, ...base } = record;
    if (user.role === 'trainer') {
      const trainerProfile = await this.trainerService.getTrainerProfile(user.id);
      const plans = await this.planService.listPlansForTrainer(user.id);
      return { ...base, trainerProfile, plans };
    }
    const traineeProfile = await this.traineeService.getTraineeProfile(user.id);
    const activePlan = await this.planService.getActivePlanForTrainee(user.id);
    return { ...base, traineeProfile, activePlan };
  }

  @Patch('me')
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof updateProfileSchema>,
  ) {
    const updatedUser = await this.usersService.updateUser(user.id, {
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      avatarUrl: body.avatarUrl,
    });
    if (user.role === 'trainer' && body.trainerProfile) {
      await this.trainerService.updateTrainerProfile(user.id, body.trainerProfile);
    }
    if (user.role === 'trainee' && body.traineeProfile) {
      await this.traineeService.updateTraineeProfile(user.id, body.traineeProfile);
    }
    const { passwordHash, ...rest } = updatedUser;
    return rest;
  }
}
