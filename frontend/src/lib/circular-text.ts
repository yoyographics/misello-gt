export interface CircularArea {
  id: string;
  label: string;
  defaultText: string;
  type?: 'text' | 'circular';
  radius?: number;
  centerX?: number;
  centerY?: number;
  startAngle?: number;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  baseline?: 'top' | 'bottom';
  x?: number;
  y?: number;
  maxLength?: number;
  /** Permitir saltos de línea dentro del mismo campo central. */
  multiLine?: boolean;
  /** Máximo de líneas permitidas (por defecto 3). */
  maxLines?: number;
  /** Interlineado en unidades SVG (por defecto fontSize * 1.2). */
  lineHeight?: number;
  /** Tamaño minimo permitido para esta area (pt). */
  minFontSize?: number;
}

const DEFAULT_LINE_HEIGHT_RATIO = 1.2;

export function estimateTextWidth(text: string, fontSize: number): number {
  return text
    .split('')
    .reduce((sum, char) => sum + estimateCharWidth(char, fontSize), 0);
}

const DEFAULT_FONT_SIZE = 9;
const WIDTH_MAP: Record<string, number> = {
  I: 0.28, i: 0.28, l: 0.28, '!': 0.28, '.': 0.28, ',': 0.28, ';': 0.28,
  ':': 0.28, '|': 0.28, ' ': 0.3,
  j: 0.32, '(': 0.33, ')': 0.33, '[': 0.33, ']': 0.33,
  f: 0.36, t: 0.38, r: 0.4,
  s: 0.42, z: 0.42, c: 0.43, v: 0.43, x: 0.43, y: 0.43,
  a: 0.48, e: 0.48, g: 0.48, o: 0.48, p: 0.48, q: 0.48, b: 0.5, d: 0.5, h: 0.5, n: 0.5, u: 0.5,
  k: 0.52,
  R: 0.58, E: 0.58, S: 0.58, Z: 0.58, C: 0.6, G: 0.6, O: 0.6, Q: 0.62, A: 0.62, V: 0.62, Y: 0.62,
  X: 0.62, K: 0.62, T: 0.6, F: 0.58, P: 0.58, B: 0.62, D: 0.64, H: 0.66, N: 0.66, U: 0.66,
  L: 0.54, J: 0.48, M: 0.74, W: 0.74,
  '0': 0.52, '1': 0.34, '2': 0.5, '3': 0.5, '4': 0.5, '5': 0.5, '6': 0.52, '7': 0.5, '8': 0.52, '9': 0.52,
  '-': 0.36, '/': 0.34, '\\': 0.34,
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function estimateCharWidth(char: string, fontSize: number): number {
  const width = WIDTH_MAP[char] ?? 0.5;
  return fontSize * width;
}

export function renderCircularText(
  svgContent: string,
  text: string,
  area: CircularArea,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Buscar si ya existe un textPath para este campo
  const textEl = doc.querySelector(`text[data-field="${area.id}"]`);
  if (textEl && textEl.querySelector('textPath')) {
    const tp = textEl.querySelector('textPath');
    if (tp) {
      // Reemplazar el texto manteniendo la estructura
      const innerTspan = tp.querySelector('tspan');
      if (innerTspan) {
        const deepest = getDeepestTspan(innerTspan);
        deepest.textContent = text;
      } else {
        tp.textContent = text;
      }
      return new XMLSerializer().serializeToString(doc.documentElement);
    }
  }

  // Fallback: generar letras individuales
  return renderCircularTextAsLetters(svgContent, text, area);
}

function getDeepestTspan(el: Element): Element {
  const child = el.querySelector('tspan');
  return child ? getDeepestTspan(child) : el;
}

function getPathMidpoint(pathEl: SVGPathElement): { x: number; y: number } | null {
  try {
    const len = pathEl.getTotalLength();
    const p = pathEl.getPointAtLength(len / 2);
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}

function pathMatchesArea(pathEl: SVGPathElement, area: CircularArea): boolean {
  const mid = getPathMidpoint(pathEl);
  if (!mid) return false;

  if (area.type === 'circular' && area.radius && area.centerX !== undefined && area.centerY !== undefined) {
    const dx = mid.x - area.centerX;
    const dy = mid.y - area.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const tolerance = area.radius * 0.25;
    const baseline = area.baseline || 'top';
    const sideOk = baseline === 'top' ? mid.y < area.centerY : mid.y > area.centerY;
    return Math.abs(dist - area.radius) < tolerance && sideOk;
  }

  if (area.type === 'text' && area.x !== undefined && area.y !== undefined) {
    const fontSize = area.fontSize || DEFAULT_FONT_SIZE;
    return Math.abs(mid.x - area.x) < fontSize * 4 && Math.abs(mid.y - area.y) < fontSize * 3;
  }

  return false;
}

function removeOriginalPathGroups(doc: Document, areas: CircularArea[]): void {
  doc.querySelectorAll('g').forEach((g) => {
    const groupPaths = Array.from(g.children).filter((el) => el.tagName.toLowerCase() === 'path') as SVGPathElement[];
    if (groupPaths.length < 3) return;

    for (const area of areas) {
      const matches = groupPaths.filter((p) => pathMatchesArea(p, area));
      if (matches.length >= 3 && matches.length >= groupPaths.length * 0.5) {
        g.remove();
        break;
      }
    }
  });
}

function renderCircularTextAsLetters(
  svgContent: string,
  text: string,
  area: CircularArea,
): string {
  const radius = area.radius || 40;
  const centerX = area.centerX ?? 45.355;
  const centerY = area.centerY ?? 45.355;
  const fontSize = area.fontSize || DEFAULT_FONT_SIZE;
  const fontFamily = area.fontFamily || 'Arial, sans-serif';
  const letterSpacing = area.letterSpacing ?? 0.2;
  const baseline = area.baseline || 'top';
  const startAngle = area.startAngle ?? (baseline === 'top' ? -90 : 90);

  if (!text) text = area.defaultText || '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  const existing = doc.querySelector(`g[data-circular-field="${area.id}"]`);
  if (existing) existing.remove();

  const chars = text.split('');
  const charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
  const totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
  const totalAngleRad = totalWidth / radius;
  const startAngleRad = degToRad(startAngle);

  // Para el arco inferior el texto debe leerse de izquierda a derecha,
  // por lo que recorremos el arco en sentido antihorario (ángulos decrecientes).
  const isBottom = baseline === 'bottom';
  const direction = isBottom ? -1 : 1;
  let currentAngle = startAngleRad - (direction * totalAngleRad) / 2;

  const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-circular-field', area.id);
  group.setAttribute('class', 'circular-text');

  chars.forEach((char, idx) => {
    const charWidth = charWidths[idx];
    const angle = currentAngle + direction * (charWidth / 2 + letterSpacing / 2) / radius;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    let rotation = (angle * 180) / Math.PI;
    if (baseline === 'top') {
      rotation += 90;
    } else {
      rotation -= 90;
    }

    const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x.toFixed(2));
    textEl.setAttribute('y', y.toFixed(2));
    textEl.setAttribute('transform', `rotate(${rotation.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`);
    textEl.setAttribute('font-family', fontFamily);
    textEl.setAttribute('font-size', fontSize.toString());
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.textContent = char === ' ' ? '\u00A0' : char;

    group.appendChild(textEl);
    currentAngle = angle + direction * (charWidth / 2 + letterSpacing / 2) / radius;
  });

  doc.documentElement.appendChild(group);

  return new XMLSerializer().serializeToString(doc.documentElement);
}

export interface ApplyTemplateFieldsOptions {
  /** Ancho seguro en mm para textos centrales; si se excede se escala el font-size proporcionalmente. */
  safeWidthMm?: number;
  /** Ancho del producto en mm para calcular la escala SVG->mm. */
  productWidthMm?: number;
}

function parseSvgViewBoxWidth(svgContent: string): number | null {
  const match = svgContent.match(/viewBox=["'][^"']+\s+[^"']+\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/);
  if (match) return parseFloat(match[1]);
  const widthMatch = svgContent.match(/width=["'](\d+(?:\.\d+)?)(?:mm|px|pt)?["']/);
  if (widthMatch) return parseFloat(widthMatch[1]);
  return null;
}

/**
 * Calcula el ancho disponible para el texto central considerando los arcos circulares
 * superior e inferior. Evita que el texto central toque los textos circulares.
 * Si no hay datos suficientes retorna el fallback.
 */
export function computeCentralSafeWidthMm(
  areas: CircularArea[],
  fontSizeMm: number,
  productWidthMm?: number,
  svgContent?: string,
  fallbackSafeWidthMm?: number,
): number {
  if (!productWidthMm || !svgContent) {
    return fallbackSafeWidthMm || productWidthMm || 0;
  }
  const viewBoxWidth = parseSvgViewBoxWidth(svgContent);
  if (!viewBoxWidth) return fallbackSafeWidthMm || productWidthMm || 0;
  const scale = productWidthMm / viewBoxWidth;

  const circularTop = areas.find((a) => a.type === 'circular' && a.baseline === 'top');
  const circularBottom = areas.find((a) => a.type === 'circular' && a.baseline === 'bottom');

  if (!circularTop && !circularBottom) {
    return fallbackSafeWidthMm || productWidthMm || 0;
  }

  const availableWidths: number[] = [];
  [circularTop, circularBottom].forEach((area) => {
    if (!area?.radius) return;
    const rMm = area.radius * scale;
    const halfHeight = fontSizeMm / 2;
    if (rMm > halfHeight) {
      availableWidths.push(2 * Math.sqrt(rMm * rMm - halfHeight * halfHeight));
    }
  });

  if (availableWidths.length === 0) return fallbackSafeWidthMm || productWidthMm || 0;
  return Math.min(...availableWidths);
}

export function applyTemplateFields(
  svgContent: string,
  fields: Record<string, string>,
  areas: CircularArea[],
  options?: ApplyTemplateFieldsOptions,
): string {
  let result = svgContent;

  areas.forEach((area) => {
    if (area.type === 'circular') {
      const value = fields[area.id] ?? area.defaultText ?? '';
      result = renderCircularText(result, value, area);
    }
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(result, 'image/svg+xml');

  // Ocultar elementos marcados por el admin (textos originales convertidos a path, líneas decorativas, etc.)
  doc.querySelectorAll('[data-hide-on-render="true"]').forEach((el) => el.remove());

  // Si el SVG aun contiene textos originales convertidos a paths (por un guardado anterior),
  // eliminar los grupos de paths que coincidan con las areas editables.
  removeOriginalPathGroups(doc, areas);

  // Textos normales data-editable
  const texts = doc.querySelectorAll('text[data-editable="true"]');
  texts.forEach((el) => {
    const field = el.getAttribute('data-field');
    const area = field ? areas.find((a) => a.id === field) : undefined;
    if (area?.fontFamily) el.setAttribute('font-family', area.fontFamily);
    if (area?.fontSize) el.setAttribute('font-size', String(area.fontSize));
    if (field && fields[field] !== undefined) {
      // Si tiene textPath, reemplazar ahi
      const tp = el.querySelector('textPath');
      if (tp) {
        const deepest = getDeepestTspan(tp);
        deepest.textContent = fields[field];
      } else {
        el.textContent = fields[field];
      }
    }
  });

  // Textos centrales detectados
  areas.forEach((area) => {
    if (area.type === 'text' && area.x !== undefined && area.y !== undefined) {
      const rawValue = fields[area.id] ?? area.defaultText ?? '';
      const value = String(rawValue);

      // Remover líneas centrales previas generadas por este campo
      doc.querySelectorAll(`text[data-central-field="${area.id}"]`).forEach((el) => el.remove());

      // Ocultar el texto editable original para evitar que se vea detrás del reemplazo
      const original = doc.querySelector(`text[data-editable="true"][data-field="${area.id}"]`);
      if (original) {
        original.setAttribute('visibility', 'hidden');
      }

      const fontSize = area.fontSize || DEFAULT_FONT_SIZE;
      const lineHeight = area.lineHeight || fontSize * DEFAULT_LINE_HEIGHT_RATIO;
      const maxLines = Math.max(1, Math.min(area.maxLines || 3, 3));

      // Dividir en líneas cuando el campo permita multilinea (saltos \n)
      const lines = (area.multiLine !== false ? value.split('\n') : [value])
        .map((l) => l.trim())
        .filter((l, idx, arr) => l !== '' || arr.length === 1);
      const clampedLines = lines.slice(0, maxLines);
      if (clampedLines.length === 0) clampedLines.push('');

      const centerY = area.y;
      const count = clampedLines.length;
      let startY = centerY;
      if (count === 2) startY = centerY - lineHeight / 2;
      else if (count >= 3) startY = centerY - lineHeight;

      // Calcular ancho disponible central basado en los radios reales de los textos circulares
      const centralFontSizeMm = fontSize * 0.3528;
      const safeWidthMm = computeCentralSafeWidthMm(
        areas,
        centralFontSizeMm,
        options?.productWidthMm,
        svgContent,
        options?.safeWidthMm,
      );

      clampedLines.forEach((line, idx) => {
        // Si el texto central excede el ancho seguro, escalar el font-size proporcionalmente
        // para que no invada los textos circulares. Nunca escalar por debajo del minimo.
        let effectiveFontSize = fontSize;
        if (safeWidthMm && area.x !== undefined) {
          const lineWidthMm = estimateTextWidth(line, fontSize) * 0.3528;
          if (lineWidthMm > safeWidthMm && lineWidthMm > 0) {
            effectiveFontSize = fontSize * (safeWidthMm / lineWidthMm);
          }
        }
        const minFontSize = area.minFontSize ?? 1;
        effectiveFontSize = Math.max(effectiveFontSize, minFontSize);

        const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('data-central-field', area.id);
        textEl.setAttribute('data-central-line', String(idx));
        textEl.setAttribute('x', String(area.x));
        textEl.setAttribute('y', String(startY + idx * lineHeight));
        textEl.setAttribute('font-size', String(effectiveFontSize));
        if (area.fontFamily) textEl.setAttribute('font-family', area.fontFamily);
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'central');
        textEl.textContent = line;
        doc.documentElement.appendChild(textEl);
      });
    }
  });

  return new XMLSerializer().serializeToString(doc.documentElement);
}
