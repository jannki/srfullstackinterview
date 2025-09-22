import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../services/token.service';

export type AuthenticatedUser = {
  id: number;
  role: 'trainer' | 'trainee';
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }
    const token = authHeader.substring(7);
    try {
      const payload = this.tokenService.verify(token);
      request.user = { id: payload.sub, role: payload.role } satisfies AuthenticatedUser;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid authorization token');
    }
  }
}
