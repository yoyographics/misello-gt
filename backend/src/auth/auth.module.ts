import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtClientGuard } from './guards/jwt-client.guard';
import { JwtAdminGuard } from './guards/jwt-admin.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Módulo 1 — Autenticación.
 * Configura Google OAuth, JWT, rate limiting y guards de seguridad.
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    // Rate limiting específico para el módulo de auth
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60000,    // 1 minuto
            limit: 20,     // 20 requests por minuto (endpoints de OAuth)
          },
        ],
      }),
    }),
  ],
  providers: [
    AuthService,
    // GoogleStrategy solo se carga si hay credenciales configuradas
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleStrategy] : []),
    JwtClientGuard,
    JwtAdminGuard,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtClientGuard, JwtAdminGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
