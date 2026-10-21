// Méthode : deux graphiques tirés du rapport d'audit calculé au build.
// 1. Ratios observé / attendu des premières places, par tiers de l'axe calculé, en mode long et rapide
//    (1 = neutre). Même couleur pour les deux modes ; la forme du point les distingue.
// 2. Équilibre des formulations : affirmations dont « d'accord » rapproche de chaque pôle de l'axe,
//    en barres opposées de même couleur (seul le côté change). Rendu au build (aucun JavaScript).
import type { ChiffresAudit } from '@/lib/audit';
import Figure from './Figure';

const MIN = 0.5;
const MAX = 1.5;
const pos = (r: number) => `${((Math.min(MAX, Math.max(MIN, r)) - MIN) / (MAX - MIN)) * 100}%`;

export function RatiosTiers({ chiffres }: { chiffres: ChiffresAudit }) {
  const tiers = chiffres.tiers.long.map((t) => t.tiers);
  const ratio = (mode: 'long' | 'rapide', t: string) => chiffres.tiers[mode].find((x) => x.tiers === t)?.ratio ?? null;
  const point = (mode: 'long' | 'rapide', r: number | null) =>
    r === null ? null : (
      <span
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: pos(r),
          background: mode === 'long' ? 'var(--viz-marque)' : 'var(--viz-anneau)',
          border: '2px solid var(--viz-marque)',
          boxShadow: '0 0 0 2px var(--viz-anneau)',
        }}
      />
    );
  return (
    <Figure
      id="graph-ratios"
      titre="Qui sort premier face à des réponses au hasard ?"
      description={
        <>
          Pour chaque tiers de l'axe calculé, nombre de premières places obtenues avec 2 000 profils sans opinion, divisé par le nombre attendu si le calcul était neutre. 1 =
          neutre ; au-dessus, le tiers sort premier plus souvent qu'attendu. Point plein : mode long ; point creux : mode rapide.
        </>
      }
      tri="Lignes dans l'ordre de l'axe calculé."
      tableau={{
        entetes: ["Tiers de l'axe", 'Ratio, mode long', 'Ratio, mode rapide', '1er observé / attendu (long)', '1er observé / attendu (rapide)'],
        lignes: tiers.map((t) => {
          const l = chiffres.tiers.long.find((x) => x.tiers === t)!;
          const r = chiffres.tiers.rapide.find((x) => x.tiers === t);
          return [`« ${t} »`, l.ratio ?? '—', r?.ratio ?? '—', `${l.observe} / ${l.attendu}`, r ? `${r.observe} / ${r.attendu}` : '—'];
        }),
      }}
    >
      <div aria-hidden="true" className="text-xs sm:text-sm">
        <ul className="grid gap-2">
          {tiers.map((t) => (
            <li key={t} className="grid grid-cols-[5.5rem_1fr_5.5rem] items-center gap-2" title={`« ${t} » : ${ratio('long', t)} (long), ${ratio('rapide', t)} (rapide)`}>
              <span className="font-semibold">« {t} »</span>
              <span className="relative h-6">
                {[0.5, 0.75, 1, 1.25, 1.5].map((g) => (
                  <span key={g} className="absolute inset-y-0 w-px" style={{ left: pos(g), background: g === 1 ? 'var(--viz-axe)' : 'var(--viz-grille)' }} />
                ))}
                {point('long', ratio('long', t))}
                {point('rapide', ratio('rapide', t))}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {ratio('long', t)} · {ratio('rapide', t)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 grid grid-cols-[5.5rem_1fr_5.5rem] gap-2">
          <span />
          <span className="relative h-4 text-muted-foreground tabular-nums">
            {[0.5, 1, 1.5].map((g) => (
              <span key={g} className="absolute -translate-x-1/2" style={{ left: pos(g) }}>
                {String(g).replace('.', ',')}
              </span>
            ))}
          </span>
          <span />
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full" style={{ background: 'var(--viz-marque)' }} /> mode long
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2" style={{ borderColor: 'var(--viz-marque)' }} /> mode rapide
          </li>
          <li>trait vertical : 1 = neutre</li>
        </ul>
      </div>
    </Figure>
  );
}

export function EquilibreFormulations({ chiffres }: { chiffres: ChiffresAudit }) {
  const max = Math.max(...chiffres.equilibre.flatMap((e) => [e.poleA, e.poleB]), 1);
  return (
    <Figure
      id="graph-formulations"
      titre="Équilibre des formulations entre les deux pôles"
      description={
        <>
          Nombre d'affirmations pour lesquelles répondre « d'accord » rapproche d'un pôle de l'axe calculé (barre de gauche : pôle « gauche » de l'audit ; barre de droite : pôle
          « droit »). Des barres de même longueur signifient qu'une personne qui répond souvent « d'accord » n'est pas poussée d'un côté. Les affirmations transversales ne
          penchent d'aucun côté.
        </>
      }
      tri="Lignes : modes long, moyen et rapide."
      tableau={{
        entetes: ['Mode', 'Questions', 'Pôle « gauche »', 'Pôle « droit »', 'Transversales', 'Indéterminées'],
        lignes: chiffres.equilibre.map((e) => [e.mode, e.questions, e.poleA, e.poleB, e.transversales, e.indeterminees]),
      }}
    >
      <div aria-hidden="true" className="text-xs sm:text-sm">
        <div className="mb-1 grid grid-cols-[4.5rem_1fr_1fr_6rem] gap-2 text-muted-foreground">
          <span />
          <span className="text-right">← « gauche »</span>
          <span>« droit » →</span>
          <span />
        </div>
        <ul className="grid gap-2">
          {chiffres.equilibre.map((e) => (
            <li key={e.mode} className="grid grid-cols-[4.5rem_1fr_1fr_6rem] items-center gap-2" title={`${e.mode} : ${e.poleA} / ${e.poleB}, ${e.transversales} transversales`}>
              <span className="font-semibold">{e.mode}</span>
              <span className="flex items-center justify-end gap-1.5">
                <span className="tabular-nums">{e.poleA}</span>
                <span className="h-4 rounded-l-[4px]" style={{ width: `${(85 * e.poleA) / max}%`, background: 'var(--viz-marque)' }} />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 rounded-r-[4px]" style={{ width: `${(85 * e.poleB) / max}%`, background: 'var(--viz-marque)' }} />
                <span className="tabular-nums">{e.poleB}</span>
              </span>
              <span className="text-muted-foreground">{e.transversales} transv.</span>
            </li>
          ))}
        </ul>
      </div>
    </Figure>
  );
}
