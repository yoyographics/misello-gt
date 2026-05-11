import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Guard que verifica permisos configurables por modulo (RoleConfig).
 * Se usa junto con @Permissions('orders', 'inventory').
 * 
 * Si no hay RoleConfig en BD, usa defaults por rol.
 * ADMIN e IT siempre tienen acceso total.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Acceso denegado');
    }

    // ADMIN e IT tienen acceso total
    if (user.role === 'ADMIN' || user.role === 'IT') {
      return true;
    }

    // Obtener permisos configurables de la BD
    const config = await this.prisma.roleConfig.findUnique({
      where: { role: user.role },
    });

    let permissions: Record<string, boolean>;
    if (config) {
      permissions = config.permissions as Record<string, boolean>;
    } else {
      // Defaults por rol
      permissions = this.getDefaultPermissions(user.role);
    }

    const hasAll = requiredModules.every((mod) => permissions[mod] === true);
    if (!hasAll) {
      throw new ForbiddenException('No tienes permiso para acceder a este modulo');
    }

    return true;
  }

  private getDefaultPermissions(role: string): Record<string, boolean> {
    const defaults: Record<string, Record<string, boolean>> = {
      ADMIN: { orders: true, payments: true, inventory: true, design: true, notifications: true, admin: true, discounts: true, fonts: true },
      CONTABILIDAD: { orders: true, payments: true, inventory: false, design: false, notifications: false, admin: false, discounts: false, fonts: false },
      IT: { orders: true, payments: true, inventory: true, design: true, notifications: true, admin: true, discounts: true, fonts: true },
      RECEPCION: { orders: true, payments: false, inventory: false, design: false, notifications: true, admin: false, discounts: false, fonts: false },
      DISENO: { orders: true, payments: false, inventory: false, design: true, notifications: false, admin: false, discounts: false, fonts: true },
      PRODUCCION: { orders: true, payments: false, inventory: false, design: false, notifications: false, admin: false, discounts: false, fonts: false },
    };
    return defaults[role] || {};
  }
}
