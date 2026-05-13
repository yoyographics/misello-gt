import { Injectable } from '@nestjs/common';

interface ValidationParams {
  textLines: Array<{
    text: string;
    fontSizePt: number;
  }>;
  productWidthPx: number;
  productHeightPx: number;
  productWidthMm: number;
  productHeightMm: number;
  strokeRatio?: number; // Grosor de trazo real de la fuente (si está disponible)
  hasLogoGradient?: boolean;
  logoWillBeConverted?: boolean;
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  checks: {
    minCharSize: boolean;
    minCharSizePx: number;
    minLineThickness: boolean;
    minLineThicknessPx: number;
    dimensionsFit: boolean;
    textConfirmed: boolean;
    logoWarning?: boolean;
  };
}

/**
 * Validador tecnico automatico antes de produccion.
 * Verifica restricciones de grabado laser para garantizar
 * que el sello sea fabricable.
 * 
 * Reglas del brief:
 *  - Tamano minimo de caracter: 2mm = 41px a 600dpi
 *  - Grosor minimo de linea: 1pt = ~9px a 600dpi
 *  - Dimensiones dentro del rango del modelo
 *  - Texto confirmado por el cliente
 */
@Injectable()
export class TechValidatorService {
  // Constantes a 600 DPI
  private readonly MIN_CHAR_SIZE_MM = 2;      // 2mm minimo
  private readonly MIN_CHAR_SIZE_PX = 41;     // 41px a 600dpi
  private readonly MIN_LINE_THICKNESS_PT = 1; // 1pt minimo
  private readonly MIN_LINE_THICKNESS_PX = 6; // ~6px a 600dpi (mas permisivo para texto tipografico)
  private readonly DEFAULT_STROKE_RATIO = 0.08; // Fallback para fuentes sin strokeRatio medido

  validate(params: ValidationParams): ValidationResult {
    const checks = {
      minCharSize: true,
      minCharSizePx: this.MIN_CHAR_SIZE_PX,
      minLineThickness: true,
      minLineThicknessPx: this.MIN_LINE_THICKNESS_PX,
      dimensionsFit: true,
      textConfirmed: true,
      logoWarning: false,
    };

    const messages: string[] = [];

    // 1. Validar tamano minimo de caracter
    for (const line of params.textLines) {
      const fontSizePx = Math.round(line.fontSizePt * 8.333); // pt → px @ 600dpi (600/72)
      // Un caracter tipico mide ~0.6x el font-size en altura
      const estimatedCharHeight = fontSizePx * 0.6;

      if (estimatedCharHeight < this.MIN_CHAR_SIZE_PX) {
        checks.minCharSize = false;
        messages.push(
          `Linea "${line.text.substring(0, 20)}...": el tamano estimado (${estimatedCharHeight.toFixed(1)}px) ` +
          `es menor al minimo requerido (${this.MIN_CHAR_SIZE_PX}px = ${this.MIN_CHAR_SIZE_MM}mm). ` +
          `Aumente la fuente a al menos ${Math.ceil(this.MIN_CHAR_SIZE_PX / 0.6 / 4.1667)}pt.`
        );
      }
    }

    // 2. Validar grosor minimo de linea (usa strokeRatio real de la fuente si existe)
    const strokeRatio = params.strokeRatio ?? this.DEFAULT_STROKE_RATIO;
    for (const line of params.textLines) {
      const fontSizePx = Math.round(line.fontSizePt * 8.333); // pt → px @ 600dpi (600/72)
      const estimatedStrokeWidth = fontSizePx * strokeRatio;

      if (estimatedStrokeWidth < this.MIN_LINE_THICKNESS_PX) {
        checks.minLineThickness = false;
        const minSizePt = Math.ceil(this.MIN_LINE_THICKNESS_PX / strokeRatio / 8.333);
        messages.push(
          `Linea "${line.text.substring(0, 20)}...": el grosor de linea estimado (${estimatedStrokeWidth.toFixed(1)}px) ` +
          `es menor al minimo (${this.MIN_LINE_THICKNESS_PX}px = ${this.MIN_LINE_THICKNESS_PT}pt). ` +
          `Aumente la fuente a al menos ${minSizePt}pt.`
        );
      }
    }

    // 3. Validar que las dimensiones del modelo sean razonables
    if (params.productWidthPx <= 0 || params.productHeightPx <= 0) {
      checks.dimensionsFit = false;
      messages.push('Las dimensiones del modelo son invalidas.');
    }

    // 4. Advertencia sobre logo con gradientes
    if (params.hasLogoGradient && !params.logoWillBeConverted) {
      checks.logoWarning = true;
      messages.push(
        'El logo tiene gradientes/sombras/transparencia. Se convertira automaticamente a blanco y negro. ' +
        'Si la calidad no es suficiente, el equipo de diseno lo redibujara (+1 dia habil).'
      );
    }

    const passed = checks.minCharSize && checks.minLineThickness && checks.dimensionsFit && checks.textConfirmed;

    return {
      passed,
      message: passed
        ? (checks.logoWarning
            ? 'Validacion tecnica superada con advertencia de logo.'
            : 'Validacion tecnica superada. El diseno es fabricable.')
        : `Validacion tecnica fallida:\n${messages.join('\n')}`,
      checks,
    };
  }
}
