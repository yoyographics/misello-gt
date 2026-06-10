import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * Servicio compartido de autenticación.
 * Genera tokens JWT y maneja hash/contraseñas.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Genera un JWT para clientes públicos (autenticados con Google).
   * Expiración: 30 días.
   */
  generateClientToken(user: { id: string; email: string; name?: string; picture?: string }): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name || user.email,
        picture: user.picture,
        role: 'CLIENT',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      },
    );
  }

  /**
   * Genera un JWT para administradores del panel.
   * Expiración: 8 horas.
   */
  generateAdminToken(adminUser: {
    id: string;
    email: string;
    name: string;
    role: string;
  }): string {
    return this.jwtService.sign(
      {
        sub: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '8h',
      },
    );
  }

  /**
   * Genera un hash bcrypt de una contraseña.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compara una contraseña en texto plano con su hash almacenado.
   */
  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
