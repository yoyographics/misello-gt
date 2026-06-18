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

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  shape: string;
  widthMm: number;
  heightMm: number;
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

interface TemplateProduct {
  productId: string;
  product?: Product;
}

interface Template {
  id: string;
  name: string;
  categoryId: string;
  svgContent?: string;
  editableAreas?: EditableArea[] | null;
  thumbnailUrl?: string;
  isActive: boolean;
  sortOrder: number;
  category?: Category;
  products?: TemplateProduct[];
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [svgPreview, setSvgPreview] = useState('');
  const [editableAreas, setEditableAreas] = useState<EditableArea[]>([]);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    isActive: true,
    sortOrder: '0',
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/templates/admin/all'),
      api.get('/categories'),
      api.get('/products?take=9999'),
    ])
      .then(([tRes, cRes, pRes]) => {
        setTemplates(tRes.data || []);
        setCategories(cRes.data || []);
        const productList = pRes.data?.items || pRes.data || [];
        setProducts(Array.isArray(productList) ? productList : []);
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
      isActive: true,
      sortOrder: '0',
    });
    setSelectedProductIds([]);
    setFile(null);
    setSvgPreview('');
    setEditableAreas([]);
    setEditing(null);
    setFormError('');
  };

  const normalizeAreas = (areas: unknown): EditableArea[] => {
    if (Array.isArray(areas)) return areas as EditableArea[];
    if (typeof areas === 'string') {
      try {
        const parsed = JSON.parse(areas);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const extractEditableAreas = (svgContent: string): EditableArea[] => {
    try {
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
    } catch {
      return [];
    }
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
    setFormError('');
    if (!form.name || !form.categoryId) {
      setFormError('Nombre y categoría son obligatorios');
      return;
    }
    if (!editing && !file) {
      setFormError('El archivo SVG es obligatorio');
      return;
    }
    if (selectedProductIds.length === 0) {
      setFormError('Seleccioná al menos un modelo de sello');
      return;
    }

    setSaving(true);
    const data = new FormData();
    data.append('name', form.name);
    data.append('categoryId', form.categoryId);
    data.append('isActive', String(form.isActive));
    data.append('sortOrder', form.sortOrder);
    data.append('editableAreas', JSON.stringify(editableAreas));
    selectedProductIds.forEach((id) => data.append('productIds', id));
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
      setFormError(err.response?.data?.message || 'Error guardando plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      categoryId: t.categoryId,
      isActive: t.isActive,
      sortOrder: t.sortOrder.toString(),
    });
    setEditableAreas(normalizeAreas(t.editableAreas));
    setSelectedProductIds((t.products || []).map((p) => p.productId));
    setSvgPreview(
      typeof t.svgContent === 'string' && t.svgContent.trim().startsWith('<svg')
        ? t.svgContent
        : ''
    );
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

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const filteredProducts = form.categoryId
    ? products.filter((p) => p.categoryId === form.categoryId)
    : products;

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

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

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
                  onChange={(e) => {
                    setForm({ ...form, categoryId: e.target.value });
                    setSelectedProductIds([]);
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Modelos de sello asignados
              </label>
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No hay modelos en esta categoría.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {filteredProducts.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          {p.widthMm}mm × {p.heightMm}mm · {p.shape}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
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
                {t.svgContent ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: t.svgContent }}
                  />
                ) : (
                  <Eye className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <h3 className="font-semibold truncate">{t.name}</h3>
              <p className="text-sm text-gray-500">{t.category?.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(t.products || []).length} modelo(s) asignado(s)
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {t.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
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
