import CategoryPage from './category-page';

const DEFAULT_SLUGS = [
  'sello-automatico',
  'sello-fechador',
  'sello-portatil',
  'sello-madera',
  'embosadora',
  'almohadillas',
  'tintas',
];

export async function generateStaticParams() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const res = await fetch(`${apiUrl}/categories`);
    const categories = await res.json();
    const slugs = categories.map((c: any) => c.slug);
    // Asegurar que al menos los slugs por defecto existan
    const allSlugs = Array.from(new Set([...DEFAULT_SLUGS, ...slugs]));
    return allSlugs.map((slug) => ({ slug }));
  } catch {
    return DEFAULT_SLUGS.map((slug) => ({ slug }));
  }
}

export default function Page({ params }: { params: { slug: string } }) {
  return <CategoryPage slug={params.slug} />;
}
