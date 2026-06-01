'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Loader2, Check, Pencil, CheckCircle, Factory, Truck, Package,
  ShieldCheck, Zap, Clock, Award, ChevronRight, X
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useCart } from '@/hooks/useCart';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: { name: string; slug: string; isCustomizable?: boolean } | string;
  shape?: string;
  widthMm?: number;
  heightMm?: number;
  basePrice: number;
  imageUrl?: string;
  imageUrlHover?: string;
  stock: number;
  isActive: boolean;
  salesCount?: number;
}

const INK_COLORS = [
  { name: 'Negro', hex: '#000000' },
  { name: 'Azul', hex: '#002183' },
  { name: 'Rojo', hex: '#CF001D' },
  { name: 'Verde', hex: '#004F27' },
];

const FEATURES = [
  { icon: Zap, title: 'Tecnologia laser', desc: 'Grabado de alta precision' },
  { icon: Award, title: 'Durabilidad', desc: 'Materiales de calidad profesional' },
  { icon: Clock, title: 'Rapidez', desc: 'Entrega en 24-48 horas' },
  { icon: ShieldCheck, title: 'Garantia', desc: '6 meses de garantia' },
];

const STEPS = [
  { icon: Pencil, title: 'Diseña', desc: 'Crea tu sello en minutos' },
  { icon: CheckCircle, title: 'Confirma', desc: 'Revisa y aprueba tu diseno' },
  { icon: Factory, title: 'Fabricamos', desc: 'Produccion laser de alta calidad' },
  { icon: Truck, title: 'Enviamos', desc: 'Paqueteria a toda Guatemala' },
  { icon: Package, title: 'Recibes', desc: 'Listo para usar en 3-4 dias' },
];

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, isInView };
}

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedInk, setSelectedInk] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const images = product
    ? [product.imageUrl, product.imageUrlHover].filter(Boolean) as string[]
    : [];

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        api.get('/products?take=12').then((r2) => {
          const all = r2.data.items || r2.data || [];
          const sameCat = all.filter((p: Product) => {
            const pCat = typeof p.category === 'string' ? p.category : p.category?.name;
            const selfCat = typeof res.data.category === 'string' ? res.data.category : res.data.category?.name;
            return p.id !== id && pCat === selfCat;
          });
          setRelated(sameCat.slice(0, 8));
        });
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    setAdding(true);
    addItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.basePrice,
      quantity: 1,
    });
    setTimeout(() => setAdding(false), 600);
  };

  const handleBuyNow = () => {
    if (!product) return;
    router.push(`/design?productId=${product.id}`);
  };

  const featView = useInView<HTMLDivElement>();
  const stepsView = useInView<HTMLDivElement>();
  const relatedView = useInView<HTMLDivElement>();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Producto no encontrado</h1>
        <p className="text-gray-500 mb-6">El producto que buscas no existe o no esta disponible.</p>
        <Link href="/store">
          <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl">Ver catalogo</Button>
        </Link>
      </div>
    );
  }

  const dims = product.widthMm && product.heightMm ? `${product.widthMm} x ${product.heightMm} mm` : '';

  // La categoria define si los productos son personalizables en el wizard
  const isCustomizable = typeof product.category === 'object'
    ? product.category?.isCustomizable || false
    : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#1B2A6B]">Inicio</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/store" className="hover:text-[#1B2A6B]">Tienda</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium truncate">{product.name}</span>
        </div>
      </div>

      {/* Main Product */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <div>
            <div
              className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 cursor-zoom-in group"
              onClick={() => images.length > 0 && setLightboxOpen(true)}
            >
              {images.length > 0 ? (
                <img
                  src={getImageUrl(images[selectedImage])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Sin imagen</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 mt-4">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-[90px] h-[90px] rounded-xl overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1 ${
                      selectedImage === i ? 'border-[#1B2A6B]' : 'border-transparent'
                    }`}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.salesCount && product.salesCount > 10 && (
                  <Badge className="bg-orange-100 text-orange-700">Mas vendido</Badge>
                )}
                <Badge className="bg-green-100 text-green-700">Entrega en 24-48h</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#1B2A6B] leading-tight">{product.name}</h1>
              <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}{dims ? ` · ${dims}` : ''}</p>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-extrabold text-[#1B2A6B]">Q{product.basePrice.toFixed(2)}</span>
              {product.stock <= 5 && product.stock > 0 && (
                <span className="text-sm text-orange-600 font-medium">Quedan {product.stock}</span>
              )}
            </div>

            {product.shape && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Forma:</span>
                <Badge variant="outline" className="capitalize">{product.shape.toLowerCase()}</Badge>
              </div>
            )}

            {/* Ink selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Color de tinta</p>
              <div className="flex gap-3">
                {INK_COLORS.map((ink, i) => (
                  <button
                    key={ink.name}
                    onClick={() => setSelectedInk(i)}
                    className={`w-[34px] h-[34px] rounded-full border-2 transition-transform duration-200 hover:scale-110 ${
                      selectedInk === i ? 'ring-2 ring-offset-2 ring-[#1B2A6B]' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: ink.hex }}
                    title={ink.name}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{INK_COLORS[selectedInk].name} seleccionado</p>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              {isCustomizable ? (
                <>
                  <Button
                    onClick={handleBuyNow}
                    className="w-full h-[60px] text-lg font-semibold rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] transition-all duration-300"
                  >
                    {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Personalizar y comprar'}
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    variant="outline"
                    className="w-full h-[52px] text-base font-semibold rounded-2xl border-2 hover:bg-gray-50"
                  >
                    Agregar al carrito
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  className="w-full h-[60px] text-lg font-semibold rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] transition-all duration-300"
                >
                  {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Agregar al carrito'}
                </Button>
              )}
            </div>

            {/* Trust card */}
            <div className="bg-[#F8FAFF] rounded-2xl p-5 space-y-3">
              {[
                'Pago seguro',
                'Fabricacion laser',
                'Garantia de calidad',
                'Envio nacional',
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div ref={featView.ref} className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#1B2A6B] text-center mb-10">Caracteristicas del producto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <Card
                key={f.title}
                className={`p-6 rounded-[18px] border-0 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-500 ${
                  featView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <f.icon className="h-8 w-8 text-orange-500 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-[#1B2A6B] to-[#2d3f8f] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Diseña tu sello hoy y recibelo en 24-48 horas
          </h2>
          <Link href="/design">
            <Button className="h-[56px] px-8 text-lg font-semibold rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] transition-all">
              Comenzar diseno
            </Button>
          </Link>
        </div>
      </div>

      {/* How It Works */}
      <div ref={stepsView.ref} className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#1B2A6B] text-center mb-12">¿Como funciona?</h2>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
            <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-gray-200 -z-10" />
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className={`flex flex-col items-center text-center flex-1 transition-all duration-700 ${
                  stepsView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center font-bold text-sm mb-3 shadow-lg">
                  {i + 1}
                </div>
                <step.icon className="h-6 w-6 text-[#1B2A6B] mb-2" />
                <h3 className="font-bold text-gray-900">{step.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div ref={relatedView.ref} className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-[#1B2A6B] mb-8">Productos relacionados</h2>
            <Swiper
              modules={[Navigation]}
              spaceBetween={20}
              slidesPerView={1}
              navigation
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 4 },
              }}
            >
              {related.map((p) => (
                <SwiperSlide key={p.id}>
                  <Link href={`/store/product?id=${p.id}`}>
                    <Card className={`overflow-hidden border-0 shadow-sm hover:-translate-y-1.5 hover:shadow-lg transition-all duration-500 cursor-pointer ${
                      relatedView.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}>
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        {p.imageUrl ? (
                          <img src={getImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin imagen</div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{p.name}</h3>
                        <p className="text-lg font-bold text-[#1B2A6B] mt-1">Q{p.basePrice.toFixed(2)}</p>
                        <Button size="sm" variant="outline" className="w-full mt-2 rounded-xl text-xs">Ver producto</Button>
                      </div>
                    </Card>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="h-8 w-8" />
          </button>
          <img
            src={getImageUrl(images[selectedImage])}
            alt={product.name}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
