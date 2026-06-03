'use client';

import React from 'react';

interface SvgImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * Renderiza una imagen. Si el src es un SVG data URI,
 * lo renderiza via <img> para bloquear scripts inline (XSS safe).
 * El @font-face dentro del SVG no funcionara en <img>,
 * pero se prefiere seguridad sobre funcionalidad tipografica en preview.
 */
export const SvgImage: React.FC<SvgImageProps> = ({ src, alt = '', className }) => {
  if (!src) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className || ''}`}>
        <span className="text-2xl">🖼️</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
};
