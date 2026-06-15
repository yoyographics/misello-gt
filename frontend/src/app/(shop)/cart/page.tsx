'use client';

import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Minus, ShoppingBag, AlertCircle, Pencil, Stamp } from 'lucide-react';
import Link from 'next/link';
import { SvgImage } from '@/components/svg-image';

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    updateIsWood,
    totalItems,
    totalAmount,
  } = useCart();

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

      <div className="space-y-4">
        {items.map((item, i) => (
          <Card key={i} className="p-4 flex gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {item.previewPngUrl ? (
                <SvgImage
                  src={item.previewPngUrl}
                  alt=""
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <span className="text-2xl">📐</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{item.productName}</h3>
              <p className="text-sm text-gray-500">{item.productSku}</p>
              {item.inkName && (
                <p className="text-sm text-gray-500">Tinta: {item.inkName}</p>
              )}
              <p className="font-medium text-[#1B2A6B]">
                Q{item.unitPrice.toFixed(2)} c/u
              </p>

              {needsCustomization(item) && (
                <div className="mt-2 flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Falta personalizar este sello</span>
                </div>
              )}

              {item.categoryIsCustomizable && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Stamp className="h-4 w-4 text-amber-700" />
                    <span className="text-sm text-gray-700">Sello de madera</span>
                  </div>
                  <Checkbox
                    checked={item.isWood || false}
                    onCheckedChange={(checked) => updateIsWood(i, !!checked)}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(i)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(i, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(i, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {item.categoryIsCustomizable && (
                <Link
                  href={`/design?productId=${item.productId}&editIndex=${i}&returnTo=cart`}
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
                    {needsCustomization(item) ? 'Personalizar' : 'Editar diseño'}
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Separator className="my-6" />

      <div className="flex justify-between items-center mb-6">
        <span className="text-lg">Total</span>
        <span className="text-2xl font-bold text-[#1B2A6B]">
          Q{totalAmount.toFixed(2)}
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
