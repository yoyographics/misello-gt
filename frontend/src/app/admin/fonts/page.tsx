'use client';

import { useState, useEffect, useCallback } from 'react';
import api, { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { Loader2, Upload, Trash2, Eye, EyeOff, Star } from 'lucide-react';

interface Font {
  id: string;
  name: string;
  fileName: string;
  originalName?: string;
  fileData?: string;
  strokeRatio?: number;
  minFontSizePt?: number;
  isDefault?: boolean;
  isActive: boolean;
}

function MinFontSizeEditor({ fontId, initialValue, onSave }: { fontId: string; initialValue: number; onSave: (id: string, val: number) => void }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(initialValue);
    setSaved(false);
  }, [initialValue]);

  const handleSave = () => {
    if (!isNaN(value) && value >= 6 && value <= 72) {
      onSave(fontId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={6}
        max={72}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-14 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
        title="Tamano minimo fabricable en pt"
      />
      <span className="text-xs text-gray-500 font-medium">pt</span>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saved}
        className={`text-xs h-7 px-3 rounded-full font-semibold transition-all duration-300 ${
          saved
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'
            : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg hover:scale-105'
        }`}
      >
        {saved ? '✓ Guardado' : 'Guardar'}
      </Button>
    </div>
  );
}

function FontPreviewGrid({ fonts }: { fonts: Font[] }) {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Inyectar @font-face por cada fuente que tenga fileData
    const injectedIds: string[] = [];

    fonts.forEach((font) => {
      if (!font.fileData || font.fileData.length < 100) {
        // font preview skipped (no fileData)
        return;
      }

      const styleId = `admin-font-style-${font.id}`;
      if (document.getElementById(styleId)) {
        // Ya inyectada
        setLoadedFonts((prev) => new Set(prev).add(font.id));
        return;
      }

      try {
        const isOtf = font.fileName?.toLowerCase().endsWith('.otf');
        const format = isOtf ? 'opentype' : 'truetype';
        const fontUrl = `${API_BASE_URL}/fonts/${font.id}/file`;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `@font-face { font-family: 'admin-font-${font.id}'; src: url('${fontUrl}') format('${format}'); }`;
        document.head.appendChild(style);
        injectedIds.push(font.id);

        // font face injected
        setLoadedFonts((prev) => new Set(prev).add(font.id));
      } catch (err: any) {
        // font face injection error
      }
    });

    // Cleanup: quitar estilos de fuentes que ya no están en la lista
    return () => {
      const currentIds = new Set(fonts.map((f) => f.id));
      const allStyles = document.querySelectorAll('[id^="admin-font-style-"]');
      allStyles.forEach((el) => {
        const fontId = el.id.replace('admin-font-style-', '');
        if (!currentIds.has(fontId)) {
          el.remove();
          setLoadedFonts((prev) => {
            const next = new Set(prev);
            next.delete(fontId);
            return next;
          });
        }
      });
    };
  }, [fonts]);

  if (fonts.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Vista previa de fuentes</h2>
        <p className="text-gray-500 text-center py-8">No hay fuentes para previsualizar.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Vista previa de fuentes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fonts.map((font) => {
          const hasData = !!font.fileData;
          const isLoaded = loadedFonts.has(font.id);
          return (
            <Card key={font.id} className="p-4 border-2 border-blue-100 rounded-xl">
              <div
                className="text-xl mb-2 min-h-[3rem] flex items-center justify-center bg-gray-50 rounded-lg px-2"
                style={hasData && isLoaded ? { fontFamily: `"admin-font-${font.id}"` } : {}}
                title={font.name}
              >
                {hasData ? (isLoaded ? 'Lorem ipsum' : <span className="text-sm text-gray-400">Cargando...</span>) : <span className="text-sm text-gray-400">Sin datos de preview</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{font.name}</span>
                <Badge className={font.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {font.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

export default function AdminFontsPage() {
  const [fonts, setFonts] = useState<Font[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { confirm, DialogComponent } = useConfirmDialog();

  const fetchFonts = useCallback(() => {
    setLoading(true);
    api.get('/fonts/admin/all')
      .then((res) => setFonts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    // Convert file to base64
    const toBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:font/ttf;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

    try {
      const fileBase64 = await toBase64(file);
      console.log('[Upload Debug] File converted to base64, length:', fileBase64.length);

      const payload = {
        fileBase64,
        originalName: file.name,
      };

      console.log('[Upload Debug] Sending POST /fonts/admin/base64');
      await api.post('/fonts/admin/base64', payload);
      setFile(null);
      fetchFonts();
    } catch (err: any) {
      console.error('Upload failed');
      await confirm({
        title: 'Error subiendo fuente',
        description: 'Status: ' + (err.response?.status || 'unknown') + '\nMensaje: ' + (err.response?.data?.message || err.message),
        confirmText: 'Aceptar',
        cancelText: '',
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/fonts/admin/${id}`, { isActive: !isActive });
      fetchFonts();
    } catch (err) {
      await confirm({
        title: 'Error actualizando fuente',
        confirmText: 'Aceptar',
        cancelText: '',
      });
    }
  };

  const updateMinFontSize = async (id: string, minFontSizePt: number) => {
    try {
      await api.patch(`/fonts/admin/${id}`, { minFontSizePt });
      fetchFonts();
    } catch (err) {
      await confirm({
        title: 'Error actualizando tamaño mínimo',
        confirmText: 'Aceptar',
        cancelText: '',
      });
    }
  };

  const setDefaultFont = async (id: string) => {
    try {
      await api.post(`/fonts/admin/${id}/set-default`);
      fetchFonts();
    } catch (err: any) {
      await confirm({
        title: err.response?.data?.message || 'Error estableciendo fuente predeterminada',
        confirmText: 'Aceptar',
        cancelText: '',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar esta fuente permanentemente?',
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/fonts/admin/${id}`);
      fetchFonts();
    } catch (err: any) {
      await confirm({
        title: err.response?.data?.message || 'Error eliminando fuente',
        confirmText: 'Aceptar',
        cancelText: '',
      });
    }
  };

  return (
    <div className="space-y-6">
      <DialogComponent />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Tipografias</h1>
      </div>

      {/* Upload */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Subir nueva fuente</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-1 block">Archivo .ttf o .otf</label>
            <Input type="file" accept=".ttf,.otf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleUpload} disabled={!file || uploading} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Subir
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">El nombre de la tipografia se detecta automaticamente desde los metadatos del archivo.</p>
      </Card>

      {/* Preview de fuentes */}
      <FontPreviewGrid fonts={fonts} />

      {/* List */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Fuentes subidas</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : fonts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay fuentes subidas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Archivo original</th>
                  <th className="text-left py-2">Tamano minimo</th>
                  <th className="text-left py-2">Predeterminada</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fonts.map((font) => (
                  <tr key={font.id} className="border-b">
                    <td className="py-2 font-medium">{font.name}</td>
                    <td className="py-2 text-gray-500">{font.originalName || font.fileName}</td>
                    <td className="py-2">
                      <MinFontSizeEditor
                        fontId={font.id}
                        initialValue={font.minFontSizePt ?? 10}
                        onSave={updateMinFontSize}
                      />
                    </td>
                    <td className="py-2">
                      {font.isDefault ? (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Star className="h-3 w-3 mr-1 fill-yellow-600" /> Predeterminada
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-500 hover:text-yellow-600"
                          onClick={() => setDefaultFont(font.id)}
                        >
                          <Star className="h-3 w-3 mr-1" /> Predeterminar
                        </Button>
                      )}
                    </td>
                    <td className="py-2">
                      <Badge className={font.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {font.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(font.id, font.isActive)} title={font.isActive ? 'Desactivar' : 'Activar'}>
                          {font.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(font.id)} title="Eliminar" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
