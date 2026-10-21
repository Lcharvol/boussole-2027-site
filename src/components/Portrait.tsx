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

export function PortraitMini({ slug, nom, photos, base, className = 'w-12' }: { slug: string; nom: string; photos: Photos; base: string; className?: string }) {
  const p = photos[slug]?.photo;
  return (
    <div className={`brut-surface aspect-[4/5] shrink-0 overflow-hidden bg-muted ${className}`}>
      {p ? (
        <img src={`${base}photos/${p.image}`} alt="" width={96} height={120} loading="lazy" decoding="async" className="size-full object-cover object-[50%_25%]" />
      ) : (
        <div aria-hidden="true" className="flex size-full items-center justify-center font-serif text-base font-bold text-muted-foreground">
          {initiales(nom)}
        </div>
      )}
    </div>
  );
}
