'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Settings, Users, FileText, DollarSign } from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'terms' | 'replica'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [replicaPrice, setReplicaPrice] = useState('');
  const [termsHtml, setTermsHtml] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ADMIN' });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get('/admin/users')
      .then((res) => setUsers(res.data || []))
      .catch((err) => console.error('Error cargando usuarios:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  const createUser = async () => {
    try {
      await api.post('/admin/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'ADMIN' });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creando usuario');
    }
  };

  const saveReplicaPrice = async () => {
    try {
      await api.post('/admin/settings/replica-price', { price: Number(replicaPrice) });
      alert('Precio de replica actualizado');
    } catch (err) {
      alert('Error guardando precio');
    }
  };

  const saveTerms = async () => {
    try {
      await api.post('/admin/settings/terms-and-conditions', { html: termsHtml });
      alert('Terminos y condiciones actualizados');
    } catch (err) {
      alert('Error guardando terminos');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B2A6B]">Configuracion</h1>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('users')}
        >
          <Users className="h-4 w-4 mr-1" /> Usuarios
        </Button>
        <Button
          variant={activeTab === 'terms' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('terms')}
        >
          <FileText className="h-4 w-4 mr-1" /> Terminos
        </Button>
        <Button
          variant={activeTab === 'replica' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('replica')}
        >
          <DollarSign className="h-4 w-4 mr-1" /> Replica
        </Button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Crear usuario admin</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Nombre"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <Input
                placeholder="Contraseña"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="ADMIN">Administrador</option>
                <option value="CONTABILIDAD">Contabilidad</option>
                <option value="IT">IT</option>
                <option value="RECEPCION">Recepcion</option>
                <option value="DISENO">Diseño</option>
                <option value="PRODUCCION">Produccion</option>
              </select>
            </div>
            <Button onClick={createUser} className="mt-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              Crear usuario
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">Usuarios del panel</h2>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : users.length === 0 ? (
              <p className="text-gray-500">No hay usuarios.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Nombre</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="py-2">{u.name}</td>
                        <td className="py-2">{u.email}</td>
                        <td className="py-2">{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'terms' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Terminos y condiciones</h2>
          <textarea
            className="w-full h-64 border rounded-md p-3 text-sm font-mono"
            value={termsHtml}
            onChange={(e) => setTermsHtml(e.target.value)}
            placeholder="<p>Escribe los terminos y condiciones en HTML...</p>"
          />
          <Button onClick={saveTerms} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            Guardar
          </Button>
        </Card>
      )}

      {activeTab === 'replica' && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Precio de replica</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-gray-600">Precio (Q)</label>
              <Input
                type="number"
                value={replicaPrice}
                onChange={(e) => setReplicaPrice(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <Button onClick={saveReplicaPrice} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              Guardar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
