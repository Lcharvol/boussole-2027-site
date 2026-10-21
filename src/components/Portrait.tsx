// Version React du portrait (même cadrage et même traitement que Portrait.astro).
import type { Photos } from '@/lib/types';

export function initiales(nom: string) {
  return nom
    .split(/[\s-]+/)
    .filter((m) => /^[A-ZÀ-Ý]/.test(m))
    .map((m) => m[0])
    .join('')
    .slice(0, 3);
}

export function PortraitMini({ slug, nom, photos, base, className = 'w-12', eager = false }: { slug: string; nom: string; photos: Photos; base: string; className?: string; eager?: boolean }) {
  const p = photos[slug]?.photo;
  return (
    <div className={`brut-surface relative aspect-[4/5] shrink-0 overflow-hidden bg-muted ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-serif text-sm font-bold text-muted-foreground">
        {initiales(nom)}
      </div>
      {p && (
        <img src={`${base}photos/${p.image}`} alt="" width={96} height={120} loading={eager ? 'eager' : 'lazy'} decoding="async" className="relative size-full object-cover object-[50%_25%]" />
      )}
    </div>
  );
}
