import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Strategy de Google OAuth 2.0 para autenticación de clientes públicos.
 * Busca o crea automáticamente el usuario en la base de datos.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id: googleId, emails, name, photos } = profile;
    const email = emails?.[0]?.value;
    const fullName = name?.givenName
      ? `${name.givenName} ${name.familyName || ''}`.trim()
      : email;
    const picture = photos?.[0]?.value;

    // Buscar usuario por googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // Crear usuario nuevo si no existe
      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name: fullName,
          picture,
        },
      });
    } else {
      // Actualizar nombre y foto si cambiaron
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          picture,
        },
      });
    }

    done(null, user);
  }
}
