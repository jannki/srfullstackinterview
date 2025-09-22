import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { SMSService } from './sms.service';
import { TraineeService } from './trainee.service';
import { PlanService } from './plan.service';
import { ChatService } from './chat.service';

const DEFAULT_INVITATION_TTL = 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class InvitationService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DatabaseType,
    private readonly smsService: SMSService,
    private readonly traineeService: TraineeService,
    private readonly planService: PlanService,
    private readonly chatService: ChatService,
  ) {}

  private generateToken() {
    return randomBytes(16).toString('hex');
  }

  async createInvitation(trainerId: number, phoneNumber: string) {
    const token = this.generateToken();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + DEFAULT_INVITATION_TTL;
    const [invitation] = await this.db
      .insert(schema.invitations)
      .values({
        trainerId,
        phoneNumber,
        token,
        status: 'pending',
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await this.smsService.sendInvitation(phoneNumber, token);
    return invitation;
  }

  async listInvitations(trainerId: number) {
    return this.db.query.invitations.findMany({
      where: eq(schema.invitations.trainerId, trainerId),
    });
  }

  async getInvitationByToken(token: string) {
    return this.db.query.invitations.findFirst({
      where: eq(schema.invitations.token, token),
    });
  }

  async acceptInvitation(token: string, traineeId: number, planId: number) {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    const now = Math.floor(Date.now() / 1000);
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation already processed');
    }
    if (invitation.expiresAt < now) {
      await this.db
        .update(schema.invitations)
        .set({ status: 'expired', updatedAt: now })
        .where(eq(schema.invitations.id, invitation.id));
      throw new BadRequestException('Invitation expired');
    }
    const plan = await this.planService.getPlan(planId);
    if (plan.trainerId !== invitation.trainerId) {
      throw new BadRequestException('Plan does not belong to inviting trainer');
    }
    await this.planService.assignPlanToTrainee(traineeId, planId);
    await this.traineeService.linkTrainer(traineeId, invitation.trainerId);
    const chat = await this.chatService.ensureChat(invitation.trainerId, traineeId);
    const [updatedInvitation] = await this.db
      .update(schema.invitations)
      .set({
        status: 'accepted',
        acceptedByTraineeId: traineeId,
        selectedPlanId: planId,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitation.id))
      .returning();
    return { invitation: updatedInvitation, chat };
  }
}
