'use client';

import { useState, useEffect, useCallback } from 'react';
import AOS from 'aos';
import api from '@/lib/api';

import 'aos/dist/aos.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import StoreSidebarSlider from '@/components/store-sidebar-slider';
import { useCart } from '@/hooks/useCart';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  _count?: { products: number };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: { name: string; slug: string; isCustomizable?: boolean };
  shape: string;
  widthMm: number;
  heightMm: number;
  basePrice: number;
  imageUrl?: string;
  imageUrlHover?: string;
  cardLabel?: string;
  stock: number;
}

interface SidebarSlider {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  gradient?: string;
  useGradient?: boolean;
  gradientOpacity?: number;
  buttonText?: string;
  buttonType?: 'URL' | 'CATEGORY' | 'PRODUCT';
  buttonUrl?: string;
  buttonCategorySlug?: string;
  buttonProductId?: string;
}

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http')
    ? url
    : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

const SHAPE_LABELS: Record<string, string> = {
  RECTANGULAR: 'Rectangular',
  CIRCULAR: 'Circular',
  OVAL: 'Oval',
  SQUARE: 'Cuadrado',
};

export default function StorePage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [leftSliders, setLeftSliders] = useState<SidebarSlider[]>([]);
  const [rightSliders, setRightSliders] = useState<SidebarSlider[]>([]);
  const [slidersLoading, setSlidersLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const fetchCategories = useCallback(() => {
    api
      .get('/categories?showInStore=true')
      .then((res) => {
        const data = res.data || [];
        // Ocultar Sellos de Madera de la tienda (se elige en el carrito)
        setCategories(data.filter((c: Category) => c.name !== 'Sellos de Madera'));
      })
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('take', '100');
    if (search.trim()) params.set('search', search.trim());
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (selectedShape) params.set('shape', selectedShape);

    api
      .get(`/products?${params.toString()}`)
      .then((res) => setProducts(res.data.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, selectedCategory, selectedShape]);

  useEffect(() => {
    AOS.init({ duration: 500, once: true, easing: 'ease-out' });
    fetchCategories();
    fetchProducts();

    // Cargar sliders laterales de la tienda
    setSlidersLoading(true);
    Promise.all([
      api.get('/sliders?position=STORE_LEFT'),
      api.get('/sliders?position=STORE_RIGHT'),
    ])
      .then(([leftRes, rightRes]) => {
        setLeftSliders(leftRes.data || []);
        setRightSliders(rightRes.data || []);
      })
      .catch(() => {})
      .finally(() => setSlidersLoading(false));
  }, [fetchCategories, fetchProducts]);

  const addToCart = (product: Product) => {
    const qty = quantities[product.id] || 1;
    addItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.basePrice,
      quantity: qty,
      inkId: undefined,
      inkName: undefined,
      categoryIsCustomizable: product.category?.isCustomizable,
      isWood: false,
      shape: product.shape,
      widthMm: product.widthMm,
      heightMm: product.heightMm,
    });
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    if (product.category?.isCustomizable) {
      toast.success(`${product.name} (${qty}) agregado. Personalízalo desde el carrito.`);
    } else {
      toast.success(`${product.name} (${qty}) agregado al carrito`);
    }
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) + (selectedShape ? 1 : 0);

  const showLeftSlider = slidersLoading || leftSliders.length > 0;
  const showRightSlider = slidersLoading || rightSliders.length > 0;
  const bothSliders = showLeftSlider && showRightSlider;
  const gridCols = bothSliders
    ? 'xl:grid-cols-[200px_minmax(0,1fr)_200px] 2xl:grid-cols-[240px_minmax(0,1fr)_240px]'
    : showLeftSlider
    ? 'xl:grid-cols-[200px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)]'
    : showRightSlider
    ? 'xl:grid-cols-[minmax(0,1fr)_200px] 2xl:grid-cols-[minmax(0,1fr)_240px]'
    : '';

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-6 xl:py-8 xl:h-[calc(100vh-4rem)] xl:flex xl:flex-col xl:overflow-hidden">
      {/* Header */}
      <div className="mb-6 xl:mb-4 flex-shrink-0" data-aos="fade-down">
        <h1 className="text-3xl font-bold text-[#1B2A6B] mb-2">Tienda</h1>
        <p className="text-gray-600">
          Catalogo completo de sellos, tintas y accesorios.
        </p>
      </div>

      {/* Search bar + mobile filter toggle */}
      <div className="flex gap-3 mb-6 xl:mb-4 flex-shrink-0" data-aos="fade-down" data-aos-delay="100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder=""
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden relative"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          title="Categorias y filtros"
        >
          <Menu className="h-5 w-5" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Layout de 3 columnas en xl: slider | contenido | slider */}
      <div
        className={`grid grid-cols-1 ${gridCols} gap-5 xl:gap-6 items-start xl:flex-1 xl:min-h-0`}
      >
        {/* Slider lateral izquierdo (solo desktop grande) */}
        {showLeftSlider && (
          <div data-aos="fade-right" data-aos-delay="200" className="hidden xl:block h-full">
            <StoreSidebarSlider sliders={leftSliders} loading={slidersLoading} />
          </div>
        )}

        {/* Contenido central: sidebar filtros + productos */}
        <div className="flex gap-5 xl:gap-6 flex-col md:flex-row min-w-0 xl:h-full xl:overflow-hidden">
          {/* Sidebar filters */}
          <aside
            data-aos="fade-right"
            data-aos-delay="150"
            className={`
              mobileFiltersOpen ? 'block' : 'hidden'
            } md:block xl:h-full xl:overflow-y-auto no-scrollbar w-full md:w-52 lg:w-56 xl:w-48 2xl:w-52 flex-shrink-0 space-y-6 pb-4`}
          >
          {/* Active filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200 hover:bg-orange-100 transition"
                >
                  {categories.find((c) => c.id === selectedCategory)?.name}
                  <X className="h-3 w-3" />
                </button>
              )}
              {selectedShape && (
                <button
                  onClick={() => setSelectedShape('')}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200 hover:bg-orange-100 transition"
                >
                  {SHAPE_LABELS[selectedShape] || selectedShape}
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedShape('');
                  setSearch('');
                }}
                className="text-xs text-gray-500 hover:text-orange-600 underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
              Categorias
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  !selectedCategory
                    ? 'bg-orange-50 text-orange-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Todas las categorias</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                    selectedCategory === cat.id
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-gray-400">
                    {cat._count?.products || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
              Forma
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedShape('')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  !selectedShape
                    ? 'bg-orange-50 text-orange-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Todas las formas</span>
              </button>
              {Object.entries(SHAPE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSelectedShape(value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                    selectedShape === value
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1 min-w-0 xl:h-full xl:overflow-y-auto no-scrollbar px-1 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">
                No se encontraron productos.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Intenta con otros terminos de busqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product, idx) => (
                <div
                  key={product.id}
                  data-aos="fade-up"
                  data-aos-delay={Math.min(idx * 80, 400)}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Imagen con label */}
                  <Link href={`/store/product?id=${product.id}`} className="block relative">
                    {product.cardLabel && (
                      <span className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                        {product.cardLabel}
                      </span>
                    )}
                    <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={getImageUrl(product.imageUrl)}
                          alt={product.name}
                          className="w-full h-full object-contain p-4"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-4xl">
                          📐
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4 pt-2">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 text-base leading-tight">
                        {product.name}
                      </h3>
                      <span className="font-bold text-orange-600 whitespace-nowrap">
                        Q{product.basePrice.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mb-2">
                      {product.sku}
                    </p>

                    {product.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
                        {product.category?.name}
                      </span>
                      {product.shape && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full">
                          {SHAPE_LABELS[product.shape] || product.shape}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
                        {product.widthMm}mm x {product.heightMm}mm
                      </span>
                    </div>

                    {/* Selector de cantidad + boton agregar */}
                    {product.stock > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              setQuantities((prev) => ({
                                ...prev,
                                [product.id]: Math.max(1, (prev[product.id] || 1) - 1),
                              }))
                            }
                          >
                            −
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {quantities[product.id] || 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() =>
                              setQuantities((prev) => ({
                                ...prev,
                                [product.id]: Math.min(product.stock, (prev[product.id] || 1) + 1),
                              }))
                            }
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-md transition-all"
                          onClick={() => addToCart(product)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Agregar al carrito
                        </Button>
                      </div>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        className="w-full rounded-xl text-gray-400"
                      >
                        Agotado
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slider lateral derecho (solo desktop grande) */}
      {showRightSlider && (
        <div data-aos="fade-left" data-aos-delay="200" className="hidden xl:block h-full">
          <StoreSidebarSlider sliders={rightSliders} loading={slidersLoading} />
        </div>
      )}
    </div>

    <style>{`
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `}</style>
  </div>
  );
}
