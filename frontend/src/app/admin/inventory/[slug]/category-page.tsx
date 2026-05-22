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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, ImageIcon, ArrowLeft, ArrowUpDown } from 'lucide-react';

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
  categoryId: '',
  shape: '',
  widthMm: '',
  heightMm: '',
  basePrice: '',
  stock: '',
  isActive: true,
};

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

export default function InventoryCategoryPage({ slug }: { slug: string }) {
  const router = useRouter();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterShape, setFilterShape] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterStock, setFilterStock] = useState('');

  // Modal producto
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [hoverImageFile, setHoverImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Ajuste stock
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/categories'),
      api.get('/products/admin/all'),
    ])
      .then(([categoriesRes, productsRes]) => {
        const cats: Category[] = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
        setCategories(cats);
        const cat = cats.find((c) => c.slug === slug) || null;
        setCategory(cat);

        const prods: Product[] = productsRes.data?.items || productsRes.data || [];
        setAllProducts(prods);
        if (cat) {
          setProducts(prods.filter((p: Product) => p.categoryId === cat.id));
        } else {
          setProducts([]);
        }
      })
      .catch((err) => console.error('Error cargando datos:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!category) return;
    let filtered = allProducts.filter((p) => p.categoryId === category.id);
    if (filterShape) {
      filtered = filtered.filter((p) => p.shape === filterShape);
    }
    if (filterMinPrice) {
      filtered = filtered.filter((p) => p.basePrice >= parseFloat(filterMinPrice));
    }
    if (filterMaxPrice) {
      filtered = filtered.filter((p) => p.basePrice <= parseFloat(filterMaxPrice));
    }
    if (filterStock) {
      filtered = filtered.filter((p) => p.stock <= parseInt(filterStock));
    }
    setProducts(filtered);
  }, [filterShape, filterMinPrice, filterMaxPrice, filterStock, allProducts, category]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryId: category?.id || '' });
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
      categoryId: product.categoryId || (product.category?.id ?? ''),
      shape: product.shape || '',
      widthMm: product.widthMm?.toString() || '',
      heightMm: product.heightMm?.toString() || '',
      basePrice: product.basePrice.toString(),
      stock: product.stock.toString(),
      isActive: product.isActive,
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
        categoryId: form.categoryId,
        shape: form.shape || undefined,
        widthMm: form.widthMm ? parseFloat(form.widthMm) : undefined,
        heightMm: form.heightMm ? parseFloat(form.heightMm) : undefined,
        basePrice: parseFloat(form.basePrice),
        stock: parseInt(form.stock) || 0,
        isActive: form.isActive,
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
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error ajustando stock');
    } finally {
      setAdjusting(false);
    }
  };

  const getCategoryName = (product: Product) => {
    if (product.category?.name) return product.category.name;
    const cat = categories.find((c) => c.id === product.categoryId);
    return cat?.name || product.categoryId || 'Sin categoria';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/inventory/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-2xl font-bold text-[#1B2A6B]">{category?.name || slug}</h1>
        <div className="flex-1" />
        <Button onClick={openCreate} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <Plus className="h-4 w-4 mr-1" /> Agregar producto
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium block mb-1">Forma</label>
            <Select value={filterShape} onValueChange={(v) => setFilterShape(v || '')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {SHAPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Precio min</label>
            <Input type="number" step="0.01" className="w-32" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Precio max</label>
            <Input type="number" step="0.01" className="w-32" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} placeholder="9999" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Stock max</label>
            <Input type="number" className="w-32" value={filterStock} onChange={(e) => setFilterStock(e.target.value)} placeholder="Todos" />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setFilterShape('');
            setFilterMinPrice('');
            setFilterMaxPrice('');
            setFilterStock('');
          }}>
            Limpiar
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : !category ? (
          <p className="text-gray-500 text-center py-8">Categoria no encontrada.</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay productos en esta categoria.</p>
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
                    <td className="py-2">{getCategoryName(p)}</td>
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openAdjust(p)}>
                          <ArrowUpDown className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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

      {/* Modal crear/editar producto */}
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
