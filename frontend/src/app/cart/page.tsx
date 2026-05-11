'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  designJson?: any;
  previewPngUrl?: string;
  inkName?: string | null;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(cart);
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    localStorage.setItem('cart', JSON.stringify(newItems));
    setItems(newItems);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    saveCart(newItems);
  };

  const removeItem = (index: number) => {
    saveCart(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

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
      <h1 className="text-3xl font-bold text-[#1B2A6B] mb-8">Carrito</h1>

      <div className="space-y-4">
        {items.map((item, i) => (
          <Card key={i} className="p-4 flex gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {item.previewPngUrl ? (
                <img src={item.previewPngUrl} alt="" className="w-full h-full object-contain rounded-lg" />
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
                <Button variant="outline" size="icon" onClick={() => updateQuantity(i, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button variant="outline" size="icon" onClick={() => updateQuantity(i, 1)}>
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
        <span className="text-2xl font-bold text-[#1B2A6B]">Q{total.toFixed(2)}</span>
      </div>

      <Link href="/checkout">
        <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg py-6">Proceder al pago</Button>
      </Link>
    </div>
  );
}
