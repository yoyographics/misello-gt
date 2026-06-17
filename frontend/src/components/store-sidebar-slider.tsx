'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Button } from '@/components/ui/button';

import 'swiper/css';
import 'swiper/css/pagination';

interface SidebarSlider {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  gradient?: string;
  useGradient?: boolean;
  gradientOpacity?: number;
  buttonText?: string;
  buttonType?: 'URL' | 'CATEGORY' | 'PRODUCT';
  buttonUrl?: string;
  buttonCategorySlug?: string;
  buttonProductId?: string;
}

interface Props {
  sliders: SidebarSlider[];
  loading?: boolean;
}

function getImageUrl(url?: string) {
  if (!url) return '';
  return url.startsWith('http')
    ? url
    : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')}${url}`;
}

function getSliderButtonHref(slider: SidebarSlider): string {
  switch (slider.buttonType) {
    case 'CATEGORY':
      return slider.buttonCategorySlug ? `/store?category=${slider.buttonCategorySlug}` : '/store';
    case 'PRODUCT':
      return slider.buttonProductId ? `/store/product?id=${slider.buttonProductId}` : '/store';
    case 'URL':
    default:
      return slider.buttonUrl || '/store';
  }
}

function SliderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}

export default function StoreSidebarSlider({ sliders, loading }: Props) {
  if (loading) {
    return (
      <div className="hidden xl:block w-full h-full px-2 2xl:px-3 rounded-2xl bg-gray-100 animate-pulse" />
    );
  }

  if (!sliders || sliders.length === 0) {
    return null;
  }

  return (
    <div className="hidden xl:block w-full h-full px-2 2xl:px-3">
      <Swiper
        modules={[Autoplay, Pagination]}
        direction="vertical"
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop={sliders.length > 1}
        className="store-sidebar-slider h-full w-full rounded-2xl overflow-hidden"
      >
        {sliders.map((slide) => {
          const hasImage = slide.imageUrl && slide.imageUrl.trim() !== '';
          const showGradient = slide.useGradient !== false;
          const bgStyle = hasImage
            ? {
                backgroundImage: showGradient
                  ? `linear-gradient(to bottom, rgba(27,42,107,${slide.gradientOpacity ?? 0.85}), rgba(15,26,74,${(slide.gradientOpacity ?? 0.85) + 0.05})), url(${getImageUrl(slide.imageUrl)})`
                  : `url(${getImageUrl(slide.imageUrl)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined;
          const bgClass = !hasImage
            ? `bg-gradient-to-b ${slide.gradient || 'from-[#1B2A6B] to-[#0f1a4a]'}`
            : '';

          return (
            <SwiperSlide key={slide.id}>
              <div
                className={`h-full w-full flex flex-col items-center justify-center text-center text-white px-4 py-6 ${bgClass}`}
                style={bgStyle}
              >
                <h3 className="text-lg font-bold mb-2 leading-tight drop-shadow">
                  {slide.title}
                </h3>
                {slide.subtitle && (
                  <p className="text-xs text-gray-100 mb-4 line-clamp-3 drop-shadow">
                    {slide.subtitle}
                  </p>
                )}
                {slide.buttonText && (
                  <SliderLink href={getSliderButtonHref(slide)}>
                    <Button
                      size="sm"
                      className="bg-white text-[#1B2A6B] hover:bg-gray-100 rounded-full font-semibold text-xs shadow-lg"
                    >
                      {slide.buttonText}
                    </Button>
                  </SliderLink>
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
      <style>{`
        .store-sidebar-slider .swiper-pagination {
          right: 8px !important;
          left: auto !important;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .store-sidebar-slider .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.5);
          opacity: 1;
        }
        .store-sidebar-slider .swiper-pagination-bullet-active {
          background: #fff;
        }
      `}</style>
    </div>
  );
}
