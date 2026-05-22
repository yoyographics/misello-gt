import { ProductShape } from '@prisma/client';

export type CategorySlug =
  | 'sello-automatico'
  | 'sello-fechador'
  | 'sello-portatil'
  | 'sello-madera'
  | 'embosadora'
  | 'almohadillas'
  | 'tintas';

export const CATEGORY_DEFINITIONS: Array<{
  name: string;
  slug: CategorySlug;
  showInWizard: boolean;
  sortOrder: number;
}> = [
  { name: 'Sellos Automáticos', slug: 'sello-automatico', showInWizard: true, sortOrder: 1 },
  { name: 'Fechadores', slug: 'sello-fechador', showInWizard: true, sortOrder: 2 },
  { name: 'Sellos Portátiles', slug: 'sello-portatil', showInWizard: true, sortOrder: 3 },
  { name: 'Sellos de Madera', slug: 'sello-madera', showInWizard: true, sortOrder: 4 },
  { name: 'Embosadoras', slug: 'embosadora', showInWizard: true, sortOrder: 5 },
  { name: 'Almohadillas', slug: 'almohadillas', showInWizard: false, sortOrder: 6 },
  { name: 'Tintas', slug: 'tintas', showInWizard: false, sortOrder: 7 },
];

/**
 * Fuente de verdad del catálogo de productos.
 * Usado por seed script y por el endpoint de sync admin.
 */
export const CATALOG_PRODUCTS = [
  // === MONTURA AUTOMATICA (28) ===
  { sku: 'S-821L', name: 'Sello automático S-821L', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 30, heightMm: 10, widthPx: 720, heightPx: 248, basePrice: 90 },
  { sku: 'S-822', name: 'Sello automático S-822', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 38, heightMm: 14, widthPx: 909, heightPx: 343, basePrice: 95 },
  { sku: 'S-823', name: 'Sello automático S-823', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 47, heightMm: 18, widthPx: 1122, heightPx: 437, basePrice: 120 },
  { sku: 'S-824', name: 'Sello automático S-824', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 58, heightMm: 22, widthPx: 1382, heightPx: 531, basePrice: 145 },
  { sku: 'S-825', name: 'Sello automático S-825', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 70, heightMm: 25, widthPx: 1665, heightPx: 602, basePrice: 160 },
  { sku: 'S-826', name: 'Sello automático S-826', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 41, heightMm: 24, widthPx: 980, heightPx: 579, basePrice: 145 },
  { sku: 'S-827', name: 'Sello automático S-827', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 50, heightMm: 30, widthPx: 1193, heightPx: 720, basePrice: 185 },
  { sku: 'S-828', name: 'Sello automático S-828', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 56, heightMm: 33, widthPx: 1335, heightPx: 791, basePrice: 210 },
  { sku: 'S-829', name: 'Sello automático S-829', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 64, heightMm: 40, widthPx: 1524, heightPx: 957, basePrice: 240 },
  { sku: 'S-830', name: 'Sello automático S-830', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 75, heightMm: 38, widthPx: 1783, heightPx: 909, basePrice: 260 },
  { sku: 'S-831', name: 'Sello automático S-831', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 70, heightMm: 10, widthPx: 1665, heightPx: 248, basePrice: 120 },
  { sku: 'S-832', name: 'Sello automático S-832', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 75, heightMm: 15, widthPx: 1783, heightPx: 366, basePrice: 140 },
  { sku: 'S-833', name: 'Sello automático S-833', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 82, heightMm: 25, widthPx: 1949, heightPx: 602, basePrice: 170 },
  { sku: 'S-835', name: 'Sello automático S-835', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 30, heightMm: 20, widthPx: 720, heightPx: 484, basePrice: 125 },
  { sku: 'S-836', name: 'Sello automático S-836', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 45, heightMm: 30, widthPx: 1075, heightPx: 720, basePrice: 170 },
  { sku: 'S-837', name: 'Sello automático S-837', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 50, heightMm: 40, widthPx: 1193, heightPx: 957, basePrice: 215 },
  { sku: 'S-310', name: 'Sello automático S-310', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 54, heightMm: 13, widthPx: 1287, heightPx: 319, basePrice: 120 },
  { sku: 'S-308', name: 'Sello automático S-308', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 45, heightMm: 10, widthPx: 1075, heightPx: 248, basePrice: 110 },
  { sku: 'S-520', name: 'Sello automático S-520', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 20, heightMm: 20, widthPx: 484, heightPx: 484, basePrice: 115 },
  { sku: 'S-524', name: 'Sello automático S-524', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 24, heightMm: 24, widthPx: 579, heightPx: 579, basePrice: 125 },
  { sku: 'S-530', name: 'Sello automático S-530', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 32, heightMm: 32, widthPx: 768, heightPx: 768, basePrice: 145 },
  { sku: 'S-542', name: 'Sello automático S-542', categorySlug: 'sello-automatico', shape: ProductShape.RECTANGULAR, widthMm: 42, heightMm: 42, widthPx: 1004, heightPx: 1004, basePrice: 205 },
  { sku: 'R-524', name: 'Sello automático R-524', categorySlug: 'sello-automatico', shape: ProductShape.CIRCULAR, widthMm: 24, heightMm: 24, widthPx: 579, heightPx: 579, basePrice: 110 },
  { sku: 'R-532', name: 'Sello automático R-532', categorySlug: 'sello-automatico', shape: ProductShape.CIRCULAR, widthMm: 32, heightMm: 32, widthPx: 768, heightPx: 768, basePrice: 145 },
  { sku: 'R-538', name: 'Sello automático R-538', categorySlug: 'sello-automatico', shape: ProductShape.CIRCULAR, widthMm: 38, heightMm: 38, widthPx: 909, heightPx: 909, basePrice: 175 },
  { sku: 'R-542', name: 'Sello automático R-542', categorySlug: 'sello-automatico', shape: ProductShape.CIRCULAR, widthMm: 42, heightMm: 42, widthPx: 1004, heightPx: 1004, basePrice: 205 },
  { sku: 'R-552', name: 'Sello automático R-552', categorySlug: 'sello-automatico', shape: ProductShape.CIRCULAR, widthMm: 52, heightMm: 52, widthPx: 1240, heightPx: 1240, basePrice: 270 },
  { sku: 'O-3555', name: 'Sello automático O-3555', categorySlug: 'sello-automatico', shape: ProductShape.OVAL, widthMm: 55, heightMm: 35, widthPx: 1311, heightPx: 839, basePrice: 210 },
  { sku: 'O-3045', name: 'Sello automático O-3045', categorySlug: 'sello-automatico', shape: ProductShape.OVAL, widthMm: 45, heightMm: 30, widthPx: 1075, heightPx: 720, basePrice: 185 },

  // === FECHADORES (13) ===
  { sku: 'S-826D', name: 'Fechador S-826 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 41, heightMm: 24, widthPx: 980, heightPx: 579, basePrice: 185 },
  { sku: 'S-827D', name: 'Fechador S-827 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 50, heightMm: 30, widthPx: 1193, heightPx: 720, basePrice: 210 },
  { sku: 'S-828D', name: 'Fechador S-828 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 56, heightMm: 33, widthPx: 1335, heightPx: 791, basePrice: 240 },
  { sku: 'S-829D', name: 'Fechador S-829 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 64, heightMm: 40, widthPx: 1524, heightPx: 957, basePrice: 265 },
  { sku: 'S-830D', name: 'Fechador S-830 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 75, heightMm: 38, widthPx: 1783, heightPx: 909, basePrice: 285 },
  { sku: 'S-835D', name: 'Fechador S-835 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 30, heightMm: 20, widthPx: 720, heightPx: 484, basePrice: 175 },
  { sku: 'S-836D', name: 'Fechador S-836 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 45, heightMm: 30, widthPx: 1075, heightPx: 720, basePrice: 200 },
  { sku: 'S-837D', name: 'Fechador S-837 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 50, heightMm: 40, widthPx: 1193, heightPx: 957, basePrice: 240 },
  { sku: 'S-530D', name: 'Fechador S-530 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 32, heightMm: 32, widthPx: 768, heightPx: 768, basePrice: 175 },
  { sku: 'S-542D', name: 'Fechador S-542 D', categorySlug: 'sello-fechador', shape: ProductShape.RECTANGULAR, widthMm: 42, heightMm: 42, widthPx: 1004, heightPx: 1004, basePrice: 235 },
  { sku: 'R-532D', name: 'Fechador R-532 D', categorySlug: 'sello-fechador', shape: ProductShape.CIRCULAR, widthMm: 32, heightMm: 32, widthPx: 768, heightPx: 768, basePrice: 175 },
  { sku: 'R-542D', name: 'Fechador R-542 D', categorySlug: 'sello-fechador', shape: ProductShape.CIRCULAR, widthMm: 42, heightMm: 42, widthPx: 1004, heightPx: 1004, basePrice: 235 },
  { sku: 'O-3555D', name: 'Fechador O-3555 D', categorySlug: 'sello-fechador', shape: ProductShape.OVAL, widthMm: 55, heightMm: 35, widthPx: 1311, heightPx: 839, basePrice: 255 },
  { sku: 'O-3045D', name: 'Fechador O-3045 D', categorySlug: 'sello-fechador', shape: ProductShape.OVAL, widthMm: 45, heightMm: 30, widthPx: 1075, heightPx: 720, basePrice: 200 },

  // === PORTATILES (6) ===
  { sku: 'S-722', name: 'Sello portátil S-722', categorySlug: 'sello-portatil', shape: ProductShape.RECTANGULAR, widthMm: 38, heightMm: 14, widthPx: 909, heightPx: 343, basePrice: 95 },
  { sku: 'S-723', name: 'Sello portátil S-723', categorySlug: 'sello-portatil', shape: ProductShape.RECTANGULAR, widthMm: 47, heightMm: 18, widthPx: 1122, heightPx: 437, basePrice: 120 },
  { sku: 'S-724', name: 'Sello portátil S-724', categorySlug: 'sello-portatil', shape: ProductShape.RECTANGULAR, widthMm: 58, heightMm: 22, widthPx: 1382, heightPx: 531, basePrice: 145 },
  { sku: 'Q-24', name: 'Sello portátil Q-24', categorySlug: 'sello-portatil', shape: ProductShape.CIRCULAR, widthMm: 24, heightMm: 24, widthPx: 579, heightPx: 579, basePrice: 115 },
  { sku: 'Q-32', name: 'Sello portátil Q-32', categorySlug: 'sello-portatil', shape: ProductShape.CIRCULAR, widthMm: 32, heightMm: 32, widthPx: 768, heightPx: 768, basePrice: 135 },
  { sku: 'EL-42', name: 'Sello portátil EL-42', categorySlug: 'sello-portatil', shape: ProductShape.CIRCULAR, widthMm: 42, heightMm: 42, widthPx: 1004, heightPx: 1004, basePrice: 180 },

  // === EMBOSADORAS (2) ===
  { sku: 'EM-50', name: 'Embosadora portátil EM', categorySlug: 'embosadora', shape: ProductShape.RECTANGULAR, widthMm: 50, heightMm: 50, widthPx: 1181, heightPx: 1181, basePrice: 795 },
  { sku: 'ED-50', name: 'Embosadora de escritorio ED', categorySlug: 'embosadora', shape: ProductShape.RECTANGULAR, widthMm: 50, heightMm: 50, widthPx: 1181, heightPx: 1181, basePrice: 795 },

  // === ALMOHADILLA AUTOMATICA (2) ===
  { sku: 'ALM-AUTO', name: 'Almohadilla automática', categorySlug: 'almohadillas', shape: null, widthMm: null, heightMm: null, widthPx: null, heightPx: null, basePrice: 36 },
  { sku: 'ALM-FEC', name: 'Almohadilla para fechador', categorySlug: 'almohadillas', shape: null, widthMm: null, heightMm: null, widthPx: null, heightPx: null, basePrice: 40 },

  // === ALMOHADILLA MADERA (4) ===
  { sku: 'ALM-S1', name: 'Almohadilla madera S-1', categorySlug: 'almohadillas', shape: ProductShape.RECTANGULAR, widthMm: 65, heightMm: 45, widthPx: null, heightPx: null, basePrice: 30 },
  { sku: 'ALM-S2', name: 'Almohadilla madera S-2', categorySlug: 'almohadillas', shape: ProductShape.RECTANGULAR, widthMm: 88, heightMm: 57, widthPx: null, heightPx: null, basePrice: 40 },
  { sku: 'ALM-S3', name: 'Almohadilla madera S-3', categorySlug: 'almohadillas', shape: ProductShape.RECTANGULAR, widthMm: 110, heightMm: 70, widthPx: null, heightPx: null, basePrice: 50 },
  { sku: 'ALM-S4', name: 'Almohadilla madera S-4', categorySlug: 'almohadillas', shape: ProductShape.RECTANGULAR, widthMm: 178, heightMm: 128, widthPx: null, heightPx: null, basePrice: 150 },
] as const;

export type CatalogProduct = typeof CATALOG_PRODUCTS[number];
