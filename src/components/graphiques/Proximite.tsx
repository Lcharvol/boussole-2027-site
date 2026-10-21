// Résultat : proximité de chaque candidat (point) avec sa marge d'incertitude (trait), et l'intervalle
// du premier (bande) : les candidats dont le trait touche la bande forment le peloton de tête.
// Graphique en HTML positionné en pourcentages, lisible sur mobile ; tous les candidats ont la même
// couleur. Ordre : le classement de la personne (score décroissant).
import type { ResultatCandidat } from '@/lib/score';
import Figure from './Figure';

interface Props {
  classement: ResultatCandidat[];
  peloton: Set<string>;
  niveau: number;
}

const GRADUATIONS = [0, 25, 50, 75, 100];

export default function Proximite({ classement, peloton, niveau }: Props) {
  if (!classement.length) return null;
  const premier = classement[0];
  const plancher = Math.max(0, premier.score! - (premier.marge ?? 0));
  return (
    <Figure
      id="graph-proximite"
      titre="Proximité et marge d'incertitude"
      description={
        <>
          Chaque point est le score d'un candidat, chaque trait sa marge (intervalle à {niveau} %). La bande jaune part du bas de l'intervalle du premier : les candidats
          dont le trait l'atteint ne peuvent pas être départagés (en gras). Le trait vertical à 50 % correspond au hasard.
        </>
      }
      tri="Ordre : votre classement, du score le plus élevé au plus bas."
      tableau={{
        entetes: ['Candidat', 'Score', 'Marge', 'Couverture', 'Peloton de tête'],
        lignes: classement.map((r) => [r.nom, `${r.score} %`, `± ${r.marge}`, `${Math.round(r.couverture * 100)} %`, peloton.has(r.nom) ? 'oui' : 'non']),
      }}
    >
      <div aria-hidden="true" className="text-xs sm:text-sm">
        <ol className="grid gap-1">
          {classement.map((r) => {
            const m = r.marge ?? 0;
            const g = Math.max(0, r.score! - m);
            const d = Math.min(100, r.score! + m);
            const enTete = peloton.has(r.nom);
            return (
              <li
                key={r.slug}
                title={`${r.nom} : ${r.score} % ± ${m}, couverture ${Math.round(r.couverture * 100)} %${enTete ? ', peloton de tête' : ''}`}
                className="grid grid-cols-[minmax(0,7.5rem)_1fr_3.6rem] items-center gap-2 rounded-sm px-1 hover:bg-muted sm:grid-cols-[minmax(0,11rem)_1fr_4.2rem]"
              >
                <span className={`truncate ${enTete ? 'font-bold' : 'text-muted-foreground'}`}>{r.nom}</span>
                <span className="relative h-5">
                  {GRADUATIONS.map((t) => (
                    <span key={t} className="absolute inset-y-0 w-px" style={{ left: `${t}%`, background: t === 50 ? 'var(--viz-axe)' : 'var(--viz-grille)' }} />
                  ))}
                  <span className="absolute inset-y-0" style={{ left: `${plancher}%`, right: 0, background: 'var(--viz-bande)' }} />
                  <span className="absolute top-1/2 h-0.5 -translate-y-1/2" style={{ left: `${g}%`, width: `${d - g}%`, background: 'var(--viz-marque)' }} />
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${r.score}%`, background: 'var(--viz-marque)', boxShadow: '0 0 0 2px var(--viz-anneau)' }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  {r.score}
                  <span className="text-muted-foreground"> ±{m}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-1 grid grid-cols-[minmax(0,7.5rem)_1fr_3.6rem] gap-2 px-1 sm:grid-cols-[minmax(0,11rem)_1fr_4.2rem]">
          <span />
          <span className="relative h-4 text-muted-foreground tabular-nums">
            {GRADUATIONS.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
                {t}
              </span>
            ))}
          </span>
          <span />
        </div>
        <p className="mt-1 text-center text-muted-foreground">Proximité (%) · 50 = hasard</p>
      </div>
    </Figure>
  );
}
