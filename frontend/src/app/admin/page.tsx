'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Users,
  Tag,
  Bell,
  Settings,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user?: { name: string; email: string };
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalWaitlist: number;
  totalUsers: number;
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/orders/admin/all'),
    ])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes.data);
        setOrders(ordersRes.data.data || ordersRes.data);
      })
      .catch(() => {
        // Si no tiene permisos, redirigir
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl py-24 text-center">
        <h1 className="text-2xl font-bold text-[#1B2A6B] mb-4">Acceso restringido</h1>
        <p className="text-gray-600 mb-4">Debes iniciar sesion como administrador.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
      PAYMENT_RECEIVED: 'bg-blue-100 text-blue-700',
      CONFIRMED: 'bg-green-100 text-green-700',
      IN_PRODUCTION: 'bg-purple-100 text-purple-700',
      FINISHED: 'bg-teal-100 text-teal-700',
      SHIPPED: 'bg-indigo-100 text-indigo-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return <Badge className={colors[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-24 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#1B2A6B]">Panel de Administracion</h1>
        <span className="text-sm text-gray-500">{user.email}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
              <p className="text-xs text-gray-500">Ordenes totales</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.pendingOrders || 0}</p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.lowStockProducts || 0}</p>
              <p className="text-xs text-gray-500">Bajo stock</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-gray-500">Usuarios panel</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders">Ordenes</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="discounts">Descuentos</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="settings">Configuracion</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Ordenes recientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Numero</th>
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 20).map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2 font-medium">{order.orderNumber}</td>
                      <td className="py-2">{order.user?.name || order.user?.email || 'N/A'}</td>
                      <td className="py-2">{getStatusBadge(order.status)}</td>
                      <td className="py-2">Q{order.totalAmount.toFixed(2)}</td>
                      <td className="py-2 text-gray-500">{new Date(order.createdAt).toLocaleDateString('es-GT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Gestion de productos</h2>
            <p className="text-gray-600">Usa la API para gestionar productos: /api/v1/products/admin</p>
          </Card>
        </TabsContent>

        <TabsContent value="discounts">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Descuentos</h2>
            <p className="text-gray-600">Gestion de descuentos via API: /api/v1/admin/discounts</p>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Waitlist</h2>
            <p className="text-gray-600">Clientes esperando productos agotados: /api/v1/admin/waitlist</p>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Configuracion</h2>
            <p className="text-gray-600">Gestion de roles, usuarios, T&C, replica price via API: /api/v1/admin/*</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
