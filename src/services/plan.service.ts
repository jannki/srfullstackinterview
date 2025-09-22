import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';

export type PlanInput = {
  name: string;
  description: string;
  priceCents: number;
  currency?: string;
  features?: string[];
};

export type PlanUpdateInput = Partial<PlanInput> & { isActive?: boolean };

type PlanRecord = typeof schema.plans.$inferSelect;

@Injectable()
export class PlanService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: DatabaseType) {}

  private serializeFeatures(features?: string[]) {
    return features ? JSON.stringify(features) : null;
  }

  private deserializeFeatures(features?: string | null) {
    if (!features) return [] as string[];
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  async createPlan(trainerId: number, payload: PlanInput) {
    const now = Math.floor(Date.now() / 1000);
    const [plan] = await this.db
      .insert(schema.plans)
      .values({
        trainerId,
        name: payload.name,
        description: payload.description,
        priceCents: payload.priceCents,
        currency: payload.currency ?? 'USD',
        features: this.serializeFeatures(payload.features),
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { ...plan, features: this.deserializeFeatures(plan.features) };
  }

  async updatePlan(trainerId: number, planId: number, payload: PlanUpdateInput) {
    const plan = await this.db.query.plans.findFirst({
      where: eq(schema.plans.id, planId),
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    if (plan.trainerId !== trainerId) {
      throw new ForbiddenException('Cannot modify another trainer\'s plan');
    }
    const updates: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.priceCents !== undefined) updates.priceCents = payload.priceCents;
    if (payload.currency !== undefined) updates.currency = payload.currency;
    if (payload.features !== undefined) updates.features = this.serializeFeatures(payload.features);
    if (payload.isActive !== undefined) updates.isActive = payload.isActive ? 1 : 0;
    const [updated] = await this.db
      .update(schema.plans)
      .set(updates)
      .where(eq(schema.plans.id, planId))
      .returning();
    return { ...updated, features: this.deserializeFeatures(updated.features) };
  }

  async listPlansForTrainer(trainerId: number) {
    const plans = await this.db.query.plans.findMany({
      where: eq(schema.plans.trainerId, trainerId),
    });
    return plans.map((plan: PlanRecord) => ({
      ...plan,
      features: this.deserializeFeatures(plan.features),
    }));
  }

  async getPlan(planId: number) {
    const plan = await this.db.query.plans.findFirst({
      where: eq(schema.plans.id, planId),
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return { ...plan, features: this.deserializeFeatures(plan.features) };
  }

  async assignPlanToTrainee(traineeId: number, planId: number) {
    const plan = await this.db.query.plans.findFirst({
      where: eq(schema.plans.id, planId),
    });
    if (!plan || plan.isActive === 0) {
      throw new NotFoundException('Plan not available');
    }
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .update(schema.traineePlans)
      .set({
        status: 'inactive',
        deactivatedAt: now,
      })
      .where(and(eq(schema.traineePlans.traineeId, traineeId), eq(schema.traineePlans.status, 'active')));

    const [record] = await this.db
      .insert(schema.traineePlans)
      .values({
        traineeId,
        trainerId: plan.trainerId,
        planId: plan.id,
        status: 'active',
        activatedAt: now,
      })
      .returning();
    return record;
  }

  async getActivePlanForTrainee(traineeId: number) {
    return this.db.query.traineePlans.findFirst({
      where: and(eq(schema.traineePlans.traineeId, traineeId), eq(schema.traineePlans.status, 'active')),
    });
  }
}
