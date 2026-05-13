'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import api, { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { ArrowRight, ArrowLeft, Plus, Minus, Check, AlertTriangle, Loader2, ShoppingCart, Upload, X } from 'lucide-react';
import { SvgImage } from '@/components/svg-image';
import { redirectToGoogleLogin } from '@/lib/auth-utils';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
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
}

interface Ink {
  id: string;
  color: string;
  hexCode: string;
}

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
  if (url.startsWith('http')) return url;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url}`;
  }
  return url;
}

export default function DesignPage() {
  const { token } = useAuth();
  const { addItem } = useCart();
  const [step, setStep] = useState(1);
  const [shape, setShape] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [inks, setInks] = useState<Ink[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lines, setLines] = useState([{ text: '', fontSize: '12pt', isBold: false, isItalic: false, alignment: 'center' as const }]);
  const [selectedFont, setSelectedFont] = useState('');
  const [selectedInk, setSelectedInk] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [textValidation, setTextValidation] = useState<any>(null);
  const [validatingText, setValidatingText] = useState(false);
  const [hasLogoGradient, setHasLogoGradient] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [designResult, setDesignResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = apiUrl.replace('/api/v1', '');

  useEffect(() => {
    Promise.all([api.get('/products'), api.get('/fonts'), api.get('/inks')])
      .then(([productsRes, fontsRes, inksRes]) => {
        const p = productsRes.data?.items || productsRes.data || [];
        const f = fontsRes.data || [];
        const i = inksRes.data || [];
        setProducts(Array.isArray(p) ? p : []);
        setFonts(Array.isArray(f) ? f : []);
        setInks(Array.isArray(i) ? i : []);
        setApiLoading(false);

        // Cargar fuentes via @font-face inyectado en <head>
        f.forEach((font: Font) => {
          if (!font.fileData || font.fileData.length < 100) {
            console.warn(`[Design Font] ${font.name}: sin fileData válido (length=${font.fileData?.length})`);
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

            console.log(`[Design Font] ${font.name}: @font-face inyectada`);
            setLoadedFonts((prev) => new Set(prev).add(font.id));
          } catch (err: any) {
            console.error(`[Design Font] Error inyectando fuente ${font.name}:`, err.message || err);
          }
        });
      })
      .catch((err) => {
        console.error('API error:', err);
        setApiError(err.response?.data?.message || err.message || 'Error cargando datos');
        setApiLoading(false);
      });
  }, []);

  const STAMP_CATEGORIES = ['MONTURA_AUTOMATICA', 'FECHADOR', 'PORTATIL', 'MADERA'];

  const filteredProducts = products.filter((p) => {
    // Solo sellos reales: deben tener shape Y ser de una categoria de sello
    if (!p.shape) return false;
    if (!STAMP_CATEGORIES.includes(p.category)) return false;
    return !shape || p.shape === shape;
  });

  const addLine = () => {
    if (lines.length < 5) {
      setLines([...lines, { text: '', fontSize: '12pt', isBold: false, isItalic: false, alignment: 'center' }]);
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
    if (!selectedProduct || !selectedFont || lines.length === 0 || !lines[0].text.trim()) {
      setTextValidation(null);
      return;
    }
    setValidatingText(true);
    try {
      const res = await api.post('/design/validate-text', {
        text: lines.map((l) => l.text).join(' '),
        fontId: selectedFont,
        productId: selectedProduct.id,
        fontSizePt: parseInt(lines[0].fontSize),
      });
      setTextValidation(res.data);
    } catch (err: any) {
      console.error('Error validando texto:', err);
      setTextValidation(null);
    } finally {
      setValidatingText(false);
    }
  }, [lines, selectedFont, selectedProduct]);

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
    if (!selectedProduct || !selectedFont) {
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
        fontId: selectedFont,
        inkId: selectedInk || undefined,
        logoUrl: logoUrl || undefined,
        hasLogoGradient,
        specialRequests: specialRequests || undefined,
      });
      setDesignResult(res.data);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error generando el diseno');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!designResult || !selectedProduct) return;
    addItem({
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
    });
    alert('Agregado al carrito!');
  };

  const renderStep1 = () => {
    if (!token) {
      return (
        <div className="space-y-6 text-center">
          <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 1: Empecemos</h2>
          <p className="text-gray-600">Para disenar tu sello personalizado, primero inicia sesion.</p>
          <div className="max-w-sm mx-auto">
            <Card className={`p-8 ${CARD_BASE}`}>
              <h3 className="font-semibold mb-4">Inicia sesion con Google</h3>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white" onClick={redirectToGoogleLogin}>
                Ingresar con Google
              </Button>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 1: Elige la forma de tu sello</h2>
        <p className="text-gray-600">Selecciona la forma que mejor se ajuste a lo que necesitas.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SHAPES.map((s) => (
            <Card
              key={s.id}
              className={`p-6 flex flex-col items-center text-center ${CARD_BASE} ${shape === s.id ? CARD_SELECTED : ''}`}
              onClick={() => setShape(s.id)}
            >
              <div className={`mb-4 ${shape === s.id ? 'text-orange-500' : 'text-blue-400'}`}>{s.svg}</div>
              <h3 className="font-semibold text-base">{s.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{s.description}</p>
            </Card>
          ))}
        </div>
        <div className="flex justify-end">
          <Button disabled={!shape} onClick={() => setStep(2)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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
          <p>No hay modelos para esta forma. Mostrando todos los disponibles:</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(filteredProducts.length > 0 ? filteredProducts : products.filter((p) => !!p.shape)).map((product) => (
          <Card
            key={product.id}
            className={`group p-4 ${CARD_BASE} ${selectedProduct?.id === product.id ? CARD_SELECTED : ''} ${product.stock <= 0 ? 'opacity-50' : ''}`}
            onClick={() => product.stock > 0 && setSelectedProduct(product)}
          >
            <div className="relative aspect-video bg-gray-50 rounded-lg mb-3 overflow-hidden">
              {product.imageUrl ? (
                <>
                  <img
                    src={getImageUrl(product.imageUrl)}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain p-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                  />
                  {product.imageUrlHover ? (
                    <img
                      src={getImageUrl(product.imageUrlHover)}
                      alt={`${product.name} - hover`}
                      className="absolute inset-0 w-full h-full object-contain p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  ) : (
                    <img
                      src={getImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-contain p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105"
                    />
                  )}
                </>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-4xl">📐</span>
              )}
            </div>
            <h3 className="font-semibold text-sm">{product.name}</h3>
            <p className="text-xs text-gray-500">{product.widthMm}mm x {product.heightMm}mm</p>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary">Q{product.basePrice.toFixed(2)}</Badge>
              {product.stock <= 0 && <Badge variant="destructive">Agotado</Badge>}
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Atras
        </Button>
        <Button disabled={!selectedProduct} onClick={() => setStep(3)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const previewText = lines[0]?.text || 'Tu texto aqui';

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 3: Personaliza tu diseno</h2>
        <p className="text-gray-600">Ingresa el texto, elige fuente, color de tinta y sube tu logo si lo deseas.</p>

        <Card className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Texto del sello</label>
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 mb-2 items-start">
                <Input
                  value={line.text}
                  onChange={(e) => updateLine(i, 'text', e.target.value)}
                  placeholder={`Linea ${i + 1}`}
                  className="flex-1"
                />
                <Select value={line.fontSize} onValueChange={(v) => updateLine(i, 'fontSize', v || '')}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6pt">6pt</SelectItem>
                    <SelectItem value="7pt">7pt</SelectItem>
                    <SelectItem value="8pt">8pt</SelectItem>
                    <SelectItem value="10pt">10pt</SelectItem>
                    <SelectItem value="12pt">12pt</SelectItem>
                    <SelectItem value="14pt">14pt</SelectItem>
                    <SelectItem value="16pt">16pt</SelectItem>
                    <SelectItem value="18pt">18pt</SelectItem>
                    <SelectItem value="20pt">20pt</SelectItem>
                    <SelectItem value="24pt">24pt</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant={line.isBold ? 'default' : 'outline'} size="icon" onClick={() => updateLine(i, 'isBold', !line.isBold)}>
                  <span className="font-bold text-sm">B</span>
                </Button>
                <Button variant={line.isItalic ? 'default' : 'outline'} size="icon" onClick={() => updateLine(i, 'isItalic', !line.isItalic)}>
                  <span className="italic text-sm">I</span>
                </Button>
                {lines.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeLine(i)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
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
                  El texto no cabe en una linea de {selectedProduct?.widthMm}mm
                </p>
                <div className="flex flex-wrap gap-2">
                  {textValidation.suggestedFontSizePt && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-white hover:bg-amber-100 border-amber-300"
                      onClick={() => {
                        const newLines = [...lines];
                        newLines[0].fontSize = `${textValidation.suggestedFontSizePt}pt`;
                        setLines(newLines);
                      }}
                    >
                      🔤 Reducir a {textValidation.suggestedFontSizePt}pt
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
                          fontSize: lines[0]?.fontSize || '12pt',
                          isBold: lines[0]?.isBold || false,
                          isItalic: lines[0]?.isItalic || false,
                          alignment: lines[0]?.alignment || 'center',
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

          {/* Vista previa de fuentes */}
          <div>
            <label className="text-sm font-medium mb-1 block">Fuente — Selecciona una tipografia</label>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona una fuente. El tamano minimo fabricable aparece en cada tarjeta.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {fonts.map((font) => (
                <Card
                  key={font.id}
                  className={`p-3 text-center ${CARD_BASE} ${selectedFont === font.id ? CARD_SELECTED : ''}`}
                  onClick={() => setSelectedFont(font.id)}
                >
                  <div
                    className="text-lg mb-1 truncate min-h-[1.75rem]"
                    style={loadedFonts.has(font.id) ? { fontFamily: `"font-${font.id}"` } : {}}
                    title={font.name}
                  >
                    {loadedFonts.has(font.id) ? (previewText || 'Aa') : <span className="text-sm text-gray-400">Cargando...</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{font.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Min: {font.minFontSizePt ?? 10}pt</p>
                </Card>
              ))}
            </div>
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

          <div>
            <label className="text-sm font-medium mb-2 block">Solicitudes especiales (opcional)</label>
            <Input value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Ej: texto curvo, borde especial, etc." />
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex justify-between">
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
                } else {
                  window.open(svgUrl, '_blank');
                }
              }}
            >
              Descargar SVG
            </Button>
            <Button onClick={addToCart} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Agregar al carrito
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s <= step ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
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
