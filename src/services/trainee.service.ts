import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';

export type TraineeProfileInput = {
  goals?: string;
  injuries?: string;
  preferredSchedule?: string;
  invitedByTrainerId?: number;
};

@Injectable()
export class TraineeService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: DatabaseType) {}

  async createTraineeProfile(userId: number, input: TraineeProfileInput = {}) {
    const now = Math.floor(Date.now() / 1000);
    const [trainee] = await this.db
      .insert(schema.trainees)
      .values({
        userId,
        goals: input.goals ?? null,
        injuries: input.injuries ?? null,
        preferredSchedule: input.preferredSchedule ?? null,
        invitedByTrainerId: input.invitedByTrainerId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: schema.trainees.userId })
      .returning();
    return trainee;
  }

  async getTraineeProfile(userId: number) {
    const trainee = await this.db.query.trainees.findFirst({
      where: eq(schema.trainees.userId, userId),
    });
    if (!trainee) {
      throw new NotFoundException('Trainee profile not found');
    }
    return trainee;
  }

  async updateTraineeProfile(userId: number, input: TraineeProfileInput) {
    const trainee = await this.db.query.trainees.findFirst({
      where: eq(schema.trainees.userId, userId),
    });
    if (!trainee) {
      throw new NotFoundException('Trainee profile not found');
    }
    const updates: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
    if (input.goals !== undefined) updates.goals = input.goals;
    if (input.injuries !== undefined) updates.injuries = input.injuries;
    if (input.preferredSchedule !== undefined) updates.preferredSchedule = input.preferredSchedule;
    if (input.invitedByTrainerId !== undefined) updates.invitedByTrainerId = input.invitedByTrainerId;
    const [updated] = await this.db
      .update(schema.trainees)
      .set(updates)
      .where(eq(schema.trainees.userId, userId))
      .returning();
    return updated;
  }

  async linkTrainer(traineeId: number, trainerId: number) {
    await this.db
      .update(schema.trainees)
      .set({
        invitedByTrainerId: trainerId,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(schema.trainees.userId, traineeId));
  }
}
