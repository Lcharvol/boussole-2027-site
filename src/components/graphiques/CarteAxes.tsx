// Résultat : carte « vous et les candidats » sur deux axes calculés à partir des seules positions
// des candidats (analyse en composantes principales, voir src/lib/acp.ts). La personne est placée
// dans le navigateur à partir de ses réponses. Seuls « Vous » et les candidats les plus proches de
// vous sur la carte sont nommés ; tous les points ont une info-bulle et figurent dans le tableau.
import { projeter, questionsMarquantes, type Carte } from '@/lib/acp';
import Figure from './Figure';

interface Props {
  carte: Carte;
  noms: Record<string, string>;
  /** Pôles de chaque enjeu, pour décrire les axes. */
  poles: Record<string, { pole_a: string; pole_b: string }>;
  reponses: Record<string, number | null>;
}

const L = 400;
const H = 360;
const M = 28;

export default function CarteAxes({ carte, noms, poles, reponses }: Props) {
  const vous = projeter(reponses, carte);
  const pts = Object.entries(carte.coords);
  const xs = [...pts.map(([, p]) => p[0]), ...(vous ? [vous[0]] : [])];
  const ys = [...pts.map(([, p]) => p[1]), ...(vous ? [vous[1]] : [])];
  const bx = Math.max(...xs.map(Math.abs)) * 1.12 || 1;
  const by = Math.max(...ys.map(Math.abs)) * 1.15 || 1;
  const X = (x: number) => L / 2 + (x / bx) * (L / 2 - M);
  const Y = (y: number) => H / 2 - (y / by) * (H / 2 - M);
  const dist = (p: [number, number]) => (vous ? Math.hypot(p[0] - vous[0], p[1] - vous[1]) : 0);
  const proches = vous ? [...pts].sort((a, b) => dist(a[1]) - dist(b[1])).slice(0, 4).map(([s]) => s) : [];

  // Étiquettes sans chevauchement : à droite, à gauche, au-dessus ou au-dessous du point.
  // Les points eux-mêmes sont des obstacles : une étiquette ne recouvre jamais un autre point.
  const boites: { x: number; y: number; w: number; h: number }[] = [
    ...pts.map(([, [x, y]]) => ({ x: X(x) - 6, y: Y(y) - 6, w: 12, h: 12 })),
    ...(vous ? [{ x: X(vous[0]) - 11, y: Y(vous[1]) - 11, w: 22, h: 22 }] : []),
  ];
  const placer = (cx: number, cy: number, texte: string, taille: number) => {
    const w = texte.length * taille * 0.56;
    const h = taille * 1.2;
    const essais = [
      [cx + 10, cy - h / 2],
      [cx - 10 - w, cy - h / 2],
      [cx - w / 2, cy - 11 - h],
      [cx - w / 2, cy + 11],
      [cx + 10, cy - h - 4],
      [cx + 10, cy + 4],
      [cx - 10 - w, cy - h - 4],
      [cx - 10 - w, cy + 4],
    ];
    for (const [x, y] of essais) {
      const b = { x, y, w, h };
      const dedans = x >= 2 && x + w <= L - 2 && y >= 2 && y + h <= H - 2;
      if (dedans && !boites.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)) {
        boites.push(b);
        return { x, y: y + h * 0.82 };
      }
    }
    return null;
  };
  const etiquettes: { x: number; y: number; texte: string; vous?: boolean }[] = [];
  if (vous) {
    const p = placer(X(vous[0]), Y(vous[1]), 'Vous', 15);
    if (p) etiquettes.push({ ...p, texte: 'Vous', vous: true });
  }
  for (const s of proches) {
    const [x, y] = carte.coords[s];
    const nom = noms[s].split(' ').slice(1).join(' '); // nom de famille (« Le Pen », « de Villepin »…)
    const p = placer(X(x), Y(y), nom, 13);
    if (p) etiquettes.push({ ...p, texte: nom });
  }

  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const decrire = (i: 0 | 1) => {
    // Un enjeu de poids positif va vers son pôle B du côté positif de l'axe ; un enjeu de poids négatif,
    // vers son pôle A. On décrit chaque côté par les deux enjeux qui pèsent le plus (un de chaque signe).
    const m = questionsMarquantes(carte.axes[i]);
    const p = poles[m.positif[0]];
    const n = poles[m.negatif[0]];
    return (
      <>
        {i === 0 ? 'Vers la droite du graphique' : 'Vers le haut'}, plutôt « {p.pole_b} » et « {n.pole_a} » ; {i === 0 ? 'vers la gauche' : 'vers le bas'}, plutôt « {p.pole_a} » et
        « {n.pole_b} ».
      </>
    );
  };

  return (
    <Figure
      id="graph-carte"
      titre="Vous et les candidats, sur deux axes calculés"
      description={
        vous ? (
          <>Votre point (losange jaune) est placé à partir de vos réponses, comme ceux des candidats à partir de leurs positions. Les quatre candidats les plus proches de vous sur la carte sont nommés ; survolez un point pour voir les autres.</>
        ) : (
          <>Vous avez répondu à trop peu de questions pour être placé sur la carte ; seuls les candidats y figurent.</>
        )
      }
      tri="La distance sur la carte résume vos réponses sur deux axes seulement : elle ne remplace pas le score de proximité."
      tableau={{
        entetes: ['Candidat', 'Axe horizontal', 'Axe vertical', ...(vous ? ['Distance à vous'] : [])],
        lignes: [
          ...(vous ? [['Vous', vous[0].toFixed(1), vous[1].toFixed(1), '0']] : []),
          ...[...pts]
            .sort((a, b) => (vous ? dist(a[1]) - dist(b[1]) : noms[a[0]].localeCompare(noms[b[0]], 'fr')))
            .map(([s, p]) => [noms[s], p[0].toFixed(1), p[1].toFixed(1), ...(vous ? [dist(p).toFixed(1)] : [])]),
        ],
        legende: carte.nonPlaces.length ? `Non placés (moins de 10 positions connues) : ${carte.nonPlaces.map((s) => noms[s]).join(', ')}.` : undefined,
      }}
    >
      <svg viewBox={`0 0 ${L} ${H}`} className="mx-auto h-auto w-full max-w-xl" role="presentation" aria-hidden="true" style={{ fontFamily: 'inherit' }}>
        <line x1={M / 2} x2={L - M / 2} y1={Y(0)} y2={Y(0)} stroke="var(--viz-axe)" strokeWidth={1} />
        <line y1={M / 2} y2={H - M / 2} x1={X(0)} x2={X(0)} stroke="var(--viz-axe)" strokeWidth={1} />
        <text x={L - M / 2} y={Y(0) - 6} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
          axe 1 ({pct(carte.axes[0].variance)})
        </text>
        <text x={X(0) + 6} y={M / 2 + 10} fontSize={11} fill="var(--muted-foreground)">
          axe 2 ({pct(carte.axes[1].variance)})
        </text>
        {pts.map(([s, [x, y]]) => (
          <g key={s}>
            <title>{noms[s]}</title>
            <circle cx={X(x)} cy={Y(y)} r={12} fill="transparent" />
            <circle cx={X(x)} cy={Y(y)} r={4.5} fill="var(--viz-marque)" stroke="var(--viz-anneau)" strokeWidth={2} />
          </g>
        ))}
        {vous && (
          <g>
            <title>Vous</title>
            <rect x={X(vous[0]) - 7} y={Y(vous[1]) - 7} width={14} height={14} transform={`rotate(45 ${X(vous[0])} ${Y(vous[1])})`} fill="var(--viz-vous)" stroke="var(--foreground)" strokeWidth={2} />
          </g>
        )}
        {etiquettes.map((e) => (
          <text key={e.texte} x={e.x} y={e.y} fontSize={e.vous ? 15 : 13} fontWeight={e.vous ? 800 : 600} fill="var(--foreground)" stroke="var(--viz-anneau)" strokeWidth={3} paintOrder="stroke">
            {e.texte}
          </text>
        ))}
      </svg>
      <div className="mt-3 rounded-[var(--radius)] border border-border/40 bg-muted/60 p-3 text-xs leading-relaxed sm:text-sm">
        <p className="font-semibold">Comment les axes sont obtenus</p>
        <p className="mt-1">
          Personne n'a placé les axes ni les candidats à la main. On cherche, à partir des seules positions des candidats sur les {carte.qids.length} questions, la direction
          qui les sépare le plus (axe 1, {pct(carte.axes[0].variance)} des écarts), puis la suivante (axe 2, {pct(carte.axes[1].variance)}) : c'est une analyse en composantes
          principales, la même que dans l'audit de neutralité. Le sens de chaque axe est fixé par le calcul ; la gauche et la droite du graphique ne désignent pas la gauche
          et la droite politiques.
        </p>
        <ul className="mt-1 list-disc pl-5">
          <li>Axe 1 : {decrire(0)}</li>
          <li>Axe 2 : {decrire(1)}</li>
        </ul>
      </div>
    </Figure>
  );
}
