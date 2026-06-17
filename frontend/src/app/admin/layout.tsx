'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Type,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Image,
  Tags,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from 'sonner';

const navItems = [
  { href: '/admin/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventory/', label: 'Inventario', icon: Package },
  { href: '/admin/categories/', label: 'Categorias', icon: Tags },
  { href: '/admin/fonts/', label: 'Tipografias', icon: Type },
  { href: '/admin/templates/', label: 'Plantillas', icon: Palette },
  { href: '/admin/sliders/', label: 'Sliders', icon: Image },
  { href: '/admin/orders/', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/customers/', label: 'Clientes', icon: Users },
  { href: '/admin/settings/', label: 'Configuracion', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        if (!pathname || (!pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/setup'))) {
          router.push('/admin/login/');
        }
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem('adminToken');
          router.push('/admin/login/');
          return;
        }
        if (payload.role === 'CLIENT') {
          localStorage.removeItem('adminToken');
          router.push('/admin/login/');
          return;
        }
        setAdminUser(payload);
      } catch {
        localStorage.removeItem('adminToken');
        router.push('/admin/login/');
      }
    };

    try {
      checkAuth();
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login/');
  };

  // No aplicar layout en login/setup
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/admin/setup')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href="/admin/" className="text-xl font-bold text-[#1B2A6B]">
            misello.gt
          </Link>
          <p className="text-xs text-gray-500 mt-1">Panel de Administracion</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href) && item.href !== '/admin/';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600 truncate">{adminUser?.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesion
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-[#1B2A6B]">misello.gt Admin</span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <span className="text-xl font-bold text-[#1B2A6B]">misello.gt</span>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-6 pt-16 md:pt-6">
        {children}
      </main>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
