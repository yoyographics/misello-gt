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
import { AuthGuard } from '@nestjs/passport';
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
   * Inicia el flujo de autenticación con Google.
   * Redirige al usuario a la página de login de Google.
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Este endpoint solo redirige a Google. El guard maneja todo.
  }

  /**
   * Callback de Google después de la autenticación exitosa.
   * Genera un JWT de cliente y redirige al frontend con el token.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const token = this.authService.generateClientToken(user);

    // Redirigir al frontend con el token en la URL
    // El frontend debe leer el token y guardarlo
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
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
  adminLogout() {
    return { message: 'Logout exitoso' };
  }
}
