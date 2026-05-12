'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Trash2, Type } from 'lucide-react';

interface Font {
  id: string;
  name: string;
  fileName: string;
  isActive: boolean;
  uploadedAt: string;
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
      await api.post('/fonts/admin', formData);
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
            <Input
              value={fontName}
              onChange={(e) => setFontName(e.target.value)}
              placeholder="Ej: Gabriola"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-1 block">Archivo .ttf o .otf</label>
            <Input
              type="file"
              accept=".ttf,.otf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Subir
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Si no pones nombre, se usara el nombre del archivo automaticamente.
        </p>
      </Card>

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
                  <th className="text-left py-2">Archivo</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fonts.map((font) => (
                  <tr key={font.id} className="border-b">
                    <td className="py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-gray-400" />
                        {font.name}
                      </div>
                    </td>
                    <td className="py-2 text-gray-500">{font.fileName}</td>
                    <td className="py-2">
                      <Badge
                        className={font.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                      >
                        {font.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(font.id, font.isActive)}
                      >
                        {font.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
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
