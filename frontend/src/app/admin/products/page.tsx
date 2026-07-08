'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, ImageIcon, ArrowUpDown } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  showInWizard?: boolean;
  _count?: { products: number };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
  shape?: string;
  widthMm?: number;
  heightMm?: number;
  basePrice: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string;
  imageUrlHover?: string;
  cardLabel?: string;
  // Área reservada para sellos fechadores
  hasReservedArea?: boolean;
  reservedWidthMm?: number;
  reservedHeightMm?: number;
  reservedPositionX?: number;
  reservedPositionY?: number;
  reservedStroke?: boolean;
  reservedStrokeWidth?: number;
}

const SHAPES = [
  { value: 'RECTANGULAR', label: 'Rectangular' },
  { value: 'CIRCULAR', label: 'Circular' },
  { value: 'OVAL', label: 'Oval' },
];

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  cardLabel: '',
  categoryId: '',
  shape: '',
  widthMm: '',
  heightMm: '',
  basePrice: '',
  stock: '',
  isActive: true,
  // Área reservada
  hasReservedArea: false,
  reservedWidthMm: '',
  reservedHeightMm: '',
  reservedPositionX: '',
  reservedPositionY: '',
  reservedStroke: true,
  reservedStrokeWidth: '1',
};

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hoverImageFile, setHoverImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjusting, setAdjusting] = useState(false);


  const fetchProducts = useCallback(() => {
    setLoading(true);
    api.get('/products/admin/all?take=9999')
      .then((res) => setProducts(res.data.items || res.data || []))
      .catch((err) => console.error('Error cargando productos:', err))
      .finally(() => setLoading(false));
  }, []);

  const fetchCategories = useCallback(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data || []))
      .catch((err) => console.error('Error cargando categorias:', err));
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setHoverImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      cardLabel: product.cardLabel || '',
      categoryId: product.categoryId || (product.category?.id ?? ''),
      shape: product.shape || '',
      widthMm: product.widthMm?.toString() || '',
      heightMm: product.heightMm?.toString() || '',
      basePrice: product.basePrice.toString(),
      stock: product.stock.toString(),
      isActive: product.isActive,
      // Área reservada
      hasReservedArea: product.hasReservedArea || false,
      reservedWidthMm: product.reservedWidthMm?.toString() || '',
      reservedHeightMm: product.reservedHeightMm?.toString() || '',
      reservedPositionX: product.reservedPositionX?.toString() || '',
      reservedPositionY: product.reservedPositionY?.toString() || '',
      reservedStroke: product.reservedStroke !== false,
      reservedStrokeWidth: product.reservedStrokeWidth?.toString() || '1',
    });
    setImageFile(null);
    setHoverImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        cardLabel: form.cardLabel || undefined,
        categoryId: form.categoryId,
        shape: form.shape || undefined,
        widthMm: form.widthMm ? parseFloat(form.widthMm) : undefined,
        heightMm: form.heightMm ? parseFloat(form.heightMm) : undefined,
        basePrice: parseFloat(form.basePrice),
        stock: parseInt(form.stock) || 0,
        isActive: form.isActive,
        // Área reservada
        hasReservedArea: form.hasReservedArea || false,
        reservedWidthMm: form.reservedWidthMm ? parseFloat(form.reservedWidthMm) : undefined,
        reservedHeightMm: form.reservedHeightMm ? parseFloat(form.reservedHeightMm) : undefined,
        reservedPositionX: form.reservedPositionX ? parseFloat(form.reservedPositionX) : undefined,
        reservedPositionY: form.reservedPositionY ? parseFloat(form.reservedPositionY) : undefined,
        reservedStroke: form.reservedStroke !== false,
        reservedStrokeWidth: form.reservedStrokeWidth ? parseFloat(form.reservedStrokeWidth) : 1,
      };

      let productId = editingId;
      if (editingId) {
        await api.patch(`/products/admin/${editingId}`, payload);
      } else {
        const res = await api.post('/products/admin', payload);
        productId = res.data.id;
      }

      if (imageFile && productId) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.post(`/products/admin/${productId}/image`, fd, {
          headers: { 'Content-Type': undefined },
        });
      }

      if (hoverImageFile && productId) {
        const fd = new FormData();
        fd.append('image', hoverImageFile);
        fd.append('type', 'hover');
        await api.post(`/products/admin/${productId}/image`, fd, {
          headers: { 'Content-Type': undefined },
        });
      }

      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error guardando producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/products/admin/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error eliminando producto');
    }
  };

  const openAdjust = (product: Product) => {
    setAdjustProduct(product);
    setAdjustQty('');
    setAdjustOpen(true);
  };

  const handleAdjust = async () => {
    if (!adjustProduct || !adjustQty) return;
    setAdjusting(true);
    try {
      const delta = parseInt(adjustQty);
      await api.post('/inventory/adjust', {
        productId: adjustProduct.id,
        delta,
      });
      setAdjustOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error ajustando stock');
    } finally {
      setAdjusting(false);
    }
  };

  const getCategoryLabel = (product: Product) => {
    if (product.category?.name) return product.category.name;
    const cat = categories.find((c) => c.id === product.categoryId);
    return cat?.name || product.categoryId || 'Sin categoria';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Productos</h1>
        <div className="flex gap-2">
          <Button onClick={openCreate} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay productos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Imagen</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Categoria</th>
                  <th className="text-left py-2">Dimensiones</th>
                  <th className="text-left py-2">Precio</th>
                  <th className="text-left py-2">Stock</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">
                      {p.imageUrl ? (
                        <img
                          src={getImageUrl(p.imageUrl)}
                          alt={p.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs">{p.sku}</td>
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2">{getCategoryLabel(p)}</td>
                    <td className="py-2">{p.widthMm ? `${p.widthMm}mm x ${p.heightMm}mm` : '-'}</td>
                    <td className="py-2">Q{p.basePrice.toFixed(2)}</td>
                    <td className="py-2">{p.stock}</td>
                    <td className="py-2">
                      <Badge className={p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openAdjust(p)} title="Ajustar stock">
                          <ArrowUpDown className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5">SKU</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SELLO-001" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Nombre</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sello automatico..." />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5">Descripcion</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion opcional" />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5">Etiqueta de card (opcional)</label>
              <Input value={form.cardLabel} onChange={(e) => setForm({ ...form, cardLabel: e.target.value })} placeholder="Ej: Nuevo, Popular, Oferta..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5">Categoria</label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Forma</label>
                <Select value={form.shape} onValueChange={(v) => setForm({ ...form, shape: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5">Ancho (mm)</label>
                <Input type="number" value={form.widthMm} onChange={(e) => setForm({ ...form, widthMm: e.target.value })} placeholder="58" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Alto (mm)</label>
                <Input type="number" value={form.heightMm} onChange={(e) => setForm({ ...form, heightMm: e.target.value })} placeholder="22" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5">Precio (Q)</label>
                <Input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="125.00" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Stock inicial</label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm">Activo</label>
            </div>

            {/* Configuración de área reservada (sellos fechadores) */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="hasReservedArea"
                  checked={form.hasReservedArea}
                  onChange={(e) => setForm({ ...form, hasReservedArea: e.target.checked })}
                />
                <label htmlFor="hasReservedArea" className="text-sm font-medium">Sello fechador (área reservada)</label>
              </div>

              {form.hasReservedArea && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Ancho reservado (mm)</label>
                      <Input type="number" step="0.1" value={form.reservedWidthMm} onChange={(e) => setForm({ ...form, reservedWidthMm: e.target.value })} placeholder="30" />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Alto reservado (mm)</label>
                      <Input type="number" step="0.1" value={form.reservedHeightMm} onChange={(e) => setForm({ ...form, reservedHeightMm: e.target.value })} placeholder="15" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Posición X (mm, 0=centro)</label>
                      <Input type="number" step="0.1" value={form.reservedPositionX} onChange={(e) => setForm({ ...form, reservedPositionX: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Posición Y (mm, 0=centro)</label>
                      <Input type="number" step="0.1" value={form.reservedPositionY} onChange={(e) => setForm({ ...form, reservedPositionY: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="reservedStroke"
                        checked={form.reservedStroke}
                        onChange={(e) => setForm({ ...form, reservedStroke: e.target.checked })}
                      />
                      <label htmlFor="reservedStroke" className="text-xs">Mostrar borde (stroke)</label>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Grosor borde</label>
                      <Input type="number" step="0.1" value={form.reservedStrokeWidth} onChange={(e) => setForm({ ...form, reservedStrokeWidth: e.target.value })} placeholder="1" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5">Imagen principal</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {editingId && !imageFile && (
                <p className="text-xs text-gray-500 mt-1">Deja vacio para mantener la imagen actual</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5">Imagen hover (efecto al pasar el mouse)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setHoverImageFile(e.target.files?.[0] || null)}
              />
              {editingId && !hoverImageFile && (
                <p className="text-xs text-gray-500 mt-1">Deja vacio para mantener la imagen hover actual</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.sku || !form.name || !form.categoryId || !form.basePrice}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog ajustar stock */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
          </DialogHeader>
          {adjustProduct && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><span className="font-medium">{adjustProduct.name}</span></p>
                <p className="text-gray-500">Stock actual: {adjustProduct.stock}</p>
              </div>
              <div>
                <label className="text-xs font-medium">Cantidad a agregar (+) o quitar (-)</label>
                <Input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Ej: 10 o -5"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleAdjust}
                  disabled={adjusting || !adjustQty}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                >
                  {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
