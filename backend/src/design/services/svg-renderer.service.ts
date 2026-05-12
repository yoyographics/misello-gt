import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { randomUUID } from 'crypto';

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
 * Genera SVG de produccion (B&W, 600dpi) y PNG de preview (color).
 * Retorna los archivos como data URIs base64 para evitar dependencia del filesystem.
 */
@Injectable()
export class SvgRendererService {
  private readonly logger = new Logger(SvgRendererService.name);

  async render(
    params: RenderParams,
    product: ProductDimensions,
    fontName: string,
    inkHex?: string,
    logoUrl?: string,
  ): Promise<{ svgDataUri: string; pngDataUri: string; designId: string }> {
    const designId = randomUUID();

    // 1. Generar SVG de produccion (B&W)
    const productionSvg = this.buildProductionSvg(params, product, fontName, logoUrl);
    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(productionSvg, 'utf-8').toString('base64')}`;

    // 2. Generar PNG de preview (color)
    const previewSvg = this.buildPreviewSvg(params, product, fontName, inkHex, logoUrl);
    const pngBuffer = await this.svgToPng(previewSvg, product.widthPx, product.heightPx);
    const pngDataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    this.logger.log(`Renderizado: ${designId} (${product.widthPx}x${product.heightPx}px)`);
    return { svgDataUri, pngDataUri, designId };
  }

  /**
   * SVG de produccion: B&W, 600dpi, medidas exactas del modelo.
   */
  private buildProductionSvg(
    params: RenderParams,
    product: ProductDimensions,
    fontName: string,
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

    const defs = logoUrl && params.logo?.grayscale
      ? `  <defs>
    <filter id="grayscale">
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>`
      : '';

    const cutMark = shape === 'CIRCULAR'
      ? `    <circle cx="${widthPx / 2}" cy="${heightPx / 2}" r="${Math.min(widthPx, heightPx) / 2 - 2}" fill="none" stroke="red" stroke-width="1" stroke-dasharray="5,5" />`
      : `    <rect x="1" y="1" width="${widthPx - 2}" height="${heightPx - 2}" fill="none" stroke="red" stroke-width="1" stroke-dasharray="5,5" />`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${widthMmStr}mm" height="${heightMmStr}mm"
  viewBox="${viewBox}"
  shape-rendering="geometricPrecision">
  <title>Sello de Produccion — ${widthMmStr}mm x ${heightMmStr}mm @ 600dpi</title>
${defs}
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
${bgElement}
${logoElement}
${textElements}
</svg>`;
  }

  private async svgToPng(svgString: string, width: number, height: number): Promise<Buffer> {
    return sharp(Buffer.from(svgString, 'utf-8'), {
      density: 600,
    })
      .resize(width, height, { fit: 'fill' })
      .png()
      .toBuffer();
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
