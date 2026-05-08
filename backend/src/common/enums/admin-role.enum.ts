/**
 * Enum de roles del panel de administración.
 * Debe mantenerse sincronizado con el enum AdminRole de Prisma schema.
 */
export enum AdminRole {
  ADMIN = 'ADMIN',
  CONTABILIDAD = 'CONTABILIDAD',
  IT = 'IT',
  RECEPCION = 'RECEPCION',
  DISENO = 'DISENO',
  PRODUCCION = 'PRODUCCION',
}
