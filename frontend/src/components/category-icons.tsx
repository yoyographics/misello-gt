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
      {/* Cuerpo */}
      <path d="M18 12h28a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" />
      {/* Bandas de fecha */}
      <path d="M16 26h32" />
      <path d="M20 26v6" />
      <path d="M28 26v6" />
      <path d="M36 26v6" />
      <path d="M44 26v6" />
      {/* Base */}
      <path d="M16 36h32" />
      <path d="M18 36v8" />
      <path d="M46 36v8" />
      <path d="M14 44h36" />
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
      {/* Mango de madera */}
      <path d="M22 12h20a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" />
      <circle cx="32" cy="20" r="3" />
      {/* Cuello */}
      <path d="M26 30v6" />
      <path d="M38 30v6" />
      {/* Base rectangular */}
      <rect x="16" y="36" width="32" height="14" rx="2" />
      <path d="M14 50h36" />
      {/* Vetas de madera */}
      <path d="M24 16h16" />
      <path d="M26 24h12" />
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
      {/* Base */}
      <rect x="10" y="30" width="44" height="18" rx="3" />
      {/* Almohadilla interior */}
      <rect x="16" y="34" width="32" height="10" rx="2" />
      {/* Tapa abierta */}
      <path d="M10 30L20 10h24l10 20" />
      <path d="M20 10h24v20" />
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
      {/* Cuello */}
      <path d="M24 12h16l-2 10H26z" />
      {/* Cuerpo */}
      <path d="M18 22h28v30a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V22z" />
      {/* Etiqueta */}
      <path d="M20 32h24" />
      <path d="M20 40h24" />
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
