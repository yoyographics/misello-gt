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
import { toast } from 'sonner';

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
      toast.error(err.response?.data?.message || 'Error actualizando estado');
    }
  };

  const updateTracking = async () => {
    if (!selectedOrder) return;
    try {
      await api.patch(`/orders/admin/${selectedOrder.id}/tracking`, { courierTracking: trackingInput });
      const res = await api.get(`/orders/admin/${selectedOrder.id}`);
      setSelectedOrder(res.data);
      fetchOrders();
      toast.success('Tracking actualizado');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error actualizando tracking');
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;

    const itemsHtml = selectedOrder.items?.map((item: any) => {
      const designLines = (() => {
        const dj = item.designJson;
        const lines = dj?.textLines || dj?.lines || [];
        if (Array.isArray(lines) && lines.length > 0) {
          return lines.map((l: any) => l.text || l.content || '').filter(Boolean).join('<br>');
        }
        return '';
      })();

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;font-size:14px;">${item.product.name}</div>
            <div style="font-size:12px;color:#6b7280;">SKU: ${item.product.sku}</div>
            ${item.ink ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">Tinta: ${item.ink.color}</div>` : ''}
            ${designLines ? `<div style="font-size:12px;color:#374151;margin-top:6px;padding:6px;background:#f9fafb;border-radius:4px;">${designLines}</div>` : ''}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-size:13px;">
            Q${item.unitPrice.toFixed(2)} x ${item.quantity}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-weight:600;">
            Q${(item.unitPrice * item.quantity).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('') || '';

    const paymentsHtml = selectedOrder.payments?.map((p: any) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #f3f4f6;">
        <span>${p.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente'} — Q${p.amount.toFixed(2)}</span>
        <span style="color:#9ca3af;">${new Date(p.createdAt).toLocaleDateString('es-GT')}</span>
      </div>
    `).join('') || '<p style="font-size:13px;color:#6b7280;">Sin pagos registrados</p>';

    const addr = selectedOrder.shippingAddress;
    const addressHtml = addr
      ? `<p style="margin:0;font-size:13px;">${addr.address}</p><p style="margin:0;font-size:13px;color:#6b7280;">${addr.municipality}, ${addr.department}</p>`
      : '<p style="font-size:13px;color:#6b7280;">Sin direccion registrada</p>';

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido ${selectedOrder.orderNumber}</title>
        <style>
          @media print { body { margin: 0; } }
          body { font-family: system-ui, -apple-system, sans-serif; color: #111827; margin: 40px; }
        </style>
      </head>
      <body>
        <div style="max-width:700px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;">
            <div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#1B2A6B;">misello.gt</h1>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">YOYO GRAPHICS, S.A. — Guatemala</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;font-size:18px;font-weight:700;">Pedido ${selectedOrder.orderNumber}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">
                ${new Date(selectedOrder.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">
                Estado: ${STATUS_OPTIONS.find((s) => s.value === selectedOrder.status)?.label || selectedOrder.status}
              </p>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
            <div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Cliente</p>
              <p style="margin:0;font-size:13px;font-weight:600;">${selectedOrder.user?.name || 'N/A'}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#374151;">${selectedOrder.user?.email || 'N/A'}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#374151;">Tel: ${selectedOrder.user?.phone || 'N/A'}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#374151;">NIT/CUI: ${selectedOrder.nitOrCui || 'N/A'}</p>
            </div>
            <div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Direccion de envio</p>
              ${addressHtml}
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="border-bottom:2px solid #e5e7eb;">
                <th style="text-align:left;padding:8px 0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Producto</th>
                <th style="text-align:right;padding:8px 0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Precio</th>
                <th style="text-align:right;padding:8px 0;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
            <div style="text-align:right;">
              <p style="margin:0;font-size:12px;color:#6b7280;">Total</p>
              <p style="margin:0;font-size:22px;font-weight:700;">Q${selectedOrder.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
            <div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Pagos</p>
              ${paymentsHtml}
            </div>
            <div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Envio</p>
              ${selectedOrder.courierTracking
                ? `<p style="margin:0;font-size:13px;font-weight:600;">Guia: ${selectedOrder.courierTracking}</p>`
                : '<p style="margin:0;font-size:13px;color:#6b7280;">Sin numero de guia</p>'}
            </div>
          </div>

          <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Gracias por tu compra en misello.gt</p>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
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
        <DialogContent className="max-w-4xl w-[90vw] p-0 gap-0">
          {detailLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !selectedOrder ? (
            <div className="p-6">
              <p className="text-gray-500">No se pudo cargar el pedido.</p>
            </div>
          ) : (
            <div ref={printRef}>
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <p className="text-xs text-gray-500">Pedido {selectedOrder.orderNumber}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  <Select value={selectedOrder.status} onValueChange={updateStatus}>
                    <SelectTrigger className="w-40 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={handlePrint} className="h-7 px-2 text-xs">
                    <Printer className="h-3 w-3 mr-1" /> Imprimir
                  </Button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Cliente | Envio | Resumen — todo en una fila */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-sm">
                  {/* Cliente */}
                  <div className="lg:col-span-5">
                    <p className="text-xs text-gray-500 mb-1.5">Cliente</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div><span className="text-gray-400 text-xs">Nombre:</span> <span className="text-gray-900">{selectedOrder.user?.name || 'N/A'}</span></div>
                      <div><span className="text-gray-400 text-xs">Telefono:</span> <span className="text-gray-900">{selectedOrder.user?.phone || 'N/A'}</span></div>
                      <div className="col-span-2"><span className="text-gray-400 text-xs">Email:</span> <span className="text-gray-900">{selectedOrder.user?.email || 'N/A'}</span></div>
                      <div><span className="text-gray-400 text-xs">NIT/CUI:</span> <span className="text-gray-900">{selectedOrder.nitOrCui || 'N/A'}</span></div>
                      <div><span className="text-gray-400 text-xs">Factura:</span> <span className="text-gray-900">{selectedOrder.invoiceName || 'N/A'}</span></div>
                    </div>
                  </div>

                  {/* Envio */}
                  <div className="lg:col-span-4">
                    <p className="text-xs text-gray-500 mb-1.5">Direccion de envio</p>
                    {selectedOrder.shippingAddress ? (
                      <div>
                        <p className="text-gray-900">{selectedOrder.shippingAddress.address}</p>
                        <p className="text-gray-500">{selectedOrder.shippingAddress.municipality}, {selectedOrder.shippingAddress.department}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Sin direccion registrada</p>
                    )}
                  </div>

                  {/* Resumen */}
                  <div className="lg:col-span-3 border border-gray-200 rounded p-3 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1.5">Resumen</p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">Metodo:</span><span className="text-gray-900">{selectedOrder.paymentMethod === 'TRANSFER' ? 'Transferencia' : selectedOrder.paymentMethod || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">Productos:</span><span className="text-gray-900">{selectedOrder.items?.length || 0}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">Pagos:</span><span className="text-gray-900">{selectedOrder.payments?.length || 0}</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between items-center">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-lg font-bold text-gray-900">Q{selectedOrder.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Productos */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Productos</p>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{item.product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                            {item.ink && (
                              <p className="text-xs flex items-center gap-1 mt-1">
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
                          <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                            <p className="text-xs text-gray-500 mb-0.5">Texto del sello:</p>
                            {(() => {
                              const dj = item.designJson;
                              const lines = dj?.textLines || dj?.lines || [];
                              if (Array.isArray(lines) && lines.length > 0) {
                                return lines.map((line: any, idx: number) => (
                                  <p key={idx} className="text-sm text-gray-700">{line.text || line.content || '-'}</p>
                                ));
                              }
                              return <p className="text-xs text-gray-600">-</p>;
                            })()}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          {item.previewPngUrl && (
                            <SvgImage src={item.previewPngUrl} alt="Preview" className="h-14 w-14 object-contain border rounded bg-white" />
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

                <Separator />

                {/* Pagos | Envio */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Pagos</p>
                    {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedOrder.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${p.status === 'CONFIRMED' ? 'border-green-300 text-green-700 bg-green-50' : 'border-yellow-300 text-yellow-700 bg-yellow-50'}`}>
                                {p.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente'}
                              </span>
                              <span className="font-semibold">Q{p.amount.toFixed(2)}</span>
                            </div>
                            <span className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString('es-GT')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 p-2 border border-gray-200 rounded">Sin pagos registrados</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Envio</p>
                    {selectedOrder.courierTracking && (
                      <div className="mb-2 p-2 border border-gray-200 rounded bg-gray-50">
                        <p className="text-xs text-gray-500">Guia:</p>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.courierTracking}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Numero de guia"
                        className="h-7 text-xs"
                      />
                      <Button onClick={updateTracking} variant="outline" className="h-7 text-xs px-3">
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer invoice (solo imprimir) */}
              <div className="hidden print:block px-6 pt-4 pb-6 border-t text-center text-xs text-gray-500">
                <p>Gracias por tu compra en misello.gt</p>
                <p>YOYO GRAPHICS, S.A.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
