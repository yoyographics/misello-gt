export interface CircularArea {
  id: string;
  label: string;
  defaultText: string;
  type?: 'text' | 'circular';
  radius?: number;
  centerX?: number;
  centerY?: number;
  startAngle?: number; // grados, 0 = derecha, -90 = arriba, 90 = abajo
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number; // extra espacio entre letras en unidades SVG
  baseline?: 'top' | 'bottom'; // top = texto en parte superior del circulo, bottom = inferior
}

const DEFAULT_FONT_SIZE = 9;
const AVG_CHAR_WIDTH_RATIO = 0.58; // aproximacion para Arial/similares

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function estimateCharWidth(char: string, fontSize: number): number {
  // Estimacion simple: M y W son mas anchas, I y . mas angostas
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

  // Calcular ancho total aproximado y angulo total ocupado
  const chars = text.split('');
  const charWidths = chars.map((c) => estimateCharWidth(c, fontSize));
  const totalWidth = charWidths.reduce((sum, w) => sum + w + letterSpacing, 0) - letterSpacing;
  const totalAngleRad = totalWidth / radius;
  const startAngleRad = degToRad(startAngle);

  // Distribuir desde el centro del arco
  let currentAngle = startAngleRad - totalAngleRad / 2;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Remover grupo circular previo del mismo campo
  const existing = doc.querySelector(`g[data-circular-field="${area.id}"]`);
  if (existing) existing.remove();

  const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-circular-field', area.id);
  group.setAttribute('class', 'circular-text');

  chars.forEach((char, idx) => {
    const charWidth = charWidths[idx];
    const angle = currentAngle + (charWidth / 2 + letterSpacing / 2) / radius;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Rotacion para que la letra quede tangente al circulo
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

  const svgRoot = doc.documentElement;
  svgRoot.appendChild(group);

  return new XMLSerializer().serializeToString(svgRoot);
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

  // Textos normales data-editable
  const parser = new DOMParser();
  const doc = parser.parseFromString(result, 'image/svg+xml');
  const texts = doc.querySelectorAll('text[data-editable="true"]');
  texts.forEach((el) => {
    const field = el.getAttribute('data-field');
    if (field && fields[field] !== undefined) {
      el.textContent = fields[field];
    }
  });

  return new XMLSerializer().serializeToString(doc.documentElement);
}
