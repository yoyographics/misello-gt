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

  let currentAngle = startAngleRad - totalAngleRad / 2;

  const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-circular-field', area.id);
  group.setAttribute('class', 'circular-text');

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
    currentAngle = angle + (charWidth / 2 + letterSpacing / 2) / radius;
  });

  doc.documentElement.appendChild(group);

  return new XMLSerializer().serializeToString(doc.documentElement);
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

  const parser = new DOMParser();
  const doc = parser.parseFromString(result, 'image/svg+xml');

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
      const value = fields[area.id] ?? area.defaultText ?? '';
      const existing = doc.querySelector(`text[data-central-field="${area.id}"]`);
      if (existing) existing.remove();

      const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('data-central-field', area.id);
      textEl.setAttribute('x', String(area.x));
      textEl.setAttribute('y', String(area.y));
      if (area.fontSize) textEl.setAttribute('font-size', String(area.fontSize));
      if (area.fontFamily) textEl.setAttribute('font-family', area.fontFamily);
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'central');
      textEl.textContent = value;
      doc.documentElement.appendChild(textEl);
    }
  });

  return new XMLSerializer().serializeToString(doc.documentElement);
}
