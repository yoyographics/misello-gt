import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DesignService } from './design.service';
import { DesignRequestDto } from './dto/design-request.dto';
import { ValidateTextDto } from './dto/validate-text.dto';
import { JwtClientGuard } from '../auth/guards/jwt-client.guard';

/**
 * Controlador del modulo de diseno.
 * Endpoint principal: generar diseno con assistant + renderer + validador.
 */
@ApiTags('Diseno — Design Assistant')
@Controller('design')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  /**
   * Genera un diseno completo:
   * 1. Claude API produce parametros JSON
   * 2. Renderer genera SVG de produccion + PNG de preview
   * 3. Validador tecnico verifica fabricabilidad
   */
  @Post()
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  async createDesign(@Body() dto: DesignRequestDto) {
    return this.designService.createDesign(dto);
  }

  @Post('upload-logo')
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;
    const logoDataUri = `data:${mimeType};base64,${base64}`;
    return { logoUrl: logoDataUri };
  }

  /**
   * Valida si un texto cabe en el ancho de un modelo de sello.
   * Retorna sugerencias de tamano y division en lineas.
   */
  @Post('validate-text')
  @UseGuards(JwtClientGuard)
  @ApiBearerAuth()
  async validateText(@Body() dto: ValidateTextDto) {
    return this.designService.validateText(dto);
  }
}
