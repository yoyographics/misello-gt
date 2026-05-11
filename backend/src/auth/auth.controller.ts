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
  @Get('google/debug')
  googleDebug() {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || '';
    return {
      clientIdConfigured: !!clientId,
      clientIdPrefix: clientId.substring(0, 20) + '...',
      callbackUrl,
      fullAuthUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=email profile`,
    };
  }

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
    // Normalizar la URL para evitar typos como /clien en vez de /client
    let frontendUrl = (process.env.FRONTEND_URL || 'https://misello-gt-production.up.railway.app/client').trim();
    frontendUrl = frontendUrl.replace(/\/+$/, ''); // quitar trailing slashes
    if (frontendUrl.endsWith('/clien')) {
      frontendUrl = frontendUrl + 't'; // corregir typo común
    }
    if (!frontendUrl.endsWith('/client')) {
      frontendUrl = frontendUrl + '/client';
    }
    return res.redirect(`${frontendUrl}?token=${token}`);
  }

  // ============================================================
  // PARTE B — ADMINISTRADORES DEL PANEL (JWT + Password)
  // ============================================================

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
