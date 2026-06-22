'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [selectedTextType, setSelectedTextType] = useState<'text' | 'circular'>('text');
  const [selectedTextForm, setSelectedTextForm] = useState({
    id: '',
    label: '',
    defaultText: '',
    maxLength: '',
    radius: '',
    centerX: '',
    centerY: '',
    startAngle: '',
    baseline: 'top' as 'top' | 'bottom',
    fontSize: '',
    fontFamily: '',
  });

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

  function getCircleCenter(doc: Document): { x: number; y: number; radius: number } | null {
    const circles = Array.from(doc.querySelectorAll('circle'));
    if (circles.length > 0) {
      let best = circles[0];
      let bestR = parseFloat(best.getAttribute('r') || '0');
      circles.forEach((c) => {
        const r = parseFloat(c.getAttribute('r') || '0');
        if (r > bestR) {
          best = c;
          bestR = r;
        }
      });
      return {
        x: parseFloat(best.getAttribute('cx') || '0'),
        y: parseFloat(best.getAttribute('cy') || '0'),
        radius: bestR,
      };
    }
    return null;
  }

  function getPathApproxCenter(pathEl: SVGPathElement): { x: number; y: number } {
    try {
      const len = pathEl.getTotalLength();
      const p = pathEl.getPointAtLength(len / 2);
      return { x: p.x, y: p.y };
    } catch {
      return { x: 0, y: 0 };
    }
  }

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

  useEffect(() => {
    if (!previewRef.current || !svgPreview) return;
    const container = previewRef.current;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textEl = target.closest('text');
      if (!textEl) return;
      const indexAttr = textEl.getAttribute('data-misello-index');
      if (indexAttr === null) return;
      const index = parseInt(indexAttr, 10);
      if (isNaN(index)) return;

      const hasTextPath = !!textEl.querySelector('textPath');
      const fontSize = textEl.getAttribute('font-size') || '';
      const fontFamily = textEl.getAttribute('font-family') || '';
      const defaultText = textEl.textContent || '';

      let type: 'text' | 'circular' = 'text';
      let radius = '';
      let centerX = '';
      let centerY = '';
      let startAngle = '';
      let baseline: 'top' | 'bottom' = 'top';

      if (hasTextPath) {
        type = 'circular';
        const doc = new DOMParser().parseFromString(svgPreview, 'image/svg+xml');
        const circle = getCircleCenter(doc);
        const tp = textEl.querySelector('textPath');
        const href = tp?.getAttribute('xlink:href') || tp?.getAttribute('href') || '';
        const pathEl = doc.querySelector(href) as SVGPathElement | null;
        if (circle && pathEl) {
          const bbox = getPathApproxCenter(pathEl);
          centerX = String(circle.x);
          centerY = String(circle.y);
          radius = String(Math.sqrt((bbox.x - circle.x) ** 2 + (bbox.y - circle.y) ** 2));
          baseline = bbox.y < circle.y ? 'top' : 'bottom';
          startAngle = baseline === 'top' ? '-90' : '90';
        }
      }

      setSelectedTextIndex(index);
      setSelectedTextType(type);
      setSelectedTextForm({
        id: `field${editableAreas.length + 1}`,
        label: hasTextPath ? 'Texto circular' : 'Texto editable',
        defaultText,
        maxLength: '',
        radius,
        centerX,
        centerY,
        startAngle,
        baseline,
        fontSize,
        fontFamily,
      });
      e.preventDefault();
      e.stopPropagation();
    };

    container.querySelectorAll('text').forEach((el) => {
      el.style.cursor = 'pointer';
    });
    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [svgPreview, editableAreas.length]);

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

  const indexSvgTexts = (svgContent: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      doc.querySelectorAll('text').forEach((el, i) => {
        el.setAttribute('data-misello-index', String(i));
      });
      return new XMLSerializer().serializeToString(doc.documentElement);
    } catch {
      return svgContent;
    }
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const indexed = indexSvgTexts(content);
      setSvgPreview(indexed);
      setEditableAreas(extractEditableAreas(indexed));
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
    if (file) {
      data.append('file', file);
    } else if (editing && svgPreview) {
      const svgFile = new File([svgPreview], 'template.svg', { type: 'image/svg+xml' });
      data.append('file', svgFile);
    }

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
        ? indexSvgTexts(t.svgContent)
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

  const addAreaFromSelection = () => {
    if (selectedTextIndex === null) return;
    const { id, label, defaultText, maxLength, radius, centerX, centerY, startAngle, baseline, fontSize, fontFamily } = selectedTextForm;
    if (!id.trim() || !label.trim()) {
      setFormError('ID y etiqueta son obligatorios');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgPreview, 'image/svg+xml');
    const textEls = Array.from(doc.querySelectorAll('text'));
    const textEl = textEls[selectedTextIndex];
    if (!textEl) return;

    textEl.setAttribute('data-editable', 'true');
    textEl.setAttribute('data-field', id.trim());
    textEl.setAttribute('data-label', label.trim());
    if (maxLength) textEl.setAttribute('data-maxlength', maxLength);

    const newArea: EditableArea = {
      id: id.trim(),
      label: label.trim(),
      defaultText: defaultText || textEl.textContent || '',
      maxLength: maxLength ? parseInt(maxLength, 10) : undefined,
      fontSize: fontSize ? parseFloat(fontSize) : undefined,
      fontFamily: fontFamily || undefined,
    };

    if (selectedTextType === 'circular') {
      (newArea as any).type = 'circular';
      (newArea as any).radius = radius ? parseFloat(radius) : undefined;
      (newArea as any).centerX = centerX ? parseFloat(centerX) : undefined;
      (newArea as any).centerY = centerY ? parseFloat(centerY) : undefined;
      (newArea as any).startAngle = startAngle ? parseFloat(startAngle) : undefined;
      (newArea as any).baseline = baseline;
    } else {
      const xAttr = textEl.getAttribute('x');
      const yAttr = textEl.getAttribute('y');
      if (xAttr) newArea.x = parseFloat(xAttr);
      if (yAttr) newArea.y = parseFloat(yAttr);
    }

    setSvgPreview(new XMLSerializer().serializeToString(doc.documentElement));
    setEditableAreas((prev) => [...prev.filter((a) => a.id !== newArea.id), newArea]);
    setSelectedTextIndex(null);
    setFormError('');
  };

  const cancelSelection = () => {
    setSelectedTextIndex(null);
    setFormError('');
  };

  const removeArea = (areaId: string) => {
    setEditableAreas((prev) => prev.filter((a) => a.id !== areaId));
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgPreview, 'image/svg+xml');
      const textEl = doc.querySelector(`text[data-field="${areaId}"]`);
      if (textEl) {
        textEl.removeAttribute('data-editable');
        textEl.removeAttribute('data-field');
        textEl.removeAttribute('data-label');
        textEl.removeAttribute('data-maxlength');
        setSvgPreview(new XMLSerializer().serializeToString(doc.documentElement));
      }
    } catch {}
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
                <label className="text-sm font-medium block mb-2">
                  Vista previa SVG — hacé clic en un texto para marcarlo editable
                </label>
                <div
                  ref={previewRef}
                  className="max-h-64 overflow-auto bg-white border rounded"
                  dangerouslySetInnerHTML={{ __html: svgPreview }}
                />
              </div>
            )}

            {selectedTextIndex !== null && (
              <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Marcar texto editable</h4>
                  <button
                    onClick={cancelSelection}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="ID del campo"
                    value={selectedTextForm.id}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, id: e.target.value })}
                  />
                  <Input
                    placeholder="Etiqueta visible"
                    value={selectedTextForm.label}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, label: e.target.value })}
                  />
                </div>

                <Input
                  placeholder="Texto por defecto"
                  value={selectedTextForm.defaultText}
                  onChange={(e) => setSelectedTextForm({ ...selectedTextForm, defaultText: e.target.value })}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Tamaño fuente"
                    value={selectedTextForm.fontSize}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, fontSize: e.target.value })}
                  />
                  <Input
                    placeholder="Fuente"
                    value={selectedTextForm.fontFamily}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, fontFamily: e.target.value })}
                  />
                  <Input
                    placeholder="Max caracteres"
                    value={selectedTextForm.maxLength}
                    onChange={(e) => setSelectedTextForm({ ...selectedTextForm, maxLength: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="areaType"
                      checked={selectedTextType === 'text'}
                      onChange={() => setSelectedTextType('text')}
                    />
                    Texto normal
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="areaType"
                      checked={selectedTextType === 'circular'}
                      onChange={() => setSelectedTextType('circular')}
                    />
                    Texto circular
                  </label>
                </div>

                {selectedTextType === 'circular' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Radio"
                      value={selectedTextForm.radius}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, radius: e.target.value })}
                    />
                    <Input
                      placeholder="Centro X"
                      value={selectedTextForm.centerX}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, centerX: e.target.value })}
                    />
                    <Input
                      placeholder="Centro Y"
                      value={selectedTextForm.centerY}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, centerY: e.target.value })}
                    />
                    <Input
                      placeholder="Ángulo inicial"
                      value={selectedTextForm.startAngle}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, startAngle: e.target.value })}
                    />
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={selectedTextForm.baseline}
                      onChange={(e) => setSelectedTextForm({ ...selectedTextForm, baseline: e.target.value as 'top' | 'bottom' })}
                    >
                      <option value="top">Arriba</option>
                      <option value="bottom">Abajo</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelSelection}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="bg-[#1B2A6B] hover:bg-[#141f4d] text-white" onClick={addAreaFromSelection}>
                    Agregar campo
                  </Button>
                </div>
              </div>
            )}

            {editableAreas.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Campos editables detectados</label>
                <div className="space-y-2">
                  {editableAreas.map((area, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
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
                      <Button variant="ghost" size="sm" onClick={() => removeArea(area.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
