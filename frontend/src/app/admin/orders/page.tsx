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
  user?: { id: string; name: string; email: string; phone?: string };
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
    api.get('/orders/admin/all?take=9999')
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
                    <td className="py-2">
                      <div className="text-sm">{order.user?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{order.user?.email}</div>
                      {order.user?.phone && <div className="text-xs text-gray-500">{order.user.phone}</div>}
                    </td>
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
        <DialogContent className="max-w-5xl w-[92vw] p-0 gap-0 border-gray-300">
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !selectedOrder ? (
            <div className="p-6">
              <p className="text-gray-500">No se pudo cargar el pedido.</p>
            </div>
          ) : (
            <div ref={printRef} className="flex flex-col">
              {/* Header sobrio */}
              <div className="border-b border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Pedido</p>
                    <h2 className="text-xl font-bold text-gray-900">{selectedOrder.orderNumber}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedOrder.status)}
                    <Select value={selectedOrder.status} onValueChange={updateStatus}>
                      <SelectTrigger className="w-48 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs">
                      <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Cliente + Envio + Resumen en una fila */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-4">
                    {/* Cliente */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Informacion del cliente
                      </h4>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">Nombre</p>
                          <p className="font-medium text-gray-900">{selectedOrder.user?.name || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 lg:col-span-1">
                          <p className="text-gray-400 text-xs">Email</p>
                          <p className="font-medium text-gray-900 truncate" title={selectedOrder.user?.email || ''}>{selectedOrder.user?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Telefono</p>
                          <p className="font-medium text-gray-900">{selectedOrder.user?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">NIT / CUI</p>
                          <p className="font-medium text-gray-900">{selectedOrder.nitOrCui || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Factura a</p>
                          <p className="font-medium text-gray-900">{selectedOrder.invoiceName || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Envio */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Direccion de envio
                      </h4>
                      {selectedOrder.shippingAddress ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.address}</p>
                          <p className="text-gray-500">{selectedOrder.shippingAddress.municipality}, {selectedOrder.shippingAddress.department}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin direccion registrada</p>
                      )}
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Resumen
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Metodo</span>
                        <span className="font-medium text-gray-900">{selectedOrder.paymentMethod === 'TRANSFER' ? 'Transferencia' : selectedOrder.paymentMethod || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Productos</span>
                        <span className="font-medium text-gray-900">{selectedOrder.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pagos</span>
                        <span className="font-medium text-gray-900">{selectedOrder.payments?.length || 0}</span>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-xl font-bold text-gray-900">Q{selectedOrder.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Productos
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900">{item.product.name}</p>
                            <p className="text-gray-500 text-xs">SKU: {item.product.sku}</p>
                            {item.ink && (
                              <p className="text-xs flex items-center gap-1.5 mt-1.5">
                                <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.ink.hexCode }} />
                                Tinta: {item.ink.color}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">Q{item.unitPrice.toFixed(2)} x {item.quantity}</p>
                            <p className="text-base font-bold text-gray-900">Q{(item.unitPrice * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>

                        {item.designJson && (
                          <div className="mt-3 p-2.5 bg-gray-50 rounded border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Texto del sello</p>
                            {(() => {
                              const dj = item.designJson;
                              const lines = dj?.textLines || dj?.lines || [];
                              if (Array.isArray(lines) && lines.length > 0) {
                                return (
                                  <div className="space-y-0.5">
                                    {lines.map((line: any, idx: number) => (
                                      <p key={idx} className="text-sm text-gray-700">
                                        {line.text || line.content || '-'}
                                      </p>
                                    ))}
                                  </div>
                                );
                              }
                              return <p className="text-xs text-gray-600">-</p>;
                            })()}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {item.previewPngUrl && (
                            <SvgImage src={item.previewPngUrl} alt="Preview" className="h-16 w-16 object-contain border rounded bg-white" />
                          )}
                          {item.productionSvgUrl && (
                            <a href={item.productionSvgUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-900 underline">
                              Ver SVG de produccion
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pago y Tracking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Pagos
                    </h4>
                    {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedOrder.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-md">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={p.status === 'CONFIRMED' ? 'text-green-700 border-green-300 bg-green-50' : 'text-yellow-700 border-yellow-300 bg-yellow-50'}>
                                {p.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente'}
                              </Badge>
                              <span className="text-sm font-semibold">Q{p.amount.toFixed(2)}</span>
                            </div>
                            <span className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString('es-GT')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 p-2.5 border border-gray-200 rounded-md">Sin pagos registrados</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" /> Envio
                    </h4>
                    {selectedOrder.courierTracking ? (
                      <div className="mb-2 p-2.5 border border-gray-200 rounded-md bg-gray-50">
                        <p className="text-xs text-gray-500">Numero de guia</p>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.courierTracking}</p>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Input
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Numero de guia / tracking"
                        className="h-8 text-xs"
                      />
                      <Button onClick={updateTracking} variant="outline" className="h-8 text-xs">
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

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
