'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  minStock: number;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjusting, setAdjusting] = useState(false);

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

  const openAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustQty('');
    setAdjustOpen(true);
  };

  const handleAdjust = async () => {
    if (!adjustItem || !adjustQty) return;
    setAdjusting(true);
    try {
      const delta = parseInt(adjustQty);
      await api.post('/inventory/adjust', {
        productId: adjustItem.id,
        delta,
      });
      setAdjustOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error ajustando stock');
    } finally {
      setAdjusting(false);
    }
  };

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
                  <th className="text-left py-2">Acciones</th>
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
                    <td className="py-2">
                      <Button variant="outline" size="sm" onClick={() => openAdjust(item)}>
                        <Plus className="h-3 w-3 mr-1" /> Ajustar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
          </DialogHeader>
          {adjustItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><span className="font-medium">{adjustItem.productName}</span></p>
                <p className="text-gray-500">Stock actual: {adjustItem.quantity}</p>
              </div>
              <div>
                <label className="text-xs font-medium">Cantidad a agregar (+) o quitar (-)</label>
                <Input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Ej: 10 o -5"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleAdjust}
                  disabled={adjusting || !adjustQty}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                >
                  {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
