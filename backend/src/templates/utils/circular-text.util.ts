import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { svgPathProperties } from 'svg-path-properties';

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

const DEFAULT_FONT_SIZE = 9;
const DEFAULT_LINE_HEIGHT_RATIO = 1.2;
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

/**
 * Detecta el marco/borde circular del sello desde los <path> del SVG.
 * Busca paths que formen círculos concéntricos (común en sellos redondos).
 * Retorna el círculo más grande encontrado (el borde exterior).
 */
export function detectFrameFromSvg(svgContent: string): FrameInfo | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(svgContent);

  const circles: FrameInfo[] = [];

  // Recorrer todos los paths del SVG
  walk(parsed, (node) => {
    const attr = node[':@'];
    if (!attr || !attr.d) return;

    const d = attr.d;
    const strokeWidth = parseFloat(attr['stroke-width'] || '0');

    const circle = parseCircleFromPath(d);
    if (circle) {
      circles.push({ ...circle, strokeWidth });
    }
  });

  if (circles.length === 0) return null;

  // Retornar el círculo más grande (borde exterior del sello)
  return circles.reduce((largest, c) => (c.radius > largest.radius ? c : largest));
}

/**
 * Parsea un path SVG en busca de comandos que formen un círculo.
 */
function parseCircleFromPath(d: string): { cx: number; cy: number; radius: number } | null {
  // Patrón 1: Arco completo
  const arcMatch = d.match(/M\s+([\d.]+)\s+([\d.]+)\s+A\s+([\d.]+)\s+([\d.]+)\s+0\s+1\s+1\s+([\d.]+)\s+([\d.]+)/i);
  if (arcMatch) {
    const x1 = parseFloat(arcMatch[1]);
    const y1 = parseFloat(arcMatch[2]);
    const rx = parseFloat(arcMatch[3]);
    const ry = parseFloat(arcMatch[4]);
    const x2 = parseFloat(arcMatch[5]);
    const y2 = parseFloat(arcMatch[6]);

    if (Math.abs(rx - ry) < 0.01 && Math.abs(x2 - x1) < 0.1 && Math.abs(y2 - y1) < 0.1) {
      return { cx: x1 + rx, cy: y1, radius: rx };
    }
  }

  // Patrón 2: Path de círculo con movimiento relativo
  const relMatch = d.match(/M\s+([\d.]+)\s+([\d.]+)\s+m\s+(-?[\d.]+)\s+(-?[\d.]+)\s+a\s+([\d.]+)\s+([\d.]+)/i);
  if (relMatch) {
    const cx = parseFloat(relMatch[1]);
    const cy = parseFloat(relMatch[2]);
    const r = Math.abs(parseFloat(relMatch[5]));
    return { cx, cy, radius: r };
  }

  // Patrón 3: Bounding box aproximado
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

function estimateCharWidth(char: string, fontSize: number): number {
  const width = WIDTH_MAP[char] ?? 0.5;
  // Ligera holgura para evitar superposición en renderizado letra-por-letra.
  return fontSize * width * 1.15;
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text
    .split('')
    .reduce((sum, char) => sum + estimateCharWidth(char, fontSize), 0);
}

function truncateTextToWidth(text: string, fontSize: number, maxWidth: number): string {
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

function walk(node: any, cb: (n: any) => void): void {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, cb));
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  cb(node);
  for (const key of Object.keys(node)) {
    if (key === ':@') continue;
    walk(node[key], cb);
  }
}

function getTextContent(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map((n) => getTextContent(n)).join('');
  if (typeof node !== 'object') return '';

  let text = '';
  for (const key of Object.keys(node)) {
    if (key === ':@') continue;
    text += getTextContent(node[key]);
  }
  return text;
}

function setTextContent(node: any, value: string): void {
  if (Array.isArray(node['#text'])) {
    node['#text'] = [value];
  } else if (node['#text'] !== undefined) {
    node['#text'] = value;
  } else {
    const keys = Object.keys(node).filter((k) => k !== ':@');
    for (const key of keys) {
      if (typeof node[key] === 'string') {
        node[key] = value;
        return;
      }
      if (Array.isArray(node[key]) && node[key].every((i: any) => typeof i === 'string')) {
        node[key] = [value];
        return;
      }
    }
  }
}

function findNodes(node: any, tagName: string): any[] {
  const result: any[] = [];
  walk(node, (n) => {
    if (n && n[tagName]) result.push(n);
  });
  return result;
}

function getCircleCenter(node: any): { x: number; y: number; radius: number } | null {
  const circles = findNodes(node, 'circle');
  if (circles.length > 0) {
    let best = circles[0];
    let bestR = parseFloat(best[':@']?.r || '0');
    circles.forEach((c) => {
      const r = parseFloat(c[':@']?.r || '0');
      if (r > bestR) {
        best = c;
        bestR = r;
      }
    });
    return {
      x: parseFloat(best[':@']?.cx || '0'),
      y: parseFloat(best[':@']?.cy || '0'),
      radius: bestR,
    };
  }
  return null;
}

function parseTransform(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate\(\s*([^,\s]+)[,\s]+([^,\s]+)\s*\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

function parseFontSizeFromStyle(className: string, node: any): number {
  if (!className) return 9;
  const classes = className.split(/\s+/);

  // Buscar en style del documento
  const styles = findNodes(node, 'style');
  for (const styleNode of styles) {
    const css = getTextContent(styleNode);
    for (const cls of classes) {
      const regex = new RegExp(`\\.${cls}\\b[^{]*\\{[^}]*font-size:\\s*([\\d.]+)px`, 'i');
      const match = css.match(regex);
      if (match) return parseFloat(match[1]);
    }
  }
  return 9;
}

export function renderCircularText(
  svgContent: string,
  text: string,
  area: CircularArea,
  frame?: FrameInfo | null,
): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(svgContent);

  // Si aun existe un textPath nativo para este campo, eliminarlo para evitar
  // que interfiera con el renderizado letra-por-letra (resvg no soporta side).
  walk(parsed, (node) => {
    if (node[':@'] && node[':@']['data-field'] === area.id && node.textPath) {
      delete node.textPath;
      node[':@']['visibility'] = 'hidden';
    }
  });

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });
  const cleanedSvg = builder.build(parsed);
  return renderCircularTextAsLetters(cleanedSvg, text, area, frame);
}

function findDeepestTextNode(node: any): any {
  if (!node || typeof node !== 'object') return null;
  if (node['#text'] !== undefined || typeof node === 'string') return node;

  const keys = Object.keys(node).filter((k) => k !== ':@');
  for (const key of keys) {
    const found = findDeepestTextNode(node[key]);
    if (found) return found;
  }
  return null;
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

  // Calcular ancho del texto para saber si cabe en el arco.
  const textWidth = estimateTextWidth(text, fontSize);
  const arcLength = Math.PI * radius; // Semicírculo
  const margin = fontSize * 0.5; // Margen reducido
  const availableArc = Math.max(0, arcLength - margin * 2);

  // Solo truncamos si el texto excede ampliamente el arco disponible.
  if (textWidth > availableArc * 1.3 && availableArc > 0) {
    const maxWidth = availableArc * 1.3;
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

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(svgContent);
  removeCircularGroup(parsed, area.id);

  // Crear path circular para textPath
  const pathId = `circular-path-${area.id}`;
  const pathRadius = isBottom ? radius - fontSize * 0.5 : radius + fontSize * 0.1;

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

  const pathD = `M ${x1} ${y1} A ${pathRadius} ${pathRadius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;

  const pathNode: any = {
    ':@': {
      id: pathId,
      fill: 'none',
      stroke: 'none',
      d: pathD,
    },
  };

  const textPathAttrs: any = {
    href: `#${pathId}`,
    startOffset: '50%',
    // NOTA: no usamos side="right" porque resvg no lo soporta
  };

  const textPathNode: any = {
    ':@': textPathAttrs,
    '#text': text,
  };

  const textNode: any = {
    ':@': {
      'font-family': fontFamily,
      'font-size': fontSize.toString(),
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    },
    textPath: [textPathNode],
  };

  const groupNode: any = {
    g: [pathNode, textNode],
    ':@': {
      'data-circular-field': area.id,
      class: 'circular-text',
    },
  };

  appendToSvg(parsed, groupNode);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return builder.build(parsed);
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
  const letterSpacing = area.letterSpacing ?? fontSize * 0.08;
  const baseline = area.baseline || 'top';
  const startAngle = area.startAngle ?? (baseline === 'top' ? -90 : 90);
  const minFontSize = area.minFontSize ?? 1;

  if (!text) text = area.defaultText || '';

  // Respetar el tamaño configurado: nunca reducir silenciosamente.
  fontSize = Math.max(fontSize, minFontSize);

  // Calcular el arco máximo disponible para el texto circular.
  // El texto no debe salirse del marco del sello.
  // El arco disponible es un semicírculo (180° = π radianes) menos un margen de seguridad.
  // El margen es proporcional al tamaño de la fuente para evitar que las letras toquen los lados.
  const marginAngle = Math.max(0.12, fontSize / radius); // Margen angular mínimo
  const maxArcAngle = Math.PI - marginAngle * 2; // Semicírculo menos márgenes

  // Calcular el ancho total del texto al tamaño configurado
  let chars = text.split('');
  let charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
  let totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
  let totalAngleRad = totalWidth / radius;

  // Si el texto excede el arco disponible, truncar manteniendo el font-size.
  if (totalAngleRad > maxArcAngle) {
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

  const startAngleRad = degToRad(startAngle);

  // Para el arco inferior el texto debe leerse de izquierda a derecha,
  // por lo que recorremos el arco en sentido antihorario (angulos decrecientes).
  const isBottom = baseline === 'bottom';
  const direction = isBottom ? -1 : 1;
  let currentAngle = startAngleRad - (direction * totalAngleRad) / 2;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(svgContent);
  removeCircularGroup(parsed, area.id);

  const textNodes: any[] = [];
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

    // La baseline del texto está sobre el círculo. Con dominant-baseline="central",
    // el centro geométrico de la letra está en (x,y). Pero queremos que la baseline
    // (línea sobre la que se sientan las letras) esté en el círculo.
    // La baseline está aproximadamente a fontSize * 0.35 por debajo del centro.
    // Desplazamos la letra hacia el centro del círculo para alinear la baseline.
    const baselineOffset = fontSize * 0.35;
    const offsetX = -Math.cos(angle) * baselineOffset;
    const offsetY = -Math.sin(angle) * baselineOffset;

    textNodes.push({
      text: [{ '#text': char === ' ' ? '\u00A0' : char }],
      ':@': {
        x: (x + offsetX).toFixed(2),
        y: (y + offsetY).toFixed(2),
        transform: `rotate(${rotation.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`,
        'font-family': fontFamily,
        'font-size': fontSize.toString(),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      },
    });

    currentAngle = angle + direction * (charWidth / 2 + letterSpacing / 2) / radius;
  });

  const groupNode: any = {
    g: textNodes,
    ':@': {
      'data-circular-field': area.id,
      class: 'circular-text',
    },
  };

  appendToSvg(parsed, groupNode);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return builder.build(parsed);
}

function removeCircularGroup(node: any, fieldId: string): void {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      if (isCircularGroup(node[i], fieldId)) {
        node.splice(i, 1);
      } else {
        removeCircularGroup(node[i], fieldId);
      }
    }
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const key of Object.keys(node)) {
    if (key === ':@') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (let i = child.length - 1; i >= 0; i--) {
        if (isCircularGroup(child[i], fieldId)) {
          child.splice(i, 1);
        } else {
          removeCircularGroup(child[i], fieldId);
        }
      }
    }
  }
}

function isCircularGroup(node: any, fieldId: string): boolean {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return false;
  return node.g && node[':@'] && node[':@']['data-circular-field'] === fieldId;
}

function appendToSvg(node: any, child: any): void {
  if (Array.isArray(node)) {
    const svg = node.find((n) => n && n.svg);
    if (svg) svg.svg.push(child);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  if (node.svg) {
    node.svg.push(child);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === ':@') continue;
    appendToSvg(node[key], child);
  }
}

export function detectCircularText(
  svgContent: string,
): { svgContent: string; areas: CircularArea[] } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });

  const parsed = parser.parse(svgContent);
  const centerInfo = getCircleCenter(parsed);
  if (!centerInfo) return { svgContent, areas: [] };

  const { x: centerX, y: centerY, radius } = centerInfo;
  const areas: CircularArea[] = [];

  // 1. Detectar textPath circular y convertirlo a area generada letra por letra
  const textPathNodes = findNodes(parsed, 'textPath');
  textPathNodes.forEach((tp, idx) => {
    const textNode = findParentText(parsed, tp);
    if (!textNode) return;

    let text = getTextContent(tp);
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) return;

    const href = tp[':@']?.['xlink:href'] || tp[':@']?.href || '';
    let baseline: 'top' | 'bottom' = 'top';
    let pathRadius = radius;
    const pathId = href.replace('#', '');
    const pathNodes = findNodes(parsed, 'path');
    const pathNode = pathNodes.find((p) => p[':@']?.id === pathId);
    if (pathNode) {
      const d = pathNode[':@']?.d || '';
      const bbox = getPathApproxCenter(d);
      baseline = bbox.y < centerY ? 'top' : 'bottom';
      pathRadius = Math.sqrt((bbox.x - centerX) ** 2 + (bbox.y - centerY) ** 2);
    }

    const fontSize = parseFontSizeFromStyle(textNode[':@']?.class || '', parsed);
    const fieldId = `circular${idx + 1}`;

    areas.push({
      id: fieldId,
      label: baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior',
      defaultText: text,
      type: 'circular',
      radius: pathRadius,
      centerX,
      centerY,
      startAngle: baseline === 'top' ? -90 : 90,
      fontSize,
      fontFamily: textNode[':@']?.['font-family'],
      baseline,
    });

    // Eliminar el nodo text padre para evitar duplicados
    textNode.__delete = true;
  });

  // 2. Detectar letras individuales circulares
  const textNodes = findNodes(parsed, 'text');
  const detected: any[] = [];

  textNodes.forEach((node) => {
    if (node.textPath) return;
    const attr = node[':@'] || {};
    const transform = attr.transform || '';
    const pos = parseTransform(transform);
    if (!pos) return;

    let char = getTextContent(node);
    char = char.replace(/\s+/g, ' ');
    if (!char || char === ' ') return;

    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    detected.push({ node, attr, x: pos.x, y: pos.y, char, distance, angle });
  });

  if (detected.length >= 3) {
    const circularTexts: any[] = [];
    const centralTexts: any[] = [];

    detected.forEach((item) => {
      if (item.distance > radius * 0.55) {
        circularTexts.push(item);
      } else {
        centralTexts.push(item);
      }
    });

    const groups: any[][] = [];
    circularTexts.forEach((item) => {
      let added = false;
      for (const group of groups) {
        const avgDist = group.reduce((s, i) => s + i.distance, 0) / group.length;
        if (Math.abs(item.distance - avgDist) <= 4) {
          group.push(item);
          added = true;
          break;
        }
      }
      if (!added) groups.push([item]);
    });

    const validGroups = groups.filter((g) => g.length >= 3);

    validGroups.forEach((group, idx) => {
      group.sort((a, b) => a.angle - b.angle);
      const text = group.map((g) => g.char).join('');
      const avgDist = group.reduce((s, g) => s + g.distance, 0) / group.length;
      const avgY = group.reduce((s, g) => s + g.y, 0) / group.length;
      const baseline: 'top' | 'bottom' = avgY < centerY ? 'top' : 'bottom';
      const fontSize = parseFontSizeFromStyle(group[0].attr.class || '', parsed);

      const fieldId = `circular${areas.length + idx + 1}`;
      areas.push({
        id: fieldId,
        label: baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior',
        defaultText: text,
        type: 'circular',
        radius: avgDist,
        centerX,
        centerY,
        startAngle: baseline === 'top' ? -90 : 90,
        fontSize,
        baseline,
      });

      group.forEach((g) => {
        g.node.__delete = true;
      });
    });

    if (centralTexts.length > 0) {
      centralTexts.sort((a, b) => a.y - b.y || a.x - b.x);
      const centralGroups: any[][] = [];
      centralTexts.forEach((item) => {
        let added = false;
        for (const group of centralGroups) {
          const avgY = group.reduce((s, i) => s + i.y, 0) / group.length;
          if (Math.abs(item.y - avgY) <= (parseFloat(item.attr['font-size']) || 9) * 0.8) {
            group.push(item);
            added = true;
            break;
          }
        }
        if (!added) centralGroups.push([item]);
      });

      centralGroups.forEach((group, idx) => {
        group.sort((a, b) => a.x - b.x);
        const text = group.map((g) => g.char).join('').trim();
        if (!text) return;

        const fontSize = parseFontSizeFromStyle(group[0].attr.class || '', parsed);
        const minX = Math.min(...group.map((g) => g.x));
        const maxX = Math.max(...group.map((g) => g.x));
        const centerXofText = (minX + maxX) / 2;
        areas.push({
          id: `line${idx + 1}`,
          label: 'Texto central',
          defaultText: text,
          type: 'text',
          x: centerXofText,
          y: group[0].y,
          fontSize,
          fontFamily: group[0].attr['font-family'],
        });

        group.forEach((g) => {
          g.node.__delete = true;
        });
      });
    }
  }

  const cleaned = removeMarkedNodes(parsed);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return { svgContent: builder.build(cleaned), areas };
}

function findParentText(root: any, target: any): any | null {
  let found: any = null;
  walk(root, (node) => {
    if (node.text && (Array.isArray(node.text) ? node.text.includes(target) : node.text === target)) {
      found = node;
    }
  });
  return found;
}

function getPathApproxCenter(d: string): { x: number; y: number } {
  try {
    const properties = new svgPathProperties(d);
    const len = properties.getTotalLength();
    return properties.getPointAtLength(len / 2);
  } catch {
    // Fallback heuristico: promediar coordenadas numericas del path
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(parseFloat) || [];
    if (numbers.length < 2) return { x: 0, y: 0 };
    const xs = numbers.filter((_, i) => i % 2 === 0);
    const ys = numbers.filter((_, i) => i % 2 === 1);
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }
}

function removeMarkedNodes(node: any): any {
  if (Array.isArray(node)) {
    return node
      .filter((n) => !n?.__delete)
      .map((n) => removeMarkedNodes(n));
  }
  if (typeof node !== 'object' || node === null) return node;

  const result: any = {};
  for (const key of Object.keys(node)) {
    if (key === ':@') {
      result[key] = node[key];
    } else if (Array.isArray(node[key])) {
      const cleaned = node[key]
        .filter((n: any) => !n?.__delete)
        .map((n: any) => removeMarkedNodes(n));
      // Conservar tags vacios que tengan atributos (p. ej. <rect/>, <circle/>).
      if (cleaned.length > 0 || node[':@']) {
        result[key] = cleaned;
      }
    } else {
      result[key] = removeMarkedNodes(node[key]);
    }
  }
  return result;
}

function getPathMidpoint(d: string): { x: number; y: number } | null {
  try {
    const props = new svgPathProperties(d);
    const len = props.getTotalLength();
    const p = props.getPointAtLength(len / 2);
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}

function pathNodeMatchesArea(node: any, area: CircularArea): boolean {
  const d = node[':@']?.d || '';
  const mid = getPathMidpoint(d);
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

function removeOriginalPathGroups(root: any, areas: CircularArea[]): void {
  const groups = findNodes(root, 'g');
  groups.forEach((g) => {
    const childPaths: any[] = [];
    walk(g, (n) => {
      if (n === g) return;
      if (n && n[':@'] && n[':@'].d !== undefined) {
        childPaths.push(n);
      }
    });
    if (childPaths.length < 3) return;

    for (const area of areas) {
      const matches = childPaths.filter((p) => pathNodeMatchesArea(p, area));
      if (matches.length >= 3 && matches.length >= childPaths.length * 0.5) {
        g.__delete = true;
        break;
      }
    }
  });
}

export interface ApplyTemplateFieldsOptions {
  /** Ancho seguro en unidades SVG para textos centrales; si se excede se escala el font-size proporcionalmente. */
  safeWidthSvg?: number;
  /** Ancho seguro en mm (legacy, se convierte a SVG internamente). */
  safeWidthMm?: number;
  /** Ancho del producto en mm para calcular la escala SVG->mm. */
  productWidthMm?: number;
  /** Alto del producto en mm para limitar el texto central verticalmente. */
  productHeightMm?: number;
  /** Forma del producto para calcular margen del marco. */
  productShape?: string;
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
    const circularFontSize = area.fontSize || 9;
    const clearance = (fontSize + circularFontSize) * 1.2;
    if (r > clearance) {
      availableWidths.push(2 * Math.sqrt(r * r - clearance * clearance));
    }
  });

  const circularWidth = availableWidths.length > 0 ? Math.min(...availableWidths) : Infinity;

  // 2. Ancho disponible por el marco físico del producto (en unidades SVG)
  // Si detectamos el marco desde el SVG, usarlo como referencia principal.
  let frameWidthSvg = Infinity;
  if (frameRadius && frameCenterY) {
    const circularTopFontSize = circularTop?.fontSize || 9;
    const circularBottomFontSize = circularBottom?.fontSize || 9;
    const maxCircularFontSize = Math.max(circularTopFontSize, circularBottomFontSize);
    const margin = fontSize + maxCircularFontSize + fontSize * 0.5;
    const safeRadius = Math.max(0, frameRadius - margin);
    frameWidthSvg = safeRadius * 2;
  } else if (productShape === 'CIRCULAR') {
    const diameterMm = Math.min(productWidthMm, productHeightMm || productWidthMm);
    const diameterSvg = diameterMm / scale;
    frameWidthSvg = Math.max(0, diameterSvg - fontSize * 3);
  } else if (productShape === 'OVAL') {
    frameWidthSvg = Math.max(0, viewBoxWidth - fontSize * 3);
  } else {
    frameWidthSvg = Math.max(0, viewBoxWidth - fontSize * 3);
  }

  // 3. Considerar áreas reservadas (sellos fechadores)
  // Las áreas reservadas reducen el espacio disponible para el texto central
  const reservedAreas = areas.filter((a) => a.type === 'reserved');
  let reservedWidthSvg = Infinity;
  if (reservedAreas.length > 0) {
    // Calcular el ancho más restrictivo impuesto por las áreas reservadas
    // El texto central debe caber al lado o arriba/debajo de las áreas reservadas
    const reservedWidths = reservedAreas.map((ra) => {
      if (ra.width && ra.height) {
        // Si el área reservada es más ancha que alta, el texto debe caber arriba o debajo
        // Si es más alta que ancha, el texto debe caber a los lados
        return Math.min(ra.width, ra.height) * 0.8; // Margen de seguridad
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
 * Legacy: calcula el ancho disponible en mm. Simplemente convierte el resultado de computeCentralSafeWidthSvg.
 */
export function computeCentralSafeWidthMm(
  areas: CircularArea[],
  fontSizeMm: number,
  productWidthMm?: number,
  svgContent?: string,
  fallbackSafeWidthMm?: number,
  productHeightMm?: number,
  productShape?: string,
): number {
  if (!productWidthMm || !svgContent) {
    return fallbackSafeWidthMm || productWidthMm || 0;
  }
  const viewBoxWidth = parseSvgViewBoxWidth(svgContent);
  if (!viewBoxWidth) return fallbackSafeWidthMm || productWidthMm || 0;
  const scale = productWidthMm / viewBoxWidth;
  
  // Convertir fontSizeMm a unidades SVG
  const fontSizeSvg = fontSizeMm / scale;
  const safeWidthSvg = computeCentralSafeWidthSvg(
    areas,
    fontSizeSvg,
    productWidthMm,
    svgContent,
    fallbackSafeWidthMm ? fallbackSafeWidthMm / scale : undefined,
    productHeightMm,
    productShape,
  );
  return safeWidthSvg * scale;
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

  // Detectar el marco/borde del sello para usar como referencia de límites
  const frame = detectFrameFromSvg(svgContent);

  areas.forEach((area) => {
    if (area.type === 'reserved') {
      // Área reservada: no renderizar texto, solo preservar el elemento SVG
      // El rectángulo reservado ya está en el SVG con stroke dash
      return;
    }
    if (area.type === 'circular') {
      const value = fields[area.id] ?? area.defaultText ?? '';
      result = renderCircularText(result, value, area, frame);
    }
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(result);

  const areaById = new Map(areas.map((a) => [a.id, a]));

  walk(parsed, (node) => {
    const attr = node[':@'];
    if (!attr || attr['data-editable'] !== 'true') return;
    const field = attr['data-field'];
    const area = field ? areaById.get(field) : undefined;
    if (area?.fontFamily) {
      attr['font-family'] = area.fontFamily;
    }
    if (area?.fontSize) {
      attr['font-size'] = String(area.fontSize);
    }
    if (field && fields[field] !== undefined) {
      if (node.textPath) {
        const tp = Array.isArray(node.textPath) ? node.textPath[0] : node.textPath;
        const deepest = findDeepestTextNode(tp);
        if (deepest) {
          setTextContent(deepest, fields[field]);
        } else {
          tp['#text'] = fields[field];
        }
      } else {
        setTextContent(node, fields[field]);
      }
    }
  });

  areas.forEach((area) => {
    if (area.type === 'text' && area.x !== undefined && area.y !== undefined) {
      const rawValue = fields[area.id] ?? area.defaultText ?? '';
      const value = String(rawValue);
      removeCentralField(parsed, area.id);

      const fontSize = area.fontSize || DEFAULT_FONT_SIZE;
      const lineHeight = area.lineHeight || fontSize * DEFAULT_LINE_HEIGHT_RATIO;
      const maxLines = Math.max(1, Math.min(area.maxLines || 3, 3));

      // Ocultar el texto editable original para evitar que se vea detrás del reemplazo
      walk(parsed, (node) => {
        const attr = node[':@'];
        if (
          attr &&
          attr['data-editable'] === 'true' &&
          attr['data-field'] === area.id
        ) {
          attr['visibility'] = 'hidden';
        }
      });

      // Calcular ancho disponible central en unidades SVG
      // Si se proporciona safeWidthMm (legacy), convertirlo a SVG
      let fallbackSafeWidthSvg = options?.safeWidthSvg;
      if (!fallbackSafeWidthSvg && options?.safeWidthMm && options?.productWidthMm && svgContent) {
        const viewBoxWidth = parseSvgViewBoxWidth(svgContent);
        if (viewBoxWidth) {
          const scale = options.productWidthMm / viewBoxWidth;
          fallbackSafeWidthSvg = options.safeWidthMm / scale;
        }
      }

      const safeWidthSvg = computeCentralSafeWidthSvg(
        areas,
        fontSize,
        options?.productWidthMm,
        svgContent,
        fallbackSafeWidthSvg,
        options?.productHeightMm,
        options?.productShape,
      );

      // Aplicar word-wrap inteligente al texto completo (respetando saltos de línea del usuario)
      const wrapResult = wrapCentralText(value, fontSize, safeWidthSvg, maxLines);
      const clampedLines = wrapResult.lines;

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

        const textNode: any = {
          ':@': {
            'data-central-field': area.id,
            'data-central-line': String(idx),
            x: String(area.x),
            y: String(startY + idx * lineHeight),
            'font-size': String(finalFontSize),
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
          },
          '#text': effectiveLine,
        };
        if (area.fontFamily) {
          textNode[':@']['font-family'] = area.fontFamily;
        }
        appendToSvg(parsed, textNode);
      });
    }
  });

  // Si el SVG aun contiene textos originales convertidos a paths, eliminar los grupos
  // de paths que coincidan con las areas editables.
  removeOriginalPathGroups(parsed, areas);

  const cleaned = removeMarkedNodes(parsed);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return builder.build(cleaned);
}

function removeCentralField(node: any, fieldId: string): void {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      if (isCentralField(node[i], fieldId)) {
        node.splice(i, 1);
      } else {
        removeCentralField(node[i], fieldId);
      }
    }
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const key of Object.keys(node)) {
    if (key === ':@') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (let i = child.length - 1; i >= 0; i--) {
        if (isCentralField(child[i], fieldId)) {
          child.splice(i, 1);
        } else {
          removeCentralField(child[i], fieldId);
        }
      }
    }
  }
}

function isCentralField(node: any, fieldId: string): boolean {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return false;
  return node[':@'] && node[':@']['data-central-field'] === fieldId;
}
