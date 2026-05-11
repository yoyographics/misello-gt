import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorador para requerir permisos de modulo especificos.
 * El guard PermissionsGuard verifica contra RoleConfig en la BD.
 * 
 * Ejemplo: @Permissions('orders', 'payments')
 */
export const Permissions = (...modules: string[]) => SetMetadata(PERMISSIONS_KEY, modules);
