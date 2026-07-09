export interface CircularArea {
  id: string;
  label: string;
  defaultText: string;
  type?: 'text' | 'circular' | 'reserved';
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
  /** Para áreas reservadas (sellos fechadores). */
  width?: number;
  height?: number;
}

/** Información del marco/borde del sello detectado desde paths del SVG. */
export interface FrameInfo {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
}

const DEFAULT_LINE_HEIGHT_RATIO = 1.2;

/**
 * Detecta el marco/borde circular del sello desde los <path> del SVG.
 * Busca paths que formen círculos concéntricos (común en sellos redondos).
 * Retorna el círculo más grande encontrado (el borde exterior).
 */
export function detectFrameFromSvg(svgContent: string): FrameInfo | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  const paths = Array.from(doc.querySelectorAll('path'));
  const circles: FrameInfo[] = [];

  for (const path of paths) {
    const d = path.getAttribute('d') || '';
    const strokeWidth = parseFloat(path.getAttribute('stroke-width') || '0');

    // Intentar detectar círculo desde path
    const circle = parseCircleFromPath(d);
    if (circle) {
      circles.push({ ...circle, strokeWidth });
    }
  }

  if (circles.length === 0) return null;

  // Retornar el círculo más grande (borde exterior del sello)
  return circles.reduce((largest, c) => (c.radius > largest.radius ? c : largest));
}

/**
 * Parsea un path SVG en busca de comandos que formen un círculo.
 * Soporta:
 * - Path de arco completo: M x y A r r 0 1 1 x2 y2
 * - Path de círculo con movimiento relativo: M cx,cy m -r,0 a r,r 0 1,0 r*2,0 a r,r 0 1,0 -r*2,0
 */
function parseCircleFromPath(d: string): { cx: number; cy: number; radius: number } | null {
  // Patrón 1: Arco completo (usado por textPath circular)
  // M cx-r cy A r r 0 1 1 cx-r+ε cy
  const arcMatch = d.match(/M\s+([\d.]+)\s+([\d.]+)\s+A\s+([\d.]+)\s+([\d.]+)\s+0\s+1\s+1\s+([\d.]+)\s+([\d.]+)/i);
  if (arcMatch) {
    const x1 = parseFloat(arcMatch[1]);
    const y1 = parseFloat(arcMatch[2]);
    const rx = parseFloat(arcMatch[3]);
    const ry = parseFloat(arcMatch[4]);
    const x2 = parseFloat(arcMatch[5]);
    const y2 = parseFloat(arcMatch[6]);

    // Para un círculo completo: x2 ≈ x1, y2 ≈ y1, rx ≈ ry
    if (Math.abs(rx - ry) < 0.01 && Math.abs(x2 - x1) < 0.1 && Math.abs(y2 - y1) < 0.1) {
      return { cx: x1 + rx, cy: y1, radius: rx };
    }
  }

  // Patrón 2: Path de círculo con movimiento relativo (común en Illustrator)
  // M cx cy m -r 0 a r r 0 1 0 r*2 0 a r r 0 1 0 -r*2 0
  const relMatch = d.match(/M\s+([\d.]+)\s+([\d.]+)\s+m\s+(-?[\d.]+)\s+(-?[\d.]+)\s+a\s+([\d.]+)\s+([\d.]+)/i);
  if (relMatch) {
    const cx = parseFloat(relMatch[1]);
    const cy = parseFloat(relMatch[2]);
    const r = Math.abs(parseFloat(relMatch[5]));
    return { cx, cy, radius: r };
  }

  // Patrón 3: Múltiples arcos que forman círculo (común en exports de Illustrator)
  // M x y A rx ry 0 0 1 x2 y2 A rx ry 0 0 1 x3 y3 ...
  // Detectar bounding box del path para estimar círculo
  const allCoords = d.match(/[MLACHV]\s+([\d.-]+)(?:[\s,]+([\d.-]+))?/gi);
  if (allCoords && allCoords.length >= 4) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const coord of allCoords) {
      const nums = coord.match(/[\d.-]+/g);
      if (nums) {
        for (let i = 0; i < nums.length; i += 2) {
          const x = parseFloat(nums[i]);
          const y = parseFloat(nums[i + 1]);
          if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
          if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        }
      }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    // Si es aproximadamente cuadrado, podría ser un círculo
    if (width > 0 && height > 0 && Math.abs(width - height) / Math.max(width, height) < 0.1) {
      return {
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        radius: Math.max(width, height) / 2,
      };
    }
  }

  return null;
}

export function estimateTextWidth(text: string, fontSize: number): number {
  return text
    .split('')
    .reduce((sum, char) => sum + estimateCharWidth(char, fontSize), 0);
}

export function truncateTextToWidth(text: string, fontSize: number, maxWidth: number): string {
  let accumulatedWidth = 0;
  let truncateIndex = 0;
  for (let i = 0; i < text.length; i++) {
    const charW = estimateCharWidth(text[i], fontSize);
    if (accumulatedWidth + charW > maxWidth) {
      truncateIndex = i;
      break;
    }
    accumulatedWidth += charW;
    truncateIndex = i + 1;
  }
  return text.slice(0, truncateIndex);
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
  frame?: FrameInfo | null,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Buscar si ya existe un textPath para este campo (SVG nativo de Illustrator)
  const textEl = doc.querySelector(`text[data-field="${area.id}"]`);
  if (textEl && textEl.querySelector('textPath')) {
    // Para texto circular inferior, NO usar el textPath nativo de Illustrator
    // porque el path está diseñado para arco superior (texto aparece torcido/invertido).
    // En su lugar, regenerar el path con la orientación correcta.
    if (area.baseline === 'bottom') {
      const tp = textEl.querySelector('textPath');
      if (tp) {
        // Obtener el ID del path referenciado para eliminarlo
        const href = tp.getAttribute('xlink:href') || tp.getAttribute('href') || '';
        const pathId = href.replace('#', '');
        if (pathId) {
          const pathEl = doc.querySelector(`path[id="${pathId}"]`);
          if (pathEl) pathEl.remove();
        }
        tp.remove();
      }
      // Eliminar atributos de posicionamiento del text original para evitar conflictos
      textEl.removeAttribute('x');
      textEl.removeAttribute('y');
      textEl.removeAttribute('transform');
      // Generar nuevo textPath con orientación correcta para inferior
      return renderCircularTextPath(
        new XMLSerializer().serializeToString(doc.documentElement),
        text,
        area,
        frame,
      );
    }

    const tp = textEl.querySelector('textPath');
    if (tp) {
      // Reemplazar el texto manteniendo la estructura nativa de Illustrator
      const innerTspan = tp.querySelector('tspan');
      if (innerTspan) {
        const deepest = getDeepestTspan(innerTspan);
        deepest.textContent = text;
      } else {
        tp.textContent = text;
      }
      // Aplicar fuente configurada si es diferente
      if (area.fontFamily) textEl.setAttribute('font-family', area.fontFamily);
      if (area.fontSize) textEl.setAttribute('font-size', String(area.fontSize));
      return new XMLSerializer().serializeToString(doc.documentElement);
    }
  }

  // Fallback: si no hay textPath nativo, usar textPath generado
  // NOTA: Las plantillas antiguas sin textPath nativo deberían ser actualizadas
  return renderCircularTextPath(svgContent, text, area, frame);
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
  frame?: FrameInfo | null,
): string {
  const radius = area.radius || 40;
  const centerX = area.centerX ?? 45.355;
  const centerY = area.centerY ?? 45.355;
  let fontSize = area.fontSize || DEFAULT_FONT_SIZE;
  const fontFamily = area.fontFamily || 'Arial, sans-serif';
  const letterSpacing = area.letterSpacing ?? 0.2;
  const baseline = area.baseline || 'top';
  const startAngle = area.startAngle ?? (baseline === 'top' ? -90 : 90);
  const minFontSize = area.minFontSize ?? 1;

  if (!text) text = area.defaultText || '';

  // Calcular el arco máximo disponible para el texto circular.
  // El texto no debe salirse del marco del sello.
  // El arco disponible es un semicírculo (180° = π radianes) menos un margen de seguridad.
  // El margen es proporcional al tamaño de la fuente para evitar que las letras toquen los lados.
  const marginAngle = Math.max(0.1, fontSize / radius); // Margen angular mínimo
  const maxArcAngle = Math.PI - marginAngle * 2; // Semicírculo menos márgenes

  // Calcular el ancho total del texto al tamaño actual
  let chars = text.split('');
  let charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
  let totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
  let totalAngleRad = totalWidth / radius;

  // Si el texto excede el arco disponible, intentar reducir el font-size proporcionalmente
  if (totalAngleRad > maxArcAngle) {
    const scaleFactor = maxArcAngle / totalAngleRad;
    const scaledFontSize = fontSize * scaleFactor;

    if (scaledFontSize >= minFontSize) {
      // Auto-escalar: reducir font-size para que quepa
      fontSize = scaledFontSize;
      charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
      totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
      totalAngleRad = totalWidth / radius;
    } else {
      // Ni siquiera al mínimo cabe. Truncar el texto.
      fontSize = minFontSize;
      // Recalcular cuántos caracteres caben al tamaño mínimo
      const maxWidth = maxArcAngle * radius;
      let accumulatedWidth = 0;
      let truncateIndex = 0;
      for (let i = 0; i < chars.length; i++) {
        const charW = estimateCharWidth(chars[i], fontSize);
        if (accumulatedWidth + charW > maxWidth) {
          truncateIndex = i;
          break;
        }
        accumulatedWidth += charW + letterSpacing;
        truncateIndex = i + 1;
      }
      chars = chars.slice(0, truncateIndex);
      charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
      totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
      totalAngleRad = totalWidth / radius;
    }
  }

  const startAngleRad = degToRad(startAngle);

  // Para el arco inferior el texto debe leerse de izquierda a derecha,
  // por lo que recorremos el arco en sentido antihorario (angulos decrecientes).
  const isBottom = baseline === 'bottom';
  const direction = isBottom ? -1 : 1;
  let currentAngle = startAngleRad - (direction * totalAngleRad) / 2;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  const existing = doc.querySelector(`g[data-circular-field="${area.id}"]`);
  if (existing) existing.remove();

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
    // La baseline del texto está sobre el círculo. Con dominant-baseline="central",
    // el centro geométrico de la letra está en (x,y). Pero queremos que la baseline
    // (línea sobre la que se sientan las letras) esté en el círculo.
    // La baseline está aproximadamente a fontSize * 0.35 por debajo del centro.
    // Desplazamos la letra hacia el centro del círculo para alinear la baseline.
    const baselineOffset = fontSize * 0.35;
    const offsetX = -Math.cos(angle) * baselineOffset;
    const offsetY = -Math.sin(angle) * baselineOffset;
    textEl.setAttribute('dx', offsetX.toFixed(2));
    textEl.setAttribute('dy', offsetY.toFixed(2));
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

  // 0. Detectar marco/borde del sello desde paths del SVG (referencia más precisa)
  const frame = detectFrameFromSvg(svgContent);
  const frameRadius = frame?.radius;
  const frameCenterY = frame?.cy;

  // 1. Ancho disponible por arcos circulares (en unidades SVG)
  const circularTop = areas.find((a) => a.type === 'circular' && a.baseline === 'top');
  const circularBottom = areas.find((a) => a.type === 'circular' && a.baseline === 'bottom');

  const availableWidths: number[] = [];
  [circularTop, circularBottom].forEach((area) => {
    if (!area?.radius) return;
    const r = area.radius;
    // Margen de seguridad: altura de la letra central + altura de las letras circulares
    // + margen adicional. Las letras circulares se extienden hacia el centro del sello.
    const circularFontSize = area.fontSize || 9;
    const clearance = (fontSize + circularFontSize) * 1.2;
    if (r > clearance) {
      availableWidths.push(2 * Math.sqrt(r * r - clearance * clearance));
    }
  });

  const circularWidth = availableWidths.length > 0 ? Math.min(...availableWidths) : Infinity;

  // 2. Ancho disponible por el marco físico del producto (convertido a unidades SVG)
  // Si detectamos el marco desde el SVG, usarlo como referencia principal.
  let frameWidthSvg = Infinity;
  if (frameRadius && frameCenterY) {
    // Usar el marco detectado del SVG: el texto central debe caber dentro del círculo
    // con un margen de seguridad igual a la altura del texto + altura de textos circulares
    const circularTopFontSize = circularTop?.fontSize || 9;
    const circularBottomFontSize = circularBottom?.fontSize || 9;
    const maxCircularFontSize = Math.max(circularTopFontSize, circularBottomFontSize);
    // El margen es la distancia desde el borde del marco hasta donde empiezan los textos circulares
    const margin = fontSize + maxCircularFontSize + fontSize * 0.5;
    const safeRadius = Math.max(0, frameRadius - margin);
    frameWidthSvg = safeRadius * 2;
  } else if (productShape === 'CIRCULAR') {
    // Fallback: usar dimensiones del producto
    const diameterMm = Math.min(productWidthMm, productHeightMm || productWidthMm);
    const diameterSvg = diameterMm / scale;
    frameWidthSvg = Math.max(0, diameterSvg - fontSize * 3);
  } else if (productShape === 'OVAL') {
    frameWidthSvg = Math.max(0, viewBoxWidth - fontSize * 3);
  } else {
    frameWidthSvg = Math.max(0, viewBoxWidth - fontSize * 3);
  }

  // 3. Considerar áreas reservadas (sellos fechadores)
  const reservedAreas = areas.filter((a) => a.type === 'reserved');
  let reservedWidthSvg = Infinity;
  if (reservedAreas.length > 0) {
    const reservedWidths = reservedAreas.map((ra) => {
      if (ra.width && ra.height) {
        return Math.min(ra.width, ra.height) * 0.8;
      }
      return Infinity;
    });
    reservedWidthSvg = Math.min(...reservedWidths);
  }

  // Retornar el más restrictivo en unidades SVG
  const result = Math.min(circularWidth, frameWidthSvg, reservedWidthSvg);
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

    const trimmedLine = userLine.trimEnd();
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
      // Cabe completa, respetarla (incluyendo espacios al final)
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

  // Detectar el marco/borde del sello para usar como referencia de límites
  const frame = detectFrameFromSvg(svgContent);

  areas.forEach((area) => {
    if (area.type === 'circular') {
      const value = fields[area.id] ?? area.defaultText ?? '';
      result = renderCircularText(result, value, area, frame);
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
      // Centrado vertical real: el centro del bloque de líneas debe coincidir con centerY
      const startY = centerY - ((count - 1) * lineHeight) / 2;

      clampedLines.forEach((line, idx) => {
        // Respetamos el tamaño de fuente configurado por el usuario.
        // Si la línea excede el ancho seguro, se trunca (no se escala silenciosamente).
        let effectiveLine = line;
        if (safeWidthSvg && area.x !== undefined) {
          const lineWidth = estimateTextWidth(line, fontSize);
          if (lineWidth > safeWidthSvg && lineWidth > 0) {
            effectiveLine = truncateTextToWidth(line, fontSize, safeWidthSvg);
          }
        }
        const minFontSize = area.minFontSize ?? 1;
        const finalFontSize = Math.max(fontSize, minFontSize);

        const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('data-central-field', area.id);
        textEl.setAttribute('data-central-line', String(idx));
        textEl.setAttribute('x', String(area.x));
        textEl.setAttribute('y', String(startY + idx * lineHeight));
        textEl.setAttribute('font-size', String(finalFontSize));
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
function renderCircularTextPath(
  svgContent: string,
  text: string,
  area: CircularArea,
  frame?: FrameInfo | null,
): string {
  const radius = area.radius || 40;
  const centerX = area.centerX ?? 45.355;
  const centerY = area.centerY ?? 45.355;
  let fontSize = area.fontSize || DEFAULT_FONT_SIZE;
  const fontFamily = area.fontFamily || 'Arial, sans-serif';
  const baseline = area.baseline || 'top';
  const minFontSize = area.minFontSize ?? 1;
  const isBottom = baseline === 'bottom';

  if (!text) text = area.defaultText || '';

  // Calcular ancho del texto para auto-escalado
  const textWidth = estimateTextWidth(text, fontSize);
  const arcLength = Math.PI * radius; // Semicírculo
  const margin = fontSize * 2; // Margen en unidades SVG
  const availableArc = Math.max(0, arcLength - margin * 2);

  // Ya no auto-escalamos silenciosamente: respetamos el tamaño configurado por el usuario.
  // Si el texto excede el arco, lo truncamos al mínimo configurable.
  if (textWidth > availableArc && availableArc > 0) {
    fontSize = Math.max(fontSize, minFontSize);
    const maxWidth = availableArc;
    let accumulatedWidth = 0;
    let truncateIndex = 0;
    for (let i = 0; i < text.length; i++) {
      const charW = estimateCharWidth(text[i], fontSize);
      if (accumulatedWidth + charW > maxWidth) {
        truncateIndex = i;
        break;
      }
      accumulatedWidth += charW;
      truncateIndex = i + 1;
    }
    text = text.slice(0, truncateIndex);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  const existing = doc.querySelector(`g[data-circular-field="${area.id}"]`);
  if (existing) existing.remove();

  // Crear path circular para textPath
  // Para arco superior: path en sentido horario (arriba del círculo)
  // Para arco inferior: path en sentido antihorario (abajo del círculo) para que el texto
  // fluya de izquierda a derecha
  const pathId = `circular-path-${area.id}`;
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('id', pathId);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'none');

  // Radio ajustado: para arco superior, el path está más afuera (baseline sobre el círculo exterior)
  // para arco inferior, el path está más adentro (baseline sobre el círculo interior)
  const pathRadius = isBottom ? radius - fontSize * 0.5 : radius + fontSize * 0.1;

  // Crear arco de semicírculo
  // Arco superior: de izquierda (-180) a derecha (0), sentido horario (sweep=1)
  // Arco inferior: de derecha (0) a izquierda (-180), sentido horario (sweep=1)
  // Esto hace que el texto fluya de izquierda a derecha en ambos arcos
  const startAngle = isBottom ? 0 : -180;
  const endAngle = isBottom ? -180 : 0;
  const largeArc = 1;
  const sweep = 1;

  const x1 = centerX + pathRadius * Math.cos(degToRad(startAngle));
  const y1 = centerY + pathRadius * Math.sin(degToRad(startAngle));
  const x2 = centerX + pathRadius * Math.cos(degToRad(endAngle));
  const y2 = centerY + pathRadius * Math.sin(degToRad(endAngle));

  path.setAttribute('d', `M ${x1} ${y1} A ${pathRadius} ${pathRadius} 0 ${largeArc} ${sweep} ${x2} ${y2}`);

  // Crear texto con textPath
  const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('font-family', fontFamily);
  textEl.setAttribute('font-size', fontSize.toString());
  textEl.setAttribute('text-anchor', 'middle');
  // dominant-baseline="middle" alinea el centro vertical del texto con el path
  textEl.setAttribute('dominant-baseline', 'middle');

  // Crear textPath sobre el path generado
  // NOTA: No usamos side="right" porque no es soportado por resvg (backend PNG/SVG)
  const textPath = doc.createElementNS('http://www.w3.org/2000/svg', 'textPath');
  textPath.setAttribute('href', `#${pathId}`);
  textPath.setAttribute('startOffset', '50%');
  textPath.textContent = text;

  textEl.appendChild(textPath);

  const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-circular-field', area.id);
  group.setAttribute('class', 'circular-text');
  group.appendChild(path);
  group.appendChild(textEl);

  doc.documentElement.appendChild(group);

  return new XMLSerializer().serializeToString(doc.documentElement);
}
