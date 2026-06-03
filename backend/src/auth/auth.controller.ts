import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminSetupDto } from './dto/admin-setup.dto';
import { JwtAdminGuard } from './guards/jwt-admin.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AdminRole } from '../common/enums/admin-role.enum';

/**
 * Controlador de autenticación.
 * Maneja login de clientes (Google OAuth) y administradores (JWT + password).
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // PARTE A — CLIENTES PÚBLICOS (Google OAuth)
  // ============================================================

  /**
   * Diagnóstico: muestra la configuración de Google OAuth (sin secret).
   */
  /**
   * Endpoint de debug eliminado para evitar filtrar configuracion OAuth.
   */

  /**
   * Inicia el flujo de autenticación con Google.
   * Redirige al usuario a la página de login de Google.
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Este endpoint solo redirige a Google. El guard maneja todo.
  }

  /**
   * Callback de Google después de la autenticación exitosa.
   * Genera un JWT de cliente y redirige al frontend con el token.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const token = this.authService.generateClientToken(user);

    // Redirigir al frontend con el token en la URL
    // El frontend Next.js esta servido en la raiz del dominio (/)
    let frontendUrl = (process.env.FRONTEND_URL || 'https://misello-gt-production.up.railway.app').trim();
    frontendUrl = frontendUrl.replace(/\/+$/, ''); // quitar trailing slashes
    // Pasar token en hash fragment para evitar que quede en server logs / browser history query params
    return res.redirect(`${frontendUrl}/#token=${encodeURIComponent(token)}`);
  }

  // ============================================================
  // PARTE B — ADMINISTRADORES DEL PANEL (JWT + Password)
  // ============================================================

  /**
   * Crear el primer usuario administrador si no existe ninguno.
   * Endpoint publico pero solo funciona una vez (cuando la tabla esta vacia).
   */
  @Post('admin/setup')
  @HttpCode(HttpStatus.CREATED)
  async adminSetup(@Body() dto: AdminSetupDto) {
    const count = await this.prisma.adminUser.count();
    if (count > 0) {
      throw new UnauthorizedException('Ya existe al menos un usuario administrador. Usa el login normal.');
    }
    const hash = await this.authService.hashPassword(dto.password);
    const admin = await this.prisma.adminUser.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hash,
        role: AdminRole.ADMIN,
        isActive: true,
      },
    });
    const token = this.authService.generateAdminToken(admin);
    return {
      accessToken: token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * Login para usuarios del panel de administración.
   * Rate limiting: máximo 5 intentos cada 15 minutos por IP.
   */
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 intentos / 15 min
  async adminLogin(@Body() dto: AdminLoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    // Mensaje genérico: no revelar si el email existe o no
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await this.authService.comparePassword(
      dto.password,
      admin.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.authService.generateAdminToken(admin);

    return {
      accessToken: token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * Retorna los datos del administrador autenticado.
   */
  @Get('admin/me')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  adminMe(@Req() req: Request) {
    const user = req.user as any;
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Logout del panel (frontend debe eliminar el token).
   * Por ahora solo retorna 200 OK.
   */
  @Post('admin/logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  adminLogout() {
    return { message: 'Logout exitoso' };
  }
}
