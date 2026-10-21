// Comparateur : pour 2 ou 3 candidats, leurs positions enjeu par enjeu, du pôle A (à gauche) au pôle B
// (à droite), reliées par un trait (haltères). Trié par désaccord (écart le plus grand en premier).
// Même couleur pour tous ; chaque candidat est identifié par ses initiales et la légende.
import { useState } from 'react';
import { initiales, libellePosition, titreEnjeu } from '@/lib/axe';
import type { Candidat, Enjeu } from '@/lib/types';
import Figure from './Figure';

interface Props {
  choisis: Candidat[];
  enjeux: Pick<Enjeu, 'id' | 'theme' | 'pole_a' | 'pole_b'>[];
}

const x = (v: number) => `${10 + ((v + 2) / 4) * 80}%`;
const PREMIERES = 12;

export default function Ecarts({ choisis, enjeux }: Props) {
  const [tout, setTout] = useState(false);
  const lignes = enjeux
    .map((q) => {
      const vals = choisis.map((c) => c.positions[q.id]?.valeur ?? null);
      const connues = vals.filter((v): v is number => v !== null);
      const ecart = connues.length >= 2 ? Math.max(...connues) - Math.min(...connues) : -1;
      return { q, vals, ecart };
    })
    .filter((l) => l.ecart >= 0)
    .sort((a, b) => b.ecart - a.ecart);
  const visibles = tout ? lignes : lignes.slice(0, PREMIERES);
  const sigles = choisis.map((c) => initiales(c.nom));
  return (
    <Figure
      id="graph-ecarts"
      niveau={2}
      titre="Où ils divergent le plus"
      description={
        <>
          Pour chaque enjeu, la position de chaque candidat entre le pôle A (à gauche) et le pôle B (à droite), reliées par un trait : plus le trait est long, plus ils sont en
          désaccord. Seuls les enjeux où au moins deux d'entre eux ont une position connue figurent.
        </>
      }
      tri="Ordre : de l'écart le plus grand au plus petit, puis ordre des données."
      tableau={{
        entetes: ['Enjeu (pôle A ou pôle B)', ...choisis.map((c) => c.nom), 'Écart (crans)'],
        lignes: lignes.map((l) => [titreEnjeu(l.q), ...l.vals.map((v) => (v === null ? 'inconnue' : libellePosition(v, l.q))), l.ecart]),
      }}
    >
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-hidden="true">
        {choisis.map((c, i) => (
          <li key={c.slug} className="flex items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-full text-[0.6rem] font-bold" style={{ background: 'var(--viz-marque)', color: 'var(--viz-anneau)' }}>
              {sigles[i]}
            </span>
            {c.nom}
          </li>
        ))}
      </ul>
      <ol aria-hidden="true" className="grid gap-3 text-xs sm:text-sm">
        {visibles.map(({ q, vals, ecart }) => {
          const connues = vals.filter((v): v is number => v !== null);
          const min = Math.min(...connues);
          const max = Math.max(...connues);
          return (
            <li key={q.id} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center sm:gap-4">
              <span className="line-clamp-2">
                <span className="font-semibold">A</span> {q.pole_a} <span className="text-muted-foreground">ou</span> <span className="font-semibold">B</span> {q.pole_b}
              </span>
              <span className="relative h-8" title={`${titreEnjeu(q)} — ${choisis.map((c, i) => `${c.nom} : ${vals[i] === null ? 'inconnue' : libellePosition(vals[i], q)}`).join(' ; ')}`}>
                {[-2, -1, 0, 1, 2].map((t) => (
                  <span key={t} className="absolute inset-y-1 w-px" style={{ left: x(t), background: t === 0 ? 'var(--viz-axe)' : 'var(--viz-grille)' }} />
                ))}
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2" style={{ left: x(min), width: `${((max - min) / 4) * 80}%`, background: 'var(--viz-marque)' }} />
                {vals.map((v, i) => {
                  if (v === null) return null;
                  // Positions identiques : pastilles côte à côte, centrées sur la position.
                  const k = vals.filter((w) => w === v).length;
                  const j = vals.slice(0, i).filter((w) => w === v).length;
                  return (
                    <span
                      key={i}
                      className="absolute top-1/2 flex size-6 items-center justify-center rounded-full text-[0.55rem] font-bold"
                      style={{
                        left: x(v),
                        transform: `translate(calc(-50% + ${(j - (k - 1) / 2) * 26}px), -50%)`,
                        background: 'var(--viz-marque)',
                        color: 'var(--viz-anneau)',
                        boxShadow: '0 0 0 2px var(--viz-anneau)',
                      }}
                    >
                      {sigles[i]}
                    </span>
                  );
                })}
                {ecart === 0 && <span className="absolute right-0 top-0 text-[0.65rem] text-muted-foreground">même position</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="mt-2 grid text-[0.65rem] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-4">
        <span />
        <span className="flex justify-between px-[6%]">
          <span>← pôle A nettement</span>
          <span>pôle B nettement →</span>
        </span>
      </div>
      {lignes.length > PREMIERES && (
        <button type="button" className="brut-control brut-focus mt-4 bg-background px-3 py-1.5 text-sm" onClick={() => setTout((t) => !t)} aria-expanded={tout}>
          {tout ? `Ne montrer que les ${PREMIERES} plus grands écarts` : `Voir les ${lignes.length} enjeux`}
        </button>
      )}
    </Figure>
  );
}
