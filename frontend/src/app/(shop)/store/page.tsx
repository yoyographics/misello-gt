'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search, ChevronRight, LayoutGrid, X } from 'lucide-react';
import Link from 'next/link';

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
  category: { name: string; slug: string };
  shape: string;
  widthMm: number;
  heightMm: number;
  basePrice: number;
  imageUrl?: string;
  imageUrlHover?: string;
  stock: number;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  const addToCart = (product: Product) => {
    const cartItem = {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.basePrice,
      quantity: 1,
      inkId: null,
      inkName: null,
    };
    const existing = JSON.parse(localStorage.getItem('cart') || '[]');
    localStorage.setItem('cart', JSON.stringify([...existing, cartItem]));
    alert('Agregado al carrito!');
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) + (selectedShape ? 1 : 0);

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1B2A6B] mb-2">Tienda</h1>
        <p className="text-gray-600">
          Catalogo completo de sellos, tintas y accesorios.
        </p>
      </div>

      {/* Search bar + mobile filter toggle */}
      <div className="flex gap-3 mb-6">
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
          className="md:hidden"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          Filtros{activeFiltersCount > 0 && ` (${activeFiltersCount})`}
        </Button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 flex-shrink-0 space-y-6`}
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
        <div className="flex-1 min-w-0">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/store/product?id=${product.id}`}
                  className="block"
                >
                  <Card className="group p-4 border-2 border-blue-100 hover:border-blue-400 rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)]">
                    <div className="relative aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden">
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
                        <span className="absolute inset-0 flex items-center justify-center text-4xl">
                          📐
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="mb-2">
                      {product.category?.name || ''}
                    </Badge>
                    <h3 className="font-semibold text-sm">{product.name}</h3>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                    <p className="text-xs text-gray-500">
                      {product.widthMm}mm x {product.heightMm}mm
                      {product.shape && ` · ${SHAPE_LABELS[product.shape] || product.shape}`}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-[#1B2A6B]">
                        Q{product.basePrice.toFixed(2)}
                      </span>
                      {product.stock > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant="destructive">Agotado</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
