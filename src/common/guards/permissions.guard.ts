import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../modules/permissions/permissions.service';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { UserRole } from '../enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{
        user: { id: string; role: UserRole };
        params: Record<string, string>;
      }>();

    if (request.user.role === UserRole.ADMIN) {
      return true;
    }

    const resourceId = request.params[required.paramName];
    const allowed = await this.permissionsService.checkForUser(
      request.user.id,
      required.resourceType,
      resourceId,
      required.level,
    );

    if (!allowed) {
      throw new ForbiddenException('Недостаточно прав доступа');
    }

    return true;
  }
}
