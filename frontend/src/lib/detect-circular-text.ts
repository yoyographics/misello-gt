import { CircularArea } from './circular-text';

interface DetectedText {
  element: Element;
  x: number;
  y: number;
  char: string;
  distance: number;
  angle: number; // radianes
}

function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate\(\s*([^,\s]+)[,\s]+([^,\s]+)\s*\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

function getCircleCenter(doc: Document): { x: number; y: number; radius: number } | null {
  const circles = Array.from(doc.querySelectorAll('circle'));
  if (circles.length === 0) return null;
  let best = circles[0];
  let bestR = parseFloat(best.getAttribute('r') || '0');
  circles.forEach((c) => {
    const r = parseFloat(c.getAttribute('r') || '0');
    if (r > bestR) {
      best = c;
      bestR = r;
    }
  });
  return {
    x: parseFloat(best.getAttribute('cx') || '0'),
    y: parseFloat(best.getAttribute('cy') || '0'),
    radius: bestR,
  };
}

export function detectCircularText(
  svgContent: string,
): { svgContent: string; areas: CircularArea[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const centerInfo = getCircleCenter(doc);
  if (!centerInfo) return { svgContent, areas: [] };

  const { x: centerX, y: centerY, radius } = centerInfo;

  const texts = Array.from(doc.querySelectorAll('text'));
  const detected: DetectedText[] = [];

  texts.forEach((el) => {
    const transform = el.getAttribute('transform') || '';
    const pos = parseTranslate(transform);
    if (!pos) return;

    // Preservar el texto tal cual, sin trim para no perder espacios
    let char = el.textContent || '';
    // Solo normalizar saltos de linea y espacios multiples a uno
    char = char.replace(/\s+/g, ' ');
    if (!char || char === ' ') return;

    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    detected.push({ element: el, x: pos.x, y: pos.y, char, distance, angle });
  });

  if (detected.length < 3) return { svgContent, areas: [] };

  // Separar textos circulares (cerca del borde) de textos centrales
  const circularTexts: DetectedText[] = [];
  const centralTexts: DetectedText[] = [];

  detected.forEach((item) => {
    // Si esta a mas del 55% del radio, es circular
    if (item.distance > radius * 0.55) {
      circularTexts.push(item);
    } else {
      centralTexts.push(item);
    }
  });

  const areas: CircularArea[] = [];

  // Agrupar textos circulares por distancia (radio) similar
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

    const first = group[0].element;
    const style = first.getAttribute('style') || '';
    let fontSize = 9;
    const fontMatch = style.match(/font-size:\s*([\d.]+)px/);
    if (fontMatch) fontSize = parseFloat(fontMatch[1]);

    const fontFamily = first.getAttribute('font-family') || undefined;

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
      fontFamily,
      baseline,
    });

    group.forEach((g) => g.element.remove());
  });

  // Detectar textos centrales (no circulares) y combinarlos si estan cercanos
  if (centralTexts.length > 0) {
    // Ordenar por posicion Y y luego X para agrupar lineas
    centralTexts.sort((a, b) => a.y - b.y || a.x - b.x);

    // Agrupar textos centrales que esten en la misma linea (Y similar)
    const centralGroups: DetectedText[][] = [];
    centralTexts.forEach((item) => {
      let added = false;
      for (const group of centralGroups) {
        const avgY = group.reduce((s, i) => s + i.y, 0) / group.length;
        if (Math.abs(item.y - avgY) <= fontSizeForElement(item.element) * 0.8) {
          group.push(item);
          added = true;
          break;
        }
      }
      if (!added) centralGroups.push([item]);
    });

    centralGroups.forEach((group, idx) => {
      // Ordenar por X para leer de izquierda a derecha
      group.sort((a, b) => a.x - b.x);
      const text = group.map((g) => g.char).join('').trim();
      if (!text) return;

      const first = group[0].element;
      let fontSize = 9;
      const style = first.getAttribute('style') || '';
      const fontMatch = style.match(/font-size:\s*([\d.]+)px/);
      if (fontMatch) fontSize = parseFloat(fontMatch[1]);

      areas.push({
        id: `line${idx + 1}`,
        label: 'Texto central',
        defaultText: text,
        type: 'text',
        x: group[0].x,
        y: group[0].y,
        fontSize,
        fontFamily: first.getAttribute('font-family') || undefined,
      });

      group.forEach((g) => g.element.remove());
    });
  }

  const cleanSvg = new XMLSerializer().serializeToString(doc.documentElement);
  return { svgContent: cleanSvg, areas };
}

function fontSizeForElement(el: Element): number {
  const style = el.getAttribute('style') || '';
  const match = style.match(/font-size:\s*([\d.]+)px/);
  return match ? parseFloat(match[1]) : 9;
}
