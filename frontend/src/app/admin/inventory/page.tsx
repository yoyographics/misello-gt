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
import { Loader2, Plus, Package, RefreshCw } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  showInWizard?: boolean;
  isCustomizable?: boolean;
  _count?: { products: number };
}

function slugify(str: string) {
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '');
}

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

export default function AdminInventoryPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [newCategoryIsCustomizable, setNewCategoryIsCustomizable] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncCatalog = async () => {
    if (!confirm('Esto sincronizara el catalogo completo (57 productos). ¿Continuar?')) return;
    setSyncing(true);
    try {
      const res = await api.post('/products/admin/sync-catalog');
      alert(`Sync completo: ${res.data.created} creados, ${res.data.updated} actualizados, ${res.data.unchanged} sin cambios`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error sincronizando catalogo');
    } finally {
      setSyncing(false);
    }
  };

  const fetchCategories = useCallback(() => {
    setLoading(true);
    api.get('/categories')
      .then((res) => {
        const data = res.data || [];
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error cargando categorias:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setNewCategorySlug(slugify(newCategoryName));
  }, [newCategoryName]);

  const toggleCustomizable = async (cat: Category) => {
    const newValue = !cat.isCustomizable;
    // Optimistic update: cambiar estado local inmediatamente sin recargar
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isCustomizable: newValue } : c))
    );
    try {
      await api.patch(`/categories/admin/${cat.id}`, {
        isCustomizable: newValue,
      });
    } catch (err: any) {
      // Revertir si falla
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isCustomizable: !newValue } : c))
      );
      alert(err.response?.data?.message || 'Error actualizando categoria');
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName || !newCategorySlug) return;
    setCreating(true);
    try {
      const payload = {
        name: newCategoryName,
        slug: newCategorySlug,
        description: newCategoryDescription || undefined,
        isCustomizable: newCategoryIsCustomizable,
      };
      const res = await api.post('/categories/admin', payload);
      const created = res.data;

      // Nota: upload de imagen para categorias requiere endpoint adicional en backend
      // Por ahora se omite hasta implementar el endpoint de upload de imagen de categoria

      setCreateOpen(false);
      setNewCategoryName('');
      setNewCategorySlug('');
      setNewCategoryDescription('');
      setNewCategoryImage(null);
      setNewCategoryIsCustomizable(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creando categoria');
    } finally {
      setCreating(false);
    }
  };

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Inventario</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncCatalog}
            disabled={syncing}
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sync catalogo
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Plus className="h-4 w-4 mr-1" /> Crear categoria
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : activeCategories.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No hay categorias activas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {activeCategories.map((cat) => (
            <Card
              key={cat.id}
              className="relative p-5 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 hover:border-orange-300"
              onClick={() => router.push(`/admin/inventory/${cat.slug}/`)}
            >
              {/* Switch estilo Apple - esquina superior derecha */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleCustomizable(cat); }}
                className={`absolute top-3 right-3 w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                  cat.isCustomizable ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={cat.isCustomizable ? 'Personalizable' : 'No personalizable'}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                    cat.isCustomizable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>

              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {cat.imageUrl ? (
                    <img
                      src={getImageUrl(cat.imageUrl)}
                      alt={cat.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{cat.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{cat.description || 'Sin descripcion'}</p>
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {cat._count?.products ?? 0} productos
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">Nombre</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Montura Automatica"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Slug</label>
              <Input
                value={newCategorySlug}
                onChange={(e) => setNewCategorySlug(e.target.value)}
                placeholder="montura_automatica"
              />
              <p className="text-[10px] text-gray-400 mt-1">Se genera automaticamente desde el nombre.</p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Descripcion (opcional)</label>
              <textarea
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Descripcion breve..."
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Imagen (opcional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setNewCategoryImage(e.target.files?.[0] || null)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCategoryIsCustomizable}
                onChange={(e) => setNewCategoryIsCustomizable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm">Permite personalizar diseño (wizard)</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !newCategoryName || !newCategorySlug}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
