import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

interface RenderParams {
  layout: string;
  textLines: Array<{
    text: string;
    fontSizePt: number;
    fontWeight: string;
    fontStyle: string;
    yPosition: number;
    xPosition: number;
    textAnchor: string;
    rotationDegrees?: number;
  }>;
  logo?: {
    x: number;
    y: number;
    width: number;
    height: number;
    grayscale: boolean;
  };
  margins: { top: number; right: number; bottom: number; left: number };
  spacing: number;
}

interface ProductDimensions {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  shape: string;
}

/**
 * Renderer determinista SVG.
 * Genera SVG de produccion (B&W, 600dpi) y SVG de preview (color).
 * Retorna los archivos como data URIs base64 para evitar dependencia del filesystem.
 * Incrusta la fuente TTF/OTF como base64 dentro del SVG para que se renderice correctamente.
 */
@Injectable()
export class SvgRendererService {
  private readonly logger = new Logger(SvgRendererService.name);

  async render(
    params: RenderParams,
    product: ProductDimensions,
    fontName: string,
    fontFileName: string | undefined,
    fontFileData: string | undefined | null,
    inkHex?: string,
    logoUrl?: string,
  ): Promise<{ svgDataUri: string; previewDataUri: string; designId: string }> {
    const designId = randomUUID();

    // Construir @font-face con la fuente incrustada (de BD o disco)
    const fontFaceCss = this.buildFontFace(fontName, fontFileName, fontFileData);

    // 1. Generar SVG de produccion (B&W)
    const productionSvg = this.buildProductionSvg(params, product, fontName, fontFaceCss, logoUrl);
    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(productionSvg, 'utf-8').toString('base64')}`;

    // 2. Generar SVG de preview (color) — el navegador lo renderiza directamente
    const previewSvg = this.buildPreviewSvg(params, product, fontName, fontFaceCss, inkHex, logoUrl);
    const previewDataUri = `data:image/svg+xml;base64,${Buffer.from(previewSvg, 'utf-8').toString('base64')}`;

    this.logger.log(`Renderizado: ${designId} (${product.widthPx}x${product.heightPx}px) fuente=${fontName} file=${fontFileName || 'ninguna'}`);
    return { svgDataUri, previewDataUri, designId };
  }

  /**
   * Construye la regla @font-face incrustando el archivo TTF/OTF como base64.
   * Prioriza fileData de la BD; fallback a lectura del disco.
   */
  private buildFontFace(
    fontName: string,
    fontFileName: string | undefined,
    fontFileData: string | undefined | null,
  ): string {
    let fontBase64: string | undefined;
    let format = 'truetype';

    if (fontFileData) {
      fontBase64 = fontFileData;
      if (fontFileName) {
        const ext = extname(fontFileName).toLowerCase();
        format = ext === '.otf' ? 'opentype' : 'truetype';
      }
    } else if (fontFileName) {
      const fontPath = `./uploads/fonts/${fontFileName}`;
      if (existsSync(fontPath)) {
        try {
          const fontBuffer = readFileSync(fontPath);
          fontBase64 = fontBuffer.toString('base64');
          const ext = extname(fontFileName).toLowerCase();
          format = ext === '.otf' ? 'opentype' : 'truetype';
        } catch (e: any) {
          this.logger.warn(`Error leyendo fuente ${fontPath}: ${e.message}`);
        }
      } else {
        this.logger.warn(`Archivo de fuente no encontrado: ${fontPath}`);
      }
    }

    if (!fontBase64) {
      return '';
    }

    return `  <style>
    @font-face {
      font-family: "${fontName}";
      src: url("data:font/${format};base64,${fontBase64}") format("${format}");
      font-weight: normal;
      font-style: normal;
    }
  </style>`;
  }

  /**
   * SVG de produccion: B&W, 600dpi, medidas exactas del modelo.
   */
  private buildProductionSvg(
    params: RenderParams,
    product: ProductDimensions,
    fontName: string,
    fontFaceCss: string,
    logoUrl?: string,
  ): string {
    const { widthPx, heightPx, widthMm, heightMm, shape } = product;
    const viewBox = `0 0 ${widthPx} ${heightPx}`;
    const widthMmStr = widthMm.toFixed(2);
    const heightMmStr = heightMm.toFixed(2);

    const textElements = params.textLines.map((line, i) => {
      const fontSizePx = Math.round(line.fontSizePt * 8.333);
      const transform = line.rotationDegrees
        ? `transform="rotate(${line.rotationDegrees}, ${line.xPosition}, ${line.yPosition})"`
        : '';

      if (shape === 'CIRCULAR' && params.layout === 'circular') {
        const radius = Math.min(widthPx, heightPx) / 2 - 30;
        const cx = widthPx / 2;
        const cy = heightPx / 2;
        const pathId = `circlePath${i}`;
        return `
    <defs>
      <path id="${pathId}" d="M ${cx - radius},${cy} A ${radius},${radius} 0 1,1 ${cx + radius},${cy} A ${radius},${radius} 0 1,1 ${cx - radius},${cy}" />
    </defs>
    <text font-family="${fontName}" font-size="${fontSizePx}" font-weight="${line.fontWeight}" font-style="${line.fontStyle}" fill="black" text-anchor="middle">
      <textPath href="#${pathId}" startOffset="50%">${this.escapeXml(line.text)}</textPath>
    </text>`;
      }

      return `    <text x="${line.xPosition}" y="${line.yPosition}" font-family="${fontName}" font-size="${fontSizePx}" font-weight="${line.fontWeight}" font-style="${line.fontStyle}" fill="black" text-anchor="${line.textAnchor}" ${transform}>${this.escapeXml(line.text)}</text>`;
    }).join('\n');

    let logoElement = '';
    if (logoUrl && params.logo) {
      logoElement = `    <image x="${params.logo.x}" y="${params.logo.y}" width="${params.logo.width}" height="${params.logo.height}" href="${logoUrl}" filter="url(#grayscale)" />`;
    }

    let defs = '';
    if (logoUrl && params.logo?.grayscale) {
      defs += `  <defs>
    <filter id="grayscale">
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>\n`;
    }

    const cutMark = shape === 'CIRCULAR'
      ? `    <circle cx="${widthPx / 2}" cy="${heightPx / 2}" r="${Math.min(widthPx, heightPx) / 2 - 2}" fill="none" stroke="red" stroke-width="1" stroke-dasharray="5,5" />`
      : `    <rect x="1" y="1" width="${widthPx - 2}" height="${heightPx - 2}" fill="none" stroke="red" stroke-width="1" stroke-dasharray="5,5" />`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${widthMmStr}mm" height="${heightMmStr}mm"
  viewBox="${viewBox}"
  shape-rendering="geometricPrecision">
  <title>Sello de Produccion — ${widthMmStr}mm x ${heightMmStr}mm @ 600dpi</title>
${defs}${fontFaceCss}
  <!-- Marco de corte (no se graba) -->
${cutMark}
  <!-- Contenido del sello -->
${logoElement}
${textElements}
</svg>`;
  }

  /**
   * SVG de preview: color, para mostrar al cliente.
   */
  private buildPreviewSvg(
    params: RenderParams,
    product: ProductDimensions,
    fontName: string,
    fontFaceCss: string,
    inkHex?: string,
    logoUrl?: string,
  ): string {
    const { widthPx, heightPx, shape } = product;
    const inkColor = inkHex || '#000000';
    const viewBox = `0 0 ${widthPx} ${heightPx}`;

    const textElements = params.textLines.map((line, i) => {
      const fontSizePx = Math.round(line.fontSizePt * 8.333);
      const transform = line.rotationDegrees
        ? `transform="rotate(${line.rotationDegrees}, ${line.xPosition}, ${line.yPosition})"`
        : '';

      if (shape === 'CIRCULAR' && params.layout === 'circular') {
        const radius = Math.min(widthPx, heightPx) / 2 - 30;
        const cx = widthPx / 2;
        const cy = heightPx / 2;
        const pathId = `previewCirclePath${i}`;
        return `
    <defs>
      <path id="${pathId}" d="M ${cx - radius},${cy} A ${radius},${radius} 0 1,1 ${cx + radius},${cy} A ${radius},${radius} 0 1,1 ${cx - radius},${cy}" />
    </defs>
    <text font-family="${fontName}" font-size="${fontSizePx}" font-weight="${line.fontWeight}" font-style="${line.fontStyle}" fill="${inkColor}" text-anchor="middle">
      <textPath href="#${pathId}" startOffset="50%">${this.escapeXml(line.text)}</textPath>
    </text>`;
      }

      return `    <text x="${line.xPosition}" y="${line.yPosition}" font-family="${fontName}" font-size="${fontSizePx}" font-weight="${line.fontWeight}" font-style="${line.fontStyle}" fill="${inkColor}" text-anchor="${line.textAnchor}" ${transform}>${this.escapeXml(line.text)}</text>`;
    }).join('\n');

    let logoElement = '';
    if (logoUrl && params.logo) {
      logoElement = `    <image x="${params.logo.x}" y="${params.logo.y}" width="${params.logo.width}" height="${params.logo.height}" href="${logoUrl}" />`;
    }

    const bgElement = shape === 'CIRCULAR'
      ? `    <circle cx="${widthPx / 2}" cy="${heightPx / 2}" r="${Math.min(widthPx, heightPx) / 2}" fill="white" stroke="#e5e7eb" stroke-width="2" />`
      : `    <rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="white" stroke="#e5e7eb" stroke-width="2" rx="4" />`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${widthPx}" height="${heightPx}"
  viewBox="${viewBox}">
  <title>Preview del Sello</title>
${fontFaceCss}
${bgElement}
${logoElement}
${textElements}
</svg>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
