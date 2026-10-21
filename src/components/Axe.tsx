// Axe d'un enjeu, du pôle A (à gauche, -2) au pôle B (à droite, +2), avec une ou plusieurs positions.
// Purement visuel (aria-hidden) : chaque usage donne aussi la position en texte.
import type { Poles } from '@/lib/axe';

export interface Marque {
  valeur: number | null | undefined;
  /** Lettre ou initiales affichées dans la marque (« V » pour vous…). */
  signe: string;
  /** Marque pleine (vous) ou en contour (candidat). */
  plein?: boolean;
}

export default function Axe({ e, marques, poles = true }: { e: Poles; marques: Marque[]; poles?: boolean }) {
  return (
    <div aria-hidden="true" className="w-full">
      {poles && (
        <div className="mb-1 flex justify-between gap-4 text-[0.7rem] leading-tight font-semibold text-muted-foreground">
          <span className="max-w-[45%]">A · {e.pole_a}</span>
          <span className="max-w-[45%] text-right">{e.pole_b} · B</span>
        </div>
      )}
      <div className="grid grid-cols-5 gap-1">
        {[-2, -1, 0, 1, 2].map((v) => {
          const ici = marques.filter((m) => m.valeur === v);
          return (
            <div key={v} className={`flex min-h-7 flex-wrap items-center justify-center gap-0.5 py-0.5 rounded-[calc(var(--radius)*0.6)] border-[length:var(--brut-border)] border-border ${v === 0 ? 'bg-muted' : 'bg-background'}`}>
              {ici.map((m, k) => (
                <span
                  key={k}
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold ${m.plein ? 'bg-primary text-primary-foreground' : 'border-2 border-foreground bg-card text-foreground'}`}
                >
                  {m.signe}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
