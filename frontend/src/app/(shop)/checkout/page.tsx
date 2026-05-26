'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { TermsAccordion } from '@/components/ui/terms-accordion';
import { Loader2, CreditCard, Building2 } from 'lucide-react';
import { redirectToGoogleLogin } from '@/lib/auth-utils';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEPARTAMENTOS, DEPARTAMENTOS_MUNICIPIOS } from '@/lib/guatemala';

interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  designJson?: any;
  inkId?: string | null;
}

export default function CheckoutPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    municipality: '',
    department: '',
    nitOrCui: '',
    invoiceName: '',
  });

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
      router.push('/cart');
      return;
    }
    setItems(cart);
  }, [router]);

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleSubmit = async () => {
    if (!token) {
      alert('Debes iniciar sesion para completar la compra');
      return;
    }
    if (!termsAccepted) {
      alert('Debes aceptar los terminos y condiciones');
      return;
    }
    if (!form.fullName.trim()) {
      alert('Ingresa tu nombre completo');
      return;
    }
    if (!form.phone.trim()) {
      alert('Ingresa tu numero de telefono');
      return;
    }
    setLoading(true);
    try {
      const order = await api.post('/orders', {
        items: items.map((item) => ({
          productId: item.productId,
          inkId: item.inkId,
          quantity: item.quantity,
          designJson: item.designJson,
        })),
        shippingAddress: {
          address: form.address,
          municipality: form.municipality,
          department: form.department,
        },
        nitOrCui: form.nitOrCui,
        invoiceName: form.invoiceName,
        customerName: form.fullName,
        customerPhone: form.phone,
        paymentMethod: 'TRANSFER',
      });

      localStorage.removeItem('cart');
      alert(`Orden creada exitosamente! Numero: ${order.data.orderNumber}`);
      router.push('/store');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creando la orden');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl py-24 px-4 text-center">
        <h1 className="text-2xl font-bold text-[#1B2A6B] mb-4">Inicia sesion para continuar</h1>
        <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white" onClick={redirectToGoogleLogin}>Ingresar con Google</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold text-[#1B2A6B] mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de envio y facturacion
            </h2>
            <div className="space-y-4">
              <Input
                placeholder="Nombre completo"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <Input
                placeholder="Telefono"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder="Direccion completa"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium mb-1 block">Departamento</label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v || '', municipality: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTAMENTOS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Municipio</label>
                <Select
                  value={form.municipality}
                  onValueChange={(v) => setForm({ ...form, municipality: v || '' })}
                  disabled={!form.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.department ? 'Selecciona un municipio' : 'Primero selecciona un departamento'} />
                  </SelectTrigger>
                  <SelectContent>
                    {form.department && DEPARTAMENTOS_MUNICIPIOS[form.department]?.map((mun) => (
                      <SelectItem key={mun} value={mun}>{mun}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="NIT o CUI"
                value={form.nitOrCui}
                onChange={(e) => setForm({ ...form, nitOrCui: e.target.value })}
              />
              <Input
                placeholder="Nombre para factura"
                value={form.invoiceName}
                onChange={(e) => setForm({ ...form, invoiceName: e.target.value })}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Metodo de pago
            </h2>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">Transferencia bancaria / Deposito</p>
              <p className="text-xs text-gray-500 mt-1">
                Realiza tu pago y sube el comprobante. Un administrador confirmara manualmente.
              </p>
            </div>
          </Card>

          <TermsAccordion />

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              He leído y acepto los términos y condiciones de compra.
            </label>
          </div>
        </div>

        <div>
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold mb-4">Resumen de orden</h2>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.productName} x{item.quantity}</span>
                  <span className="font-medium">Q{(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-[#1B2A6B]">Q{total.toFixed(2)}</span>
            </div>
            <Button
              className="w-full mt-6 bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar orden
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
