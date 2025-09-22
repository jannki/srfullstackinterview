import { Injectable } from '@nestjs/common';
import {
  AccessTokenPayload,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
} from '../common/utils/token';

@Injectable()
export class TokenService {
  issueTokens(userId: number, role: 'trainer' | 'trainee') {
    const accessToken = generateAccessToken({ sub: userId, role });
    const refreshTokenData = generateRefreshToken();
    return {
      accessToken,
      refreshToken: refreshTokenData.token,
      refreshTokenExpiresAt: refreshTokenData.expiresAt,
    };
  }

  verify(token: string): AccessTokenPayload {
    return verifyAccessToken(token);
  }

  hashRefreshToken(token: string) {
    return hashToken(token);
  }
}
