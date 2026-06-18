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
}

const DEFAULT_FONT_SIZE = 9;
const AVG_CHAR_WIDTH_RATIO = 0.58;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function estimateCharWidth(char: string, fontSize: number): number {
  const narrow = 'I.,;:!|i1l '.includes(char);
  const wide = 'MWm w'.includes(char);
  if (narrow) return fontSize * AVG_CHAR_WIDTH_RATIO * 0.45;
  if (wide) return fontSize * AVG_CHAR_WIDTH_RATIO * 1.25;
  return fontSize * AVG_CHAR_WIDTH_RATIO;
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
  const letterSpacing = area.letterSpacing ?? 0.3;
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

  // Buscar y reemplazar grupo circular previo
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

function getCircleCenter(node: any): { x: number; y: number } | null {
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
  const center = getCircleCenter(parsed);
  if (!center) return { svgContent, areas: [] };

  const textNodes = collectNodes(parsed, 'text');
  const detected: DetectedText[] = [];

  textNodes.forEach((node) => {
    const attr = node[':@'] || {};
    const transform = attr.transform || '';
    const pos = parseTransform(transform);
    if (!pos) return;

    const char = getTextContent(node).trim();
    if (!char) return;

    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    detected.push({ node, attr, x: pos.x, y: pos.y, char, distance, angle });
  });

  if (detected.length < 3) return { svgContent, areas: [] };

  const groups: DetectedText[][] = [];
  detected.forEach((item) => {
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
  if (validGroups.length === 0) return { svgContent, areas: [] };

  const areas: CircularArea[] = [];

  validGroups.forEach((group, idx) => {
    group.sort((a, b) => a.angle - b.angle);

    const text = group.map((g) => g.char).join('');
    const avgDist = group.reduce((s, g) => s + g.distance, 0) / group.length;
    const avgY = group.reduce((s, g) => s + g.y, 0) / group.length;
    const baseline: 'top' | 'bottom' = avgY < center.y ? 'top' : 'bottom';
    const startAngle = baseline === 'top' ? -90 : 90;

    const fontSize = parseFloat(group[0].attr['font-size']) || 9;

    areas.push({
      id: `circular${idx + 1}`,
      label: baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior',
      defaultText: text,
      type: 'circular',
      radius: avgDist,
      centerX: center.x,
      centerY: center.y,
      startAngle,
      fontSize,
      baseline,
    });

    group.forEach((g) => {
      g.node.__delete = true;
    });
  });

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

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: false,
  });

  return builder.build(parsed);
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
