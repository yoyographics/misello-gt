'use client';

import {
  AutomaticStampIcon,
  PocketStampIcon,
  DaterStampIcon,
  WoodStampIcon,
  InkPadIcon,
  InkBottleIcon,
  EmbosserIcon,
  LawyerStampIcon,
  ColegiadoStampIcon,
  CustomStampIcon,
} from '@/components/category-icons';

const ICONS = [
  { name: 'Sellos Automáticos', slug: 'sello-automatico', Icon: AutomaticStampIcon, color: 'bg-blue-100 text-[#1B2A6B]' },
  { name: 'Sellos Portátiles', slug: 'sello-portatil', Icon: PocketStampIcon, color: 'bg-orange-100 text-orange-600' },
  { name: 'Fechadores', slug: 'sello-fechador', Icon: DaterStampIcon, color: 'bg-pink-100 text-pink-600' },
  { name: 'Sellos de Madera', slug: 'sello-madera', Icon: WoodStampIcon, color: 'bg-amber-100 text-amber-700' },
  { name: 'Almohadillas', slug: 'almohadillas', Icon: InkPadIcon, color: 'bg-cyan-100 text-cyan-600' },
  { name: 'Tintas', slug: 'tintas', Icon: InkBottleIcon, color: 'bg-sky-100 text-sky-600' },
  { name: 'Embosadoras', slug: 'embosadora', Icon: EmbosserIcon, color: 'bg-indigo-100 text-indigo-600' },
  { name: 'Sellos para Abogados', slug: 'sellos-para-abogados', Icon: LawyerStampIcon, color: 'bg-emerald-100 text-emerald-600' },
  { name: 'Sellos de Colegiado', slug: 'sellos-colegiado', Icon: ColegiadoStampIcon, color: 'bg-teal-100 text-teal-600' },
  { name: 'Sellos Personalizados', slug: 'sellos-personalizados', Icon: CustomStampIcon, color: 'bg-purple-100 text-purple-600' },
];

export default function IconPreviewPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4 text-[#1B2A6B]">
          Preview de iconos de categorías
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Estos son los iconos disponibles. Indicá cuáles querés aplicar en la home.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {ICONS.map(({ name, slug, Icon, color }) => (
            <div
              key={slug}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`h-32 rounded-lg ${color} flex items-center justify-center mb-3`}
              >
                <Icon className="h-14 w-14" />
              </div>
              <h3 className="font-semibold text-center text-sm">{name}</h3>
              <p className="text-xs text-center text-gray-400 mt-1">{slug}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
