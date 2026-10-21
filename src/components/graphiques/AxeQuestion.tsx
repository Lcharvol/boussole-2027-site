// « Qui pense quoi » : une ligne du pôle A (à gauche) au pôle B (à droite) de l'enjeu, avec chaque
// candidat placé sur sa position (pastille à ses initiales, même couleur pour tous). Les positions
// inconnues sont listées à part, jamais placées au milieu. Dans chaque colonne : ordre alphabétique.
// Rendu au build (aucun JavaScript).
import { initiales, libelleCourt, libellePosition, type Poles } from '@/lib/axe';
import Figure from './Figure';

interface Props {
  id: string;
  /** Enjeu : ses deux pôles donnent les extrémités de l'axe. */
  enjeu: Poles;
  /** Candidats dans l'ordre alphabétique du nom de famille. */
  candidats: { slug: string; nom: string; valeur: number | null }[];
  base: string;
}

const VALEURS = [-2, -1, 0, 1, 2];

export default function AxeQuestion({ id, enjeu, candidats, base }: Props) {
  const inconnus = candidats.filter((c) => c.valeur === null);
  return (
    <Figure
      id={id}
      niveau={2}
      titre="Les candidats entre les deux pôles"
      description={
        <>
          Chaque pastille est un candidat, placé sur sa position sourcée, du pôle A « {enjeu.pole_a} » (à gauche) au pôle B « {enjeu.pole_b} » (à droite). Les candidats dont la position est
          inconnue ne sont pas placés : ils sont listés sous le graphique.
        </>
      }
      tri="Dans chaque colonne, ordre alphabétique du nom de famille."
      tableau={{
        entetes: ['Position', 'Nombre', 'Candidats'],
        lignes: [
          ...VALEURS.map((v) => {
            const l = candidats.filter((c) => c.valeur === v);
            return [libellePosition(v, enjeu), l.length, l.map((c) => c.nom).join(', ') || '—'];
          }),
          ['Position inconnue', inconnus.length, inconnus.map((c) => c.nom).join(', ') || '—'],
        ],
      }}
    >
      <div aria-hidden="true">
        <div className="grid grid-cols-5 items-end gap-1 sm:gap-3">
          {VALEURS.map((v) => (
            <ul key={v} className="flex flex-col-reverse flex-wrap content-center items-center justify-start gap-1">
              {candidats
                .filter((c) => c.valeur === v)
                .map((c) => (
                  <li key={c.slug}>
                    <a
                      href={`${base}candidats/${c.slug}/`}
                      title={`${c.nom} : ${libellePosition(v, enjeu)}`}
                      tabIndex={-1}
                      className="flex size-8 items-center justify-center rounded-full text-[0.62rem] font-bold sm:size-9 sm:text-xs"
                      style={{ background: 'var(--viz-marque)', color: 'var(--viz-anneau)', boxShadow: '0 0 0 2px var(--viz-anneau)' }}
                    >
                      {initiales(c.nom)}
                    </a>
                  </li>
                ))}
            </ul>
          ))}
        </div>
        <div className="relative mt-2 h-3">
          <span className="absolute inset-x-[10%] top-1/2 h-px" style={{ background: 'var(--viz-axe)' }} />
          {VALEURS.map((v, i) => (
            <span key={v} className="absolute top-0 h-3 w-px" style={{ left: `${10 + i * 20}%`, background: 'var(--viz-axe)' }} />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[0.65rem] leading-tight text-muted-foreground sm:text-xs">
          {VALEURS.map((v) => (
            <span key={v}>
              {libelleCourt(v)}
              <span className="block font-semibold text-foreground tabular-nums">{candidats.filter((c) => c.valeur === v).length}</span>
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="mt-2 flex justify-between gap-4 text-xs font-semibold">
        <span className="max-w-[45%]">← A · {enjeu.pole_a}</span>
        <span className="max-w-[45%] text-right">{enjeu.pole_b} · B →</span>
      </div>
      {inconnus.length > 0 && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Position inconnue ({inconnus.length}) :</span> {inconnus.map((c) => c.nom).join(', ')}.
        </p>
      )}
    </Figure>
  );
}
