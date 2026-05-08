import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Instancia del guard de Passport para Google
const GooglePassportGuard = AuthGuard('google');

/**
 * Guard personalizado para Google OAuth.
 * Verifica que las credenciales de Google estén configuradas antes de delegar a Passport.
 * Si no están configuradas, retorna 503 Service Unavailable.
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly passportGuard = new GooglePassportGuard();

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const clientID = process.env.GOOGLE_CLIENT_ID;

    if (!clientID) {
      throw new ServiceUnavailableException(
        'Google OAuth no está configurado. Contacte al administrador.',
      );
    }

    return this.passportGuard.canActivate(context) as any;
  }
}
