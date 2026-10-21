// Cadre commun des graphiques : titre, description (texte alternatif), graphique, version tableau.
// Le tableau est l'équivalent accessible : toute valeur du graphique s'y retrouve.
import type { ReactNode } from 'react';

interface Props {
  id: string;
  titre: string;
  /** Ce que montre le graphique et comment le lire (sert aussi de description accessible). */
  description: ReactNode;
  /** Ordre de tri, toujours expliqué. */
  tri?: string;
  tableau: { entetes: string[]; lignes: (string | number)[][]; legende?: string };
  children: ReactNode;
  className?: string;
  /** Niveau du titre, selon la page (h2 si aucun titre de niveau 2 ne précède). */
  niveau?: 2 | 3;
}

export default function Figure({ id, titre, description, tri, tableau, children, className = '', niveau = 3 }: Props) {
  const Titre = niveau === 2 ? 'h2' : 'h3';
  return (
    <figure id={id} className={`brut-panel min-w-0 bg-card p-4 sm:p-5 ${className}`} aria-labelledby={`${id}-titre`} aria-describedby={`${id}-desc`}>
      <Titre id={`${id}-titre`} className="font-sans text-lg font-bold">
        {titre}
      </Titre>
      <div id={`${id}-desc`} className="mt-1 text-sm text-muted-foreground">
        {description}
        {tri && <> {tri}</>}
      </div>
      <div className="mt-4">{children}</div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold">Voir les données en tableau</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            {tableau.legende && <caption className="mb-1 text-left text-muted-foreground">{tableau.legende}</caption>}
            <thead>
              <tr>
                {tableau.entetes.map((e) => (
                  <th key={e} scope="col" className="border-b border-border px-2 py-1 font-semibold">
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableau.lignes.map((l, i) => (
                <tr key={i}>
                  {l.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="border-b border-border/40 px-2 py-1 font-normal">
                        {c}
                      </th>
                    ) : (
                      <td key={j} className="border-b border-border/40 px-2 py-1 tabular-nums">
                        {c}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
