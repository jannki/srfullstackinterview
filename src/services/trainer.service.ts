import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { PlanInput, PlanService } from './plan.service';

export type TrainerProfileInput = {
  bio?: string;
  experienceYears?: number;
  timezone?: string;
  specialties?: string[];
  defaultPlan?: PlanInput;
};

export type TrainerProfileUpdate = Partial<Omit<TrainerProfileInput, 'defaultPlan'>> & {
  defaultPlanId?: number;
};

@Injectable()
export class TrainerService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DatabaseType,
    private readonly planService: PlanService,
  ) {}

  private serializeSpecialties(specialties?: string[]) {
    return specialties ? JSON.stringify(specialties) : null;
  }

  private deserializeSpecialties(value?: string | null) {
    if (!value) return [] as string[];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  async createTrainerProfile(userId: number, input: TrainerProfileInput = {}) {
    const now = Math.floor(Date.now() / 1000);
    const [trainer] = await this.db
      .insert(schema.trainers)
      .values({
        userId,
        bio: input.bio ?? null,
        experienceYears: input.experienceYears ?? null,
        timezone: input.timezone ?? null,
        specialties: this.serializeSpecialties(input.specialties),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: schema.trainers.userId })
      .returning();

    let defaultPlanId = trainer?.defaultPlanId ?? null;
    if (!defaultPlanId) {
      const planPayload =
        input.defaultPlan ??
        ({
          name: 'Starter Plan',
          description: 'Default starter plan',
          priceCents: 0,
          features: ['Intro consultation'],
        } satisfies PlanInput);
      const plan = await this.planService.createPlan(userId, planPayload);
      defaultPlanId = plan.id;
      await this.db
        .update(schema.trainers)
        .set({ defaultPlanId, updatedAt: Math.floor(Date.now() / 1000) })
        .where(eq(schema.trainers.userId, userId));
    }

    const profile = await this.db.query.trainers.findFirst({
      where: eq(schema.trainers.userId, userId),
    });

    return {
      ...profile!,
      defaultPlanId,
      specialties: this.deserializeSpecialties(profile?.specialties ?? null),
    };
  }

  async getTrainerProfile(userId: number) {
    const trainer = await this.db.query.trainers.findFirst({
      where: eq(schema.trainers.userId, userId),
    });
    if (!trainer) {
      throw new NotFoundException('Trainer profile not found');
    }
    return {
      ...trainer,
      specialties: this.deserializeSpecialties(trainer.specialties),
    };
  }

  async updateTrainerProfile(userId: number, input: TrainerProfileUpdate) {
    const trainer = await this.db.query.trainers.findFirst({
      where: eq(schema.trainers.userId, userId),
    });
    if (!trainer) {
      throw new NotFoundException('Trainer profile not found');
    }
    const updates: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
    if (input.bio !== undefined) updates.bio = input.bio;
    if (input.experienceYears !== undefined) updates.experienceYears = input.experienceYears;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.specialties !== undefined) updates.specialties = this.serializeSpecialties(input.specialties);
    if (input.defaultPlanId !== undefined) updates.defaultPlanId = input.defaultPlanId;
    const [updated] = await this.db
      .update(schema.trainers)
      .set(updates)
      .where(eq(schema.trainers.userId, userId))
      .returning();
    return {
      ...updated,
      specialties: this.deserializeSpecialties(updated.specialties),
    };
  }
}
