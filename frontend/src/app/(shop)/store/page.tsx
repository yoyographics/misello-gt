'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search } from 'lucide-react';
import Link from 'next/link';

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

const CATEGORY_LABELS: Record<string, string> = {
  MONTURA_AUTOMATICA: 'Automaticos',
  FECHADOR: 'Fechadores',
  PORTATIL: 'Portatiles',
  MADERA: 'Madera',
  EMBOSADORA: 'Embosadoras',
  ALMOHADILLA_AUTOMATICA: 'Almohadillas',
  ALMOHADILLA_MADERA: 'Almohadillas Madera',
  TINTA: 'Tintas',
};

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data.items || res.data));
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <h1 className="text-3xl font-bold text-[#1B2A6B] mb-2">Tienda</h1>
      <p className="text-gray-600 mb-8">Catalogo completo de sellos, tintas y accesorios.</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!categoryFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('')}
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {CATEGORY_LABELS[cat] || cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <Link key={product.id} href={`/store/product?id=${product.id}`} className="block">
            <Card
              className="group p-4 border-2 border-blue-100 hover:border-blue-400 rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)]"
            >
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
                  <span className="absolute inset-0 flex items-center justify-center text-4xl">📐</span>
                )}
              </div>
              <Badge variant="secondary" className="mb-2">{CATEGORY_LABELS[product.category] || product.category}</Badge>
              <h3 className="font-semibold text-sm">{product.name}</h3>
              <p className="text-xs text-gray-500">{product.sku}</p>
              <p className="text-xs text-gray-500">{product.widthMm}mm x {product.heightMm}mm</p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-[#1B2A6B]">Q{product.basePrice.toFixed(2)}</span>
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
    </div>
  );
}
