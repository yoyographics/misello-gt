import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para el login de administradores del panel.
 * Valida que ambos campos estén presentes y que el email tenga formato válido.
 */
export class AdminLoginDto {
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
