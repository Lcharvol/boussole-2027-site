// Méthode : deux graphiques tirés du rapport d'audit calculé au build (format 2 des données).
// 1. Ratios observé / attendu des premières places, par tiers de l'axe calculé, pour chaque mode
//    (1 = neutre). Même couleur pour tous les modes ; la forme du point les distingue.
// 2. Pôles des enjeux : nombre d'enjeux dont le pôle A, ou le pôle B, est proche du côté « gauche » de
//    l'axe calculé, en barres opposées de même couleur. Rendu au build (aucun JavaScript).
import type { CSSProperties } from 'react';
import type { ChiffresAudit, ModeAudit } from '@/lib/audit';
import Figure from './Figure';

const MIN = 0.5;
const MAX = 1.5;
const pos = (r: number) => `${((Math.min(MAX, Math.max(MIN, r)) - MIN) / (MAX - MIN)) * 100}%`;
const virgule = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const millier = (n: number | undefined) => (n === undefined ? '' : n.toLocaleString('fr-FR'));

// Forme du point de chaque mode (même couleur) : plein, creux, carré plein.
const FORME: Record<ModeAudit, { libelle: string; style: CSSProperties }> = {
  complet: { libelle: 'point plein', style: { background: 'var(--viz-marque)', borderRadius: '9999px' } },
  rapide: { libelle: 'point creux', style: { background: 'var(--viz-anneau)', border: '2px solid var(--viz-marque)', borderRadius: '9999px' } },
  adaptatif: { libelle: 'carré', style: { background: 'var(--viz-marque)', borderRadius: '2px' } },
};

export function RatiosTiers({ chiffres }: { chiffres: ChiffresAudit }) {
  const { modes } = chiffres;
  const tiers = chiffres.tiers.complet!.map((t) => t.tiers);
  const ligne = (m: ModeAudit, t: string) => chiffres.tiers[m]?.find((x) => x.tiers === t);
  const ratio = (m: ModeAudit, t: string) => ligne(m, t)?.ratio ?? null;
  const point = (m: ModeAudit, r: number | null) =>
    r === null ? null : (
      <span key={m} className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(r), boxShadow: '0 0 0 2px var(--viz-anneau)', ...FORME[m].style }} />
    );
  const nbProfils = modes.map((m) => `${millier(chiffres.profils[m])} en mode ${m}`).join(', ');
  return (
    <Figure
      id="graph-ratios"
      titre="Qui sort premier face à des réponses au hasard ?"
      description={
        <>
          Pour chaque tiers de l'axe calculé, nombre de premières places obtenues avec des profils sans opinion ({nbProfils}), divisé par le nombre attendu si le calcul était
          neutre. 1 = neutre ; au-dessus, le tiers sort premier plus souvent qu'attendu. {modes.map((m) => `${FORME[m].libelle[0].toUpperCase()}${FORME[m].libelle.slice(1)} : mode ${m}`).join(' ; ')}.
        </>
      }
      tri="Lignes dans l'ordre de l'axe calculé."
      tableau={{
        entetes: ["Tiers de l'axe", ...modes.map((m) => `Ratio, mode ${m}`), ...modes.map((m) => `1er observé / attendu (${m})`)],
        lignes: tiers.map((t) => [
          `« ${t} »`,
          ...modes.map((m) => ratio(m, t) ?? '—'),
          ...modes.map((m) => {
            const l = ligne(m, t);
            return l ? `${l.observe} / ${l.attendu}` : '—';
          }),
        ]),
      }}
    >
      <div aria-hidden="true" className="text-xs sm:text-sm">
        <ul className="grid gap-2">
          {tiers.map((t) => (
            <li key={t} className="grid grid-cols-[5.5rem_1fr_7rem] items-center gap-2" title={`« ${t} » : ${modes.map((m) => `${virgule(ratio(m, t))} (${m})`).join(', ')}`}>
              <span className="font-semibold">« {t} »</span>
              <span className="relative h-6">
                {[0.5, 0.75, 1, 1.25, 1.5].map((g) => (
                  <span key={g} className="absolute inset-y-0 w-px" style={{ left: pos(g), background: g === 1 ? 'var(--viz-axe)' : 'var(--viz-grille)' }} />
                ))}
                {modes.map((m) => point(m, ratio(m, t)))}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{modes.map((m) => virgule(ratio(m, t))).join(' · ')}</span>
            </li>
          ))}
        </ul>
        <div className="mt-1 grid grid-cols-[5.5rem_1fr_7rem] gap-2">
          <span />
          <span className="relative h-4 text-muted-foreground tabular-nums">
            {[0.5, 1, 1.5].map((g) => (
              <span key={g} className="absolute -translate-x-1/2" style={{ left: pos(g) }}>
                {virgule(g)}
              </span>
            ))}
          </span>
          <span />
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          {modes.map((m) => (
            <li key={m} className="flex items-center gap-1.5">
              <span className="size-3" style={FORME[m].style} /> mode {m}
            </li>
          ))}
          <li>trait vertical : 1 = neutre</li>
        </ul>
      </div>
    </Figure>
  );
}

export function EquilibrePoles({ chiffres }: { chiffres: ChiffresAudit }) {
  const { a, b, transversaux, indetermines } = chiffres.poles;
  const max = Math.max(a, b, 1);
  return (
    <Figure
      id="graph-poles"
      titre="Pôles A et B des enjeux, de part et d'autre de l'axe"
      description={
        <>
          Nombre d'enjeux dont le pôle A (barre de gauche) ou le pôle B (barre de droite) rapproche du côté « gauche » de l'axe calculé. Des barres de même longueur signifient
          que les données ne rangent pas systématiquement un camp du même côté. Dans le test, le côté où chaque pôle s'affiche est de toute façon tiré au hasard : ce décompte ne
          joue pas sur le résultat. Les enjeux transversaux ne penchent d'aucun côté.
        </>
      }
      tri="Une seule ligne : tous les enjeux."
      tableau={{
        entetes: ['Enjeux', 'Pôle A proche de la « gauche »', 'Pôle B proche de la « gauche »', 'Transversaux', 'Indéterminés'],
        lignes: [[a + b + transversaux + indetermines, a, b, transversaux, indetermines]],
      }}
    >
      <div aria-hidden="true" className="text-xs sm:text-sm">
        <div className="mb-1 grid grid-cols-[1fr_1fr_7rem] gap-2 text-muted-foreground">
          <span className="text-right">← pôle A</span>
          <span>pôle B →</span>
          <span />
        </div>
        <div className="grid grid-cols-[1fr_1fr_7rem] items-center gap-2" title={`Pôle A : ${a}, pôle B : ${b}, ${transversaux} transversaux`}>
          <span className="flex items-center justify-end gap-1.5">
            <span className="tabular-nums">{a}</span>
            <span className="h-4 rounded-l-[4px]" style={{ width: `${(85 * a) / max}%`, background: 'var(--viz-marque)' }} />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 rounded-r-[4px]" style={{ width: `${(85 * b) / max}%`, background: 'var(--viz-marque)' }} />
            <span className="tabular-nums">{b}</span>
          </span>
          <span className="text-muted-foreground">
            {transversaux} transv. · {indetermines} indét.
          </span>
        </div>
      </div>
    </Figure>
  );
}
