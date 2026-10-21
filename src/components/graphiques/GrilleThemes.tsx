// Résultat : grille thème × candidat (proximité par thème), pour les premiers du classement.
// Échelle à une seule teinte (graphite) ; la valeur est écrite dans chaque case ; case vide quand
// aucune position du candidat n'est connue sur les questions répondues du thème.
import type { ResultatCandidat } from '@/lib/score';
import Figure from './Figure';

interface Props {
  candidats: ResultatCandidat[];
  themes: Record<string, string>;
}

const court = (libelle: string) => libelle.split(/[ ,]/)[0];

export default function GrilleThemes({ candidats, themes }: Props) {
  const ordre = Object.keys(themes).filter((t) => candidats.some((c) => t in c.par_theme));
  if (!candidats.length || !ordre.length) return null;
  return (
    <Figure
      id="graph-themes"
      titre="Proximité par thème"
      description={
        <>
          Pour les {candidats.length} premiers de votre classement, la proximité thème par thème (0 à 100 %, 50 = hasard). Plus la case est marquée, plus vos réponses sont proches
          de leurs positions. Une case vide signale qu'aucune de leurs positions n'est connue sur vos réponses de ce thème.
        </>
      }
      tri="Ordre des lignes : votre classement ; colonnes : ordre des thèmes du test."
      tableau={{
        entetes: ['Candidat', ...ordre.map((t) => themes[t])],
        lignes: candidats.map((c) => [c.nom, ...ordre.map((t) => (t in c.par_theme ? `${c.par_theme[t]} %` : '—'))]),
      }}
    >
      <p aria-hidden="true" className="mb-2 text-xs text-muted-foreground sm:hidden">
        Faites défiler horizontalement pour voir tous les thèmes.
      </p>
      <div aria-hidden="true" className="overflow-x-auto">
        <div className="grid min-w-[36rem] gap-[2px] text-xs" style={{ gridTemplateColumns: `minmax(7rem, 10rem) repeat(${ordre.length}, minmax(0, 1fr))` }}>
          <span />
          {ordre.map((t) => (
            <span key={t} className="truncate px-1 pb-1 text-center font-semibold text-muted-foreground">
              {court(themes[t])}
            </span>
          ))}
          {candidats.map((c) => (
            <div key={c.slug} className="contents">
              <span className="sticky left-0 z-10 truncate bg-card py-2 pr-2 font-semibold">{c.nom}</span>
              {ordre.map((t) => {
                const v = c.par_theme[t];
                if (v === undefined)
                  return (
                    <span key={t} title={`${c.nom}, ${themes[t]} : aucune position connue`} className="flex items-center justify-center rounded-sm border border-dashed border-border/40 text-muted-foreground">
                      —
                    </span>
                  );
                return (
                  <span
                    key={t}
                    title={`${c.nom}, ${themes[t]} : ${v} %`}
                    className="flex items-center justify-center rounded-sm py-2 text-sm font-bold tabular-nums"
                    style={{
                      background: `color-mix(in oklab, var(--viz-seq-max) ${v}%, var(--viz-seq-min))`,
                      color: 'var(--foreground)',
                    }}
                  >
                    {v}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>0 %</span>
        <span className="h-2.5 w-32 rounded-sm" style={{ background: 'linear-gradient(to right, var(--viz-seq-min), var(--viz-seq-max))' }} />
        <span>100 %</span>
      </div>
    </Figure>
  );
}
