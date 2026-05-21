import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

interface DesignParameters {
  layout: 'single-line' | 'multi-line' | 'circular' | 'oval-fit';
  textLines: Array<{
    text: string;
    fontSizePt: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    yPosition: number;
    xPosition: number;
    textAnchor: 'start' | 'middle' | 'end';
    rotationDegrees?: number;
  }>;
  logo?: {
    x: number;
    y: number;
    width: number;
    height: number;
    grayscale: boolean;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  spacing: number;
}

/**
 * Servicio que llama a la API de Claude (Anthropic)
 * para generar parametros de diseno estructurados en JSON.
 * 
 * El prompt esta optimizado para producir JSON deterministico
 * que el renderer SVG puede consumir directamente.
 */
@Injectable()
export class ClaudeDesignService {
  private readonly logger = new Logger(ClaudeDesignService.name);
  private anthropic: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async generateDesign(
    category: string,
    lines: Array<{ text: string; fontSize?: string; isBold?: boolean; isItalic?: boolean; alignment?: string }>,
    product: { name: string; widthMm: number; heightMm: number; widthPx: number; heightPx: number; shape: string },
    fontName: string,
    logoUrl?: string,
    specialRequests?: string,
  ): Promise<DesignParameters> {
    if (!this.anthropic) {
      this.logger.warn('ANTHROPIC_API_KEY no configurada. Usando layout por defecto.');
      return this.getDefaultDesign(lines, product, logoUrl);
    }

    const prompt = this.buildPrompt(category, lines, product, fontName, logoUrl, specialRequests);

    try {
      const response = await this.anthropic.messages.create({
        model: this.configService.get<string>('CLAUDE_MODEL') || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.1, // Baja temperatura para maxima determinismo
        system: `Eres un asistente de diseno experto para sellos de hule personalizados. 
Tu trabajo es generar parametros de layout en JSON para un renderer SVG determinista.

REGLAS CRITICAS:
- Responde UNICAMENTE con JSON valido, sin markdown, sin explicaciones.
- Todas las medidas estan en pixeles a 600 DPI.
- Margenes minimos: 10px en todos los lados.
- El texto debe caber completamente dentro del area util (widthPx - margenes, heightPx - margenes).
- Tamano minimo de fuente: 8pt (~33px a 600dpi). Tamano maximo razonable segun modelo.
- Si el modelo es circular (shape=CIRCULAR), centrar todo y ajustar al diametro.
- Si hay logo, dejar espacio adecuado entre logo y texto.
- Los yPosition deben ser coordenadas SVG (top-down).`,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Claude no devolvio texto');
      }

      const jsonText = content.text.trim();
      // Limpiar posible markdown de code block
      const cleanJson = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const params = JSON.parse(cleanJson) as DesignParameters;

      this.logger.log(`Claude genero layout: ${params.layout}`);
      return params;
    } catch (error) {
      this.logger.error(`Error llamando a Claude: ${error.message}. Usando layout por defecto.`);
      return this.getDefaultDesign(lines, product, logoUrl);
    }
  }

  private buildPrompt(
    category: string,
    lines: Array<{ text: string; fontSize?: string; isBold?: boolean; isItalic?: boolean; alignment?: string }>,
    product: { name: string; widthMm: number; heightMm: number; widthPx: number; heightPx: number; shape: string },
    fontName: string,
    logoUrl?: string,
    specialRequests?: string,
  ): string {
    const linesDesc = lines.map((l, i) =>
      `  Linea ${i + 1}: "${l.text}" | tamano: ${l.fontSize || 'auto'} | bold: ${l.isBold || false} | italic: ${l.isItalic || false} | alineacion: ${l.alignment || 'center'}`
    ).join('\n');

    return `Genera parametros de layout JSON para un sello personalizado.

DATOS DEL CLIENTE:
- Categoria: ${category}
- Modelo: ${product.name}
- Forma: ${product.shape}
- Dimensiones del modelo: ${product.widthPx}px ancho x ${product.heightPx}px alto (a 600 DPI = ${product.widthMm}mm x ${product.heightMm}mm)
- Fuente seleccionada: ${fontName}
${logoUrl ? `- Logo: SI, URL ${logoUrl}` : '- Logo: NO'}
${specialRequests ? `- Solicitudes especiales: ${specialRequests}` : ''}

TEXTO A INCLUIR:
${linesDesc}

Genera el JSON con esta estructura exacta:
{
  "layout": "single-line|multi-line|circular|oval-fit",
  "textLines": [
    {
      "text": "texto exacto",
      "fontSizePt": 12,
      "fontWeight": "normal|bold",
      "fontStyle": "normal|italic",
      "yPosition": 100,
      "xPosition": 200,
      "textAnchor": "start|middle|end",
      "rotationDegrees": 0
    }
  ],
  "logo": {
    "x": 50,
    "y": 50,
    "width": 100,
    "height": 100,
    "grayscale": true
  },
  "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 },
  "spacing": 10
}`;
  }

  private getDefaultDesign(
    lines: Array<{ text: string; fontSize?: string; isBold?: boolean; isItalic?: boolean; alignment?: string }>,
    product: { widthPx: number; heightPx: number; shape: string },
    logoUrl?: string,
  ): DesignParameters {
    const margin = 10;
    const availWidth = product.widthPx - margin * 2;
    const availHeight = product.heightPx - margin * 2;
    const lineHeight = availHeight / (lines.length || 1);

    const textLines = lines.map((line, i) => ({
      text: line.text,
      fontSizePt: this.parseFontSize(line.fontSize) || Math.min(14, Math.max(8, Math.floor(availHeight / (lines.length * 3)))),
      fontWeight: (line.isBold ? 'bold' : 'normal') as 'normal' | 'bold',
      fontStyle: (line.isItalic ? 'italic' : 'normal') as 'normal' | 'italic',
      yPosition: margin + lineHeight * (i + 0.5) + 10, // +10 para baseline
      xPosition: product.widthPx / 2,
      textAnchor: (line.alignment === 'left' ? 'start' : line.alignment === 'right' ? 'end' : 'middle') as 'start' | 'middle' | 'end',
      rotationDegrees: 0,
    }));

    return {
      layout: product.shape === 'CIRCULAR' ? 'circular' : lines.length === 1 ? 'single-line' : 'multi-line',
      textLines,
      ...(logoUrl ? {
        logo: {
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          grayscale: true,
        }
      } : {}),
      margins: { top: margin, right: margin, bottom: margin, left: margin },
      spacing: 10,
    };
  }

  private parseFontSize(fs?: string): number | undefined {
    if (!fs) return undefined;
    const match = fs.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
}
