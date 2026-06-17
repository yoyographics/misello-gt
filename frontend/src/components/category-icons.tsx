interface IconProps {
  className?: string;
}

// Iconos con líneas gruesas, estilo outline, basados en fotos reales de productos.

export function AutomaticStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cuerpo / tapa superior sólida */}
      <rect x="18" y="8" width="28" height="24" rx="5" fill="currentColor" />
      {/* Línea divisoria */}
      <path d="M18 28h28" />
      {/* Base del sello, solo líneas */}
      <rect x="20" y="28" width="24" height="22" rx="4" />
      {/* Patas */}
      <path d="M16 50h32" />
    </svg>
  );
}

export function PocketStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cuerpo del Handy Stamp, solo contorno */}
      <rect x="16" y="6" width="32" height="52" rx="10" />
      {/* Tapa superior sólida */}
      <path
        d="M16 18c0-6 7-10 16-10s16 4 16 10v12c0 6-7 10-16 10s-16-4-16-10V18z"
        fill="currentColor"
      />
      {/* Línea divisoria */}
      <path d="M16 28h32" />
      {/* Orificio inferior */}
      <path d="M28 52h8" strokeWidth="4" />
    </svg>
  );
}

export function DaterStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Igual que el automático */}
      <rect x="18" y="8" width="28" height="24" rx="5" fill="currentColor" />
      <path d="M18 28h28" />
      <rect x="20" y="28" width="24" height="22" rx="4" />
      <path d="M16 50h32" />
      {/* Ruedas / bandas de fecha */}
      <path d="M24 36h16" />
      <path d="M24 42h16" />
    </svg>
  );
}

export function WoodStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Base rectangular */}
      <rect x="12" y="42" width="40" height="12" rx="2" />
      {/* Mango con silueta real: se ensancha arriba con curvas suaves */}
      <path
        d="M16 42
           C16 36 20 34 22 30
           C24 24 22 18 24 14
           C26 8 38 8 40 14
           C42 18 40 24 42 30
           C44 34 48 36 48 42"
        fill="currentColor"
      />
      {/* Círculo del agarre */}
      <circle cx="32" cy="24" r="4" fill="none" />
    </svg>
  );
}

export function InkPadIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cuerpo del estuche, tipo almohadilla / caja de chicles */}
      <rect x="12" y="22" width="40" height="28" rx="4" />
      {/* Tapa abierta hacia atrás */}
      <path d="M12 22L18 8h28l6 14" />
      <path d="M18 8h28" />
      {/* Almohadilla interior */}
      <rect x="18" y="28" width="28" height="16" rx="2" />
    </svg>
  );
}

export function InkBottleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Tapa cónica con borde ancho */}
      <path d="M23 8h18l-3 9H26z" />
      <path d="M21 10h22" />
      {/* Cuello estrecho */}
      <path d="M27 17h10v5H27z" />
      {/* Hombros curvos y cuerpo barril */}
      <path
        d="M20 22
           C20 22 27 22 32 22
           C37 22 44 22 44 22
           C48 26 48 32 48 38
           C48 48 44 54 32 54
           C20 54 16 48 16 38
           C16 32 16 26 20 22z"
      />
      {/* Etiqueta */}
      <path d="M17 36h30" />
    </svg>
  );
}

export function EmbosserIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Base */}
      <path d="M10 50h44" />
      <path d="M14 50v-8a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v8" />
      {/* Cuerpo curvo */}
      <path d="M18 38V28a14 14 0 0 1 28 0v10" />
      {/* Palanca */}
      <path d="M44 30l10-16" />
      <path d="M50 20l8-4" />
      <path d="M32 14h6" />
    </svg>
  );
}

export function LawyerStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M32 8v48" />
      <path d="M16 20h32" />
      <path d="M12 52h40" />
      <circle cx="32" cy="34" r="6" />
    </svg>
  );
}

export function ColegiadoStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Birrete */}
      <path d="M32 8l18 10-18 10-18-10z" />
      <path d="M14 18v10" />
      <path d="M50 18v10" />
      <path d="M32 38v10" />
      <path d="M14 28c0 10 8 18 18 18s18-8 18-18" />
      {/* Borla */}
      <circle cx="32" cy="54" r="3" />
      <path d="M32 48v6" />
    </svg>
  );
}

export function CustomStampIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="32" cy="22" r="12" />
      <path d="M20 34h24" />
      <path d="M24 34v8" />
      <path d="M40 34v8" />
      <path d="M18 42h28" />
      <path d="M32 18v6l4 2" />
    </svg>
  );
}
