import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeDesignService } from './services/claude-design.service';
import { SvgRendererService } from './services/svg-renderer.service';
import { TechValidatorService } from './services/tech-validator.service';
import { DesignRequestDto } from './dto/design-request.dto';
import { DesignResponseDto } from './dto/design-response.dto';

/**
 * Servicio principal del modulo de diseno.
 * Orquesta: Claude API → Renderer SVG/PNG → Validador Tecnico.
 */
@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeDesignService,
    private readonly renderer: SvgRendererService,
    private readonly validator: TechValidatorService,
  ) {}

  async createDesign(dto: DesignRequestDto): Promise<DesignResponseDto> {
    // 1. Obtener producto (modelo)
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // 2. Obtener fuente
    const font = await this.prisma.font.findUnique({
      where: { id: dto.fontId },
    });
    if (!font) {
      throw new NotFoundException('Fuente no encontrada');
    }

    // 3. Obtener tinta (opcional)
    let inkHex: string | undefined;
    if (dto.inkId) {
      const ink = await this.prisma.ink.findUnique({
        where: { id: dto.inkId },
      });
      if (ink) inkHex = ink.hexCode;
    }

    // 4. Generar parametros de diseno (Claude o default)
    const designParams = await this.claude.generateDesign(
      dto.category,
      dto.lines,
      {
        name: product.name,
        widthMm: product.widthMm || 0,
        heightMm: product.heightMm || 0,
        widthPx: product.widthPx || 300,
        heightPx: product.heightPx || 150,
        shape: product.shape || 'RECTANGULAR',
      },
      font.name,
      dto.logoUrl,
      dto.specialRequests,
    );

    // 5. Renderizar SVG y PNG
    const { svgUrl, pngUrl } = await this.renderer.render(
      designParams,
      {
        widthPx: product.widthPx || 300,
        heightPx: product.heightPx || 150,
        widthMm: product.widthMm || 0,
        heightMm: product.heightMm || 0,
        shape: product.shape || 'RECTANGULAR',
      },
      font.name,
      inkHex,
      dto.logoUrl,
    );

    // 6. Validacion tecnica
    const validation = this.validator.validate({
      textLines: designParams.textLines.map((tl: any) => ({
        text: tl.text,
        fontSizePt: tl.fontSizePt,
      })),
      productWidthPx: product.widthPx || 300,
      productHeightPx: product.heightPx || 150,
      productWidthMm: product.widthMm || 0,
      productHeightMm: product.heightMm || 0,
      hasLogoGradient: dto.hasLogoGradient,
      logoWillBeConverted: !!dto.logoUrl && dto.hasLogoGradient,
    });

    return {
      designId: svgUrl.split('/').pop()?.replace('-production.svg', '') || 'unknown',
      designJson: designParams,
      previewPngUrl: pngUrl,
      productionSvgUrl: svgUrl,
      validation,
      logoConvertedToBw: !!dto.logoUrl && !!dto.hasLogoGradient,
    };
  }
}
