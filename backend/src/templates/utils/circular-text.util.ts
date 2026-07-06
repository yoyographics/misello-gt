import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { svgPathProperties } from 'svg-path-properties';

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

function estimateCharWidth(char: string, fontSize: number): number {
  const width = WIDTH_MAP[char] ?? 0.5;
  return fontSize * width;
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text
    .split('')
    .reduce((sum, char) => sum + estimateCharWidth(char, fontSize), 0);
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
): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(svgContent);

  // Buscar text[data-field=area.id] con textPath
  let textPathFound = false;
  walk(parsed, (node) => {
    if (node[':@'] && node[':@']['data-field'] === area.id && node.textPath) {
      textPathFound = true;
      const tp = Array.isArray(node.textPath) ? node.textPath[0] : node.textPath;
      // Reemplazar texto manteniendo estructura
      const deepest = findDeepestTextNode(tp);
      if (deepest) {
        setTextContent(deepest, text);
      } else {
        tp['#text'] = text;
      }
    }
  });

  if (textPathFound) {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      preserveOrder: true,
      format: false,
    });
    return builder.build(parsed);
  }

  return renderCircularTextAsLetters(svgContent, text, area);
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
  const baseline = area.baseline || 'top';

  if (!text) text = area.defaultText || '';

  const isBottom = baseline === 'bottom';

  // Crear un path circular para textPath.
  // Para arco superior: el path es el círculo exterior. El texto fluye sobre el path
  // y las letras "suben" hacia el centro del sello (baseline sobre el path).
  // Para arco inferior: el path es un círculo interior. El texto fluye sobre el path
  // y las letras "suben" hacia afuera (hacia el borde del sello).
  // Esto hace que la línea media de la tipografía esté sobre el círculo.
  const pathRadius = isBottom ? radius - fontSize * 0.7 : radius + fontSize * 0.1;

  const pathId = `circular-path-${area.id}`;

  // Path circular: desde el ángulo -180 a 0.
  // Para arco superior: arco de -180 a 0 (sentido horario, arriba).
  // Para arco inferior: arco de 180 a 0 (sentido antihorario, abajo) —
  //   esto hace que el path vaya de izquierda a derecha en la parte inferior.
  const startAngle = isBottom ? 180 : -180;
  const endAngle = 0;
  const largeArc = 1;
  const sweep = isBottom ? 0 : 1;

  const x1 = centerX + pathRadius * Math.cos(degToRad(startAngle));
  const y1 = centerY + pathRadius * Math.sin(degToRad(startAngle));
  const x2 = centerX + pathRadius * Math.cos(degToRad(endAngle));
  const y2 = centerY + pathRadius * Math.sin(degToRad(endAngle));

  const pathD = `M ${x1} ${y1} A ${pathRadius} ${pathRadius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });
  const parsed = parser.parse(svgContent);
  removeCircularGroup(parsed, area.id);

  const pathNode: any = {
    ':@': {
      id: pathId,
      fill: 'none',
      stroke: 'none',
      d: pathD,
    },
  };

  const textPathNode: any = {
    ':@': {
      href: `#${pathId}`,
      startOffset: '50%',
    },
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
    ':@': {
      'data-circular-field': area.id,
      class: 'circular-text',
    },
    g: [],
  };

  // Insertar path y text en el grupo
  groupNode.g.push(pathNode);
  groupNode.g.push(textNode);

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
  return node[':@'] && node[':@']['data-circular-field'] === fieldId;
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
        areas.push({
          id: `line${idx + 1}`,
          label: 'Texto central',
          defaultText: text,
          type: 'text',
          x: group[0].x,
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
  // Heuristica simple: extraer numeros y promediar
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(parseFloat) || [];
  if (numbers.length < 2) return { x: 0, y: 0 };
  const xs = numbers.filter((_, i) => i % 2 === 0);
  const ys = numbers.filter((_, i) => i % 2 === 1);
  return {
    x: xs.reduce((a, b) => a + b, 0) / xs.length,
    y: ys.reduce((a, b) => a + b, 0) / ys.length,
  };
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
      if (cleaned.length > 0) result[key] = cleaned;
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

  // 1. Ancho disponible por arcos circulares (en unidades SVG)
  const circularTop = areas.find((a) => a.type === 'circular' && a.baseline === 'top');
  const circularBottom = areas.find((a) => a.type === 'circular' && a.baseline === 'bottom');

  const availableWidths: number[] = [];
  [circularTop, circularBottom].forEach((area) => {
    if (!area?.radius) return;
    const r = area.radius;
    // Margen de seguridad en unidades SVG: altura de la letra central + altura de las letras circulares
    // + margen adicional. Las letras circulares se extienden hacia el centro del sello.
    // Usamos un margen conservador de 2.0x (altura central + altura circular) para garantizar separación.
    const circularFontSize = area.fontSize || 9;
    const clearance = (fontSize + circularFontSize) * 2.0;
    if (r > clearance) {
      availableWidths.push(2 * Math.sqrt(r * r - clearance * clearance));
    }
  });

  const circularWidth = availableWidths.length > 0 ? Math.min(...availableWidths) : Infinity;

  // 2. Ancho disponible por el marco físico del producto (en unidades SVG)
  // El texto central nunca debe tocar los bordes del sello.
  const frameMargin = fontSize * 2.5;
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

  areas.forEach((area) => {
    if (area.type === 'circular') {
      const value = fields[area.id] ?? area.defaultText ?? '';
      result = renderCircularText(result, value, area);
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

        const textNode: any = {
          ':@': {
            'data-central-field': area.id,
            'data-central-line': String(idx),
            x: String(area.x),
            y: String(startY + idx * lineHeight),
            'font-size': String(effectiveFontSize),
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
          },
          '#text': line,
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
