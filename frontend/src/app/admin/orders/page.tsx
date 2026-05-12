'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    api.get('/orders/admin/all')
      .then((res) => setOrders(res.data.items || res.data || []))
      .catch((err) => console.error('Error cargando pedidos:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Pedidos</h1>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay pedidos.</p>
        ) : (
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
                {orders.map((order) => (
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
        )}
      </Card>
    </div>
  );
}
