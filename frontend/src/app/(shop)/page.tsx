'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stamp, Palette, Truck, ShieldCheck, Clock, Award } from 'lucide-react';
import { handleGoogleCallback } from '@/lib/auth-utils';

export default function Home() {
  useEffect(() => {
    handleGoogleCallback();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1B2A6B] via-[#1B2A6B] to-[#0f1a4a] text-white py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Sellos personalizados
            <span className="block bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              sin salir de casa
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Disena tu sello en minutos, paga en linea y recibelo en 3-4 dias habiles en cualquier departamento de Guatemala.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/design">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg px-8">Crear mi sello</Button>
            </Link>
            <Link href="/store">
              <Button size="lg" variant="outline" className="border-white text-white bg-transparent hover:bg-white/20 text-lg px-8">Ver catalogo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center border-0 shadow-lg">
              <Palette className="h-10 w-10 mx-auto mb-4 text-orange-500" />
              <h3 className="text-lg font-semibold mb-2">Diseno facil</h3>
              <p className="text-gray-600 text-sm">Solo ingresa tu texto, elige modelo y color. Nosotros nos encargamos del resto.</p>
            </Card>
            <Card className="p-6 text-center border-0 shadow-lg">
              <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-pink-500" />
              <h3 className="text-lg font-semibold mb-2">Calidad garantizada</h3>
              <p className="text-gray-600 text-sm">14 anos de experiencia fabricando sellos de hule con tecnologia laser de precision.</p>
            </Card>
            <Card className="p-6 text-center border-0 shadow-lg">
              <Truck className="h-10 w-10 mx-auto mb-4 text-[#1B2A6B]" />
              <h3 className="text-lg font-semibold mb-2">Envio nacional</h3>
              <p className="text-gray-600 text-sm">Entrega en 3-4 dias habiles a cualquier departamento de Guatemala.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#1B2A6B]">Tipos de sellos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Automaticos', icon: <Stamp className="h-6 w-6" /> },
              { name: 'Fechadores', icon: <Clock className="h-6 w-6" /> },
              { name: 'Portatiles', icon: <Award className="h-6 w-6" /> },
              { name: 'Embosadoras', icon: <ShieldCheck className="h-6 w-6" /> },
            ].map((cat) => (
              <Link key={cat.name} href={`/store?category=${cat.name}`}>
                <Card className="p-6 text-center hover:shadow-xl transition cursor-pointer border-0">
                  <div className="text-orange-500 mx-auto mb-3">{cat.icon}</div>
                  <h3 className="font-medium">{cat.name}</h3>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1B2A6B] text-white text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">¿Listo para crear tu sello?</h2>
          <p className="text-gray-300 mb-8">En solo 4 pasos tendras tu sello disenado y listo para ordenar.</p>
          <Link href="/design">
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg px-8">Empezar ahora</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
