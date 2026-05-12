'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, Plus, Minus, Image, Check, AlertTriangle, Loader2, ShoppingCart } from 'lucide-react';

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
  stock: number;
}

interface Font {
  id: string;
  name: string;
}

interface Ink {
  id: string;
  color: string;
  hexCode: string;
}

const CATEGORIES = [
  { id: 'PROFESIONAL', name: 'Profesional / Colegiado', icon: '👨‍⚕️' },
  { id: 'EMPRESA', name: 'Empresa / Negocio', icon: '🏢' },
  { id: 'DIRECCION', name: 'Direccion / Contacto', icon: '📍' },
  { id: 'FIRMA', name: 'Firma personal', icon: '✍️' },
  { id: 'INSTITUCIONAL', name: 'Institucional / Gobierno', icon: '🏛️' },
  { id: 'OTRO', name: 'Otro uso', icon: '🔧' },
];

export default function DesignPage() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [inks, setInks] = useState<Ink[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lines, setLines] = useState([{ text: '', fontSize: '12pt', isBold: false, isItalic: false, alignment: 'center' as const }]);
  const [selectedFont, setSelectedFont] = useState('');
  const [selectedInk, setSelectedInk] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [hasLogoGradient, setHasLogoGradient] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [designResult, setDesignResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = apiUrl.replace('/api/v1', '');

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/fonts'),
      api.get('/inks'),
    ])
      .then(([productsRes, fontsRes, inksRes]) => {
        console.log('Products API response:', productsRes.data);
        console.log('Fonts API response:', fontsRes.data);
        console.log('Inks API response:', inksRes.data);
        const p = productsRes.data?.items || productsRes.data || [];
        const f = fontsRes.data || [];
        const i = inksRes.data || [];
        setProducts(Array.isArray(p) ? p : []);
        setFonts(Array.isArray(f) ? f : []);
        setInks(Array.isArray(i) ? i : []);
        setApiLoading(false);
      })
      .catch((err) => {
        console.error('API error:', err);
        setApiError(err.response?.data?.message || err.message || 'Error cargando datos');
        setApiLoading(false);
      });
  }, []);

  const filteredProducts = category
    ? products.filter((p) => {
        const catMap: Record<string, string[]> = {
          PROFESIONAL: ['MONTURA_AUTOMATICA'],
          EMPRESA: ['MONTURA_AUTOMATICA'],
          DIRECCION: ['MONTURA_AUTOMATICA'],
          FIRMA: ['MONTURA_AUTOMATICA', 'PORTATIL'],
          INSTITUCIONAL: ['MONTURA_AUTOMATICA', 'FECHADOR'],
          OTRO: ['MONTURA_AUTOMATICA', 'FECHADOR', 'PORTATIL', 'MADERA', 'EMBOSADORA'],
        };
        return catMap[category]?.includes(p.category);
      })
    : products;

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

  const handleGenerateDesign = async () => {
    if (!token) {
      setShowLoginDialog(true);
      return;
    }
    if (!selectedProduct || !selectedFont) {
      setError('Selecciona un modelo y fuente');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/design', {
        productId: selectedProduct.id,
        category,
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
    };
    const existing = JSON.parse(localStorage.getItem('cart') || '[]');
    localStorage.setItem('cart', JSON.stringify([...existing, cartItem]));
    alert('Agregado al carrito!');
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#1B2A6B]">Paso 1: ¿Para que es tu sello?</h2>
      <p className="text-gray-600">Selecciona la categoria que mejor describa el uso de tu sello.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <Card
            key={cat.id}
            className={`p-6 cursor-pointer transition hover:shadow-lg ${
              category === cat.id ? 'ring-2 ring-orange-500 bg-orange-50' : ''
            }`}
            onClick={() => setCategory(cat.id)}
          >
            <div className="text-3xl mb-3">{cat.icon}</div>
            <h3 className="font-semibold">{cat.name}</h3>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <Button disabled={!category} onClick={() => setStep(2)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products;

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
          <p>No hay modelos para esta categoria. Mostrando todos los disponibles:</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayProducts.map((product) => (
          <Card
            key={product.id}
            className={`p-4 cursor-pointer transition hover:shadow-lg ${
              selectedProduct?.id === product.id ? 'ring-2 ring-orange-500 bg-orange-50' : ''
            } ${product.stock <= 0 ? 'opacity-50' : ''}`}
            onClick={() => product.stock > 0 && setSelectedProduct(product)}
          >
            <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-full object-contain" />
              ) : (
                <span className="text-4xl">📐</span>
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

  const renderStep3 = () => (
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
                  <SelectItem value="8pt">8pt</SelectItem>
                  <SelectItem value="10pt">10pt</SelectItem>
                  <SelectItem value="12pt">12pt</SelectItem>
                  <SelectItem value="14pt">14pt</SelectItem>
                  <SelectItem value="16pt">16pt</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={line.isBold ? 'default' : 'outline'}
                size="icon"
                onClick={() => updateLine(i, 'isBold', !line.isBold)}
              >
                <span className="font-bold text-sm">B</span>
              </Button>
              <Button
                variant={line.isItalic ? 'default' : 'outline'}
                size="icon"
                onClick={() => updateLine(i, 'isItalic', !line.isItalic)}
              >
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
        </div>

        <Separator />

        <div>
          <label className="text-sm font-medium mb-2 block">Fuente</label>
          <Select value={selectedFont} onValueChange={(v) => setSelectedFont(v || '')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una fuente" />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((font) => (
                <SelectItem key={font.id} value={font.id}>{font.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Color de tinta</label>
          <Select value={selectedInk} onValueChange={(v) => setSelectedInk(v || '')}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un color" />
            </SelectTrigger>
            <SelectContent>
              {inks.map((ink) => (
                <SelectItem key={ink.id} value={ink.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: ink.hexCode }} />
                    {ink.color}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Logo (opcional)</label>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="URL del logo"
          />
          {logoUrl && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="gradient"
                checked={hasLogoGradient}
                onChange={(e) => setHasLogoGradient(e.target.checked)}
              />
              <label htmlFor="gradient" className="text-sm text-gray-600">
                El logo tiene gradientes/sombras (se convertira a B&W)
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Solicitudes especiales (opcional)</label>
          <Input
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Ej: texto curvo, borde especial, etc."
          />
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
              <img
                src={designResult.previewPngUrl}
                alt="Preview del sello"
                className="w-full rounded-lg border"
              />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Image className="h-12 w-12 text-gray-400" />
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

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inicia sesion para continuar</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Para guardar tu diseno y realizar el pedido, necesitas iniciar sesion con Google.</p>
          <a href={`${baseUrl}/api/v1/auth/google`}>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white">Ingresar con Google</Button>
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
