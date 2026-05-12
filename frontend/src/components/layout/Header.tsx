'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Stamp, ShoppingCart, User, LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = apiUrl.replace('/api/v1', '');

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
          <Link href="/cart" className="flex items-center gap-1 text-sm font-medium hover:text-orange-500 transition relative">
            <ShoppingCart className="h-4 w-4" />
            Carrito
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <a href={`${baseUrl}/api/v1/auth/google`}>
              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                <User className="h-4 w-4 mr-1" />
                Ingresar
              </Button>
            </a>
          )}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col gap-4 mt-8">
              <Link href="/store" onClick={() => setOpen(false)} className="text-lg font-medium">Tienda</Link>
              <Link href="/design" onClick={() => setOpen(false)} className="text-lg font-medium">Crear Sello</Link>
              <Link href="/cart" onClick={() => setOpen(false)} className="text-lg font-medium">Carrito</Link>
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.name}</span>
                  <Button onClick={() => { logout(); setOpen(false); }}>Cerrar sesion</Button>
                </>
              ) : (
                <a href={`${baseUrl}/api/v1/auth/google`}>
                  <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">Ingresar con Google</Button>
                </a>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
