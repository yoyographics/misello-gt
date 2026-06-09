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
import { Loader2, Plus, Pencil, Trash2, ImageIcon, Upload, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Slider {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  gradient?: string;
  useGradient?: boolean;
  animation?: string;
  buttonText?: string;
  buttonType?: 'URL' | 'CATEGORY' | 'PRODUCT';
  buttonUrl?: string;
  buttonCategorySlug?: string;
  buttonProductId?: string;
  sortOrder: number;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  gradient: '',
  useGradient: true,
  animation: 'fade-up',
  buttonText: '',
  buttonType: 'URL',
  buttonUrl: '',
  buttonCategorySlug: '',
  buttonProductId: '',
  sortOrder: 0,
  isActive: true,
};

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http')
    ? url
    : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

// Extrae colores hex de un string tipo "from-[#1B2A6B] via-[#FF0000] to-[#0f1a4a]"
function parseGradientColors(value: string): string[] {
  const matches = value.match(/#([0-9A-Fa-f]{6})/g);
  return matches || ['#1B2A6B', '#0f1a4a'];
}

function buildGradient(colors: string[]): string {
  if (colors.length === 2) return `from-[${colors[0]}] to-[${colors[1]}]`;
  if (colors.length >= 3) return `from-[${colors[0]}] via-[${colors[1]}] to-[${colors[2]}]`;
  return '';
}

function GradientPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [colors, setColors] = useState<string[]>(() => {
    const parsed = parseGradientColors(value);
    return parsed.length >= 2 ? parsed : ['#1B2A6B', '#0f1a4a'];
  });

  const updateColor = (index: number, color: string) => {
    const next = [...colors];
    next[index] = color;
    setColors(next);
    onChange(buildGradient(next));
  };

  const addColor = () => {
    if (colors.length >= 3) return;
    const next = [...colors, '#ffffff'];
    setColors(next);
    onChange(buildGradient(next));
  };

  const removeColor = () => {
    if (colors.length <= 2) return;
    const next = colors.slice(0, -1);
    setColors(next);
    onChange(buildGradient(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {colors.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <input
              type="color"
              value={c}
              onChange={(e) => updateColor(i, e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
            />
            <span className="text-[10px] text-gray-500 uppercase">{c}</span>
          </div>
        ))}
        <div className="flex gap-1">
          {colors.length < 3 && (
            <button
              type="button"
              onClick={addColor}
              className="w-10 h-10 rounded-lg border border-dashed border-gray-400 flex items-center justify-center text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
              title="Agregar color"
            >
              +
            </button>
          )}
          {colors.length > 2 && (
            <button
              type="button"
              onClick={removeColor}
              className="w-10 h-10 rounded-lg border border-dashed border-gray-400 flex items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-500 transition-colors"
              title="Quitar color"
            >
              −
            </button>
          )}
        </div>
      </div>
      <div
        className="w-full h-12 rounded-lg border border-gray-200"
        style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }}
      />
      <p className="text-[10px] text-gray-400">
        Generado: <code className="bg-gray-100 px-1 rounded">{buildGradient(colors)}</code>
      </p>
    </div>
  );
}

export default function AdminSlidersPage() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
    api.get('/categories').then((res) => setCategories(res.data || [])).catch(() => {});
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
      imageUrl: slider.imageUrl || '',
      gradient: slider.gradient || '',
      useGradient: slider.useGradient !== false,
      animation: slider.animation || 'fade-up',
      buttonText: slider.buttonText || '',
      buttonType: slider.buttonType || 'URL',
      buttonUrl: slider.buttonUrl || '',
      buttonCategorySlug: slider.buttonCategorySlug || '',
      buttonProductId: slider.buttonProductId || '',
      sortOrder: slider.sortOrder,
      isActive: slider.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl || undefined,
        gradient: form.gradient || undefined,
        useGradient: form.useGradient,
        animation: form.animation,
        buttonText: form.buttonText || undefined,
        buttonType: form.buttonType,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };

      if (form.buttonType === 'URL') {
        payload.buttonUrl = form.buttonUrl || undefined;
      } else if (form.buttonType === 'CATEGORY') {
        payload.buttonCategorySlug = form.buttonCategorySlug || undefined;
      } else if (form.buttonType === 'PRODUCT') {
        payload.buttonProductId = form.buttonProductId || undefined;
      }

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

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/sliders/admin/seed');
      if (res.data.seeded) {
        toast.success(`Se crearon ${res.data.count} sliders por defecto`);
        fetchSliders();
      } else {
        toast.info(res.data.message || 'Ya existen sliders');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error restaurando sliders');
    } finally {
      setSeeding(false);
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
          <div className="text-center py-8 space-y-4">
            <p className="text-gray-500">No hay sliders.</p>
            <Button
              onClick={handleSeed}
              disabled={seeding}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Restaurar sliders por defecto
            </Button>
          </div>
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
                Imagen del slider
              </label>
              {form.imageUrl ? (
                <div className="relative mb-2">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <label className="absolute bottom-1 right-1 bg-black/60 text-white text-xs rounded px-2 py-1 cursor-pointer hover:bg-black/80">
                    Cambiar
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('La imagen no debe superar 5MB');
                          return;
                        }
                        setUploadingImage(true);
                        try {
                          const fd = new FormData();
                          fd.append('image', file);
                          const res = await api.post('/sliders/admin/upload', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          });
                          setForm({ ...form, imageUrl: res.data.url });
                          toast.success('Imagen subida');
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Error subiendo imagen');
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors">
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {uploadingImage ? 'Subiendo...' : 'Arrastra o haz click para subir'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('La imagen no debe superar 5MB');
                          return;
                        }
                        setUploadingImage(true);
                        try {
                          const fd = new FormData();
                          fd.append('image', file);
                          const res = await api.post('/sliders/admin/upload', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          });
                          setForm({ ...form, imageUrl: res.data.url });
                          toast.success('Imagen subida');
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Error subiendo imagen');
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Formato recomendado: <strong>1920 x 650 px</strong> (16:9), max 5MB. JPG o PNG.
                    La imagen se comprime automaticamente a WebP via Cloudinary.
                  </p>
                </>
              )}
            </div>
            {/* Gradiente con picker visual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Gradiente sobre imagen / fondo</label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useGradient}
                    onChange={(e) => setForm({ ...form, useGradient: e.target.checked })}
                  />
                  Activar gradiente
                </label>
              </div>

              {form.useGradient && (
                <GradientPicker
                  value={form.gradient}
                  onChange={(gradient) => setForm({ ...form, gradient })}
                />
              )}
            </div>

            {/* Animación */}
            <div>
              <label className="text-xs font-medium block mb-1.5">
                Animación de textos
              </label>
              <select
                value={form.animation}
                onChange={(e) => setForm({ ...form, animation: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="fade-up">Fade up (aparece desde abajo)</option>
                <option value="fade-left">Fade left (aparece desde derecha)</option>
                <option value="fade-right">Fade right (aparece desde izquierda)</option>
                <option value="zoom-in">Zoom in (aparece con zoom)</option>
                <option value="slide-up">Slide up (desliza hacia arriba)</option>
              </select>
            </div>

            {/* Botón del slide */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Texto del boton
                </label>
                <Input
                  value={form.buttonText}
                  onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                  placeholder="Ej: Ver oferta"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Tipo de link
                </label>
                <select
                  value={form.buttonType}
                  onChange={(e) => setForm({ ...form, buttonType: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="URL">URL libre</option>
                  <option value="CATEGORY">Categoría de productos</option>
                  <option value="PRODUCT">Producto específico</option>
                </select>
              </div>
            </div>

            {/* Campo condicional según tipo de link */}
            {form.buttonType === 'URL' && (
              <div>
                <label className="text-xs font-medium block mb-1.5">URL de destino</label>
                <Input
                  value={form.buttonUrl}
                  onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                  placeholder="/store o https://..."
                />
              </div>
            )}
            {form.buttonType === 'CATEGORY' && (
              <div>
                <label className="text-xs font-medium block mb-1.5">Categoría</label>
                <select
                  value={form.buttonCategorySlug}
                  onChange={(e) => setForm({ ...form, buttonCategorySlug: e.target.value })}
                  className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
            {form.buttonType === 'PRODUCT' && (
              <div>
                <label className="text-xs font-medium block mb-1.5">ID del producto</label>
                <Input
                  value={form.buttonProductId}
                  onChange={(e) => setForm({ ...form, buttonProductId: e.target.value })}
                  placeholder="ID del producto"
                />
              </div>
            )}
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
                disabled={saving || !form.title || (!form.imageUrl && !form.gradient)}
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
