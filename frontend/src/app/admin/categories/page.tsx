'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Eye, EyeOff, Wand2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  showInWizard: boolean;
  showInStore: boolean;
  isCustomizable: boolean;
  _count?: { products: number };
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    api
      .get('/categories')
      .then((res) => setCategories(res.data || []))
      .catch(() => toast.error('Error cargando categorias'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      sortOrder: cat.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/categories/admin/${editingId}`, form);
        toast.success('Categoria actualizada');
      } else {
        await api.post('/categories/admin', form);
        toast.success('Categoria creada');
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando categoria');
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (cat: Category, field: 'showInStore' | 'showInWizard' | 'isActive') => {
    try {
      if (field === 'showInStore') {
        await api.patch(`/categories/admin/${cat.id}/show-in-store`);
      } else {
        await api.patch(`/categories/admin/${cat.id}`, { [field]: !cat[field] });
      }
      toast.success(`${field === 'showInStore' ? 'Visibilidad en tienda' : field === 'showInWizard' ? 'Visibilidad en wizard' : 'Estado'} actualizado`);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error actualizando');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoria?')) return;
    try {
      await api.delete(`/categories/admin/${id}`);
      toast.success('Categoria eliminada');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error eliminando');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Categorias</h1>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> Agregar
        </Button>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay categorias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Slug</th>
                  <th className="text-left py-2">Productos</th>
                  <th className="text-left py-2">Tienda</th>
                  <th className="text-left py-2">Wizard</th>
                  <th className="text-left py-2">Activo</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b">
                    <td className="py-2 font-medium">{cat.name}</td>
                    <td className="py-2 text-gray-500">{cat.slug}</td>
                    <td className="py-2">{cat._count?.products || 0}</td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleField(cat, 'showInStore')}
                        className={`p-1 rounded transition ${cat.showInStore ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}
                        title={cat.showInStore ? 'Visible en tienda' : 'Oculto en tienda'}
                      >
                        {cat.showInStore ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleField(cat, 'showInWizard')}
                        className={`p-1 rounded transition ${cat.showInWizard ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-300 hover:bg-gray-50'}`}
                        title={cat.showInWizard ? 'Visible en wizard' : 'Oculto en wizard'}
                      >
                        {cat.showInWizard ? <Wand2 className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleField(cat, 'isActive')}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {cat.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} title="Eliminar">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nueva Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">Nombre</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Sellos Automaticos"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="sellos-automaticos"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Descripcion</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripcion opcional"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">URL de imagen</label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Orden</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name || !form.slug}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
