'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Stamp, ShoppingCart, User, LogOut, X, Trash2 } from 'lucide-react';
import { redirectToGoogleLogin } from '@/lib/auth-utils';

export default function Header() {
  const { user, logout } = useAuth();
  const { items, totalItems, totalAmount, removeItem } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setCartOpen(false);
      }
    }
    if (cartOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cartOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Stamp className="h-6 w-6 text-orange-500" />
          <span className="text-xl font-bold">
            <span className="text-[#1B2A6B]">misello</span>
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">.gt</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/store" className="text-sm font-medium hover:text-orange-500 transition">Tienda</Link>
          <Link href="/design" className="text-sm font-medium hover:text-orange-500 transition">Crear Sello</Link>

          {/* Carrito con preview */}
          <div className="relative" ref={cartRef}>
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="flex items-center gap-1 text-sm font-medium hover:text-orange-500 transition relative"
            >
              <ShoppingCart className="h-4 w-4" />
              Carrito
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Popover del carrito */}
            {cartOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Tu carrito</h3>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      Tu carrito está vacío
                    </div>
                  ) : (
                    items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                          <p className="text-xs text-gray-400">
                            {item.quantity} x Q{item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-orange-600">
                          Q{(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {items.length > 0 && (
                  <div className="p-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-lg font-bold text-[#1B2A6B]">Q{totalAmount.toFixed(2)}</span>
                    </div>
                    <Link href="/cart" onClick={() => setCartOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                        Ver el carrito
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white" onClick={redirectToGoogleLogin}>
              <User className="h-4 w-4 mr-1" />
              Ingresar
            </Button>
          )}
        </nav>

        {/* Mobile nav removed — links already visible in top nav */}
      </div>
    </header>
  );
}
