'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import api, { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Minus, Check, AlertTriangle, Loader2, ShoppingCart, X, Stamp } from 'lucide-react';
import { SvgImage } from '@/components/svg-image';
import { redirectToGoogleLogin } from '@/lib/auth-utils';
import { applyTemplateFields as applyTemplateFieldsCircular, CircularArea } from '@/lib/circular-text';
import { detectCircularText } from '@/lib/detect-circular-text';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  showInWizard?: boolean;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  shape: string;
  widthMm: number;
  heightMm: number;
  basePrice: number;
  imageUrl?: string;
  imageUrlHover?: string;
  stock: number;
}

interface Font {
  id: string;
  name: string;
  fileName: string;
  fileData?: string;
  minFontSizePt?: number;
  isDefault?: boolean;
}

interface Ink {
  id: string;
  color: string;
  hexCode: string;
}

interface LineData {
  text: string;
  fontSize: string;
  fontId: string;
  isBold: boolean;
  isItalic: boolean;
  alignment: 'center' | 'left' | 'right';
}

interface Template {
  id: string;
  name: string;
  categoryId: string;
  svgContent?: string;
  editableAreas?: EditableArea[];
  thumbnailUrl?: string;
  isActive: boolean;
  sortOrder: number;
  products?: { productId: string; product?: { id: string; name: string } }[];
}

interface EditableArea {
  id: string;
  label: string;
  defaultText: string;
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: string;
  maxLength?: number;
  type?: 'text' | 'circular';
  radius?: number;
  centerX?: number;
  centerY?: number;
  startAngle?: number;
  letterSpacing?: number;
  baseline?: 'top' | 'bottom';
}

type StampType = 'MONTURA_AUTOMATICA' | 'FECHADOR' | 'PORTATIL' | 'EMBOSADORA';
type SubStep = 'type' | 'shape';

const STAMP_TYPE_DETAILS: Record<StampType, { name: string; description: string; svg: React.ReactNode }> = {
  MONTURA_AUTOMATICA: {
    name: 'Montura Automática',
    description: 'Sello con mecanismo automático para uso frecuente',
    svg: (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <rect x="20" y="65" width="60" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="30" y="58" width="40" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <rect x="38" y="20" width="24" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="42" y="12" width="16" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="42" y1="28" x2="58" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <line x1="42" y1="34" x2="58" y2="34" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <line x1="42" y1="40" x2="58" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <ellipse cx="50" cy="88" rx="25" ry="4" fill="currentColor" opacity="0.1" />
      </svg>
    ),
  },
  FECHADOR: {
    name: 'Fechador',
    description: 'Sello con fecha ajustable para documentos',
    svg: (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <rect x="42" y="10" width="16" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="50" cy="18" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="45" y="38" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="62" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="35" y="58" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="46" y="58" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="57" y="58" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="40" y1="58" x2="40" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="51" y1="58" x2="51" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="62" y1="58" x2="62" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <ellipse cx="50" cy="87" rx="18" ry="3" fill="currentColor" opacity="0.1" />
      </svg>
    ),
  },
  PORTATIL: {
    name: 'Portátil',
    description: 'Sello compacto de bolsillo para transporte',
    svg: (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <rect x="25" y="35" width="50" height="35" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="30" y="20" width="40" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="25" y1="38" x2="75" y2="38" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <line x1="35" y1="28" x2="65" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <rect x="22" y="68" width="56" height="8" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="50" cy="82" rx="22" ry="3" fill="currentColor" opacity="0.1" />
      </svg>
    ),
  },
  EMBOSADORA: {
    name: 'Embosadora',
    description: 'Herramienta para marcar en relieve en papel',
    svg: (
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <rect x="32" y="10" width="36" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="42" y="28" width="16" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <rect x="18" y="50" width="64" height="30" rx="5" fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1="25" y1="58" x2="75" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <rect x="38" y="65" width="24" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="50" cy="85" rx="28" ry="4" fill="currentColor" opacity="0.1" />
      </svg>
    ),
  },
};

const SHAPES = [
  {
    id: 'RECTANGULAR',
    name: 'Rectangular',
    description: 'Forma alargada',
    svg: (
      <svg viewBox="0 0 120 70" className="w-20 h-12">
        <rect x="5" y="5" width="110" height="60" rx="8" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="25" y="20" width="70" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'SQUARE',
    name: 'Cuadrado',
    description: 'Forma cuadrada',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16">
        <rect x="8" y="8" width="84" height="84" rx="8" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="28" y="28" width="44" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'CIRCULAR',
    name: 'Redondo',
    description: 'Forma circular',
    svg: (
      <svg viewBox="0 0 100 100" className="w-16 h-16">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'OVAL',
    name: 'Oval',
    description: 'Forma ovalada',
    svg: (
      <svg viewBox="0 0 120 70" className="w-20 h-12">
        <ellipse cx="60" cy="35" rx="54" ry="30" fill="none" stroke="currentColor" strokeWidth="4" />
        <ellipse cx="60" cy="35" rx="34" ry="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </svg>
    ),
  },
];

const CARD_BASE =
  'border-2 border-blue-100 hover:border-blue-400 rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:scale-[1.03] cursor-pointer';

const CARD_SELECTED = 'ring-2 ring-orange-500 bg-orange-50 border-orange-300';

function getImageUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '');
  return `${baseUrl}${url}`;
}

export default function DesignPage() {
  const { token } = useAuth();
  const { addItem, updateItem, items: cartItems } = useCart();
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState<SubStep>('type');
  const [stampType, setStampType] = useState<StampType | ''>('');
  const [shape, setShape] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [inks, setInks] = useState<Ink[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lines, setLines] = useState<LineData[]>([{ text: '', fontSize: '12pt', fontId: '', isBold: false, isItalic: false, alignment: 'center' }]);
  const [selectedInk, setSelectedInk] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [textValidation, setTextValidation] = useState<any>(null);
  const [validatingText, setValidatingText] = useState(false);
  const [hasLogoGradient, setHasLogoGradient] = useState(false);
  const [designResult, setDesignResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [isWood, setIsWood] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});
  const [useTemplate, setUseTemplate] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  // selectedFont se deriva de la primera linea que tenga fontId
  const selectedFont = lines.find((l) => l.fontId)?.fontId || '';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = apiUrl.replace('/api/v1', '');

  // ── Persistencia del wizard en localStorage ──
  const STORAGE_KEY = 'design-state';

  // Guardar estado cuando cambie
  useEffect(() => {
    const state = {
      step,
      subStep,
      stampType,
      shape,
      selectedProductId: selectedProduct?.id || null,
      lines,
      selectedInk,
      logoUrl,
      hasLogoGradient,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [step, subStep, stampType, shape, selectedProduct, lines, selectedInk, logoUrl, hasLogoGradient]);

  // Restaurar estado al montar
  useEffect(() => {
    // Si venimos desde el catalogo con un productId precargado, no restaurar localStorage
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('productId')) return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved.step) setStep(saved.step);
      if (saved.subStep) setSubStep(saved.subStep);
      if (saved.stampType) setStampType(saved.stampType);
      if (saved.shape) setShape(saved.shape);
      if (saved.lines) {
        // Migrar lines antiguas sin fontId
        const migratedLines = saved.lines.map((l: any) => ({
          text: l.text || '',
          fontSize: l.fontSize || '12pt',
          fontId: l.fontId || saved.selectedFont || '',
          isBold: l.isBold || false,
          isItalic: l.isItalic || false,
          alignment: l.alignment || 'center',
        }));
        setLines(migratedLines);
      }
      if (saved.selectedInk) setSelectedInk(saved.selectedInk);
      if (saved.logoUrl) setLogoUrl(saved.logoUrl);
      if (typeof saved.hasLogoGradient === 'boolean') setHasLogoGradient(saved.hasLogoGradient);
      // selectedProduct se restaura despues de cargar products
      if (saved.selectedProductId) {
        const restoreProduct = (prods: Product[]) => {
          const p = prods.find((x) => x.id === saved.selectedProductId);
          if (p) setSelectedProduct(p);
        };
        if (products.length > 0) restoreProduct(products);
        else {
          const check = setInterval(() => {
            if (products.length > 0) {
              clearInterval(check);
              restoreProduct(products);
            }
          }, 200);
          setTimeout(() => clearInterval(check), 5000);
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  useEffect(() => {
    // Leer params de la URL para auto-precargar desde detalle de producto o carrito
    const params = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
    const urlProductId = params?.get('productId') || null;
    const editIndexParam = params?.get('editIndex');
    const editIndex = editIndexParam ? parseInt(editIndexParam, 10) : -1;
    const returnToParam = params?.get('returnTo');
    if (returnToParam) setReturnTo(returnToParam);
    if (!isNaN(editIndex) && editIndex >= 0 && cartItems[editIndex]) {
      setIsWood(cartItems[editIndex].isWood || false);
    }

    Promise.all([
      api.get('/products?take=9999'),
      api.get('/categories?showInWizard=true'),
      api.get('/fonts'),
      api.get('/inks'),
    ])
      .then(([productsRes, categoriesRes, fontsRes, inksRes]) => {
        const p = productsRes.data?.items || productsRes.data || [];
        const c = categoriesRes.data || [];
        const f = fontsRes.data || [];
        const i = inksRes.data || [];
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
        const fontsArr = Array.isArray(f) ? f : [];
        setFonts(fontsArr);
        setInks(Array.isArray(i) ? i : []);
        setApiLoading(false);

        // Auto-precargar producto desde URL (viene de /store/product)
        if (urlProductId) {
          const targetProduct = p.find((prod: Product) => prod.id === urlProductId);
          if (targetProduct) {
            const productCategory = c.find((cat: Category) => cat.id === targetProduct.categoryId);
            if (productCategory) {
              const SLUG_TO_STAMP_TYPE: Record<string, StampType> = {
                'sello-automatico': 'MONTURA_AUTOMATICA',
                'sello-fechador': 'FECHADOR',
                'sello-portatil': 'PORTATIL',
                'embosadora': 'EMBOSADORA',
              };
              const autoStampType = SLUG_TO_STAMP_TYPE[productCategory.slug];
              if (autoStampType) {
                // Limpiar estado previo del wizard para evitar conflictos
                localStorage.removeItem(STORAGE_KEY);
                setStampType(autoStampType);
                setShape(targetProduct.shape || '');
                setSelectedProduct(targetProduct);
                setStep(3); // Saltar directo al paso de diseño
                // Limpiar query param de la URL
                if (typeof window !== 'undefined' && window.history.replaceState) {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('productId');
                  window.history.replaceState({}, '', url.toString());
                }
              }
            }
          }
        }

        // Auto-seleccionar fuente predeterminada si no hay ninguna en las lineas
        const hasAnyFont = lines.some((l) => l.fontId);
        if (!hasAnyFont && fontsArr.length > 0) {
          const defaultFont = fontsArr.find((font: Font) => font.isDefault);
          const firstFontId = defaultFont?.id || fontsArr[0]?.id || '';
          if (firstFontId) {
            setLines((prev) => prev.map((l, idx) => (idx === 0 ? { ...l, fontId: firstFontId } : l)));
          }
        }

        // Cargar fuentes via @font-face inyectado en <head>
        fontsArr.forEach((font: Font) => {
          if (!font.fileData || font.fileData.length < 100) {
            // font skipped (no fileData)
            return;
          }

          const styleId = `design-font-style-${font.id}`;
          if (document.getElementById(styleId)) {
            setLoadedFonts((prev) => new Set(prev).add(font.id));
            return;
          }

          try {
            const isOtf = font.fileName?.toLowerCase().endsWith('.otf');
            const format = isOtf ? 'opentype' : 'truetype';
            const fontUrl = `${API_BASE_URL}/fonts/${font.id}/file`;

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `@font-face { font-family: 'font-${font.id}'; src: url('${fontUrl}') format('${format}'); }`;
            document.head.appendChild(style);

            // font face injected
            setLoadedFonts((prev) => new Set(prev).add(font.id));
          } catch (err: any) {
            // font face injection error
          }
        });
      })
      .catch((err) => {
        // api error
        setApiError(err.response?.data?.message || err.message || 'Error cargando datos');
        setApiLoading(false);
      });
  }, []);

  const STAMP_TYPE_TO_SLUG: Record<StampType, string> = {
    MONTURA_AUTOMATICA: 'sello-automatico',
    FECHADOR: 'sello-fechador',
    PORTATIL: 'sello-portatil',
    EMBOSADORA: 'embosadora',
  };

  const stampCategoryIds = categories.map((c) => c.id);

  const selectedCategoryId = stampType
    ? categories.find((c) => c.slug === STAMP_TYPE_TO_SLUG[stampType])?.id
    : undefined;

  // Filtrar productos por tipo de sello y forma seleccionados
  const filteredProducts = products.filter((p) => {
    if (!stampCategoryIds.includes(p.categoryId)) return false;
    if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false;
    return !shape || p.shape === shape;
  });

  // Mostrar solo los shapes que realmente existen en productos del stampType seleccionado
  const availableShapes = selectedCategoryId
    ? new Set(products.filter((p) => p.categoryId === selectedCategoryId && p.shape).map((p) => p.shape))
    : new Set(SHAPES.map((s) => s.id));
  const filteredShapes = SHAPES.filter((s) => availableShapes.has(s.id));

  const addLine = () => {
    if (lines.length < 5) {
      const lastLine = lines[lines.length - 1];
      setLines([...lines, { text: '', fontSize: lastLine.fontSize, fontId: lastLine.fontId, isBold: false, isItalic: false, alignment: 'center' }]);
    }
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const validateTextWidth = useCallback(async () => {
    if (!selectedProduct || lines.length === 0 || !lines.some((l) => l.text.trim() && l.fontId)) {
      setTextValidation(null);
      return;
    }
    setValidatingText(true);
    try {
      // Validar cada linea por separado con su propia fuente
      const validations = await Promise.all(
        lines
          .filter((l) => l.text.trim() && l.fontId)
          .map(async (line) => {
            const res = await api.post('/design/validate-text', {
              text: line.text,
              fontId: line.fontId,
              productId: selectedProduct.id,
              fontSizePt: parseInt(line.fontSize),
            });
            return { ...res.data, lineText: line.text, lineFontSize: line.fontSize };
          })
      );

      // Encontrar la linea mas ancha que no cabe
      const failing = validations.filter((v) => !v.fits);
      const worst = failing.length > 0
        ? failing.reduce((max, v) => (v.textWidthPx > max.textWidthPx ? v : max))
        : null;

      if (worst) {
        setTextValidation(worst);
      } else {
        // Todo cabe, mostrar la linea mas ancha como referencia
        const widest = validations.reduce((max, v) => (v.textWidthPx > max.textWidthPx ? v : max));
        setTextValidation({ ...widest, fits: true });
      }
    } catch (err: any) {
        // text validation error
      setTextValidation(null);
    } finally {
      setValidatingText(false);
    }
  }, [lines, selectedProduct]);

  // Validar ancho de texto cuando cambian lineas, fuente o producto
  useEffect(() => {
    const timer = setTimeout(validateTextWidth, 500);
    return () => clearTimeout(timer);
  }, [validateTextWidth]);

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/design/upload-logo', fd, {
        headers: { 'Content-Type': undefined },
      });
      setLogoUrl(res.data.logoUrl);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error subiendo logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleGenerateDesign = async () => {
    if (!selectedProduct) {
      setError('Selecciona un modelo');
      return;
    }

    // Flujo de plantilla
    if (useTemplate && selectedTemplate) {
      setLoading(true);
      setError('');
      try {
        const res = await api.post('/design', {
          productId: selectedProduct.id,
          templateId: selectedTemplate.id,
          templateData: templateFields,
          fontId: fonts[0]?.id || '',
          inkId: selectedInk || undefined,
        });
        setDesignResult(res.data);
        setStep(4);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error generando el diseno desde plantilla');
      } finally {
        setLoading(false);
      }
      return;
    }

    const primaryFontId = lines.find((l) => l.fontId)?.fontId;
    if (!primaryFontId) {
      setError('Selecciona un modelo y fuente');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/design', {
        productId: selectedProduct.id,
        lines: lines.map((l) => ({
          text: l.text,
          fontSize: l.fontSize,
          isBold: l.isBold,
          isItalic: l.isItalic,
          alignment: l.alignment,
        })),
        fontId: primaryFontId,
        inkId: selectedInk || undefined,
        logoUrl: logoUrl || undefined,
        hasLogoGradient,
      });
      setDesignResult(res.data);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error generando el diseno');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSubStep('type');
    setStampType('');
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('productId');
      url.searchParams.delete('editIndex');
      window.history.replaceState({}, '', url.toString());
    }
    setShape('');
    setSelectedProduct(null);
    setLines([{ text: '', fontSize: '12pt', fontId: '', isBold: false, isItalic: false, alignment: 'center' }]);
    setSelectedInk('');
    setLogoUrl('');
    setHasLogoGradient(false);
    setDesignResult(null);
    setTextValidation(null);
    setTemplates([]);
    setSelectedTemplate(null);
    setTemplateFields({});
    setUseTemplate(false);
    setShowTemplateSelection(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const normalizeEditableAreas = (areas: unknown): EditableArea[] => {
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

  const loadTemplates = async (product: Product) => {
    setTemplatesLoading(true);
    try {
      const res = await api.get('/templates', {
        params: {
          productId: product.id,
        },
      });
      const list = (res.data || []).map((t: Template) => {
        const normalized = normalizeEditableAreas(t.editableAreas);
        if (normalized.length === 0 && t.svgContent) {
          const detected = detectCircularText(t.svgContent);
          return { ...t, svgContent: detected.svgContent, editableAreas: detected.areas };
        }
        return { ...t, editableAreas: normalized };
      });
      setTemplates(list);
      if (list.length > 0) {
        setShowTemplateSelection(true);
      } else {
        setShowTemplateSelection(false);
      }
    } catch {
      setTemplates([]);
      setShowTemplateSelection(false);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const selectProductAndProceed = (product: Product) => {
    if (product.stock > 0) {
      setSelectedProduct(product);
      loadTemplates(product).then(() => {
        setStep(3);
      });
    }
  };

  const selectTemplate = (template: Template) => {
    const areas = normalizeEditableAreas(template.editableAreas);
    setSelectedTemplate({ ...template, editableAreas: areas });
    const initialFields: Record<string, string> = {};
    areas.forEach((area) => {
      initialFields[area.id] = area.defaultText || '';
    });
    setTemplateFields(initialFields);
    setUseTemplate(true);
    setShowTemplateSelection(false);
  };

  const selectNoTemplate = () => {
    setUseTemplate(false);
    setShowTemplateSelection(false);
  };

  const applyTemplateFields = (svgContent: string, fields: Record<string, string>): string => {
    return applyTemplateFieldsCircular(svgContent, fields, selectedTemplate?.editableAreas || []);
  };

  const addToCart = () => {
    if (!designResult || !selectedProduct) return;
    const params = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
    const editIndexParam = params?.get('editIndex');
    const editIndex = editIndexParam ? parseInt(editIndexParam, 10) : -1;

    const cartItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSku: selectedProduct.sku,
      unitPrice: selectedProduct.basePrice,
      quantity: 1,
      designJson: designResult.designJson,
      previewPngUrl: designResult.previewPngUrl,
      productionSvgUrl: designResult.productionSvgUrl,
      inkId: selectedInk,
      inkName: inks.find((i) => i.id === selectedInk)?.color,
      categoryIsCustomizable: true,
      isWood,
      shape: selectedProduct.shape,
      widthMm: selectedProduct.widthMm,
      heightMm: selectedProduct.heightMm,
    };

    if (!isNaN(editIndex) && editIndex >= 0) {
      updateItem(editIndex, cartItem);
      toast.success('Diseño actualizado en el carrito');
    } else {
      addItem(cartItem);
      toast.success('Agregado al carrito');
    }

    if (returnTo === 'cart') {
      window.location.href = '/cart';
    } else {
      resetWizard();
    }
  };

  // ── Render helpers ──

  const renderAuthGate = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-bold text-[#1B2A6B] mb-3">Diseña tu sello personalizado</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        Para crear y guardar tu diseño, primero necesitas iniciar sesión con tu cuenta de Google.
      </p>
      <Card className={`p-8 max-w-sm w-full ${CARD_BASE}`}>
        <h3 className="font-semibold mb-4 text-lg">Inicia sesión</h3>
        <p className="text-sm text-gray-500 mb-5">
          Accede para guardar tus diseños, revisar tu carrito y realizar pedidos.
        </p>
        <Button
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg transition-shadow"
          onClick={redirectToGoogleLogin}
        >
          Ingresar con Google
        </Button>
      </Card>
    </div>
  );

  const renderStep1 = () => {
    const panelActive = 'opacity-100 scale-100 relative pointer-events-auto';
    const panelHidden = 'opacity-0 scale-95 absolute top-0 left-0 w-full pointer-events-none';

    return (
      <div className="space-y-6 relative min-h-[320px]">
        {/* Panel 1A: Tipo de sello */}
        <div className={`transition-all duration-500 ease-in-out ${subStep === 'type' ? panelActive : panelHidden}`}>
          <h2 className="text-2xl font-bold text-[#1B2A6B] mb-2">Paso 1: ¿Qué tipo de sello necesitas?</h2>
          <p className="text-gray-600 mb-6">Selecciona el tipo de sello que mejor se ajuste a tu uso.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {(Object.keys(STAMP_TYPE_DETAILS) as StampType[]).map((type) => {
              const detail = STAMP_TYPE_DETAILS[type];
              return (
                <Card
                  key={type}
                  className={`p-6 flex flex-col items-center text-center ${CARD_BASE} ${stampType === type ? CARD_SELECTED : ''}`}
                  onClick={() => {
                    setStampType(type);
                    setSubStep('shape');
                  }}
                >
                  <div className={`mb-4 ${stampType === type ? 'text-orange-500' : 'text-blue-400'}`}>
                    {detail.svg}
                  </div>
                  <h3 className="font-semibold text-base">{detail.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{detail.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Panel 1B: Forma */}
        <div className={`transition-all duration-500 ease-in-out ${subStep === 'shape' ? panelActive : panelHidden}`}>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 -ml-2"
              onClick={() => {
                setSubStep('type');
                setShape('');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Tipo
            </Button>
          </div>
          <h2 className="text-2xl font-bold text-[#1B2A6B] mb-2">Paso 1: Elige la forma</h2>
          <p className="text-gray-600 mb-6">
            {stampType === 'FECHADOR'
              ? 'Los fechadores solo están disponibles en forma rectangular.'
              : 'Selecciona la forma que mejor se ajuste a lo que necesitas.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {filteredShapes.map((s) => (
              <Card
                key={s.id}
                className={`p-6 flex flex-col items-center text-center ${CARD_BASE} ${shape === s.id ? CARD_SELECTED : ''}`}
                onClick={() => {
                  setShape(s.id);
                  setStep(2);
                }}
              >
                <div className={`mb-4 ${shape === s.id ? 'text-orange-500' : 'text-blue-400'}`}>{s.svg}</div>
                <h3 className="font-semibold text-base">{s.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 2: Elige tu modelo</h2>
      <p className="text-gray-600">Selecciona el modelo que se ajuste a tus necesidades.</p>

      {apiLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
          <p className="mt-4 text-gray-500">Cargando modelos...</p>
        </div>
      )}

      {apiError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          <p className="font-medium">Error cargando modelos:</p>
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      {!apiLoading && !apiError && products.length === 0 && (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
          <p>No hay productos disponibles.</p>
        </div>
      )}

      {!apiLoading && !apiError && filteredProducts.length === 0 && products.length > 0 && (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-lg">
          <p>No hay modelos para esta forma en este tipo de sello.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {(filteredProducts.length > 0 ? filteredProducts : []).map((product) => (
          <Card
            key={product.id}
            className={`group p-3 ${CARD_BASE} ${selectedProduct?.id === product.id ? CARD_SELECTED : ''} ${product.stock <= 0 ? 'opacity-50' : ''}`}
            onClick={() => selectProductAndProceed(product)}
          >
            <div className="relative h-44 bg-gray-50 rounded-lg mb-2 overflow-hidden">
              {product.imageUrl ? (
                <>
                  <img
                    src={getImageUrl(product.imageUrl)}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain p-1 opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                  />
                  {product.imageUrlHover ? (
                    <img
                      src={getImageUrl(product.imageUrlHover)}
                      alt={`${product.name} - hover`}
                      className="absolute inset-0 w-full h-full object-contain p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  ) : (
                    <img
                      src={getImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-contain p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105"
                    />
                  )}
                </>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-2xl">📐</span>
              )}
            </div>
            <h3 className="font-semibold text-xs leading-tight">{product.name}</h3>
            <p className="text-[10px] text-gray-500">{product.widthMm}mm × {product.heightMm}mm</p>
            <div className="flex items-center justify-between mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Q{product.basePrice.toFixed(2)}</Badge>
              {product.stock <= 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Agotado</Badge>}
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Atras
        </Button>
      </div>
    </div>
  );

  const renderLivePreview = () => {
    if (!selectedProduct) return null;

    // Preview de plantilla
    if (useTemplate && selectedTemplate?.svgContent) {
      const svgWithFields = applyTemplateFields(selectedTemplate.svgContent, templateFields);
      return (
        <div className="sticky top-6">
          <Card className="p-5">
            <h3 className="font-semibold text-base mb-4 text-[#1B2A6B]">Vista previa</h3>
            <div
              className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-inner"
              dangerouslySetInnerHTML={{ __html: svgWithFields }}
            />
            <div className="mt-4 text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700 tracking-wide">
                {selectedProduct.widthMm}mm × {selectedProduct.heightMm}mm
              </p>
              <p className="text-xs text-gray-500">{selectedTemplate.name}</p>
            </div>
          </Card>
        </div>
      );
    }

    const w = selectedProduct.widthMm;
    const h = selectedProduct.heightMm;
    const ink = inks.find((i) => i.id === selectedInk);
    const inkColor = ink?.hexCode || '#1a1a1a';
    const activeLines = lines.filter((l) => l.text.trim());
    const padding = Math.min(w, h) * 0.12;

    // Shape element
    let shapeEl;
    if (selectedProduct.shape === 'RECTANGULAR') {
      shapeEl = <rect x={0} y={0} width={w} height={h} rx={Math.min(w, h) * 0.08} fill="#fafafa" stroke="#d1d5db" strokeWidth={0.4} />;
    } else if (selectedProduct.shape === 'SQUARE') {
      shapeEl = <rect x={0} y={0} width={w} height={h} rx={0} fill="#fafafa" stroke="#d1d5db" strokeWidth={0.4} />;
    } else if (selectedProduct.shape === 'CIRCULAR') {
      const r = Math.min(w, h) / 2;
      shapeEl = <circle cx={w / 2} cy={h / 2} r={r} fill="#fafafa" stroke="#d1d5db" strokeWidth={0.4} />;
    } else {
      shapeEl = <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#fafafa" stroke="#d1d5db" strokeWidth={0.4} />;
    }

    // Logo (if any) — positioned at top center
    const logoEl = logoUrl ? (
      <image
        href={getImageUrl(logoUrl)}
        x={w * 0.25}
        y={padding + 1}
        width={w * 0.5}
        height={h * 0.25}
        preserveAspectRatio="xMidYMid meet"
        opacity={0.9}
      />
    ) : null;

    // Text lines — cada una con su propia fuente
    const textEls = activeLines.map((line, i) => {
      const fontSizeMm = parseInt(line.fontSize) * 0.3528;
      const lineHeight = fontSizeMm * 1.3;
      const totalTextHeight = activeLines.length * lineHeight;
      const logoOffset = logoUrl ? h * 0.22 : 0;
      const startY = (h - totalTextHeight) / 2 + lineHeight * 0.8 + logoOffset / 2;
      const y = startY + i * lineHeight;
      const fontFamily = line.fontId ? `font-${line.fontId}` : 'sans-serif';

      return (
        <text
          key={i}
          x={w / 2}
          y={Math.min(y, h - padding)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={fontFamily}
          fontSize={fontSizeMm}
          fontWeight={line.isBold ? 'bold' : 'normal'}
          fontStyle={line.isItalic ? 'italic' : 'normal'}
          fill={inkColor}
        >
          {line.text}
        </text>
      );
    });

    // Dimension labels
    const dimLabel = `${w}mm × ${h}mm`;

    return (
      <div className="sticky top-6">
        <Card className="p-5">
          <h3 className="font-semibold text-base mb-4 text-[#1B2A6B]">Vista previa</h3>
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-inner">
            <svg
              viewBox={`${-padding} ${-padding} ${w + padding * 2} ${h + padding * 2 + 6}`}
              className="w-full h-auto"
              style={{ maxHeight: '420px', minHeight: '200px' }}
            >
              {shapeEl}
              {logoEl}
              {textEls}
            </svg>
          </div>
          <div className="mt-4 text-center space-y-1">
            <p className="text-sm font-semibold text-gray-700 tracking-wide">{dimLabel}</p>
            {selectedProduct.name && (
              <p className="text-xs text-gray-500">{selectedProduct.name}</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 3: Elige una plantilla</h2>
      <p className="text-gray-600">
        Selecciona una plantilla para modificar solo el texto, o diseña desde cero.
      </p>

      {templatesLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
        </div>
      )}

      {!templatesLoading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map((t) => (
              <Card
                key={t.id}
                className={`p-4 cursor-pointer ${CARD_BASE} ${selectedTemplate?.id === t.id ? CARD_SELECTED : ''}`}
                onClick={() => selectTemplate(t)}
              >
                <div className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {t.svgContent ? (
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: t.svgContent }}
                    />
                  ) : (
                    <span className="text-gray-300 text-2xl">📄</span>
                  )}
                </div>
                <h3 className="font-semibold text-sm truncate">{t.name}</h3>
                <p className="text-xs text-gray-500">
                  {t.editableAreas?.length || 0} campo(s) editable(s)
                </p>
              </Card>
            ))}
          </div>

          <Card
            className={`p-4 cursor-pointer ${CARD_BASE}`}
            onClick={selectNoTemplate}
          >
            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
              <Plus className="h-10 w-10 mb-2" />
              <span className="font-medium">Diseñar desde cero</span>
            </div>
          </Card>
        </>
      )}

      <div className="flex justify-start">
        <Button variant="outline" onClick={() => (templates.length > 0 ? setShowTemplateSelection(true) : setStep(2))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Atras
        </Button>
      </div>
    </div>
  );

  const renderTemplateEditor = () => {
    if (!selectedTemplate) return null;
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 3: Completa los datos</h2>
        <p className="text-gray-600">Modifica solo los textos de la plantilla.</p>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          <div className="space-y-4 min-w-0">
            <Card className="p-4 space-y-4">
              {(selectedTemplate.editableAreas || []).length === 0 && (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
                  Esta plantilla no tiene textos editables configurados. El administrador debe
                  subir un SVG con los textos marcados como{' '}
                  <code>data-editable=&quot;true&quot;</code>.
                </div>
              )}
              {selectedTemplate.editableAreas?.map((area) => (
                <div key={area.id}>
                  <label className="text-sm font-medium mb-1 block">{area.label}</label>
                  <Input
                    value={templateFields[area.id] || ''}
                    onChange={(e) =>
                      setTemplateFields((prev) => ({ ...prev, [area.id]: e.target.value }))
                    }
                    placeholder={area.defaultText}
                    maxLength={area.maxLength}
                  />
                </div>
              ))}

              <Separator />

              <div>
                <label className="text-sm font-medium mb-3 block">Color de tinta</label>
                <div className="flex flex-wrap gap-3">
                  {inks.map((ink) => (
                    <button
                      key={ink.id}
                      onClick={() => setSelectedInk(ink.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedInk === ink.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: ink.hexCode }} />
                      <span className="text-sm font-medium">{ink.color}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setShowTemplateSelection(true)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Elegir otra plantilla
              </Button>
              <Button
                onClick={handleGenerateDesign}
                disabled={loading || selectedTemplate.editableAreas?.some((a) => !templateFields[a.id]?.trim())}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Generar diseno
              </Button>
            </div>
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            {renderLivePreview()}
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (showTemplateSelection) return renderTemplateSelection();
    if (useTemplate) return renderTemplateEditor();

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 3: Personaliza tu diseno</h2>
        <p className="text-gray-600">Ingresa el texto, elige fuente, color de tinta y sube tu logo si lo deseas.</p>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* Left: Form */}
          <div className="space-y-4 min-w-0">
            <Card className="p-4 space-y-4 overflow-hidden">
              <div>
                <label className="text-sm font-medium mb-2 block">Texto del sello</label>
                {lines.map((line, i) => (
                  <div key={i} className="mb-3">
                    {/* Fila única: input + controles inline */}
                    <div className="flex gap-2 items-center">
                      <Input
                        value={line.text}
                        onChange={(e) => updateLine(i, 'text', e.target.value)}
                        placeholder={`Linea ${i + 1}`}
                        className="flex-1 min-w-0"
                      />
                      {(() => {
                        const lineFont = fonts.find((f) => f.id === line.fontId);
                        const minPt = lineFont?.minFontSizePt ?? 6;
                        const allSizes = [6, 7, 8, 10, 12, 14, 16];
                        const availableSizes = allSizes.filter((s) => s >= minPt);
                        return (
                          <Select value={line.fontSize} onValueChange={(v) => updateLine(i, 'fontSize', v || '')}>
                            <SelectTrigger className="w-16 h-8 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSizes.map((s) => (
                                <SelectItem key={s} value={`${s}pt`}>{s}pt</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}

                      <Select value={line.fontId} onValueChange={(v) => updateLine(i, 'fontId', v || '')}>
                        <SelectTrigger className="w-32 h-8 px-2 shrink-0">
                          <SelectValue placeholder="Fuente">
                            {line.fontId ? (
                              <span
                                className="text-base leading-none"
                                style={loadedFonts.has(line.fontId) ? { fontFamily: `"font-${line.fontId}"` } : {}}
                              >
                                abc
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Fuente</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[360px]">
                          {fonts.map((font) => (
                            <SelectItem key={font.id} value={font.id} className="h-12 px-3">
                              <span
                                className="text-lg leading-none"
                                style={loadedFonts.has(font.id) ? { fontFamily: `"font-${font.id}"` } : {}}
                              >
                                abcdefg...
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant={line.isBold ? 'default' : 'outline'} size="icon" className="h-8 w-8 shrink-0" onClick={() => updateLine(i, 'isBold', !line.isBold)}>
                        <span className="font-bold text-sm">B</span>
                      </Button>
                      <Button variant={line.isItalic ? 'default' : 'outline'} size="icon" className="h-8 w-8 shrink-0" onClick={() => updateLine(i, 'isItalic', !line.isItalic)}>
                        <span className="italic text-sm">I</span>
                      </Button>
                      {lines.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeLine(i)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {lines.length < 5 && (
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar linea
                  </Button>
                )}

                {/* Validacion de ancho de texto */}
                {validatingText && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verificando que el texto cabe en el sello...
                  </p>
                )}
                {textValidation && !validatingText && !textValidation.fits && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-sm text-amber-800 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {textValidation.impossible
                        ? `Este texto es demasiado largo para un sello de ${selectedProduct?.widthMm}mm`
                        : `&ldquo;${textValidation.lineText || 'El texto'}&rdquo; no cabe en ${selectedProduct?.widthMm}mm`}
                    </p>
                    {textValidation.impossible && (
                      <p className="text-xs text-amber-700">
                        Ni siquiera al minimo ({textValidation.minFontSizePt}pt) cabe. Usa menos caracteres o elige un modelo mas grande.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!textValidation.impossible && textValidation.suggestedFontSizePt && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-white hover:bg-amber-100 border-amber-300"
                          onClick={() => {
                            const newLines = lines.map((l) => ({
                              ...l,
                              fontSize: `${textValidation.suggestedFontSizePt}pt`,
                            }));
                            setLines(newLines);
                          }}
                        >
                          🔤 Reducir todo a {textValidation.suggestedFontSizePt}pt
                        </Button>
                      )}
                      {textValidation.suggestedLines.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-white hover:bg-amber-100 border-amber-300"
                          onClick={() => {
                            const newLines = textValidation.suggestedLines.map((text: string) => ({
                              text,
                              fontSize: textValidation.impossible ? `${textValidation.minFontSizePt}pt` : (lines[0]?.fontSize || '12pt'),
                              isBold: lines[0]?.isBold || false,
                              isItalic: lines[0]?.isItalic || false,
                              alignment: lines[0]?.alignment || 'center',
                              fontId: lines[0]?.fontId || '',
                            }));
                            setLines(newLines);
                          }}
                        >
                          📝 Dividir en {textValidation.suggestedLines.length} lineas
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-amber-600">
                      Ancho usado: {textValidation.textWidthPx}px / {textValidation.availableWidthPx}px disponibles
                    </p>
                  </div>
                )}
                {textValidation && !validatingText && textValidation.fits && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <Check className="h-3 w-3" /> El texto cabe perfectamente en el sello.
                  </p>
                )}
              </div>

              <Separator />

              {/* Color de tinta */}
              <div>
                <label className="text-sm font-medium mb-3 block">Color de tinta</label>
                <div className="flex flex-wrap gap-3">
                  {inks.map((ink) => (
                    <button
                      key={ink.id}
                      onClick={() => setSelectedInk(ink.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedInk === ink.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: ink.hexCode }} />
                      <span className="text-sm font-medium">{ink.color}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Logo upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Logo (opcional)</label>
                {!logoUrl ? (
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      className="max-w-xs"
                    />
                    {logoUploading && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <img src={getImageUrl(logoUrl)} alt="Logo subido" className="h-16 w-16 object-contain border rounded-lg" />
                    <Button variant="ghost" size="sm" onClick={() => { setLogoUrl(''); setHasLogoGradient(false); }}>
                      <X className="h-4 w-4 mr-1" /> Quitar
                    </Button>
                  </div>
                )}
                {logoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      id="gradient"
                      checked={hasLogoGradient}
                      onCheckedChange={(v) => setHasLogoGradient(v as boolean)}
                    />
                    <label htmlFor="gradient" className="text-sm text-gray-600">
                      El logo tiene gradientes/sombras (se convertira a B&W)
                    </label>
                  </div>
                )}
              </div>
            </Card>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atras
              </Button>
              <Button
                onClick={handleGenerateDesign}
                disabled={loading || lines.some((l) => !l.text.trim()) || !selectedFont}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Generar diseno
              </Button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            {renderLivePreview()}
          </div>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    if (!designResult) return null;
    const validation = designResult.validation;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 4: Vista final</h2>
        <p className="text-gray-600">Revisa tu diseno antes de agregarlo al carrito.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Preview</h3>
            {designResult.previewPngUrl ? (
              <SvgImage src={designResult.previewPngUrl} alt="Preview del sello" className="w-full rounded-lg border" />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-4xl">🖼️</span>
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Detalles</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Modelo:</span>
                <span className="font-medium">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensiones:</span>
                <span className="font-medium">{selectedProduct?.widthMm}mm x {selectedProduct?.heightMm}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Precio:</span>
                <span className="font-medium">Q{selectedProduct?.basePrice.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            <div className={`p-3 rounded-lg ${validation?.passed ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              <div className="flex items-center gap-2">
                {validation?.passed ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                <span className="font-medium text-sm">{validation?.message}</span>
              </div>
            </div>

            {designResult.logoConvertedToBw && (
              <div className="p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                El logo fue convertido a blanco y negro para produccion.
              </div>
            )}
          </Card>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(3)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Atras
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const svgUrl = designResult.productionSvgUrl;
                if (svgUrl.startsWith('data:')) {
                  const blob = new Blob([atob(svgUrl.split(',')[1])], { type: 'image/svg+xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sello-${designResult.designId}.svg`;
                  a.click();
                  URL.revokeObjectURL(url);
                } else if (/^https?:\/\//.test(svgUrl)) {
                  window.open(svgUrl, '_blank', 'noopener,noreferrer');
                } else {
                  console.error('Invalid SVG URL:', svgUrl);
                }
              }}
            >
              Descargar SVG
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50">
                <Stamp className="h-4 w-4 text-amber-700" />
                <span className="text-sm text-amber-900">Sello de madera</span>
                <Checkbox
                  checked={isWood}
                  onCheckedChange={(checked) => setIsWood(!!checked)}
                />
              </div>
              <Button onClick={addToCart} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                <ShoppingCart className="mr-2 h-4 w-4" />
                {returnTo === 'cart' ? 'Guardar y volver al carrito' : 'Agregar al carrito'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render principal ──

  // Si no está autenticado, mostrar solo el auth gate (sin stepper)
  if (!token) {
    return (
      <div className="w-full max-w-[1600px] mx-auto py-6 px-4 lg:px-8">
        {renderAuthGate()}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto py-8 px-4 lg:px-8">
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (s < step) setStep(s); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                s <= step
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white cursor-pointer hover:scale-110 hover:shadow-lg'
                  : 'bg-gray-200 text-gray-500 cursor-default'
              } ${s < step ? 'hover:opacity-90' : ''}`}
              disabled={s >= step}
            >
              {s}
            </button>
            {s < 4 && <div className={`w-8 h-1 ${s < step ? 'bg-orange-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
}
