import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplatesService } from '../templates/templates.service';
import { ClaudeDesignService } from './services/claude-design.service';
import { SvgRendererService } from './services/svg-renderer.service';
import { TechValidatorService } from './services/tech-validator.service';
import { DesignRequestDto } from './dto/design-request.dto';
import { DesignResponseDto } from './dto/design-response.dto';
import { ValidateTextDto } from './dto/validate-text.dto';
import * as opentype from 'opentype.js';
import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { Resvg } from '@resvg/resvg-js';

/**
 * Servicio principal del modulo de diseno.
 * Orquesta: Claude API → Renderer SVG/PNG → Validador Tecnico.
 * Retorna archivos como data URIs base64 (no depende del filesystem).
 */
@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeDesignService,
    private readonly renderer: SvgRendererService,
    private readonly validator: TechValidatorService,
    private readonly templatesService: TemplatesService,
  ) {}

  async createDesign(dto: DesignRequestDto): Promise<DesignResponseDto> {
    // 1. Obtener producto (modelo)
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // 2. Renderizado desde plantilla (flujo alternativo)
    if (dto.templateId) {
      return this.renderTemplateDesign(dto, product);
    }

    // 3. Obtener fuente
    const font = await this.prisma.font.findUnique({
      where: { id: dto.fontId },
    });
    if (!font) {
      throw new NotFoundException('Fuente no encontrada');
    }

    // 4. Obtener tinta (opcional)
    let inkHex: string | undefined;
    if (dto.inkId) {
      const ink = await this.prisma.ink.findUnique({
        where: { id: dto.inkId },
      });
      if (ink) inkHex = ink.hexCode;
    }

    // 5. Generar parametros de diseno (Claude o default)
    const designParams = await this.claude.generateDesign(
      dto.category || 'OTRO',
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

    // 5.5 Auto-ajustar tamanos de fuente si son muy pequenos (usa minFontSizePt de la fuente)
    const minFontPt = font.minFontSizePt ?? 10;
    let fontAdjusted = false;
    for (const line of designParams.textLines) {
      if (line.fontSizePt < minFontPt) {
        this.logger.log(`Auto-ajustando fuente de ${line.fontSizePt}pt a ${minFontPt}pt para linea "${line.text.substring(0, 20)}..."`);
        line.fontSizePt = minFontPt;
        fontAdjusted = true;
      }
    }

    // 6. Renderizar SVG y PNG como data URIs base64
    const { svgDataUri, previewDataUri, designId } = await this.renderer.render(
      designParams,
      {
        widthPx: product.widthPx || 300,
        heightPx: product.heightPx || 150,
        widthMm: product.widthMm || 0,
        heightMm: product.heightMm || 0,
        shape: product.shape || 'RECTANGULAR',
      },
      font.name,
      font.fileName,
      font.fileData,
      inkHex,
      dto.logoUrl,
    );

    // 7. Validacion tecnica
    const validation = this.validator.validate({
      textLines: designParams.textLines.map((tl: any) => ({
        text: tl.text,
        fontSizePt: tl.fontSizePt,
      })),
      productWidthPx: product.widthPx || 300,
      productHeightPx: product.heightPx || 150,
      productWidthMm: product.widthMm || 0,
      productHeightMm: product.heightMm || 0,
      strokeRatio: font.strokeRatio ?? undefined,
      minFontSizePt: font.minFontSizePt ?? undefined,
      hasLogoGradient: dto.hasLogoGradient,
      logoWillBeConverted: !!dto.logoUrl && dto.hasLogoGradient,
    });

    return {
      designId,
      designJson: designParams,
      previewPngUrl: previewDataUri,
      productionSvgUrl: svgDataUri,
      validation,
      logoConvertedToBw: !!dto.logoUrl && !!dto.hasLogoGradient,
      fontAutoAdjusted: fontAdjusted,
    };
  }

  /**
   * Renderiza un diseno a partir de una plantilla SVG.
   * El cliente envia templateId + templateData (mapa de campos editables).
   */
  private async renderTemplateDesign(
    dto: DesignRequestDto,
    product: any,
  ): Promise<DesignResponseDto> {
    if (!dto.templateId) {
      throw new BadRequestException('templateId es requerido para renderizar plantilla');
    }

    const template = await this.templatesService.findOnePublic(dto.templateId);

    // Validar compatibilidad basica
    if (template.categoryId !== product.categoryId) {
      throw new BadRequestException('La plantilla no pertenece a la categoria del producto');
    }
    if (template.productShape && template.productShape !== product.shape) {
      throw new BadRequestException('La plantilla no coincide con la forma del producto');
    }

    const fields = dto.templateData || {};

    // Aplicar textos al SVG
    const finalSvg = this.templatesService.applyTemplateFields(template.svgContent, fields);

    // Generar PNG preview con resvg
    const designId = randomUUID();
    let previewDataUri = '';
    try {
      const resvg = new Resvg(finalSvg, {
        fitTo: { mode: 'original' },
        font: {
          // fallback fonts para el renderizado
          defaultFontFamily: 'Arial, sans-serif',
          serifFamily: 'Arial',
          sansSerifFamily: 'Arial',
        },
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      previewDataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch (e: any) {
      this.logger.error(`Error renderizando preview PNG de plantilla: ${e.message}`);
      throw new BadRequestException('No se pudo generar el preview de la plantilla');
    }

    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(finalSvg, 'utf-8').toString('base64')}`;

    // Validacion tecnica basica
    const validation = this.validator.validate({
      textLines: (template.editableAreas as any[] || []).map((area) => ({
        text: fields[area.id] || area.defaultText || '',
        fontSizePt: area.fontSize || 12,
      })),
      productWidthPx: product.widthPx || 300,
      productHeightPx: product.heightPx || 150,
      productWidthMm: product.widthMm || 0,
      productHeightMm: product.heightMm || 0,
    });

    return {
      designId,
      designJson: {
        templateId: template.id,
        templateName: template.name,
        fields,
        productId: product.id,
      },
      previewPngUrl: previewDataUri,
      productionSvgUrl: svgDataUri,
      validation,
      logoConvertedToBw: false,
      fontAutoAdjusted: false,
    };
  }

  /**
   * Valida si un texto cabe en el ancho de un modelo.
   * Retorna ancho medido, sugerencias de tamano y division en lineas.
   */
  async validateText(dto: ValidateTextDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const font = await this.prisma.font.findUnique({ where: { id: dto.fontId } });
    if (!font) throw new NotFoundException('Fuente no encontrada');

    // Cargar fuente con opentype.js
    let parsedFont: opentype.Font | undefined;
    if (font.fileData) {
      try {
        const buffer = Buffer.from(font.fileData, 'base64');
        parsedFont = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      } catch (e: any) {
        this.logger.warn(`Error parseando fuente desde fileData: ${e.message}`);
      }
    } else if (font.fileName && existsSync(`./uploads/fonts/${font.fileName}`)) {
      try {
        const buffer = readFileSync(`./uploads/fonts/${font.fileName}`);
        parsedFont = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      } catch (e: any) {
        this.logger.warn(`Error parseando fuente desde disco: ${e.message}`);
      }
    }

    if (!parsedFont) {
      throw new NotFoundException('No se pudo cargar la fuente para medicion');
    }

    const widthPx = product.widthPx || 300;
    const marginPx = 10;
    const availableWidthPx = widthPx - marginPx * 2;

    // Usar el fontSizePt proporcionado o calcular uno razonable
    const fontSizePt = dto.fontSizePt ?? 12;
    const fontSizePx = Math.round(fontSizePt * 8.333); // pt → px @ 600dpi

    const textWidthPx = parsedFont.getAdvanceWidth(dto.text, fontSizePx);
    const fits = textWidthPx <= availableWidthPx;

    // Tamano minimo fabricable para esta fuente (configurable por admin)
    const minFontSizePt = font.minFontSizePt ?? 10;

    // Calcular tamano minimo para que quepa
    let suggestedFontSizePt: number | null = null;
    if (!fits) {
      const minRequiredPx = textWidthPx > 0 ? (availableWidthPx / textWidthPx) * fontSizePx : fontSizePx;
      const minRequiredPt = Math.ceil(minRequiredPx / 8.333);
      // Solo sugerir si es mayor o igual al minimo fabricable de la fuente
      if (minRequiredPt >= minFontSizePt) {
        suggestedFontSizePt = minRequiredPt;
      }
    }

    // Determinar si es imposible (ni siquiera al minimo cabe)
    const minFontSizePx = Math.round(minFontSizePt * 8.333);
    const textWidthAtMin = parsedFont.getAdvanceWidth(dto.text, minFontSizePx);
    const impossible = textWidthAtMin > availableWidthPx;

    // Sugerir division en lineas si no cabe ni siquiera al minimo
    const suggestedLines: string[] = [];
    if (!fits && impossible) {
      const words = dto.text.split(/\s+/);
      if (words.length > 1) {
        // Intentar dividir en 2 lineas lo mas balanceadas posible
        const half = Math.ceil(words.length / 2);
        const line1 = words.slice(0, half).join(' ');
        const line2 = words.slice(half).join(' ');

        // Verificar si cada linea cabe al tamano original
        const line1Width = parsedFont.getAdvanceWidth(line1, fontSizePx);
        const line2Width = parsedFont.getAdvanceWidth(line2, fontSizePx);
        if (line1Width <= availableWidthPx && line2Width <= availableWidthPx) {
          suggestedLines.push(line1, line2);
        } else {
          // Si alguna linea sigue sin caber, verificar si caben al minimo
          const line1MinWidth = parsedFont.getAdvanceWidth(line1, minFontSizePx);
          const line2MinWidth = parsedFont.getAdvanceWidth(line2, minFontSizePx);
          if (line1MinWidth <= availableWidthPx && line2MinWidth <= availableWidthPx) {
            suggestedLines.push(line1, line2);
            suggestedFontSizePt = minFontSizePt;
          }
        }
      }
    }

    return {
      fits,
      textWidthPx: Math.round(textWidthPx),
      availableWidthPx,
      fontSizePt,
      suggestedFontSizePt,
      suggestedLines,
      minFontSizePt,
      impossible,
    };
  }
}
