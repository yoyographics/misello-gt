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

function getCircleCenter(doc: Document): { x: number; y: number } | null {
  const circles = Array.from(doc.querySelectorAll('circle'));
  if (circles.length === 0) return null;
  // Usar el circulo mas grande (mayor radio)
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
  };
}

export function detectCircularText(
  svgContent: string,
): { svgContent: string; areas: CircularArea[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const center = getCircleCenter(doc);
  if (!center) return { svgContent, areas: [] };

  const texts = Array.from(doc.querySelectorAll('text'));
  const detected: DetectedText[] = [];

  texts.forEach((el) => {
    const transform = el.getAttribute('transform') || '';
    const pos = parseTranslate(transform);
    if (!pos) return;

    const char = el.textContent?.trim() || '';
    if (!char) return;

    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    detected.push({ element: el, x: pos.x, y: pos.y, char, distance, angle });
  });

  if (detected.length < 3) return { svgContent, areas: [] };

  // Agrupar por distancia (radio) similar
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

  // Filtrar grupos con al menos 3 letras
  const validGroups = groups.filter((g) => g.length >= 3);
  if (validGroups.length === 0) return { svgContent, areas: [] };

  const areas: CircularArea[] = [];

  validGroups.forEach((group, idx) => {
    // Ordenar por angulo
    group.sort((a, b) => a.angle - b.angle);

    const text = group.map((g) => g.char).join('');
    const avgDist = group.reduce((s, g) => s + g.distance, 0) / group.length;

    // Determinar baseline segun posicion Y relativa al centro
    const avgY = group.reduce((s, g) => s + g.y, 0) / group.length;
    const baseline: 'top' | 'bottom' = avgY < center.y ? 'top' : 'bottom';

    // Angulo de inicio: promedio del grupo, ajustado para centrar
    const startAngle = baseline === 'top' ? -90 : 90;

    // Estimar fontSize del primer elemento
    const first = group[0].element;
    const className = first.getAttribute('class') || '';
    const style = first.getAttribute('style') || '';
    let fontSize = 9;
    const fontMatch = style.match(/font-size:\s*([\d.]+)px/);
    if (fontMatch) fontSize = parseFloat(fontMatch[1]);

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

    // Eliminar textos originales del grupo
    group.forEach((g) => g.element.remove());
  });

  const cleanSvg = new XMLSerializer().serializeToString(doc.documentElement);
  return { svgContent: cleanSvg, areas };
}
