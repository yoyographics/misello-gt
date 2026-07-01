'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Plus, X, Eye } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  shape: string;
  widthMm: number;
  heightMm: number;
}

interface EditableArea {
  id: string;
  label: string;
  defaultText: string;
  type?: 'text' | 'circular';
  x?: number;
  y?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
  startAngle?: number;
  baseline?: 'top' | 'bottom';
  fontSize?: number;
  fontFamily?: string;
  maxLength?: number;
  multiLine?: boolean;
  maxLines?: number;
  lineHeight?: number;
}

interface TemplateProduct {
  productId: string;
  product?: Product;
}

interface Template {
  id: string;
  name: string;
  categoryId: string;
  svgContent?: string;
  editableAreas?: EditableArea[] | null;
  thumbnailUrl?: string;
  isActive: boolean;
  sortOrder: number;
  category?: Category;
  products?: TemplateProduct[];
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [svgPreview, setSvgPreview] = useState('');
  const [editableAreas, setEditableAreas] = useState<EditableArea[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const manualTargetRef = useRef<Element | null>(null);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [selectedTextManual, setSelectedTextManual] = useState(false);
  const [selectedTextType, setSelectedTextType] = useState<'text' | 'circular'>('text');
  const [selectedTextForm, setSelectedTextForm] = useState({
    id: '',
    label: '',
    defaultText: '',
    maxLength: '',
    radius: '',
    centerX: '',
    centerY: '',
    startAngle: '',
    baseline: 'top' as 'top' | 'bottom',
    fontSize: '',
    fontFamily: '',
    x: '',
    y: '',
  });

  interface Font {
    id: string;
    name: string;
    fileName: string;
    minFontSizePt?: number;
    isDefault?: boolean;
  }

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    isActive: true,
    sortOrder: '0',
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [fonts, setFonts] = useState<Font[]>([]);
  const [hideMode, setHideMode] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/templates/admin/all'),
      api.get('/categories'),
      api.get('/products?take=9999'),
      api.get('/fonts'),
    ])
      .then(([tRes, cRes, pRes, fRes]) => {
        setTemplates(tRes.data || []);
        setCategories(cRes.data || []);
        const productList = pRes.data?.items || pRes.data || [];
        setProducts(Array.isArray(productList) ? productList : []);
        const fontList = fRes.data?.items || fRes.data || [];
        setFonts(Array.isArray(fontList) ? fontList : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({
      name: '',
      categoryId: '',
      isActive: true,
      sortOrder: '0',
    });
    setSelectedProductIds([]);
    setFile(null);
    setSvgPreview('');
    setEditableAreas([]);
    setEditing(null);
    setFormError('');
  };

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
      // Descartar circulos decorativos muy pequenos comparados con el viewBox
      const svg = doc.querySelector('svg');
      const viewBox = svg?.getAttribute('viewBox');
      let viewBoxSize = 100;
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(parseFloat);
        if (parts.length >= 4) viewBoxSize = Math.max(parts[2], parts[3]);
      } else {
        const width = parseFloat(svg?.getAttribute('width') || '0');
        const height = parseFloat(svg?.getAttribute('height') || '0');
        viewBoxSize = Math.max(width, height) || 100;
      }
      if (bestR < viewBoxSize * 0.08) return null;
      return {
        x: parseFloat(best.getAttribute('cx') || '0'),
        y: parseFloat(best.getAttribute('cy') || '0'),
        radius: bestR,
      };
    }
    return null;
  }

  function getSvgViewBoxCenter(doc: Document): { x: number; y: number; radius: number } | null {
    const svg = doc.querySelector('svg');
    if (!svg) return null;
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(parseFloat);
      if (parts.length >= 4) {
        return { x: parts[0] + parts[2] / 2, y: parts[1] + parts[3] / 2, radius: Math.min(parts[2], parts[3]) / 2 };
      }
    }
    const width = parseFloat(svg.getAttribute('width') || '0');
    const height = parseFloat(svg.getAttribute('height') || '0');
    if (width && height) return { x: width / 2, y: height / 2, radius: Math.min(width, height) / 2 };
    return null;
  }

  function getSvgCoordinates(svg: SVGSVGElement, container: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    return {
      x: viewBox.x + (clientX - rect.left) * scaleX,
      y: viewBox.y + (clientY - rect.top) * scaleY,
    };
  }

  function getTextPosition(textEl: Element): { x: string | null; y: string | null } {
    let x = textEl.getAttribute('x');
    let y = textEl.getAttribute('y');
    if (!x || !y) {
      const tspan = textEl.querySelector('tspan');
      if (tspan) {
        x = x || tspan.getAttribute('x');
        y = y || tspan.getAttribute('y');
      }
    }
    return { x, y };
  }

  function removeHiddenElements(svgContent: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      doc.querySelectorAll('[data-hide-on-render="true"]').forEach((el) => el.remove());
      return new XMLSerializer().serializeToString(doc.documentElement);
    } catch {
      return svgContent;
    }
  }

  function detectPathTextGroups(doc: Document, circle: { x: number; y: number; radius: number } | null): EditableArea[] {
    if (!circle) return [];
    const areas: EditableArea[] = [];
    const minPaths = 4;

    doc.querySelectorAll('g').forEach((g) => {
      // Solo analizar grupos que no contengan subgrupos ni textos reales
      if (g.querySelector('g, text')) return;

      const paths = Array.from(g.querySelectorAll('path'));
      if (paths.length < minPaths) return;

      const centers: { x: number; y: number }[] = [];
      let totalLength = 0;

      paths.forEach((p) => {
        try {
          const pathEl = p as SVGPathElement;
          const len = pathEl.getTotalLength();
          totalLength += len;
          const point = pathEl.getPointAtLength(len / 2);
          centers.push({ x: point.x, y: point.y });
        } catch {
          // ignorar paths que no se puedan medir
        }
      });

      if (centers.length < minPaths) return;

      const distances = centers.map((c) => Math.sqrt((c.x - circle.x) ** 2 + (c.y - circle.y) ** 2));
      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      const avgX = centers.reduce((s, c) => s + c.x, 0) / centers.length;
      const avgY = centers.reduce((s, c) => s + c.y, 0) / centers.length;
      const minX = Math.min(...centers.map((c) => c.x));
      const maxX = Math.max(...centers.map((c) => c.x));
      const minY = Math.min(...centers.map((c) => c.y));
      const maxY = Math.max(...centers.map((c) => c.y));
      const spreadX = maxX - minX;
      const spreadY = maxY - minY;

      const distVariance = distances.reduce((s, d) => s + (d - avgDist) ** 2, 0) / distances.length;
      const distStdDev = Math.sqrt(distVariance);
      const yVariance = centers.reduce((s, c) => s + (c.y - avgY) ** 2, 0) / centers.length;
      const yStdDev = Math.sqrt(yVariance);

      // Descartar formas grandes de fondo (circulos del sello)
      const bboxArea = spreadX * spreadY;
      const effectiveRadius = circle.radius || Math.min(circle.x * 2, circle.y * 2) / 2;
      const circleArea = Math.PI * effectiveRadius * effectiveRadius;
      if (bboxArea > circleArea * 0.65 || totalLength > effectiveRadius * 30) return;

      const distTolerance = effectiveRadius * 0.15;
      const yTolerance = effectiveRadius * 0.22;

      // Texto circular: paths a distancia similar del centro, formando un arco
      const isCircular = avgDist > effectiveRadius * 0.35 && distStdDev < distTolerance && spreadX > effectiveRadius * 0.25;
      // Texto central: paths cerca del centro, alineados horizontalmente
      const isCentral = avgDist < effectiveRadius * 0.55 && yStdDev < yTolerance && spreadX > effectiveRadius * 0.15;

      if (isCircular) {
        const baseline = avgY < circle.y ? 'top' : 'bottom';
        const fieldId = `circular${areas.filter((a) => a.type === 'circular').length + 1}`;
        paths.forEach((p) => {
          p.setAttribute('data-hide-on-render', 'true');
          p.setAttribute('data-field', fieldId);
          p.setAttribute('data-type', 'circular');
          p.setAttribute('data-baseline', baseline);
        });
        areas.push({
          id: fieldId,
          label: baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior',
          defaultText: '',
          type: 'circular',
          radius: avgDist,
          centerX: circle.x,
          centerY: circle.y,
          startAngle: baseline === 'top' ? -90 : 90,
          baseline,
        });
      } else if (isCentral) {
        const textIdx = areas.filter((a) => a.type === 'text').length + 1;
        const fieldId = textIdx === 1 ? 'central' : `central${textIdx}`;
        const label = textIdx === 1 ? 'Texto central' : `Texto central ${textIdx}`;
        paths.forEach((p) => {
          p.setAttribute('data-hide-on-render', 'true');
          p.setAttribute('data-field', fieldId);
          p.setAttribute('data-type', 'text');
        });
        areas.push({
          id: fieldId,
          label,
          defaultText: '',
          type: 'text',
          x: avgX,
          y: avgY,
          multiLine: true,
          maxLines: 3,
        });
      }
    });

    return areas;
  }

  function detectEditableAreas(svgContent: string): { svgContent: string; areas: EditableArea[] } {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const areas: EditableArea[] = [];
      const circle = getCircleCenter(doc) || getSvgViewBoxCenter(doc);

      // 1. Detectar textPath circular
      doc.querySelectorAll('textPath').forEach((tp, idx) => {
        const textEl = tp.closest('text');
        if (!textEl) return;

        const text = (tp.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;

        const href = tp.getAttribute('xlink:href') || tp.getAttribute('href') || '';
        const pathEl = doc.querySelector(href) as SVGPathElement | null;
        let baseline: 'top' | 'bottom' = 'top';
        let radius = 40;
        if (circle && pathEl) {
          const bbox = getPathApproxCenter(pathEl);
          baseline = bbox.y < circle.y ? 'top' : 'bottom';
          radius = Math.sqrt((bbox.x - circle.x) ** 2 + (bbox.y - circle.y) ** 2);
        } else if (circle) {
          const textY = parseFloat(textEl.getAttribute('y') || '0') || circle.y;
          baseline = textY < circle.y ? 'top' : 'bottom';
          radius = Math.abs(textY - circle.y);
        }

        const fontSize = parseFloat(textEl.getAttribute('font-size') || '0') || undefined;
        const fontFamily = textEl.getAttribute('font-family') || undefined;
        const fieldId = `circular${idx + 1}`;

        textEl.setAttribute('data-editable', 'true');
        textEl.setAttribute('data-field', fieldId);
        textEl.setAttribute('data-label', baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior');
        textEl.setAttribute('data-type', 'circular');
        textEl.setAttribute('data-radius', String(radius));
        if (circle) {
          textEl.setAttribute('data-center-x', String(circle.x));
          textEl.setAttribute('data-center-y', String(circle.y));
        }
        textEl.setAttribute('data-start-angle', baseline === 'top' ? '-90' : '90');
        textEl.setAttribute('data-baseline', baseline);
        if (fontSize) textEl.setAttribute('data-font-size', String(fontSize));
        if (fontFamily) textEl.setAttribute('data-font-family', fontFamily);

        areas.push({
          id: fieldId,
          label: baseline === 'top' ? 'Texto circular superior' : 'Texto circular inferior',
          defaultText: text,
          type: 'circular',
          radius,
          centerX: circle?.x,
          centerY: circle?.y,
          startAngle: baseline === 'top' ? -90 : 90,
          baseline,
          fontSize,
          fontFamily,
        });
      });

      // 2. Detectar textos centrales normales y agruparlos en bloques dinámicos
      const centralCandidates: {
        el: Element;
        text: string;
        x: number;
        y: number;
        fontSize: number;
        fontFamily?: string;
      }[] = [];
      doc.querySelectorAll('text').forEach((textEl) => {
        if (textEl.querySelector('textPath')) return;
        if (textEl.getAttribute('data-editable') === 'true') return;

        const text = (textEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;

        // Ignorar textos que parecen ser letras individuales circulares (rotadas alrededor del centro)
        const transform = textEl.getAttribute('transform') || '';
        const hasRotate = /rotate\s*\(/.test(transform);
        if (hasRotate && circle) {
          const translateMatch = transform.match(/translate\(\s*([\d.]+)[,\s]+([\d.]+)\s*\)/);
          if (translateMatch) {
            const tx = parseFloat(translateMatch[1]);
            const ty = parseFloat(translateMatch[2]);
            const dist = Math.sqrt((tx - circle.x) ** 2 + (ty - circle.y) ** 2);
            if (dist > (circle.radius || 0) * 0.3) return; // probablemente letra circular
          }
        }

        const pos = getTextPosition(textEl);
        const fontSize = parseFloat(textEl.getAttribute('font-size') || '0') || 9;
        const x = parseFloat(pos.x || '0');
        const y = parseFloat(pos.y || '0');
        if (!x && !y) return;
        centralCandidates.push({
          el: textEl,
          text,
          x,
          y,
          fontSize,
          fontFamily: textEl.getAttribute('font-family') || undefined,
        });
      });

      if (centralCandidates.length > 0) {
        centralCandidates.sort((a, b) => a.y - b.y || a.x - b.x);
        const groups: typeof centralCandidates[] = [];
        centralCandidates.forEach((item) => {
          let added = false;
          for (const group of groups) {
            const avgY = group.reduce((s, i) => s + i.y, 0) / group.length;
            const threshold = Math.max(...group.map((i) => i.fontSize)) * 1.3;
            if (Math.abs(item.y - avgY) <= threshold) {
              group.push(item);
              added = true;
              break;
            }
          }
          if (!added) groups.push([item]);
        });

        groups.forEach((group, gIdx) => {
          group.sort((a, b) => a.x - b.x);
          const defaultText = group.map((g) => g.text).join('\n');
          const avgX = group.reduce((s, g) => s + g.x, 0) / group.length;
          const avgY = group.reduce((s, g) => s + g.y, 0) / group.length;
          const avgFontSize = group.reduce((s, g) => s + g.fontSize, 0) / group.length;
          const fieldId = `central${groups.length === 1 ? '' : gIdx + 1}`;
          const label = groups.length === 1 ? 'Texto central' : `Texto central ${gIdx + 1}`;

          group.forEach((item) => {
            item.el.setAttribute('data-editable', 'true');
            item.el.setAttribute('data-field', fieldId);
            item.el.setAttribute('data-label', label);
            item.el.setAttribute('data-type', 'text');
            item.el.setAttribute('data-multi-line', 'true');
            item.el.setAttribute('data-max-lines', '3');
            item.el.setAttribute('data-x', String(item.x));
            item.el.setAttribute('data-y', String(item.y));
            item.el.setAttribute('data-font-size', String(item.fontSize));
            if (item.fontFamily) item.el.setAttribute('data-font-family', item.fontFamily);
          });

          areas.push({
            id: fieldId,
            label,
            defaultText,
            type: 'text',
            x: avgX,
            y: avgY,
            fontSize: avgFontSize,
            fontFamily: group[0].fontFamily,
            multiLine: true,
            maxLines: 3,
          });
        });
      }

      // Fallback: si no se detectaron textos reales, intentar detectar textos dibujados como paths
      if (areas.length === 0) {
        const pathAreas = detectPathTextGroups(doc, circle);
        areas.push(...pathAreas);
      }

      return { svgContent: new XMLSerializer().serializeToString(doc.documentElement), areas };
    } catch {
      return { svgContent, areas: [] };
    }
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

  const normalizeAreas = (areas: unknown): EditableArea[] => {
    if (Array.isArray(areas)) return areas as EditableArea[];
    if (typeof areas === 'string') {
      try {
        const parsed = JSON.parse(areas);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (!previewRef.current || !svgPreview) return;
    const container = previewRef.current;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (hideMode) {
        const svg = container.querySelector('svg');
        if (!svg) return;
        const elToHide = (target.closest('path, text, circle, line, rect, polygon, g') as Element | null) || target;
        if (!elToHide || elToHide === svg || elToHide === container) return;
        const currentHide = elToHide.getAttribute('data-hide-on-render');
        if (currentHide === 'true') {
          elToHide.removeAttribute('data-hide-on-render');
          elToHide.removeAttribute('data-hide-label');
          setHiddenCount((prev) => Math.max(0, prev - 1));
        } else {
          elToHide.setAttribute('data-hide-on-render', 'true');
          elToHide.setAttribute('data-hide-label', elToHide.tagName.toLowerCase());
          setHiddenCount((prev) => prev + 1);
        }
        setSvgPreview(container.innerHTML);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const textEl = target.closest('text, path[data-field], g[data-field]');

      if (textEl) {
        const indexAttr = textEl.getAttribute('data-misello-index');
        if (indexAttr === null) return;
        const index = parseInt(indexAttr, 10);
        if (isNaN(index)) return;

        const fieldId = textEl.getAttribute('data-field') || `field${editableAreas.length + 1}`;
        const existingArea = editableAreas.find((a) => a.id === fieldId);

        const hasTextPath = textEl.tagName.toLowerCase() === 'text' && !!textEl.querySelector('textPath');
        const typeFromAttr = (textEl.getAttribute('data-type') as 'text' | 'circular') || existingArea?.type || 'text';
        const type: 'text' | 'circular' = hasTextPath || typeFromAttr === 'circular' ? 'circular' : 'text';

        let radius = existingArea?.radius !== undefined ? String(existingArea.radius) : textEl.getAttribute('data-radius') || '';
        let centerX = existingArea?.centerX !== undefined ? String(existingArea.centerX) : textEl.getAttribute('data-center-x') || '';
        let centerY = existingArea?.centerY !== undefined ? String(existingArea.centerY) : textEl.getAttribute('data-center-y') || '';
        let startAngle = existingArea?.startAngle !== undefined ? String(existingArea.startAngle) : textEl.getAttribute('data-start-angle') || '';
        let baseline = existingArea?.baseline || (textEl.getAttribute('data-baseline') as 'top' | 'bottom') || 'top';

        if (hasTextPath && (!radius || !centerX || !centerY)) {
          const doc = new DOMParser().parseFromString(svgPreview, 'image/svg+xml');
          const circle = getCircleCenter(doc);
          const tp = textEl.querySelector('textPath');
          const href = tp?.getAttribute('xlink:href') || tp?.getAttribute('href') || '';
          const pathEl = doc.querySelector(href) as SVGPathElement | null;
          if (circle && pathEl) {
            const bbox = getPathApproxCenter(pathEl);
            centerX = centerX || String(circle.x);
            centerY = centerY || String(circle.y);
            radius = radius || String(Math.sqrt((bbox.x - circle.x) ** 2 + (bbox.y - circle.y) ** 2));
            baseline = baseline || (bbox.y < circle.y ? 'top' : 'bottom');
            startAngle = startAngle || (baseline === 'top' ? '-90' : '90');
          }
        }

        const defaultText = existingArea?.defaultText || textEl.textContent || '';
        const fontSize =
          existingArea?.fontSize !== undefined
            ? String(existingArea.fontSize)
            : textEl.getAttribute('font-size') || textEl.getAttribute('data-font-size') || '';
        const fontFamily =
          existingArea?.fontFamily || textEl.getAttribute('font-family') || textEl.getAttribute('data-font-family') || '';
        const x = existingArea?.x !== undefined ? String(existingArea.x) : textEl.getAttribute('data-x') || textEl.getAttribute('x') || '';
        const y = existingArea?.y !== undefined ? String(existingArea.y) : textEl.getAttribute('data-y') || textEl.getAttribute('y') || '';

        setSelectedTextIndex(index);
        setSelectedTextManual(false);
        setSelectedTextType(type);
        setSelectedTextForm({
          id: fieldId,
          label: existingArea?.label || (type === 'circular' ? 'Texto circular' : 'Texto editable'),
          defaultText,
          maxLength: existingArea?.maxLength !== undefined ? String(existingArea.maxLength) : textEl.getAttribute('data-maxlength') || '',
          radius,
          centerX,
          centerY,
          startAngle,
          baseline,
          fontSize,
          fontFamily,
          x,
          y,
        });
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Click sobre path u otro elemento: crear área de texto manual en esa posición
      const svg = container.querySelector('svg') as SVGSVGElement | null;
      if (!svg) return;
      const coords = getSvgCoordinates(svg, container, e.clientX, e.clientY);

      // Ocultar el elemento visual subyacente (path, forma, etc.) para evitar que el
      // texto manual se sobreponga al texto/gráfico original del SVG.
      const originalEl = target.closest('path, circle, line, rect, polygon') as Element | null;
      if (originalEl && originalEl !== svg) {
        originalEl.setAttribute('data-hide-on-render', 'true');
        originalEl.setAttribute('data-hide-label', originalEl.tagName.toLowerCase());
        setHiddenCount((prev) => prev + 1);
        setSvgPreview(container.innerHTML);
        manualTargetRef.current = originalEl;
      }

      const doc = svg.ownerDocument;
      const circle = getCircleCenter(doc) || getSvgViewBoxCenter(doc);

      setSelectedTextIndex(null);
      setSelectedTextManual(true);
      setSelectedTextType('text');
      setSelectedTextForm({
        id: `field${editableAreas.length + 1}`,
        label: 'Texto central manual',
        defaultText: '',
        maxLength: '',
        radius: '',
        centerX: circle ? String(circle.x) : '',
        centerY: circle ? String(circle.y) : '',
        startAngle: '',
        baseline: 'top',
        fontSize: '',
        fontFamily: '',
        x: String(coords.x.toFixed(2)),
        y: String(coords.y.toFixed(2)),
      });
      e.preventDefault();
      e.stopPropagation();
    };

    container.querySelectorAll('text, path[data-field], g[data-field]').forEach((el) => {
      (el as HTMLElement).style.cursor = 'pointer';
    });
    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [svgPreview, editableAreas.length, hideMode, hiddenCount]);

  const extractEditableAreas = (svgContent: string): EditableArea[] => {
    try {
      const areas: EditableArea[] = [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const texts = doc.querySelectorAll('text[data-editable="true"], path[data-field], g[data-field]');
      texts.forEach((el) => {
        const field = el.getAttribute('data-field') || 'field1';
        const label = el.getAttribute('data-label') || 'Texto editable';
        const type = (el.getAttribute('data-type') as 'text' | 'circular') || 'text';
        const maxLength = el.getAttribute('data-maxlength');
        const radius = el.getAttribute('data-radius');
        const centerX = el.getAttribute('data-center-x');
        const centerY = el.getAttribute('data-center-y');
        const startAngle = el.getAttribute('data-start-angle');
        const baseline = el.getAttribute('data-baseline') as 'top' | 'bottom' | null;
        const fontSize = el.getAttribute('data-font-size') || el.getAttribute('font-size');
        const fontFamily = el.getAttribute('data-font-family') || el.getAttribute('font-family');
        const x = el.getAttribute('data-x') || el.getAttribute('x');
        const y = el.getAttribute('data-y') || el.getAttribute('y');
        const multiLine = el.getAttribute('data-multi-line');
        const dataMaxLines = el.getAttribute('data-max-lines');

        const area: EditableArea = {
          id: field,
          label,
          defaultText: el.textContent || '',
          type,
          fontSize: fontSize ? parseFloat(fontSize) : undefined,
          fontFamily: fontFamily || undefined,
          maxLength: maxLength ? parseInt(maxLength, 10) : undefined,
          multiLine: multiLine === 'true' ? true : undefined,
          maxLines: dataMaxLines ? parseInt(dataMaxLines, 10) : undefined,
        };

        if (type === 'circular') {
          if (radius) area.radius = parseFloat(radius);
          if (centerX) area.centerX = parseFloat(centerX);
          if (centerY) area.centerY = parseFloat(centerY);
          if (startAngle) area.startAngle = parseFloat(startAngle);
          if (baseline) area.baseline = baseline;
        } else {
          if (x) area.x = parseFloat(x);
          if (y) area.y = parseFloat(y);
        }

        areas.push(area);
      });
      return areas;
    } catch {
      return [];
    }
  };

  const indexSvgTexts = (svgContent: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (svg) {
        const style = svg.getAttribute('style') || '';
        if (!style.includes('max-width')) {
          svg.setAttribute('style', `${style}; max-width:100%; height:auto; display:block;`.replace(/^;\s*/, ''));
        }
        let styleEl = svg.querySelector('style') as SVGStyleElement | null;
        if (!styleEl) {
          styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style') as SVGStyleElement;
          svg.insertBefore(styleEl, svg.firstChild);
        }
        const hoverCss = `text[data-misello-index], path[data-misello-index], g[data-misello-index] { cursor: pointer; } text[data-misello-index]:hover, path[data-misello-index]:hover, g[data-misello-index]:hover { outline: 2px dashed #f97316; }`;
        if (!(styleEl.textContent || '').includes('data-misello-index')) {
          styleEl.textContent = (styleEl.textContent || '') + hoverCss;
        }
      }
      doc.querySelectorAll('text, path[data-field], g[data-field]').forEach((el, i) => {
        el.setAttribute('data-misello-index', String(i));
      });
      return new XMLSerializer().serializeToString(doc.documentElement);
    } catch {
      return svgContent;
    }
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const detected = detectEditableAreas(content);
      const indexed = indexSvgTexts(detected.svgContent);
      setSvgPreview(indexed);
      setEditableAreas(detected.areas.length > 0 ? detected.areas : extractEditableAreas(indexed));
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.name || !form.categoryId) {
      setFormError('Nombre y categoría son obligatorios');
      return;
    }
    if (!editing && !file) {
      setFormError('El archivo SVG es obligatorio');
      return;
    }
    if (selectedProductIds.length === 0) {
      setFormError('Seleccioná al menos un modelo de sello');
      return;
    }

    setSaving(true);
    const data = new FormData();
    data.append('name', form.name);
    data.append('categoryId', form.categoryId);
    data.append('isActive', String(form.isActive));
    data.append('sortOrder', form.sortOrder);
    data.append('editableAreas', JSON.stringify(editableAreas));
    selectedProductIds.forEach((id) => data.append('productIds', id));
    const svgToSend = svgPreview ? removeHiddenElements(svgPreview) : svgPreview;
    const hasProcessedSvg =
      !!svgPreview &&
      (svgPreview.includes('data-editable="true"') || svgPreview.includes('data-hide-on-render="true"'));
    if (svgToSend && (hasProcessedSvg || hiddenCount > 0 || editing)) {
      const svgFile = new File([svgToSend], file?.name || 'template.svg', { type: 'image/svg+xml' });
      data.append('file', svgFile);
    } else if (file) {
      data.append('file', file);
    }

    try {
      if (editing) {
        await api.patch(`/templates/admin/${editing.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/templates/admin', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error guardando plantilla');
    } finally {
      setSaving(false);
    }
  };

  const applyAreasToSvg = (svgContent: string, areas: EditableArea[]): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      areas.forEach((area) => {
        // Buscar por data-field existente o por posición aproximada
        let textEl: Element | null = doc.querySelector(
          `text[data-field="${area.id}"], path[data-field="${area.id}"], g[data-field="${area.id}"]`,
        );
        if (!textEl) {
          // Buscar un text no marcado que coincida con el texto por defecto
          const texts = Array.from(doc.querySelectorAll('text')).filter(
            (el) => el.getAttribute('data-editable') !== 'true',
          );
          textEl =
            texts.find((el) => (el.textContent || '').replace(/\s+/g, ' ').trim() === area.defaultText) || null;
          if (!textEl && area.type === 'text' && area.x !== undefined && area.y !== undefined) {
            const ax = area.x;
            const ay = area.y;
            textEl =
              texts.find((el) => {
                const pos = getTextPosition(el);
                const ex = parseFloat(pos.x || '0');
                const ey = parseFloat(pos.y || '0');
                return Math.abs(ex - ax) < 1 && Math.abs(ey - ay) < 1;
              }) || null;
          }
        }
        if (!textEl) return;
        const tagName = textEl.tagName.toLowerCase();
        if (tagName === 'text') {
          textEl.setAttribute('data-editable', 'true');
        } else {
          textEl.setAttribute('data-hide-on-render', 'true');
        }
        textEl.setAttribute('data-field', area.id);
        textEl.setAttribute('data-label', area.label);
        textEl.setAttribute('data-type', area.type || 'text');
        if (area.maxLength) textEl.setAttribute('data-maxlength', String(area.maxLength));
        if (area.fontSize) textEl.setAttribute('data-font-size', String(area.fontSize));
        if (area.fontFamily) textEl.setAttribute('data-font-family', area.fontFamily);
        if (area.multiLine) textEl.setAttribute('data-multi-line', 'true');
        if (area.maxLines) textEl.setAttribute('data-max-lines', String(area.maxLines));
        if (area.type === 'circular') {
          if (area.radius !== undefined) textEl.setAttribute('data-radius', String(area.radius));
          if (area.centerX !== undefined) textEl.setAttribute('data-center-x', String(area.centerX));
          if (area.centerY !== undefined) textEl.setAttribute('data-center-y', String(area.centerY));
          if (area.startAngle !== undefined) textEl.setAttribute('data-start-angle', String(area.startAngle));
          if (area.baseline) textEl.setAttribute('data-baseline', area.baseline);
        } else {
          if (area.x !== undefined) textEl.setAttribute('data-x', String(area.x));
          if (area.y !== undefined) textEl.setAttribute('data-y', String(area.y));
        }
      });
      return new XMLSerializer().serializeToString(doc.documentElement);
    } catch {
      return svgContent;
    }
  };

  const handleEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      categoryId: t.categoryId,
      isActive: t.isActive,
      sortOrder: t.sortOrder.toString(),
    });
    setEditableAreas(normalizeAreas(t.editableAreas));
    setSelectedProductIds((t.products || []).map((p) => p.productId));
    const areas = normalizeAreas(t.editableAreas);
    const svgWithAreas =
      typeof t.svgContent === 'string' && t.svgContent.trim().startsWith('<svg')
        ? applyAreasToSvg(t.svgContent, areas)
        : '';
    setSvgPreview(svgWithAreas ? indexSvgTexts(svgWithAreas) : '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await api.delete(`/templates/admin/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error eliminando plantilla');
    }
  };

  const addAreaFromSelection = () => {
    const { id, label, defaultText, maxLength, radius, centerX, centerY, startAngle, baseline, fontSize, fontFamily, x, y } = selectedTextForm;
    if (!id.trim() || !label.trim()) {
      setFormError('ID y etiqueta son obligatorios');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgPreview, 'image/svg+xml');

    let textEl: Element | null = null;
    if (!selectedTextManual && selectedTextIndex !== null) {
      const selectableEls = Array.from(doc.querySelectorAll('text, path[data-field], g[data-field]'));
      textEl = selectableEls[selectedTextIndex] || null;
    }

    if (!textEl && selectedTextType === 'text' && x && y) {
      // Crear un <text> nuevo en el SVG para áreas manuales (p. ej. sobre paths)
      textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', x);
      textEl.setAttribute('y', y);
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'central');
      textEl.textContent = defaultText || label;
      doc.documentElement.appendChild(textEl);
    }

    if (!textEl) return;

    const tagName = textEl.tagName.toLowerCase();
    if (tagName === 'text') {
      textEl.setAttribute('data-editable', 'true');
    } else {
      textEl.setAttribute('data-hide-on-render', 'true');
    }
    textEl.setAttribute('data-field', id.trim());
    textEl.setAttribute('data-label', label.trim());
    textEl.setAttribute('data-type', selectedTextType);
    if (maxLength) textEl.setAttribute('data-maxlength', maxLength);
    if (fontSize) textEl.setAttribute('data-font-size', fontSize);
    if (fontFamily) textEl.setAttribute('data-font-family', fontFamily);

    const newArea: EditableArea = {
      id: id.trim(),
      label: label.trim(),
      defaultText: defaultText || textEl.textContent || '',
      type: selectedTextType,
      maxLength: maxLength ? parseInt(maxLength, 10) : undefined,
      fontSize: fontSize ? parseFloat(fontSize) : undefined,
      fontFamily: fontFamily || undefined,
    };

    if (selectedTextType === 'circular') {
      newArea.radius = radius ? parseFloat(radius) : undefined;
      newArea.centerX = centerX ? parseFloat(centerX) : undefined;
      newArea.centerY = centerY ? parseFloat(centerY) : undefined;
      newArea.startAngle = startAngle ? parseFloat(startAngle) : undefined;
      newArea.baseline = baseline;
      if (radius) textEl.setAttribute('data-radius', radius);
      if (centerX) textEl.setAttribute('data-center-x', centerX);
      if (centerY) textEl.setAttribute('data-center-y', centerY);
      if (startAngle) textEl.setAttribute('data-start-angle', startAngle);
      textEl.setAttribute('data-baseline', baseline);
    } else {
      const xAttr = x || textEl.getAttribute('x') || '0';
      const yAttr = y || textEl.getAttribute('y') || '0';
      newArea.x = parseFloat(xAttr);
      newArea.y = parseFloat(yAttr);
      textEl.setAttribute('data-x', xAttr);
      textEl.setAttribute('data-y', yAttr);
    }

    setSvgPreview(new XMLSerializer().serializeToString(doc.documentElement));
    setEditableAreas((prev) => [...prev.filter((a) => a.id !== newArea.id), newArea]);
    setSelectedTextIndex(null);
    setSelectedTextManual(false);
    manualTargetRef.current = null;
    setFormError('');
  };

  const cancelSelection = () => {
    // Si se ocultó un elemento original para una área manual, desocultarlo al cancelar
    if (manualTargetRef.current) {
      manualTargetRef.current.removeAttribute('data-hide-on-render');
      manualTargetRef.current.removeAttribute('data-hide-label');
      setHiddenCount((prev) => Math.max(0, prev - 1));
      if (previewRef.current) {
        setSvgPreview(previewRef.current.innerHTML);
      }
      manualTargetRef.current = null;
    }
    setSelectedTextIndex(null);
    setSelectedTextManual(false);
    setFormError('');
  };

  const removeArea = (areaId: string) => {
    setEditableAreas((prev) => prev.filter((a) => a.id !== areaId));
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgPreview, 'image/svg+xml');
      const textEl = doc.querySelector(
        `text[data-field="${areaId}"], path[data-field="${areaId}"], g[data-field="${areaId}"]`,
      );
      if (textEl) {
        textEl.removeAttribute('data-editable');
        textEl.removeAttribute('data-hide-on-render');
        textEl.removeAttribute('data-hide-label');
        textEl.removeAttribute('data-field');
        textEl.removeAttribute('data-label');
        textEl.removeAttribute('data-maxlength');
        textEl.removeAttribute('data-type');
        textEl.removeAttribute('data-baseline');
        setSvgPreview(new XMLSerializer().serializeToString(doc.documentElement));
      }
    } catch {}
  };

  const updateArea = (index: number, updates: Partial<EditableArea>) => {
    setEditableAreas((prev) =>
      prev.map((area, i) => (i === index ? { ...area, ...updates } : area))
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const filteredProducts = form.categoryId
    ? products.filter((p) => p.categoryId === form.categoryId)
    : products;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Plantillas de diseño</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-[#1B2A6B] hover:bg-[#141f4d] text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Nueva plantilla
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                {editing ? 'Editar plantilla' : 'Nueva plantilla'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Plantilla abogado 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={form.categoryId}
                  onChange={(e) => {
                    setForm({ ...form, categoryId: e.target.value });
                    setSelectedProductIds([]);
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Modelos de sello asignados
              </label>
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No hay modelos en esta categoría.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {filteredProducts.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          {p.widthMm}mm × {p.heightMm}mm · {p.shape}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Archivo SVG</label>
              <Input
                type="file"
                accept=".svg"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Marca los textos editables con data-editable=&quot;true&quot; data-field=&quot;line1&quot; data-label=&quot;Nombre&quot;
              </p>
            </div>

            {svgPreview && (
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
                <div className="border rounded-lg p-3 bg-gray-50 flex flex-col items-center">
                  <label className="text-sm font-medium block mb-2 text-center">
                    Vista previa — clic en un texto
                  </label>
                  <div className="w-full max-w-[220px] bg-white border rounded p-2">
                    <div
                      ref={previewRef}
                      className="w-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: svgPreview }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Si no se detecta un texto, hacé clic sobre él.
                  </p>
                  <Button
                    variant={hideMode ? 'default' : 'outline'}
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setHideMode((prev) => !prev);
                      setSelectedTextIndex(null);
                      setSelectedTextManual(false);
                    }}
                  >
                    {hideMode ? 'Desactivar modo ocultar' : 'Modo ocultar elementos'}
                  </Button>
                  {hideMode && (
                    <p className="text-xs text-orange-600 mt-2 text-center">
                      Hacé clic en los elementos que querés ocultar (texto original, líneas decorativas, etc.). {hiddenCount} oculto(s).
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {(selectedTextIndex !== null || selectedTextManual) && (
                    <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Marcar texto editable</h4>
                  <button
                    onClick={cancelSelection}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="ID del campo"
                    value={selectedTextForm.id}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, id: e.target.value })}
                  />
                  <Input
                    placeholder="Etiqueta visible"
                    value={selectedTextForm.label}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, label: e.target.value })}
                  />
                </div>

                <Input
                  placeholder="Texto por defecto"
                  value={selectedTextForm.defaultText}
                  onChange={(e) => setSelectedTextForm({ ...selectedTextForm, defaultText: e.target.value })}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Tamaño fuente"
                    value={selectedTextForm.fontSize}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, fontSize: e.target.value })}
                  />
                  <Select
                    value={selectedTextForm.fontFamily}
                    onValueChange={(value) => {
                      if (!value) return;
                      const selectedFont = fonts.find((f) => f.name === value);
                      const minPt = selectedFont?.minFontSizePt ?? 6;
                      setSelectedTextForm((prev) => ({
                        ...prev,
                        fontFamily: value,
                        fontSize: !prev.fontSize || parseFloat(prev.fontSize) < minPt ? String(minPt) : prev.fontSize,
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Fuente" />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((font) => (
                        <SelectItem key={font.id} value={font.name}>
                          {font.name} {font.minFontSizePt ? `(mín ${font.minFontSizePt}pt)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Max caracteres"
                    value={selectedTextForm.maxLength}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, maxLength: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="areaType"
                      checked={selectedTextType === 'text'}
                      onChange={() => setSelectedTextType('text')}
                    />
                    Texto normal
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="areaType"
                      checked={selectedTextType === 'circular'}
                      onChange={() => setSelectedTextType('circular')}
                    />
                    Texto circular
                  </label>
                </div>

                {selectedTextType === 'text' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Posición X"
                      value={selectedTextForm.x}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, x: e.target.value })}
                    />
                    <Input
                      placeholder="Posición Y"
                      value={selectedTextForm.y}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, y: e.target.value })}
                    />
                  </div>
                )}

                {selectedTextType === 'circular' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Radio"
                      value={selectedTextForm.radius}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, radius: e.target.value })}
                    />
                    <Input
                      placeholder="Centro X"
                      value={selectedTextForm.centerX}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, centerX: e.target.value })}
                    />
                    <Input
                      placeholder="Centro Y"
                      value={selectedTextForm.centerY}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, centerY: e.target.value })}
                    />
                    <Input
                      placeholder="Ángulo inicial"
                      value={selectedTextForm.startAngle}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, startAngle: e.target.value })}
                    />
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={selectedTextForm.baseline}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, baseline: e.target.value as 'top' | 'bottom' })}
                    >
                      <option value="top">Arriba</option>
                      <option value="bottom">Abajo</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelSelection}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="bg-[#1B2A6B] hover:bg-[#141f4d] text-white" onClick={addAreaFromSelection}>
                    Agregar campo
                  </Button>
                </div>
              </div>
            )}

            {editableAreas.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Campos editables detectados</label>
                <div className="space-y-2">
                  {editableAreas.map((area, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <Input
                        placeholder="ID"
                        value={area.id}
                        onChange={(e) => updateArea(idx, { id: e.target.value })}
                      />
                      <Input
                        placeholder="Label visible"
                        value={area.label}
                        onChange={(e) => updateArea(idx, { label: e.target.value })}
                      />
                      <Input
                        placeholder="Texto por defecto"
                        value={area.defaultText}
                        onChange={(e) => updateArea(idx, { defaultText: e.target.value })}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeArea(area.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editableAreas.length === 0 && selectedTextIndex === null && !selectedTextManual && (
              <p className="text-sm text-gray-500">
                No se detectaron textos editables. Hacé clic en un texto del preview para marcarlo, o en cualquier parte del sello para crear un texto manual.
              </p>
            )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Activa
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Orden:</span>
                <Input
                  type="number"
                  className="w-20"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#1B2A6B] hover:bg-[#141f4d] text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {t.svgContent ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: t.svgContent }}
                  />
                ) : (
                  <Eye className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <h3 className="font-semibold truncate">{t.name}</h3>
              <p className="text-sm text-gray-500">{t.category?.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(t.products || []).length} modelo(s) asignado(s)
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {t.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
