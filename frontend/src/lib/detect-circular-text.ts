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

function getCircleInfoFromPath(d: string): { x: number; y: number; radius: number } | null {
  // Intentar parsear path circular tipo: M cx-r cy a r,r 0 1,1 2r,0 a r,r 0 1,1 -2r,0
  // o forma simple: M cx-r,cy a r,r 0 1,1 2r,0 ...
  const parts = d.split(/[,\s]+/).map(parseFloat).filter((n) => !isNaN(n));
  if (parts.length < 7) return null;

  // Heuristica: buscar patron M x y a rx ry ...
  // Arco con rx == ry indica circulo
  for (let i = 0; i < parts.length - 5; i++) {
    if (parts[i + 2] === 0 && parts[i + 3] === 1 && parts[i + 4] === 1) {
      // Formato a rx ry x-axis-rotation large-arc-flag sweep-flag x y
      const rx = parts[i];
      const ry = parts[i + 1];
      if (Math.abs(rx - ry) < 0.5 && rx > 0) {
        // cx = x - rx si el arco empieza en cx-rx, cy
        // Aproximacion: asumir circulo centrado en partes[1], partes[2] (despues de M)
        const cx = parts[1];
        const cy = parts[2];
        return { x: cx, y: cy, radius: rx };
      }
    }
  }

  // Fallback: usar el circulo mas grande del SVG si existe
  return null;
}

function getCircleCenter(doc: Document): { x: number; y: number; radius: number } | null {
  const circles = Array.from(doc.querySelectorAll('circle'));
  if (circles.length > 0) {
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

  // Intentar con path circular
  const paths = Array.from(doc.querySelectorAll('path'));
  for (const p of paths) {
    const info = getCircleInfoFromPath(p.getAttribute('d') || '');
    if (info) return info;
  }

  return null;
}

export function detectCircularText(
  svgContent: string,
): { svgContent: string; areas: CircularArea[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const centerInfo = getCircleCenter(doc);
  if (!centerInfo) return { svgContent, areas: [] };

  const { x: centerX, y: centerY, radius } = centerInfo;
  const areas: CircularArea[] = [];

  // 1. Detectar textPath circular y convertirlo a area generada letra por letra
  // (mas robusto que depender de startOffset extranos de Illustrator)
  const textPathElements = Array.from(doc.querySelectorAll('textPath'));
  textPathElements.forEach((tp, idx) => {
    const textEl = tp.closest('text');
    if (!textEl) return;

    let text = tp.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) return;

    // Determinar baseline segun posicion del path
    const href = tp.getAttribute('xlink:href') || tp.getAttribute('href') || '';
    const pathEl = doc.querySelector(href) as SVGPathElement | null;
    let baseline: 'top' | 'bottom' = 'top';
    let pathRadius = radius;
    if (pathEl) {
      const bbox = getPathApproxCenter(pathEl);
      baseline = bbox.y < centerY ? 'top' : 'bottom';
      pathRadius = Math.sqrt((bbox.x - centerX) ** 2 + (bbox.y - centerY) ** 2);
    }

    const fontSize = parseFloat(textEl.getAttribute('font-size') || '0') ||
      parseFloatFromClass(textEl.getAttribute('class') || '', doc) || 9;

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
      fontFamily: textEl.getAttribute('font-family') || undefined,
      baseline,
    });

    // Eliminar el textPath original para que no interfiera con la generacion
    textEl.remove();
  });

  // 2. Detectar letras individuales circulares (Illustrator viejo)
  const texts = Array.from(doc.querySelectorAll('text'));
  const detected: DetectedText[] = [];

  texts.forEach((el) => {
    // Saltar textos que ya son textPath
    if (el.querySelector('textPath')) return;

    const transform = el.getAttribute('transform') || '';
    const pos = parseTranslate(transform);
    if (!pos) return;

    let char = el.textContent || '';
    char = char.replace(/\s+/g, ' ');
    if (!char || char === ' ') return;

    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    detected.push({ element: el, x: pos.x, y: pos.y, char, distance, angle });
  });

  if (detected.length >= 3) {
    const circularTexts: DetectedText[] = [];
    const centralTexts: DetectedText[] = [];

    detected.forEach((item) => {
      if (item.distance > radius * 0.55) {
        circularTexts.push(item);
      } else {
        centralTexts.push(item);
      }
    });

    // Agrupar circulares por radio
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

      const first = group[0].element;
      const fontSize = parseFloatFromClass(first.getAttribute('class') || '', doc) || 9;

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
        fontFamily: first.getAttribute('font-family') || undefined,
        baseline,
      });

      group.forEach((g) => g.element.remove());
    });

    // Detectar textos centrales
    if (centralTexts.length > 0) {
      centralTexts.sort((a, b) => a.y - b.y || a.x - b.x);

      const centralGroups: DetectedText[][] = [];
      centralTexts.forEach((item) => {
        let added = false;
        for (const group of centralGroups) {
          const avgY = group.reduce((s, i) => s + i.y, 0) / group.length;
          if (Math.abs(item.y - avgY) <= (parseFloat(item.element.getAttribute('font-size') || '0') || 9) * 0.8) {
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

        const fontSize = parseFloatFromClass(group[0].element.getAttribute('class') || '', doc) || 9;

        areas.push({
          id: `line${idx + 1}`,
          label: 'Texto central',
          defaultText: text,
          type: 'text',
          x: group[0].x,
          y: group[0].y,
          fontSize,
          fontFamily: group[0].element.getAttribute('font-family') || undefined,
        });

        group.forEach((g) => g.element.remove());
      });
    }
  }

  const cleanSvg = new XMLSerializer().serializeToString(doc.documentElement);
  return { svgContent: cleanSvg, areas };
}

function getPathApproxCenter(pathEl: SVGPathElement): { x: number; y: number } {
  try {
    const len = pathEl.getTotalLength();
    const p = pathEl.getPointAtLength(len / 2);
    return { x: p.x, y: p.y };
  } catch {
    return { x: 0, y: 0 };
  }
}

function parseFloatFromClass(className: string, doc: Document): number | null {
  if (!className) return null;
  const classes = className.split(/\s+/);
  for (const cls of classes) {
    const styleEl = doc.querySelector(`style`);
    if (!styleEl) continue;
    const css = styleEl.textContent || '';
    const match = css.match(new RegExp(`\\.${cls}\\b[^{]*{[^}]*font-size:\\s*([\\d.]+)px`, 'i'));
    if (match) return parseFloat(match[1]);
  }
  return null;
}
