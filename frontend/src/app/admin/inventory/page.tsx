'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Warehouse } from 'lucide-react';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  minStock: number;
  lastUpdated: string;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(() => {
    setLoading(true);
    api.get('/inventory')
      .then((res) => setItems(res.data || []))
      .catch((err) => console.error('Error cargando inventario:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Inventario</h1>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay datos de inventario.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-left py-2">Stock actual</th>
                  <th className="text-left py-2">Minimo</th>
                  <th className="text-left py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 font-mono text-xs">{item.sku}</td>
                    <td className="py-2 font-medium">{item.productName}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{item.minStock}</td>
                    <td className="py-2">
                      <Badge className={item.quantity <= item.minStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                        {item.quantity <= item.minStock ? 'Bajo stock' : 'OK'}
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
