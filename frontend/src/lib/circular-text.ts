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
  // por lo que recorremos el arco en sentido antihorario (angulos decrecientes).
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
  /** Ancho seguro en unidades SVG para textos centrales; si se excede se escala el font-size proporcionalmente. */
  safeWidthSvg?: number;
  /** Ancho del producto en mm para calcular la escala SVG->mm. */
  productWidthMm?: number;
  /** Alto del producto en mm para limitar el texto central verticalmente. */
  productHeightMm?: number;
  /** Forma del producto para calcular margen del marco. */
  productShape?: string;
  /** Escala SVG->mm (productWidthMm / viewBoxWidth). Si no se proporciona, se calcula internamente. */
  scale?: number;
}

function parseSvgViewBoxWidth(svgContent: string): number | null {
  const match = svgContent.match(/viewBox=["'][^"']+\s+[^"']+\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/);
  if (match) return parseFloat(match[1]);
  const widthMatch = svgContent.match(/width=["'](\d+(?:\.\d+)?)(?:mm|px|pt)?["']/);
  if (widthMatch) return parseFloat(widthMatch[1]);
  return null;
}

function parseSvgViewBoxHeight(svgContent: string): number | null {
  const match = svgContent.match(/viewBox=["'][^"']+\s+[^"']+\s+\d+(?:\.\d+)?\s+(\d+(?:\.\d+)?)["']/);
  if (match) return parseFloat(match[1]);
  const heightMatch = svgContent.match(/height=["'](\d+(?:\.\d+)?)(?:mm|px|pt)?["']/);
  if (heightMatch) return parseFloat(heightMatch[1]);
  return null;
}

/**
 * Calcula el ancho disponible para el texto central en unidades SVG.
 * Considera:
 * 1. Los arcos circulares superior e inferior (radio + margen).
 * 2. El marco físico del producto (nunca tocar los bordes del sello).
 * 
 * Retorna el ancho más restrictivo en unidades SVG.
 */
export function computeCentralSafeWidthSvg(
  areas: CircularArea[],
  fontSize: number,
  productWidthMm?: number,
  svgContent?: string,
  fallbackSafeWidthSvg?: number,
  productHeightMm?: number,
  productShape?: string,
): number {
  if (!productWidthMm || !svgContent) {
    return fallbackSafeWidthSvg || 0;
  }
  const viewBoxWidth = parseSvgViewBoxWidth(svgContent);
  const viewBoxHeight = parseSvgViewBoxHeight(svgContent);
  if (!viewBoxWidth) return fallbackSafeWidthSvg || 0;
  const scaleX = productWidthMm / viewBoxWidth;
  const scaleY = viewBoxHeight ? (productHeightMm || productWidthMm) / viewBoxHeight : scaleX;
  const scale = Math.min(scaleX, scaleY);

  // 1. Ancho disponible por arcos circulares (en unidades SVG)
  const circularTop = areas.find((a) => a.type === 'circular' && a.baseline === 'top');
  const circularBottom = areas.find((a) => a.type === 'circular' && a.baseline === 'bottom');

  const availableWidths: number[] = [];
  [circularTop, circularBottom].forEach((area) => {
    if (!area?.radius) return;
    const r = area.radius;
    // Margen de seguridad en unidades SVG: altura de la letra central + altura de las letras circulares
    // + margen adicional. Las letras circulares se extienden hacia el centro del sello.
    // Usamos un margen conservador de 2x (altura central + altura circular) para garantizar separación.
    const circularFontSize = area.fontSize || 9;
    const clearance = (fontSize + circularFontSize) * 1.2;
    if (r > clearance) {
      availableWidths.push(2 * Math.sqrt(r * r - clearance * clearance));
    }
  });

  const circularWidth = availableWidths.length > 0 ? Math.min(...availableWidths) : Infinity;

  // 2. Ancho disponible por el marco físico del producto (convertido a unidades SVG)
  // El texto central nunca debe tocar los bordes del sello.
  const frameMargin = fontSize * 1.5;
  let frameWidthSvg = Infinity;
  if (productShape === 'CIRCULAR') {
    // Para circular: el ancho seguro es el diámetro menos margen en ambos lados
    const diameterMm = Math.min(productWidthMm, productHeightMm || productWidthMm);
    const diameterSvg = diameterMm / scale;
    frameWidthSvg = Math.max(0, diameterSvg - frameMargin * 2);
  } else if (productShape === 'OVAL') {
    // Para oval: ancho del ovalo menos margen
    frameWidthSvg = Math.max(0, viewBoxWidth - frameMargin * 2);
  } else {
    // Rectangular/cuadrado: ancho menos margen
    frameWidthSvg = Math.max(0, viewBoxWidth - frameMargin * 2);
  }

  // Retornar el más restrictivo en unidades SVG
  const result = Math.min(circularWidth, frameWidthSvg);
  if (!isFinite(result)) return fallbackSafeWidthSvg || viewBoxWidth * 0.8 || 0;
  return result;
}

/**
 * Convierte un ancho en unidades SVG a mm usando el scale del producto.
 */
export function svgWidthToMm(widthSvg: number, productWidthMm?: number, svgContent?: string): number {
  if (!productWidthMm || !svgContent) return widthSvg;
  const viewBoxWidth = parseSvgViewBoxWidth(svgContent);
  if (!viewBoxWidth) return widthSvg;
  const scale = productWidthMm / viewBoxWidth;
  return widthSvg * scale;
}

/**
 * Procesa un texto con saltos de línea respetando el ancho máximo por línea.
 * - Respeta los saltos de línea del usuario (\n).
 * - Si una línea excede el ancho, hace word-wrap automático dentro de esa línea.
 * - Nunca excede maxLines en total. Si sobran líneas, trunca la última.
 */
export function wrapCentralText(
  text: string,
  fontSize: number,
  safeWidthSvg: number,
  maxLines: number,
): { lines: string[]; wasTruncated: boolean } {
  if (!safeWidthSvg || safeWidthSvg <= 0 || !text) {
    return { lines: [text || ''], wasTruncated: false };
  }

  const userLines = text.split('\n');
  const resultLines: string[] = [];
  let wasTruncated = false;

  for (const userLine of userLines) {
    // Si ya alcanzamos maxLines, truncar y salir
    if (resultLines.length >= maxLines) {
      wasTruncated = true;
      break;
    }

    const trimmedLine = userLine.trim();
    if (!trimmedLine) {
      // Línea vacía del usuario: solo agregar si hay espacio
      if (resultLines.length < maxLines) {
        resultLines.push('');
      }
      continue;
    }

    // Verificar si la línea del usuario cabe completa
    const lineWidth = estimateTextWidth(trimmedLine, fontSize);
    if (lineWidth <= safeWidthSvg) {
      // Cabe completa, respetarla
      if (resultLines.length < maxLines) {
        resultLines.push(trimmedLine);
      } else {
        wasTruncated = true;
      }
      continue;
    }

    // La línea excede el ancho. Hacer word-wrap dentro de ella.
    const words = trimmedLine.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      // Verificar si ya alcanzamos maxLines
      if (resultLines.length >= maxLines) {
        wasTruncated = true;
        break;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = estimateTextWidth(testLine, fontSize);

      if (testWidth <= safeWidthSvg) {
        currentLine = testLine;
        continue;
      }

      // La palabra con espacio no cabe. ¿Cabe sola?
      const wordWidth = estimateTextWidth(word, fontSize);
      if (wordWidth <= safeWidthSvg) {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = word;
        }
      } else {
        // La palabra sola NO cabe. Dividirla por caracteres.
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = '';
        }

        if (resultLines.length >= maxLines) {
          wasTruncated = true;
          break;
        }

        let chars = word;
        while (chars.length > 0) {
          if (!currentLine) {
            if (estimateTextWidth(chars[0], fontSize) > safeWidthSvg) {
              return { lines: resultLines.length > 0 ? resultLines : [''], wasTruncated: true };
            }
            currentLine = chars[0];
            chars = chars.slice(1);
            continue;
          }

          const combined = `${currentLine}${chars[0]}`;
          if (estimateTextWidth(combined, fontSize) > safeWidthSvg) {
            resultLines.push(currentLine);
            currentLine = '';

            if (resultLines.length >= maxLines) {
              wasTruncated = true;
              // Truncar última línea
              const lastIdx = resultLines.length - 1;
              let lastLine = resultLines[lastIdx];
              while (lastLine.length > 0 && estimateTextWidth(lastLine, fontSize) > safeWidthSvg) {
                lastLine = lastLine.slice(0, -1);
              }
              resultLines[lastIdx] = lastLine;
              break;
            }
          } else {
            currentLine = combined;
            chars = chars.slice(1);
          }
        }
      }
    }

    // Agregar la última línea del procesamiento de esta línea de usuario
    if (currentLine && resultLines.length < maxLines) {
      resultLines.push(currentLine);
    } else if (currentLine && resultLines.length >= maxLines) {
      wasTruncated = true;
    }
  }

  // Truncar si excedimos maxLines (por seguridad)
  const finalLines = resultLines.slice(0, maxLines);
  if (finalLines.length > 0) {
    const lastIdx = finalLines.length - 1;
    let lastLine = finalLines[lastIdx];
    while (lastLine.length > 0 && estimateTextWidth(lastLine, fontSize) > safeWidthSvg) {
      lastLine = lastLine.slice(0, -1);
    }
    finalLines[lastIdx] = lastLine;
  }

  return { lines: finalLines.length > 0 ? finalLines : [''], wasTruncated: wasTruncated || resultLines.length > maxLines };
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

      // Calcular ancho disponible central en unidades SVG
      const safeWidthSvg = computeCentralSafeWidthSvg(
        areas,
        fontSize,
        options?.productWidthMm,
        svgContent,
        options?.safeWidthSvg,
        options?.productHeightMm,
        options?.productShape,
      );

      // Aplicar word-wrap inteligente respetando saltos de línea del usuario
      const wrapResult = wrapCentralText(value, fontSize, safeWidthSvg, maxLines);
      const clampedLines = wrapResult.lines;
      if (clampedLines.length === 0) clampedLines.push('');

      const centerY = area.y;
      const count = clampedLines.length;
      let startY = centerY;
      if (count === 2) startY = centerY - lineHeight / 2;
      else if (count >= 3) startY = centerY - lineHeight;

      clampedLines.forEach((line, idx) => {
        // Si el texto central excede el ancho seguro, escalar el font-size proporcionalmente
        // para que no invada los textos circulares. Nunca escalar por debajo del minimo.
        let effectiveFontSize = fontSize;
        if (safeWidthSvg && area.x !== undefined) {
          const lineWidth = estimateTextWidth(line, fontSize);
          if (lineWidth > safeWidthSvg && lineWidth > 0) {
            effectiveFontSize = fontSize * (safeWidthSvg / lineWidth);
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
