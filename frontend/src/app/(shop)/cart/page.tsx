'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, AlertCircle, Pencil, Stamp } from 'lucide-react';
import Link from 'next/link';
import { SvgImage } from '@/components/svg-image';
import api from '@/lib/api';

interface WoodProduct {
  id: string;
  sku: string;
  name: string;
  shape?: string;
  widthMm?: number;
  heightMm?: number;
  basePrice: number;
}

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    updateIsWood,
    totalItems,
    totalAmount,
  } = useCart();
  const [woodProducts, setWoodProducts] = useState<WoodProduct[]>([]);

  useEffect(() => {
    api.get('/products?categorySlug=sello-madera&take=100')
      .then((res) => setWoodProducts(res.data?.items || []))
      .catch(() => setWoodProducts([]));
  }, []);

  const findWoodPrice = (item: (typeof items)[0]) => {
    const match = woodProducts.find(
      (w) =>
        w.shape === item.shape &&
        w.widthMm === item.widthMm &&
        w.heightMm === item.heightMm
    );
    return match?.basePrice;
  };

  const effectiveUnitPrice = (item: (typeof items)[0]) => {
    if (item.isWood && item.woodPrice !== undefined) return item.woodPrice;
    return item.unitPrice;
  };

  const needsCustomization = (item: (typeof items)[0]) =>
    item.categoryIsCustomizable && !item.designJson;

  const pendingItems = items.filter(needsCustomization);
  const firstPendingIndex = items.findIndex(needsCustomization);

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl py-24 px-4 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-[#1B2A6B] mb-2">
          Tu carrito esta vacio
        </h1>
        <p className="text-gray-600 mb-6">
          Agrega productos desde la tienda o crea un sello personalizado.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/store">
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              Ir a la tienda
            </Button>
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
      <h1 className="text-3xl font-bold text-[#1B2A6B] mb-2">
        Carrito ({totalItems})
      </h1>
      {pendingItems.length > 0 && (
        <p className="text-sm text-orange-600 mb-6 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Tienes {pendingItems.length} sello(s) pendiente(s) de personalización.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item, i) => (
          <Card key={i} className="p-3 flex gap-3 items-start">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {item.previewPngUrl ? (
                <SvgImage
                  src={item.previewPngUrl}
                  alt=""
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <span className="text-xl">📐</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{item.productName}</h3>
                  <p className="text-xs text-gray-500">{item.productSku}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -mr-2 -mt-2"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>

              {needsCustomization(item) && (
                <p className="mt-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Falta personalizar
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {item.categoryIsCustomizable && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <Stamp className="h-3.5 w-3.5 text-amber-700" />
                    <span>Sello de madera</span>
                    <Checkbox
                      checked={item.isWood || false}
                      onCheckedChange={(checked) => {
                        const isWood = !!checked;
                        const woodPrice = isWood ? findWoodPrice(item) : undefined;
                        updateIsWood(i, isWood, woodPrice);
                      }}
                    />
                  </label>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(i, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(i, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <span className="text-sm font-semibold text-[#1B2A6B] ml-auto">
                  Q{(effectiveUnitPrice(item) * item.quantity).toFixed(2)}
                </span>
              </div>

              {item.isWood && item.woodPrice === undefined && (
                <p className="mt-1 text-xs text-red-600">
                  No se encontró precio de madera para esta medida.
                </p>
              )}
            </div>

            {item.categoryIsCustomizable && (
              <Link
                href={`/design?productId=${item.productId}&editIndex=${i}&returnTo=cart`}
                className="self-center"
              >
                <Button
                  size="sm"
                  variant={needsCustomization(item) ? 'default' : 'outline'}
                  className={
                    needsCustomization(item)
                      ? 'h-8 text-xs bg-[#1B2A6B] hover:bg-[#0f1a4a] text-white'
                      : 'h-8 text-xs'
                  }
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {needsCustomization(item) ? 'Personalizar' : 'Editar'}
                </Button>
              </Link>
            )}
          </Card>
        ))}
      </div>

      <Separator className="my-6" />

      <div className="flex justify-between items-center mb-6">
        <span className="text-lg">Total</span>
        <span className="text-2xl font-bold text-[#1B2A6B]">
          Q{items.reduce((sum, item) => sum + effectiveUnitPrice(item) * item.quantity, 0).toFixed(2)}
        </span>
      </div>

      {pendingItems.length > 0 ? (
        <div className="space-y-3">
          <Link
            href={
              firstPendingIndex >= 0
                ? `/design?productId=${items[firstPendingIndex].productId}&editIndex=${firstPendingIndex}&returnTo=cart`
                : '/design'
            }
          >
            <Button className="w-full bg-gradient-to-r from-[#1B2A6B] to-[#0f1a4a] text-white text-lg py-6">
              Personalizar {pendingItems.length} sello(s) pendiente(s)
            </Button>
          </Link>
          <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Debes personalizar todos los sellos antes de pagar.
          </p>
          <Button disabled className="w-full text-lg py-6">
            Proceder al pago
          </Button>
        </div>
      ) : (
        <Link href="/checkout">
          <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg py-6">
            Proceder al pago
          </Button>
        </Link>
      )}
    </div>
  );
}
