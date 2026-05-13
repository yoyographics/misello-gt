'use client';

import React from 'react';

interface SvgImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * Renderiza una imagen. Si el src es un SVG data URI,
 * lo inserta inline en el DOM para que @font-face funcione correctamente.
 * Si no, usa <img> normal.
 */
export const SvgImage: React.FC<SvgImageProps> = ({ src, alt = '', className }) => {
  if (!src) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className || ''}`}>
        <span className="text-2xl">🖼️</span>
      </div>
    );
  }

  // Si es SVG data URI, renderizar inline con estilos responsive
  if (src.startsWith('data:image/svg+xml;base64,')) {
    try {
      const base64 = src.replace('data:image/svg+xml;base64,', '');
      let svgHtml = atob(base64);
      // Forzar que el SVG no se desborde del contenedor
      svgHtml = svgHtml.replace(
        /<svg\b/,
        '<svg style="max-width:100%;height:auto;display:block;"'
      );
      return (
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
          aria-label={alt}
        />
      );
    } catch {
      // fallback a img si el base64 es invalido
    }
  }

  return <img src={src} alt={alt} className={className} />;
};
