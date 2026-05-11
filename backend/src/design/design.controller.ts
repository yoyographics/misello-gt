import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DesignService } from './design.service';
import { DesignRequestDto } from './dto/design-request.dto';
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
}
