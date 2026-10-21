// Comparateur : pour 2 ou 3 candidats, leurs positions question par question sur l'échelle de
// réponse, reliées par un trait (haltères). Trié par désaccord (écart le plus grand en premier).
// Même couleur pour tous ; chaque candidat est identifié par ses initiales et la légende.
import { useState } from 'react';
import type { Candidat, Question } from '@/lib/types';
import Figure from './Figure';

interface Props {
  choisis: Candidat[];
  questions: Question[];
  echelle: Record<string, string>;
}

const initiales = (n: string) =>
  n
    .split(/[\s-]+/)
    .filter((m) => /^[A-ZÀ-Ý]/.test(m))
    .map((m) => m[0])
    .join('')
    .slice(0, 3);
const x = (v: number) => `${10 + ((v + 2) / 4) * 80}%`;
const PREMIERES = 12;

export default function Ecarts({ choisis, questions, echelle }: Props) {
  const [tout, setTout] = useState(false);
  const lignes = questions
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
          Pour chaque affirmation, la position de chaque candidat de « {echelle['-2']} » (à gauche) à « {echelle['2']} » (à droite), reliées par un trait : plus le trait est long,
          plus ils sont en désaccord. Seules les affirmations où au moins deux d'entre eux ont une position connue figurent.
        </>
      }
      tri="Ordre : de l'écart le plus grand au plus petit, puis ordre du test."
      tableau={{
        entetes: ['Affirmation', ...choisis.map((c) => c.nom), 'Écart (crans)'],
        lignes: lignes.map((l) => [l.q.texte, ...l.vals.map((v) => (v === null ? 'inconnue' : echelle[String(v)])), l.ecart]),
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
              <span className="line-clamp-2">{q.texte}</span>
              <span className="relative h-8" title={`${q.texte} — ${choisis.map((c, i) => `${c.nom} : ${vals[i] === null ? 'inconnue' : echelle[String(vals[i])]}`).join(' ; ')}`}>
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
          <span>{echelle['-2']}</span>
          <span>{echelle['2']}</span>
        </span>
      </div>
      {lignes.length > PREMIERES && (
        <button type="button" className="brut-control brut-focus mt-4 bg-background px-3 py-1.5 text-sm" onClick={() => setTout((t) => !t)} aria-expanded={tout}>
          {tout ? `Ne montrer que les ${PREMIERES} plus grands écarts` : `Voir les ${lignes.length} affirmations`}
        </button>
      )}
    </Figure>
  );
}
