import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import { PlanService } from '../../services/plan.service';
import { AuthGuard, AuthenticatedUser } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/validators/zod-validation.pipe';
import { TraineeService } from '../../services/trainee.service';

const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().optional(),
  features: z.array(z.string()).optional(),
});

const updatePlanSchema = createPlanSchema.partial().extend({
  isActive: z.boolean().optional(),
});

@Controller('plans')
export class PlansController {
  constructor(
    private readonly planService: PlanService,
    private readonly traineeService: TraineeService,
  ) {}

  @Post()
  @Roles('trainer')
  @UseGuards(AuthGuard, RolesGuard)
  @UsePipes(new ZodValidationPipe(createPlanSchema))
  createPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof createPlanSchema>,
  ) {
    return this.planService.createPlan(user.id, body);
  }

  @Get()
  @Roles('trainer')
  @UseGuards(AuthGuard, RolesGuard)
  listTrainerPlans(@CurrentUser() user: AuthenticatedUser) {
    return this.planService.listPlansForTrainer(user.id);
  }

  @Get(':planId')
  getPlan(@Param('planId', ParseIntPipe) planId: number) {
    return this.planService.getPlan(planId);
  }

  @Patch(':planId')
  @Roles('trainer')
  @UseGuards(AuthGuard, RolesGuard)
  @UsePipes(new ZodValidationPipe(updatePlanSchema))
  updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() body: z.infer<typeof updatePlanSchema>,
  ) {
    return this.planService.updatePlan(user.id, planId, body);
  }

  @Get('trainer/:trainerId')
  listTrainerPlansPublic(@Param('trainerId', ParseIntPipe) trainerId: number) {
    return this.planService.listPlansForTrainer(trainerId);
  }

  @Post(':planId/select')
  @Roles('trainee')
  @UseGuards(AuthGuard, RolesGuard)
  async selectPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    const traineeProfile = await this.traineeService.getTraineeProfile(user.id);
    const plan = await this.planService.getPlan(planId);
    if (traineeProfile.invitedByTrainerId !== plan.trainerId) {
      throw new ForbiddenException('Trainee is not invited by this trainer');
    }
    const selection = await this.planService.assignPlanToTrainee(user.id, planId);
    return { selection };
  }
}
