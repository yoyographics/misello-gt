import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminSetupDto {
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@misello.gt' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
