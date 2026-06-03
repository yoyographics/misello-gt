import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard que verifica que el JWT token pertenezca a un administrador activo.
 * Valida el token Y consulta la base de datos para confirmar que el usuario sigue activo.
 */
@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Allow CORS preflight requests to pass through
    if (request.method === 'OPTIONS') {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Verificar que el admin todavía exista y esté activo en la base de datos
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Usuario no autorizado');
      }

      // Adjuntar el admin autenticado al request
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
