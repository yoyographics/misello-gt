import { XMLParser, XMLBuilder } from 'fast-xml-parser';

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
  const radius = area.radius || 40;
  const centerX = area.centerX ?? 45.355;
  const centerY = area.centerY ?? 45.355;
  const fontSize = area.fontSize || DEFAULT_FONT_SIZE;
  const fontFamily = area.fontFamily || 'Arial, sans-serif';
  const letterSpacing = area.letterSpacing ?? 0.2;
  const baseline = area.baseline || 'top';
  const startAngle = area.startAngle ?? (baseline === 'top' ? -90 : 90);

  if (!text) text = area.defaultText || '';

  const chars = text.split('');
  const charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
  const totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
  const totalAngleRad = totalWidth / radius;
  const startAngleRad = degToRad(startAngle);

  let currentAngle = startAngleRad - totalAngleRad / 2;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    preserveOrder: true,
  });

  const parsed = parser.parse(svgContent);
  removeCircularGroup(parsed, area.id);

  const groupNode: any = {
    ':@': {
      'data-circular-field': area.id,
      class: 'circular-text',
    },
    g: [],
  };

  chars.forEach((char, idx) => {
    const charWidth = charWidths[idx];
    const angle = currentAngle + (charWidth / 2 + letterSpacing / 2) / radius;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    let rotation = (angle * 180) / Math.PI;
    if (baseline === 'top') {
      rotation += 90;
    } else {
      rotation -= 90;
    }

    const textNode: any = {
      ':@': {
        x: x.toFixed(2),
        y: y.toFixed(2),
        transform: `rotate(${rotation.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`,
        'font-family': fontFamily,
        'font-size': fontSize.toString(),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      },
      '#text': char === ' ' ? '\u00A0' : char,
    };

    groupNode.g.push(textNode);
    currentAngle = angle + (charWidth / 2 + letterSpacing / 2) / radius;
  });

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

  if (node[':@'] && node[':@']['data-circular-field'] === fieldId) {
    return;
  }

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
  if (typeof node !== 'object' || node === null) return false;
  if (Array.isArray(node)) return false;
  return node[':@'] && node[':@']['data-circular-field'] === fieldId;
}

function appendToSvg(node: any, child: any): void {
  if (Array.isArray(node)) {
    const svg = node.find((n) => n && n.svg);
    if (svg) {
      svg.svg.push(child);
    }
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

interface DetectedText {
  node: any;
  attr: any;
  x: number;
  y: number;
  char: string;
  distance: number;
  angle: number;
}

function parseTransform(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate\(\s*([^,\s]+)[,\s]+([^,\s]+)\s*\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

function getCircleCenter(node: any): { x: number; y: number; radius: number } | null {
  const circles = collectNodes(node, 'circle');
  if (circles.length === 0) return null;

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

function collectNodes(node: any, tagName: string): any[] {
  const result: any[] = [];
  walk(node, (n) => {
    if (n && n[tagName]) result.push(n);
  });
  return result;
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

  const textNodes = collectNodes(parsed, 'text');
  const detected: DetectedText[] = [];

  textNodes.forEach((node) => {
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

  if (detected.length < 3) return { svgContent, areas: [] };

  const circularTexts: DetectedText[] = [];
  const centralTexts: DetectedText[] = [];

  detected.forEach((item) => {
    if (item.distance > radius * 0.55) {
      circularTexts.push(item);
    } else {
      centralTexts.push(item);
    }
  });

  const areas: CircularArea[] = [];

  const groups: DetectedText[][] = [];
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
    const startAngle = baseline === 'top' ? -90 : 90;

    const fontSize = parseFloat(group[0].attr['font-size']) || 9;

    areas.push({
      id: `circular${idx + 1}`,
      label: baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior',
      defaultText: text,
      type: 'circular',
      radius: avgDist,
      centerX,
      centerY,
      startAngle,
      fontSize,
      baseline,
    });

    group.forEach((g) => {
      g.node.__delete = true;
    });
  });

  if (centralTexts.length > 0) {
    centralTexts.sort((a, b) => a.y - b.y || a.x - b.x);

    const centralGroups: DetectedText[][] = [];
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

      const fontSize = parseFloat(group[0].attr['font-size']) || 9;

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

  const cleaned = removeMarkedNodes(parsed);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return { svgContent: builder.build(cleaned), areas };
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

export function applyTemplateFields(
  svgContent: string,
  fields: Record<string, string>,
  areas: CircularArea[],
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

  walk(parsed, (node) => {
    const attr = node[':@'];
    if (!attr || attr['data-editable'] !== 'true') return;
    const field = attr['data-field'];
    if (field && fields[field] !== undefined) {
      setTextContent(node, fields[field]);
    }
  });

  areas.forEach((area) => {
    if (area.type === 'text' && area.x !== undefined && area.y !== undefined) {
      const value = fields[area.id] ?? area.defaultText ?? '';
      removeCentralField(parsed, area.id);

      const textNode: any = {
        ':@': {
          'data-central-field': area.id,
          x: String(area.x),
          y: String(area.y),
          'font-size': String(area.fontSize || DEFAULT_FONT_SIZE),
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        },
        '#text': value,
      };
      if (area.fontFamily) {
        textNode[':@']['font-family'] = area.fontFamily;
      }
      appendToSvg(parsed, textNode);
    }
  });

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return builder.build(parsed);
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
  if (typeof node !== 'object' || node === null) return false;
  if (Array.isArray(node)) return false;
  return node[':@'] && node[':@']['data-central-field'] === fieldId;
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
