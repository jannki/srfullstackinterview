import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { and, eq, ne } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { hashPassword } from '../common/utils/password';

type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: 'trainer' | 'trainee';
  avatarUrl?: string | null;
};

type UpdateUserInput = Partial<{
  fullName: string;
  phoneNumber: string;
  avatarUrl: string | null;
  email: string;
  password: string;
}>;

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: DatabaseType) {}

  async createUser(data: CreateUserInput) {
    const existing = await this.db.query.users.findFirst({
      where: eq(schema.users.email, data.email),
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const now = Math.floor(Date.now() / 1000);
    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: data.email,
        passwordHash: hashPassword(data.password),
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        avatarUrl: data.avatarUrl ?? null,
        role: data.role,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return user;
  }

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({ where: eq(schema.users.email, email) });
  }

  async findById(id: number) {
    return this.db.query.users.findFirst({ where: eq(schema.users.id, id) });
  }

  async updateUser(userId: number, payload: UpdateUserInput) {
    const updates: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
    if (payload.fullName !== undefined) updates.fullName = payload.fullName;
    if (payload.phoneNumber !== undefined) updates.phoneNumber = payload.phoneNumber;
    if (payload.avatarUrl !== undefined) updates.avatarUrl = payload.avatarUrl;
    if (payload.email !== undefined) {
      const duplicate = await this.db.query.users.findFirst({
        where: and(eq(schema.users.email, payload.email), ne(schema.users.id, userId)),
      });
      if (duplicate && duplicate.id !== userId) {
        throw new ConflictException('Email already taken');
      }
      updates.email = payload.email;
    }
    if (payload.password !== undefined) {
      updates.passwordHash = hashPassword(payload.password);
    }
    const result = await this.db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning();
    const [user] = result;
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
