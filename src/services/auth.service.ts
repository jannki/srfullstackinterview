import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseType } from '../database/database.module';
import { schema } from '../database/database';
import { UsersService } from './users.service';
import { TrainerProfileInput, TrainerService } from './trainer.service';
import { TraineeProfileInput, TraineeService } from './trainee.service';
import { TokenService } from './token.service';
import { verifyPassword } from '../common/utils/password';
import { InvitationService } from './invitation.service';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: number;
};

export type RegisterTrainerInput = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  profile?: TrainerProfileInput;
};

export type RegisterTraineeInput = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  profile?: TraineeProfileInput;
  invitationToken?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly trainerService: TrainerService,
    private readonly traineeService: TraineeService,
    private readonly tokenService: TokenService,
    private readonly invitationService: InvitationService,
    @Inject(DATABASE_CONNECTION) private readonly db: DatabaseType,
  ) {}

  private async storeRefreshToken(userId: number, refreshToken: string, expiresAt: number) {
    const hashed = this.tokenService.hashRefreshToken(refreshToken);
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId));
    await this.db.insert(schema.refreshTokens).values({
      userId,
      tokenHash: hashed,
      expiresAt,
      createdAt: now,
    });
  }

  private async assertRefreshToken(userId: number, refreshToken: string) {
    const hashed = this.tokenService.hashRefreshToken(refreshToken);
    const record = await this.db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.userId, userId),
    });
    if (!record || record.tokenHash !== hashed) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.expiresAt < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Refresh token expired');
    }
  }

  private buildAuthResponse(user: any, tokens: AuthTokens) {
    const { passwordHash, ...rest } = user;
    return { user: rest, tokens };
  }

  async registerTrainer(input: RegisterTrainerInput) {
    const user = await this.usersService.createUser({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      avatarUrl: input.avatarUrl,
      role: 'trainer',
    });
    await this.trainerService.createTrainerProfile(user.id, input.profile);
    const tokens = this.tokenService.issueTokens(user.id, 'trainer');
    await this.storeRefreshToken(user.id, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return this.buildAuthResponse(user, tokens);
  }

  async registerTrainee(input: RegisterTraineeInput) {
    let invitedByTrainerId: number | undefined;
    if (input.invitationToken) {
      const invitation = await this.invitationService.getInvitationByToken(input.invitationToken);
      if (invitation && invitation.status === 'pending') {
        invitedByTrainerId = invitation.trainerId;
      }
    }
    const user = await this.usersService.createUser({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      avatarUrl: input.avatarUrl,
      role: 'trainee',
    });
    await this.traineeService.createTraineeProfile(user.id, {
      ...input.profile,
      invitedByTrainerId,
    });
    const tokens = this.tokenService.issueTokens(user.id, 'trainee');
    await this.storeRefreshToken(user.id, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return this.buildAuthResponse(user, tokens);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordValid = verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = this.tokenService.issueTokens(user.id, user.role as 'trainer' | 'trainee');
    await this.storeRefreshToken(user.id, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return this.buildAuthResponse(user, tokens);
  }

  async refresh(userId: number, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.assertRefreshToken(userId, refreshToken);
    const tokens = this.tokenService.issueTokens(userId, user.role as 'trainer' | 'trainee');
    await this.storeRefreshToken(userId, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return this.buildAuthResponse(user, tokens);
  }

  async logout(userId: number) {
    await this.db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, userId));
  }
}
