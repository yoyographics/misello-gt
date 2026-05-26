'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, User, Mail, Phone, ShoppingBag, Calendar } from 'lucide-react';

interface Customer {
  id: string;
  name: string | null;
  email: string;
  picture: string | null;
  phone: string | null;
  createdAt: string;
  _count?: { orders: number };
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { product: { name: string }; quantity: number }[];
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    api.get('/customers/admin/all?take=9999')
      .then((res) => {
        const data = res.data;
        setCustomers(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => console.error('Error cargando clientes:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
    setOrdersLoading(true);
    try {
      const res = await api.get(`/customers/admin/${customer.id}/orders`);
      setCustomerOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error cargando ordenes del cliente:', err);
      setCustomerOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
      PAYMENT_RECEIVED: 'bg-blue-100 text-blue-700',
      CONFIRMED: 'bg-green-100 text-green-700',
      IN_PRODUCTION: 'bg-purple-100 text-purple-700',
      FINISHED: 'bg-indigo-100 text-indigo-700',
      SHIPPED: 'bg-teal-100 text-teal-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador',
      PENDING_PAYMENT: 'Pendiente de pago',
      PAYMENT_RECEIVED: 'Pago recibido',
      CONFIRMED: 'Confirmado',
      IN_PRODUCTION: 'En produccion',
      FINISHED: 'Terminado',
      SHIPPED: 'Enviado',
      CANCELLED: 'Cancelado',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Clientes</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, email o telefono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No hay clientes registrados.</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium">Contacto</th>
                  <th className="text-left py-3 px-4 font-medium">Telefono</th>
                  <th className="text-left py-3 px-4 font-medium">Ordenes</th>
                  <th className="text-left py-3 px-4 font-medium">Registro</th>
                  <th className="text-left py-3 px-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {customer.picture ? (
                          <img src={customer.picture} alt="" className="h-8 w-8 rounded-full" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <span className="font-medium">{customer.name || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="h-3.5 w-3.5" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3.5 w-3.5" />
                        {customer.phone || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">{customer._count?.orders ?? 0}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString('es-GT')}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm" onClick={() => openDetail(customer)}>
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal detalle cliente */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {selectedCustomer.picture ? (
                  <img src={selectedCustomer.picture} alt="" className="h-16 w-16 rounded-full" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name || 'Sin nombre'}</h3>
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedCustomer.email}
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <Phone className="h-3.5 w-3.5" />
                    {selectedCustomer.phone || 'Sin telefono'}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                    <Calendar className="h-3 w-3" />
                    Registrado el {new Date(selectedCustomer.createdAt).toLocaleDateString('es-GT')}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Historial de compras ({customerOrders.length})
                </h4>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm">Este cliente no tiene ordenes registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order) => (
                      <Card key={order.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString('es-GT')} — {' '}
                              {order.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusBadge(order.status)}>{statusLabel(order.status)}</Badge>
                            <p className="text-sm font-semibold mt-1">Q{order.totalAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
