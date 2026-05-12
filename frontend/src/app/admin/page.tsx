'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/orders/admin/all'),
    ])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes.data);
        setOrders(ordersRes.data.items || ordersRes.data);
      })
      .catch((err) => {
        console.error('Admin API error:', err);
      })
      .finally(() => setLoading(false));
  }, []);

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B2A6B]">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Ordenes recientes */}
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
    </div>
  );
}
