import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { MOCK_USERS } from '../common/interfaces/auth-context.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    if (!req) {
      throw new UnauthorizedException('Request context not found');
    }

    // Extract token from Authorization header
    const authHeader = req.headers?.authorization || '';
    
    // Expected format: "Bearer token-user-1" or "Bearer token-user-2" or "Bearer token-user-3"
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      throw new UnauthorizedException(
        'Authentication token not found. Use: Bearer token-user-1, Bearer token-user-2, or Bearer token-user-3',
      );
    }

    // Validate token against mock users
    const mockUser = MOCK_USERS[token];

    if (!mockUser) {
      throw new UnauthorizedException(
        `Invalid token. Valid tokens are: token-user-1, token-user-2, token-user-3`,
      );
    }

    // Attach user to request for resolver access
    req.user = {
      userId: mockUser.userId,
      username: mockUser.username,
    };

    console.log(`Authenticated user: ${mockUser.username} (${mockUser.userId})`);

    return true;
  }
}