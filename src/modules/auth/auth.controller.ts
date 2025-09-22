import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from '../../services/auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/validators/zod-validation.pipe';

const trainerProfileSchema = z
  .object({
    bio: z.string().optional(),
    experienceYears: z.number().int().nonnegative().optional(),
    timezone: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    defaultPlan: z
      .object({
        name: z.string(),
        description: z.string(),
        priceCents: z.number().int().nonnegative(),
        currency: z.string().optional(),
        features: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .partial();

const traineeProfileSchema = z
  .object({
    goals: z.string().optional(),
    injuries: z.string().optional(),
    preferredSchedule: z.string().optional(),
  })
  .partial();

const registerTrainerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phoneNumber: z.string().min(5),
  avatarUrl: z.string().url().optional().nullable(),
  profile: trainerProfileSchema.optional(),
});

const registerTraineeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phoneNumber: z.string().min(5),
  avatarUrl: z.string().url().optional().nullable(),
  profile: traineeProfileSchema.optional(),
  invitationToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  userId: z.number().int().positive(),
  refreshToken: z.string().min(10),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/trainer')
  @UsePipes(new ZodValidationPipe(registerTrainerSchema))
  registerTrainer(@Body() body: z.infer<typeof registerTrainerSchema>) {
    return this.authService.registerTrainer(body);
  }

  @Post('register/trainee')
  @UsePipes(new ZodValidationPipe(registerTraineeSchema))
  registerTrainee(@Body() body: z.infer<typeof registerTraineeSchema>) {
    return this.authService.registerTrainee(body);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: z.infer<typeof loginSchema>) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @UsePipes(new ZodValidationPipe(refreshSchema))
  refresh(@Body() body: z.infer<typeof refreshSchema>) {
    return this.authService.refresh(body.userId, body.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@CurrentUser() user: { id: number }) {
    return this.authService.logout(user.id);
  }
}
