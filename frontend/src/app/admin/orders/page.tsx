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
        <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-0 gap-0">
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : !selectedOrder ? (
            <div className="p-6">
              <p className="text-gray-500">No se pudo cargar el pedido.</p>
            </div>
          ) : (
            <div ref={printRef} className="flex flex-col">
              {/* Header moderno */}
              <div className="bg-gradient-to-r from-[#1B2A6B] to-[#2d3f8f] text-white p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingBag className="h-5 w-5 text-orange-400" />
                      <span className="text-sm text-blue-200">Pedido</span>
                    </div>
                    <h2 className="text-2xl font-bold">{selectedOrder.orderNumber}</h2>
                    <p className="text-sm text-blue-200 mt-1">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <Select value={selectedOrder.status} onValueChange={updateStatus}>
                      <SelectTrigger className="w-52 bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <Printer className="h-4 w-4 mr-1" /> Imprimir
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Cliente + Envio (2/3) | Resumen (1/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Card ancha: Cliente y Envio */}
                  <Card className="lg:col-span-2 p-5 shadow-sm border-gray-200">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-[#1B2A6B]">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      Informacion del cliente
                    </h3>

                    {/* Datos en grid horizontal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Nombre</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.user?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Email</p>
                        <p className="font-semibold text-gray-900 break-all">{selectedOrder.user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Telefono</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.user?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">NIT / CUI</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.nitOrCui || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Factura a</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.invoiceName || 'N/A'}</p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Direccion */}
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Direccion de envio</p>
                        {selectedOrder.shippingAddress ? (
                          <div>
                            <p className="font-semibold text-gray-900">{selectedOrder.shippingAddress.address}</p>
                            <p className="text-gray-500 text-sm">{selectedOrder.shippingAddress.municipality}, {selectedOrder.shippingAddress.department}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Sin direccion registrada</p>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Resumen */}
                  <Card className="p-5 shadow-sm border-gray-200 bg-gradient-to-br from-gray-50 to-white flex flex-col">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-[#1B2A6B]">
                      <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      Resumen
                    </h3>
                    <div className="space-y-3 text-sm flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Metodo de pago</span>
                        <Badge variant="outline" className="font-medium">
                          {selectedOrder.paymentMethod === 'TRANSFER' ? 'Transferencia' : selectedOrder.paymentMethod || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Productos</span>
                        <span className="font-semibold">{selectedOrder.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Pagos registrados</span>
                        <span className="font-semibold">{selectedOrder.payments?.length || 0}</span>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-end">
                      <span className="text-gray-500 text-sm">Total</span>
                      <span className="text-2xl font-bold text-[#1B2A6B]">Q{selectedOrder.totalAmount.toFixed(2)}</span>
                    </div>
                  </Card>
                </div>

                {/* Productos */}
                <Card className="shadow-sm border-gray-200 overflow-hidden">
                  <div className="p-5 border-b bg-gray-50/50">
                    <h3 className="font-semibold flex items-center gap-2 text-[#1B2A6B]">
                      <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Package className="h-4 w-4 text-purple-600" />
                      </div>
                      Productos
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {selectedOrder.items?.map((item, i) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-base">{item.product.name}</p>
                              <p className="text-gray-500 text-sm">SKU: {item.product.sku}</p>
                              {item.ink && (
                                <p className="text-sm flex items-center gap-1.5 mt-2">
                                  <span className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: item.ink.hexCode }} />
                                  <span className="text-gray-600">Tinta:</span> <span className="font-medium">{item.ink.color}</span>
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm text-gray-500">Q{item.unitPrice.toFixed(2)} x {item.quantity}</p>
                              <p className="text-xl font-bold text-[#1B2A6B]">Q{(item.unitPrice * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>

                          {item.designJson && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Texto del sello</p>
                              {(() => {
                                const dj = item.designJson;
                                const lines = dj?.textLines || dj?.lines || [];
                                if (Array.isArray(lines) && lines.length > 0) {
                                  return (
                                    <div className="space-y-1">
                                      {lines.map((line: any, idx: number) => (
                                        <p key={idx} className="text-sm text-gray-700 font-medium">
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
                              <div className="flex items-center gap-2">
                                <SvgImage src={item.previewPngUrl} alt="Preview" className="h-20 w-20 object-contain border rounded-lg bg-white" />
                              </div>
                            )}
                            {item.productionSvgUrl && (
                              <a href={item.productionSvgUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                                <Package className="h-3.5 w-3.5" /> SVG de produccion
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Pago y Tracking en 2 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card className="p-5 shadow-sm border-gray-200">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-[#1B2A6B]">
                      <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      Pagos
                    </h3>
                    {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedOrder.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Badge className={p.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                {p.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente'}
                              </Badge>
                              <span className="font-semibold">Q{p.amount.toFixed(2)}</span>
                            </div>
                            <span className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString('es-GT')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-gray-50 text-center">
                        <p className="text-gray-500 text-sm">Sin pagos registrados</p>
                      </div>
                    )}
                  </Card>

                  <Card className="p-5 shadow-sm border-gray-200">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-[#1B2A6B]">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-indigo-600" />
                      </div>
                      Envio
                    </h3>
                    {selectedOrder.courierTracking ? (
                      <div className="mb-3 p-3 rounded-lg bg-indigo-50">
                        <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Numero de guia</p>
                        <p className="text-lg font-bold text-indigo-900">{selectedOrder.courierTracking}</p>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Input
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Numero de guia / tracking"
                        className="flex-1"
                      />
                      <Button onClick={updateTracking} className="bg-[#1B2A6B] hover:bg-[#2d3f8f] text-white">
                        Guardar
                      </Button>
                    </div>
                  </Card>
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
