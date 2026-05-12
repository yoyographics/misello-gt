'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Plus } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  shape: string;
  widthMm: number;
  heightMm: number;
  basePrice: number;
  stock: number;
  isActive: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    api.get('/products/admin/all')
      .then((res) => setProducts(res.data.items || res.data || []))
      .catch((err) => console.error('Error cargando productos:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      MONTURA_AUTOMATICA: 'Montura Automatica',
      PORTATIL: 'Portatil',
      FECHADOR: 'Fechador',
      MADERA: 'Madera',
      EMBOSSADORA: 'Embossadora',
      ALMOHADILLA_AUTOMATICA: 'Almohadilla Auto.',
      ALMOHADILLA_MADERA: 'Almohadilla Madera',
      TINTA: 'Tinta',
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Productos</h1>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay productos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Categoria</th>
                  <th className="text-left py-2">Dimensiones</th>
                  <th className="text-left py-2">Precio</th>
                  <th className="text-left py-2">Stock</th>
                  <th className="text-left py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 font-mono text-xs">{p.sku}</td>
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2">{getCategoryLabel(p.category)}</td>
                    <td className="py-2">{p.widthMm}mm x {p.heightMm}mm</td>
                    <td className="py-2">Q{p.basePrice.toFixed(2)}</td>
                    <td className="py-2">{p.stock}</td>
                    <td className="py-2">
                      <Badge className={p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
