'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { SvgImage } from '@/components/svg-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ShoppingBag, Printer, Package, User, MapPin, CreditCard, Truck, X } from 'lucide-react';

interface OrderItem {
  id: string;
  product: { name: string; sku: string };
  ink?: { color: string; hexCode: string };
  quantity: number;
  unitPrice: number;
  designJson?: any;
  previewPngUrl?: string;
  productionSvgUrl?: string;
}

interface Payment {
  id: string;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod?: string;
  shippingAddress?: Record<string, any>;
  nitOrCui?: string;
  invoiceName?: string;
  courierTracking?: string;
  user?: { name: string; email: string };
  items?: OrderItem[];
  payments?: Payment[];
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PENDING_PAYMENT', label: 'Pendiente de pago' },
  { value: 'PAYMENT_RECEIVED', label: 'Pago recibido' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_PRODUCTION', label: 'En produccion' },
  { value: 'FINISHED', label: 'Terminado' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PAYMENT_RECEIVED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  IN_PRODUCTION: 'bg-purple-100 text-purple-700',
  FINISHED: 'bg-teal-100 text-teal-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

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

  const openDetail = async (order: Order) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get(`/orders/admin/${order.id}`);
      setSelectedOrder(res.data);
      setTrackingInput(res.data.courierTracking || '');
    } catch (err) {
      console.error('Error cargando detalle:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (status: string | null) => {
    if (!status) return;
    if (!selectedOrder) return;
    try {
      await api.patch(`/orders/admin/${selectedOrder.id}/status`, { status });
      const res = await api.get(`/orders/admin/${selectedOrder.id}`);
      setSelectedOrder(res.data);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error actualizando estado');
    }
  };

  const updateTracking = async () => {
    if (!selectedOrder) return;
    try {
      await api.patch(`/orders/admin/${selectedOrder.id}/tracking`, { courierTracking: trackingInput });
      const res = await api.get(`/orders/admin/${selectedOrder.id}`);
      setSelectedOrder(res.data);
      fetchOrders();
      alert('Tracking actualizado');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error actualizando tracking');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status] || ''}>{STATUS_OPTIONS.find((s) => s.value === status)?.label || status}</Badge>
  );

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
                  <th className="text-left py-2">Accion</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(order)}>
                    <td className="py-2 font-medium">{order.orderNumber}</td>
                    <td className="py-2">{order.user?.name || order.user?.email || 'N/A'}</td>
                    <td className="py-2">{getStatusBadge(order.status)}</td>
                    <td className="py-2">Q{order.totalAmount.toFixed(2)}</td>
                    <td className="py-2 text-gray-500">{new Date(order.createdAt).toLocaleDateString('es-GT')}</td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDetail(order); }}>Ver</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalle del pedido</span>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Imprimir
              </Button>
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : !selectedOrder ? (
            <p className="text-gray-500">No se pudo cargar el pedido.</p>
          ) : (
            <div ref={printRef} className="space-y-6">
              {/* Header del invoice (solo visible al imprimir) */}
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold text-[#1B2A6B]">misello.gt</h1>
                <p className="text-sm text-gray-600">Invoice #{selectedOrder.orderNumber}</p>
                <p className="text-sm text-gray-600">{new Date(selectedOrder.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              {/* Estado y numero */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-gray-500">Pedido</p>
                  <p className="text-lg font-bold">{selectedOrder.orderNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  <Select value={selectedOrder.status} onValueChange={updateStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Cliente
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Nombre:</span> {selectedOrder.user?.name || 'N/A'}</p>
                    <p><span className="text-gray-500">Email:</span> {selectedOrder.user?.email || 'N/A'}</p>
                    <p><span className="text-gray-500">NIT/CUI:</span> {selectedOrder.nitOrCui || 'N/A'}</p>
                    <p><span className="text-gray-500">Factura a:</span> {selectedOrder.invoiceName || 'N/A'}</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Direccion de envio
                  </h3>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.shippingAddress ? (
                      <>
                        <p>{selectedOrder.shippingAddress.address}</p>
                        <p>{selectedOrder.shippingAddress.municipality}, {selectedOrder.shippingAddress.department}</p>
                      </>
                    ) : (
                      <p className="text-gray-500">Sin direccion registrada</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Items */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Productos
                </h3>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-2">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-gray-500 text-xs">SKU: {item.product.sku}</p>
                          {item.ink && (
                            <p className="text-xs flex items-center gap-1 mt-1">
                              <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.ink.hexCode }} />
                              Tinta: {item.ink.color}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p>Q{item.unitPrice.toFixed(2)} x {item.quantity}</p>
                          <p className="font-bold">Q{(item.unitPrice * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                      {/* Diseño */}
                      {item.designJson && (
                        <div className="mt-2 bg-gray-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Diseno:</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">{JSON.stringify(item.designJson, null, 2)}</pre>
                        </div>
                      )}
                      {item.previewPngUrl && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Preview:</p>
                          <SvgImage src={item.previewPngUrl} alt="Preview" className="h-24 object-contain border rounded" />
                        </div>
                      )}
                      {item.productionSvgUrl && (
                        <div className="mt-2">
                          <a href={item.productionSvgUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            Ver SVG de produccion
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4 pt-3 border-t">
                  <p className="text-lg font-bold">Total: Q{selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
              </Card>

              {/* Pago */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pago
                </h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Metodo:</span> {selectedOrder.paymentMethod || 'No especificado'}</p>
                  {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                    selectedOrder.payments.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 mt-1">
                        <Badge className={p.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {p.status}
                        </Badge>
                        <span>Q{p.amount.toFixed(2)}</span>
                        <span className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString('es-GT')}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Sin pagos registrados</p>
                  )}
                </div>
              </Card>

              {/* Tracking */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Envio
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Numero de guia / tracking"
                  />
                  <Button onClick={updateTracking} variant="outline">Guardar</Button>
                </div>
              </Card>

              {/* Footer del invoice (solo visible al imprimir) */}
              <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
                <p>Gracias por tu compra en misello.gt</p>
                <p>YOYO GRAPHICS, S.A. — Guatemala</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estilos de impresion */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-state="open"] > div,
          [data-state="open"] > div * {
            visibility: visible;
          }
          [data-state="open"] > div {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            box-shadow: none;
            border: none;
          }
          [data-state="open"] button,
          [data-state="open"] [role="dialog"] > button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
