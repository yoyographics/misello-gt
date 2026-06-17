'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Plus, X, Eye } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface EditableArea {
  id: string;
  label: string;
  defaultText: string;
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: string;
  maxLength?: number;
}

interface Template {
  id: string;
  name: string;
  categoryId: string;
  productShape?: string;
  widthMm?: number;
  heightMm?: number;
  editableAreas?: EditableArea[];
  thumbnailUrl?: string;
  isActive: boolean;
  sortOrder: number;
  category?: Category;
}

const SHAPES = ['RECTANGULAR', 'CIRCULAR', 'OVAL', 'SQUARE'];

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [svgPreview, setSvgPreview] = useState('');
  const [editableAreas, setEditableAreas] = useState<EditableArea[]>([]);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    productShape: '',
    widthMm: '',
    heightMm: '',
    isActive: true,
    sortOrder: '0',
  });
  const [file, setFile] = useState<File | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/templates/admin/all'), api.get('/categories')])
      .then(([tRes, cRes]) => {
        setTemplates(tRes.data || []);
        setCategories(cRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({
      name: '',
      categoryId: '',
      productShape: '',
      widthMm: '',
      heightMm: '',
      isActive: true,
      sortOrder: '0',
    });
    setFile(null);
    setSvgPreview('');
    setEditableAreas([]);
    setEditing(null);
  };

  const extractEditableAreas = (svgContent: string): EditableArea[] => {
    const areas: EditableArea[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const texts = doc.querySelectorAll('text[data-editable="true"]');
    texts.forEach((el, idx) => {
      const field = el.getAttribute('data-field') || `field${idx + 1}`;
      const label = el.getAttribute('data-label') || `Texto ${idx + 1}`;
      const maxLength = el.getAttribute('data-maxlength');
      areas.push({
        id: field,
        label,
        defaultText: el.textContent || '',
        x: parseFloat(el.getAttribute('x') || '0') || undefined,
        y: parseFloat(el.getAttribute('y') || '0') || undefined,
        fontSize: parseFloat(el.getAttribute('font-size') || '0') || undefined,
        fontFamily: el.getAttribute('font-family') || undefined,
        maxLength: maxLength ? parseInt(maxLength) : undefined,
      });
    });
    return areas;
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setSvgPreview(content);
      setEditableAreas(extractEditableAreas(content));
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.categoryId) {
      alert('Nombre y categoría son obligatorios');
      return;
    }
    if (!editing && !file) {
      alert('El archivo SVG es obligatorio');
      return;
    }

    setSaving(true);
    const data = new FormData();
    data.append('name', form.name);
    data.append('categoryId', form.categoryId);
    if (form.productShape) data.append('productShape', form.productShape);
    if (form.widthMm) data.append('widthMm', form.widthMm);
    if (form.heightMm) data.append('heightMm', form.heightMm);
    data.append('isActive', String(form.isActive));
    data.append('sortOrder', form.sortOrder);
    data.append('editableAreas', JSON.stringify(editableAreas));
    if (file) data.append('file', file);

    try {
      if (editing) {
        await api.patch(`/templates/admin/${editing.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/templates/admin', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error guardando plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      categoryId: t.categoryId,
      productShape: t.productShape || '',
      widthMm: t.widthMm?.toString() || '',
      heightMm: t.heightMm?.toString() || '',
      isActive: t.isActive,
      sortOrder: t.sortOrder.toString(),
    });
    setEditableAreas(t.editableAreas || []);
    setSvgPreview('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await api.delete(`/templates/admin/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error eliminando plantilla');
    }
  };

  const updateArea = (index: number, updates: Partial<EditableArea>) => {
    setEditableAreas((prev) =>
      prev.map((area, i) => (i === index ? { ...area, ...updates } : area))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Plantillas de diseño</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-[#1B2A6B] hover:bg-[#141f4d] text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Nueva plantilla
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                {editing ? 'Editar plantilla' : 'Nueva plantilla'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Plantilla abogado 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Forma</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={form.productShape}
                  onChange={(e) => setForm({ ...form, productShape: e.target.value })}
                >
                  <option value="">Cualquiera</option>
                  {SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Ancho (mm)</label>
                  <Input
                    type="number"
                    value={form.widthMm}
                    onChange={(e) => setForm({ ...form, widthMm: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alto (mm)</label>
                  <Input
                    type="number"
                    value={form.heightMm}
                    onChange={(e) => setForm({ ...form, heightMm: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Archivo SVG</label>
              <Input
                type="file"
                accept=".svg"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Marca los textos editables con data-editable=&quot;true&quot; data-field=&quot;line1&quot; data-label=&quot;Nombre&quot;
              </p>
            </div>

            {svgPreview && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <label className="text-sm font-medium block mb-2">Vista previa SVG</label>
                <div
                  className="max-h-64 overflow-auto bg-white border rounded"
                  dangerouslySetInnerHTML={{ __html: svgPreview }}
                />
              </div>
            )}

            {editableAreas.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Campos editables detectados</label>
                <div className="space-y-2">
                  {editableAreas.map((area, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="ID"
                        value={area.id}
                        onChange={(e) => updateArea(idx, { id: e.target.value })}
                      />
                      <Input
                        placeholder="Label visible"
                        value={area.label}
                        onChange={(e) => updateArea(idx, { label: e.target.value })}
                      />
                      <Input
                        placeholder="Texto por defecto"
                        value={area.defaultText}
                        onChange={(e) => updateArea(idx, { defaultText: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Activa
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Orden:</span>
                <Input
                  type="number"
                  className="w-20"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#1B2A6B] hover:bg-[#141f4d] text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={t.name} className="max-h-full" />
                ) : (
                  <Eye className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <h3 className="font-semibold truncate">{t.name}</h3>
              <p className="text-sm text-gray-500">{t.category?.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {t.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
                {t.productShape && <Badge variant="outline">{t.productShape}</Badge>}
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
