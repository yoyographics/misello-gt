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
import { Loader2, Plus, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Slider {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  buttonText: '',
  buttonLink: '',
  sortOrder: 0,
  isActive: true,
};

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http')
    ? url
    : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

export default function AdminSlidersPage() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchSliders = useCallback(() => {
    setLoading(true);
    api
      .get('/sliders/admin/all')
      .then((res) => setSliders(res.data.items || res.data || []))
      .catch(() => toast.error('Error cargando sliders'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (slider: Slider) => {
    setEditingId(slider.id);
    setForm({
      title: slider.title,
      subtitle: slider.subtitle,
      imageUrl: slider.imageUrl,
      buttonText: slider.buttonText || '',
      buttonLink: slider.buttonLink || '',
      sortOrder: slider.sortOrder,
      isActive: slider.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl,
        buttonText: form.buttonText || undefined,
        buttonLink: form.buttonLink || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };

      if (editingId) {
        await api.patch(`/sliders/admin/${editingId}`, payload);
        toast.success('Slider actualizado');
      } else {
        await api.post('/sliders/admin', payload);
        toast.success('Slider creado');
      }

      setDialogOpen(false);
      fetchSliders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando slider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este slider?')) return;
    try {
      await api.delete(`/sliders/admin/${id}`);
      toast.success('Slider eliminado');
      fetchSliders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error eliminando slider');
    }
  };

  const handleToggleActive = async (slider: Slider) => {
    try {
      await api.patch(`/sliders/admin/${slider.id}`, {
        isActive: !slider.isActive,
      });
      toast.success(`Slider ${slider.isActive ? 'desactivado' : 'activado'}`);
      fetchSliders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error actualizando estado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Sliders</h1>
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
        ) : sliders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay sliders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Imagen</th>
                  <th className="text-left py-2">Titulo</th>
                  <th className="text-left py-2">Subtitulo</th>
                  <th className="text-left py-2">Orden</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sliders.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2">
                      {s.imageUrl ? (
                        <img
                          src={getImageUrl(s.imageUrl)}
                          alt={s.title}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-2 font-medium">{s.title}</td>
                    <td className="py-2 text-gray-600 max-w-xs truncate">
                      {s.subtitle}
                    </td>
                    <td className="py-2">{s.sortOrder}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="cursor-pointer"
                      >
                        <Badge
                          className={
                            s.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {s.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id)}
                        >
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
            <DialogTitle>
              {editingId ? 'Editar Slider' : 'Nuevo Slider'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium block mb-1.5">
                Titulo
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Titulo del slider"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">
                Subtitulo
              </label>
              <Input
                value={form.subtitle}
                onChange={(e) =>
                  setForm({ ...form, subtitle: e.target.value })
                }
                placeholder="Subtitulo"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">
                URL de imagen
              </label>
              <Input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Texto del boton
                </label>
                <Input
                  value={form.buttonText}
                  onChange={(e) =>
                    setForm({ ...form, buttonText: e.target.value })
                  }
                  placeholder="Ej: Ver mas"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Link del boton
                </label>
                <Input
                  value={form.buttonLink}
                  onChange={(e) =>
                    setForm({ ...form, buttonLink: e.target.value })
                  }
                  placeholder="/store"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">
                Orden
              </label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              <label htmlFor="isActive" className="text-sm">
                Activo
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.title || !form.imageUrl}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
