'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { SvgImage } from '@/components/svg-image';

export default function CartPage() {
  const { items, removeItem, totalItems, totalAmount } = useCart();
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const getQuantity = (index: number, defaultQty: number) => {
    return quantities[index] ?? defaultQty;
  };

  const updateQuantityLocal = (index: number, delta: number, defaultQty: number) => {
    const current = getQuantity(index, defaultQty);
    const next = Math.max(1, current + delta);
    setQuantities({ ...quantities, [index]: next });
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl py-24 px-4 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-[#1B2A6B] mb-2">Tu carrito esta vacio</h1>
        <p className="text-gray-600 mb-6">Agrega productos desde la tienda o crea un sello personalizado.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/store">
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">Ir a la tienda</Button>
          </Link>
          <Link href="/design">
            <Button variant="outline">Crear un sello</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold text-[#1B2A6B] mb-8">Carrito ({totalItems})</h1>

      <div className="space-y-4">
        {items.map((item, i) => (
          <Card key={i} className="p-4 flex gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {item.previewPngUrl ? (
                <SvgImage src={item.previewPngUrl} alt="" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <span className="text-2xl">📐</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{item.productName}</h3>
              <p className="text-sm text-gray-500">{item.productSku}</p>
              {item.inkName && <p className="text-sm text-gray-500">Tinta: {item.inkName}</p>}
              <p className="font-medium text-[#1B2A6B]">Q{item.unitPrice.toFixed(2)} c/u</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => updateQuantityLocal(i, -1, item.quantity)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{getQuantity(i, item.quantity)}</span>
                <Button variant="outline" size="icon" onClick={() => updateQuantityLocal(i, 1, item.quantity)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Separator className="my-6" />

      <div className="flex justify-between items-center mb-6">
        <span className="text-lg">Total</span>
        <span className="text-2xl font-bold text-[#1B2A6B]">Q{totalAmount.toFixed(2)}</span>
      </div>

      <Link href="/checkout">
        <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg py-6">Proceder al pago</Button>
      </Link>
    </div>
  );
}
