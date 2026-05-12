'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Trash2, Eye, EyeOff } from 'lucide-react';

interface Font {
  id: string;
  name: string;
  fileName: string;
  originalName?: string;
  fileData?: string;
  isActive: boolean;
}

function FontPreviewGrid({ fonts }: { fonts: Font[] }) {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fonts.forEach(async (font) => {
      if (!font.fileData || font.fileData.length < 100) {
        console.warn(`Fuente ${font.name} sin fileData válido`);
        return;
      }
      try {
        const isOtf = font.fileName?.toLowerCase().endsWith('.otf');
        const mime = isOtf ? 'font/otf' : 'font/ttf';
        const byteCharacters = atob(font.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const fontFace = new FontFace(
          `admin-font-${font.id}`,
          `url("${blobUrl}") format("${isOtf ? 'opentype' : 'truetype'}")`
        );
        await fontFace.load();
        document.fonts.add(fontFace);
        setLoadedFonts((prev) => new Set(prev).add(font.id));
      } catch (err) {
        console.error(`Error cargando fuente ${font.name}:`, err);
      }
    });
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
  const [fontName, setFontName] = useState('');

  const fetchFonts = useCallback(() => {
    setLoading(true);
    api.get('/fonts/admin/all')
      .then((res) => setFonts(res.data || []))
      .catch((err) => console.error('Error cargando fuentes:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (fontName.trim()) {
      formData.append('name', fontName.trim());
    }
    try {
      const token = localStorage.getItem('adminToken');
      await api.post('/fonts/admin', formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setFile(null);
      setFontName('');
      fetchFonts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error subiendo fuente');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/fonts/admin/${id}`, { isActive: !isActive });
      fetchFonts();
    } catch (err) {
      alert('Error actualizando fuente');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta fuente permanentemente?')) return;
    try {
      await api.delete(`/fonts/admin/${id}`);
      fetchFonts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error eliminando fuente');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Tipografias</h1>
      </div>

      {/* Upload */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Subir nueva fuente</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-1 block">Nombre (opcional)</label>
            <Input value={fontName} onChange={(e) => setFontName(e.target.value)} placeholder="Ej: Gabriola" />
          </div>
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-1 block">Archivo .ttf o .otf</label>
            <Input type="file" accept=".ttf,.otf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleUpload} disabled={!file || uploading} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Subir
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Si no pones nombre, se usara el nombre del archivo automaticamente.</p>
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
