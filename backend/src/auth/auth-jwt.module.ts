import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

/**
 * Modulo compartido que exporta JwtModule configurado con JWT_SECRET.
 * Importar este modulo en cualquier modulo que use JwtService o guards JWT.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule],
})
export class AuthJwtModule {}
