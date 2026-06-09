'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import AOS from 'aos';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Stamp,
  Calendar,
  Award,
  ShieldCheck,
  Truck,
  Package,
  Image as ImageIcon,
  ShoppingCart,
  Building2,
  HeartPulse,
  Scale,
  PenTool,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'aos/dist/aos.css';

interface Product {
  id: string;
  name: string;
  basePrice: number;
  imageUrl?: string;
  category?: {
    id: string;
    slug: string;
    name: string;
  };
}

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http')
    ? url
    : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

interface HeroButton {
  label: string;
  href: string;
  variant: 'primary' | 'outline';
}

interface HeroSlide {
  title: string;
  subtitle: string;
  gradient: string;
  animation: 'fade-up' | 'fade-left' | 'fade-right' | 'zoom-in' | 'slide-up';
  buttons: HeroButton[];
}

const heroSlides: HeroSlide[] = [
  {
    title: 'Sellos personalizados sin salir de casa',
    subtitle:
      'Diseña tu sello en minutos y recíbelo en cualquier departamento de Guatemala.',
    gradient: 'from-[#1B2A6B] to-[#0f1a4a]',
    animation: 'fade-up',
    buttons: [
      { label: 'Crear mi sello', href: '/design/', variant: 'primary' },
      { label: 'Ver catálogo', href: '/store/', variant: 'outline' },
    ],
  },
  {
    title: 'Calidad profesional garantizada',
    subtitle: 'Fabricados con tecnología láser de alta precisión.',
    gradient: 'from-[#1B2A6B] to-[#16245c]',
    animation: 'fade-left',
    buttons: [
      { label: 'Ver sellos automáticos', href: '/store/', variant: 'primary' },
    ],
  },
  {
    title: 'Fabricación rápida',
    subtitle: 'Producción y envío en tiempo récord.',
    gradient: 'from-[#1B2A6B] to-[#243885]',
    animation: 'fade-right',
    buttons: [
      { label: 'Ver catálogo', href: '/store/', variant: 'outline' },
    ],
  },
  {
    title: 'Envíos a toda Guatemala',
    subtitle: 'Recibe tu pedido en 3 a 4 días hábiles.',
    gradient: 'from-[#1B2A6B] to-[#122052]',
    animation: 'zoom-in',
    buttons: [
      { label: 'Hacer pedido', href: '/design/', variant: 'primary' },
    ],
  },
];

// Mapeo de animaciones configurables a atributos AOS
const aosAnimations: Record<HeroSlide['animation'], { title: string; subtitle: string }> = {
  'fade-up': { title: 'fade-up', subtitle: 'fade-up' },
  'fade-left': { title: 'fade-right', subtitle: 'fade-right' },
  'fade-right': { title: 'fade-left', subtitle: 'fade-left' },
  'zoom-in': { title: 'zoom-in', subtitle: 'zoom-in' },
  'slide-up': { title: 'slide-up', subtitle: 'slide-up' },
};

const categories = [
  {
    name: 'Sellos automáticos',
    icon: Stamp,
    color: 'bg-blue-100 text-[#1B2A6B]',
  },
  {
    name: 'Sellos de bolsillo',
    icon: Award,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    name: 'Sellos fechadores',
    icon: Calendar,
    color: 'bg-pink-100 text-pink-600',
  },
  {
    name: 'Sellos empresariales',
    icon: Building2,
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    name: 'Sellos médicos',
    icon: HeartPulse,
    color: 'bg-red-100 text-red-600',
  },
  {
    name: 'Sellos para abogados',
    icon: Scale,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    name: 'Sellos personalizados',
    icon: PenTool,
    color: 'bg-purple-100 text-purple-600',
  },
];

const steps = [
  {
    title: 'Diseña tu sello',
    description: 'Usa nuestro editor en línea para crear tu diseño perfecto.',
  },
  {
    title: 'Realiza tu pedido',
    description: 'Elige el modelo, color y cantidad que necesites.',
  },
  {
    title: 'Fabricamos',
    description: 'Producimos tu sello con tecnología láser de alta precisión.',
  },
  {
    title: 'Enviamos',
    description:
      'Empacamos y enviamos tu pedido a cualquier parte de Guatemala.',
  },
  {
    title: 'Recíbelo',
    description: 'Recibe tu sello en 3 a 4 días hábiles y empieza a usarlo.',
  },
];

const testimonials = [
  {
    name: 'Maria Lopez',
    company: 'Clinica San Jose',
    comment:
      'Excelente calidad y servicio. Los sellos quedaron perfectos y la entrega fue muy rapida.',
    rating: 5,
  },
  {
    name: 'Carlos Mendez',
    company: 'Estudio Juridico Mendez',
    comment:
      'Muy satisfecho con la atencion y la calidad de los sellos. Totalmente recomendados.',
    rating: 5,
  },
  {
    name: 'Ana Rodriguez',
    company: 'Farmacia del Pueblo',
    comment:
      'El mejor servicio de sellos personalizados en Guatemala. Volvere a comprar.',
    rating: 5,
  },
];

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  );
}

export default function HomeV2() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    AOS.init({ duration: 600, once: true });

    api
      .get('/products?take=100')
      .then((res) => {
        const raw = res.data?.items || res.data || [];
        // Separar sellos automaticos del resto
        const auto = raw.filter((p: Product) => p.category?.slug === 'sello-automatico');
        const others = raw.filter((p: Product) => p.category?.slug !== 'sello-automatico');
        // Mostrar max 8 destacados: primero sellos automaticos, luego otros
        const featured = [...auto, ...others].slice(0, 8);
        setProducts(featured);
        setProductsLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando productos:', err);
        setProductsError(true);
        setProductsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Slider */}
      <section className="relative w-full">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 6000, disableOnInteraction: false }}
          speed={700}
          loop={true}
          pagination={{ clickable: true }}
          className="h-[350px] md:h-[450px] lg:h-[550px] w-full"
          onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
        >
          {heroSlides.map((slide, i) => {
            const anim = aosAnimations[slide.animation];
            return (
              <SwiperSlide key={i}>
                <div
                  className={`h-full w-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center px-4`}
                >
                  <div className="container mx-auto max-w-4xl text-center text-white">
                    <h1
                      className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6"
                      data-aos={anim.title}
                      data-aos-delay="100"
                    >
                      {slide.title}
                    </h1>
                    <p
                      className="text-base md:text-lg lg:text-xl text-gray-200 mb-6 md:mb-8 max-w-2xl mx-auto"
                      data-aos={anim.subtitle}
                      data-aos-delay="200"
                    >
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* CTA Buttons — minimalistas, alineados con el Trust Bar */}
        <div className="bg-white py-8 px-4 border-b border-gray-100">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              {/* Crear mi sello */}
              <Link href="/design/" className="group">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <PenTool className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <span className="block text-base font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                      Crear mi sello
                    </span>
                    <span className="block text-xs text-gray-400">
                      Diseña en minutos
                    </span>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Ver catálogo */}
              <Link href="/store/" className="group">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Package className="h-5 w-5 text-[#1B2A6B]" />
                  </div>
                  <div>
                    <span className="block text-base font-semibold text-gray-800 group-hover:text-[#1B2A6B] transition-colors">
                      Ver catálogo
                    </span>
                    <span className="block text-xs text-gray-400">
                      Explora todos los modelos
                    </span>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            {/* Botones personalizados del slide activo */}
            {heroSlides[activeSlide]?.buttons && heroSlides[activeSlide].buttons.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {heroSlides[activeSlide].buttons.map((btn, idx) => (
                  <Link key={idx} href={btn.href} className="group">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-600 hover:border-gray-300 hover:shadow-sm hover:text-gray-900 transition-all duration-200">
                      <span>{btn.label}</span>
                      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-white py-10 px-4 border-b border-gray-100">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Award, text: '+15 años de experiencia' },
              { icon: Package, text: '+25,000 sellos fabricados' },
              { icon: Truck, text: 'Envíos nacionales' },
              { icon: ShieldCheck, text: 'Garantía de calidad' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center gap-2"
                data-aos="fade-up"
                data-aos-delay={i * 100}
              >
                <item.icon className="h-8 w-8 text-orange-500" />
                <span className="text-sm md:text-base font-medium text-gray-800">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2
            className="text-2xl md:text-3xl font-bold text-center mb-10 text-[#1B2A6B]"
            data-aos="fade-up"
          >
            Encuentra el sello ideal
          </h2>
          <Swiper
            modules={[Pagination, Navigation]}
            spaceBetween={16}
            slidesPerView={1.5}
            breakpoints={{
              480: { slidesPerView: 2.5 },
              768: { slidesPerView: 3.5 },
              1024: { slidesPerView: 4 },
              1280: { slidesPerView: 5 },
            }}
            navigation
            className="pb-10"
          >
            {categories.map((cat, i) => (
              <SwiperSlide key={i}>
                <Link href={`/store/?category=${encodeURIComponent(cat.name)}`}>
                  <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full">
                    <div
                      className={`h-32 rounded-lg ${cat.color} flex items-center justify-center mb-3`}
                    >
                      <cat.icon className="h-10 w-10" />
                    </div>
                    <h3 className="font-semibold text-center text-sm md:text-base">
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2
            className="text-2xl md:text-3xl font-bold text-center mb-10 text-[#1B2A6B]"
            data-aos="fade-up"
          >
            Productos destacados
          </h2>
          {productsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-6 w-6 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : productsError ? (
            <div className="text-center text-gray-500 py-8">
              No se pudieron cargar los productos. Intenta recargar la página.
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay productos disponibles en este momento.
            </div>
          ) : (
            <div className="featured-swiper">
              <Swiper
                modules={[Pagination, Navigation]}
                spaceBetween={16}
                slidesPerView={1}
                breakpoints={{
                  480: { slidesPerView: 2 },
                  768: { slidesPerView: 3 },
                  1024: { slidesPerView: 4 },
                }}
                navigation
                pagination={{ clickable: true }}
                className="px-1"
              >
                {products.map((product) => (
                  <SwiperSlide key={product.id} className="!h-auto">
                    <Link href={`/store/product?id=${product.id}`} className="block h-full py-2 px-1">
                      <Card className="group overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 h-full cursor-pointer rounded-xl">
                        <div className="relative overflow-hidden aspect-[4/3] bg-gray-100">
                          {product.imageUrl ? (
                            <img
                              src={getImageUrl(product.imageUrl)}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-10 w-10 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-orange-600 font-bold mt-1">
                            Q{product.basePrice?.toFixed(2)}
                          </p>
                          <div className="mt-3 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                            <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-semibold hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] active:!translate-y-0">
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Comprar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
              <style>{`
                .featured-swiper .swiper-pagination {
                  position: relative !important;
                  bottom: auto !important;
                  margin-top: 1.25rem;
                }
                .featured-swiper .swiper-pagination-bullet {
                  width: 10px;
                  height: 10px;
                  background: #d1d5db;
                  opacity: 1;
                  margin: 0 6px !important;
                }
                .featured-swiper .swiper-pagination-bullet-active {
                  background: #1B2A6B;
                }
              `}</style>
            </div>
          )}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-16 px-4 bg-[#1B2A6B]">
        <div
          className="container mx-auto max-w-4xl text-center text-white"
          data-aos="fade-up"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            Obtén envío gratis en compras superiores a Q500
          </h2>
          <Link href="/store/">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg px-8 rounded-2xl font-semibold hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] active:!translate-y-0 transition-all"
            >
              Comprar ahora
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2
            className="text-2xl md:text-3xl font-bold text-center mb-12 text-[#1B2A6B]"
            data-aos="fade-up"
          >
            ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center"
                data-aos="fade-up"
                data-aos-delay={i * 100}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2
            className="text-2xl md:text-3xl font-bold text-center mb-10 text-[#1B2A6B]"
            data-aos="fade-up"
          >
            Lo que dicen nuestros clientes
          </h2>
          <div className="testimonials-swiper">
            <Swiper
              modules={[Autoplay, Pagination]}
              spaceBetween={16}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              className="px-1"
            >
              {testimonials.map((t, i) => (
                <SwiperSlide key={i} className="!h-auto py-2 px-1">
                  <Card className="h-full border border-gray-200 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: t.rating }).map((_, r) => (
                          <StarIcon
                            key={r}
                            className="h-4 w-4 text-orange-400"
                          />
                        ))}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-4">
                        &ldquo;{t.comment}&rdquo;
                      </p>
                      <div className="mt-auto">
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.company}</p>
                      </div>
                    </CardContent>
                  </Card>
                </SwiperSlide>
              ))}
            </Swiper>
            <style>{`
              .testimonials-swiper .swiper-pagination {
                position: relative !important;
                bottom: auto !important;
                margin-top: 1.25rem;
              }
              .testimonials-swiper .swiper-pagination-bullet {
                width: 10px;
                height: 10px;
                background: #d1d5db;
                opacity: 1;
                margin: 0 6px !important;
              }
              .testimonials-swiper .swiper-pagination-bullet-active {
                background: #1B2A6B;
              }
            `}</style>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1B2A6B] text-white pt-16 pb-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <h4 className="font-bold text-lg mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <Link
                    href="/about/"
                    className="hover:text-white transition-colors"
                  >
                    Nosotros
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact/"
                    className="hover:text-white transition-colors"
                  >
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq/"
                    className="hover:text-white transition-colors"
                  >
                    Preguntas frecuentes
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Productos</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <Link
                    href="/store/?category=Automaticos"
                    className="hover:text-white transition-colors"
                  >
                    Sellos automáticos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/store/?category=Empresariales"
                    className="hover:text-white transition-colors"
                  >
                    Sellos empresariales
                  </Link>
                </li>
                <li>
                  <Link
                    href="/store/?category=Medicos"
                    className="hover:text-white transition-colors"
                  >
                    Sellos médicos
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Ayuda</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <Link
                    href="/shipping/"
                    className="hover:text-white transition-colors"
                  >
                    Envíos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/warranty/"
                    className="hover:text-white transition-colors"
                  >
                    Garantías
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy/"
                    className="hover:text-white transition-colors"
                  >
                    Política de privacidad
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Contacto</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-orange-400" />
                  <span>WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-400" />
                  <span>info@misello.gt</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-400" />
                  <span>Guatemala, Guatemala</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-orange-400 transition-colors">
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-orange-400 transition-colors">
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-orange-400 transition-colors">
                <TwitterIcon className="h-5 w-5" />
              </a>
            </div>
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} misello.gt. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
