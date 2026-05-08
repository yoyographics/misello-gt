import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../common/enums/admin-role.enum';

/**
 * Clave de metadata utilizada por RolesGuard para verificar permisos.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador @Roles que asigna los roles permitidos a un endpoint del panel.
 * Ejemplo de uso: @Roles(AdminRole.ADMIN, AdminRole.IT)
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
