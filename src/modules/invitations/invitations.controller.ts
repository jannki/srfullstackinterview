import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { InvitationService } from '../../services/invitation.service';
import { AuthGuard, AuthenticatedUser } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/validators/zod-validation.pipe';

const createInvitationSchema = z.object({
  phoneNumber: z.string().min(5),
});

const acceptInvitationSchema = z.object({
  planId: z.number().int().positive(),
});

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @Roles('trainer')
  @UseGuards(AuthGuard, RolesGuard)
  @UsePipes(new ZodValidationPipe(createInvitationSchema))
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof createInvitationSchema>,
  ) {
    return this.invitationService.createInvitation(user.id, body.phoneNumber);
  }

  @Get()
  @Roles('trainer')
  @UseGuards(AuthGuard, RolesGuard)
  listInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.invitationService.listInvitations(user.id);
  }

  @Post(':token/accept')
  @Roles('trainee')
  @UseGuards(AuthGuard, RolesGuard)
  @UsePipes(new ZodValidationPipe(acceptInvitationSchema))
  acceptInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
    @Body() body: z.infer<typeof acceptInvitationSchema>,
  ) {
    return this.invitationService.acceptInvitation(token, user.id, body.planId);
  }
}
