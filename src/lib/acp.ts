// Carte « vous et les candidats » : deux axes calculés à partir des seules positions des candidats
// (analyse en composantes principales), comme le premier axe de scripts/audit_biais.py du skill.
// Aucune question ni aucun candidat n'est étiqueté à la main.
//
// 1. Candidats ayant au moins MIN_POSITIONS positions connues ; positions centrées par question
//    (une position inconnue vaut la moyenne, donc 0 une fois centrée).
// 2. Premier axe : vecteur propre principal de la matrice de covariance (itération de la puissance).
//    Second axe : même calcul après avoir retiré le premier (déflation).
// 3. Coordonnée d'un candidat ou de la personne : moindres carrés sur les seules questions connues
//    (ou répondues), Σ x·w / Σ w².
// 4. Sens d'un axe : la question qui pèse le plus sur l'axe est placée du côté positif. Ce choix est
//    arbitraire mais calculé ; il ne dit rien de « gauche » ou de « droite » politiques.

export const MIN_POSITIONS = 10;

export interface Axe {
  /** Poids de chaque question sur l'axe (vecteur unitaire). */
  poids: Record<string, number>;
  /** Part de la variance des positions expliquée par l'axe (0 à 1). */
  variance: number;
}

export interface Carte {
  qids: string[];
  moyennes: Record<string, number>;
  axes: [Axe, Axe];
  coords: Record<string, [number, number]>;
  nonPlaces: string[];
}

type Positions = Record<string, { valeur?: number | null } | null | undefined>;
const val = (p: Positions | undefined, q: string) => {
  const v = p?.[q]?.valeur;
  return v === null || v === undefined ? null : v;
};

function puissance(cov: number[][], n: number): number[] {
  let w = new Array(n).fill(1);
  for (let it = 0; it < 500; it++) {
    const nw = cov.map((ligne) => ligne.reduce((s, c, j) => s + c * w[j], 0));
    const norme = Math.sqrt(nw.reduce((s, x) => s + x * x, 0)) || 1;
    const u = nw.map((x) => x / norme);
    const fini = u.every((x, i) => Math.abs(x - w[i]) < 1e-10);
    w = u;
    if (fini) break;
  }
  return w;
}

export function calculerCarte(candidats: { slug: string; positions: Positions }[], qids: string[]): Carte {
  const base = candidats.filter((c) => qids.filter((q) => val(c.positions, q) !== null).length >= MIN_POSITIONS);
  const moyennes: Record<string, number> = {};
  for (const q of qids) {
    const vs = base.map((c) => val(c.positions, q)).filter((v): v is number => v !== null);
    moyennes[q] = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
  }
  const X = base.map((c) => qids.map((q) => (val(c.positions, q) === null ? 0 : val(c.positions, q)! - moyennes[q])));
  const n = qids.length;
  const cov = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
  const trace = cov.reduce((s, l, i) => s + l[i], 0) || 1;

  const axes: Axe[] = [];
  let m = cov.map((l) => [...l]);
  for (let k = 0; k < 2; k++) {
    let w = puissance(m, n);
    const propre = w.reduce((s, wi, i) => s + wi * m[i].reduce((t, c, j) => t + c * w[j], 0), 0);
    // Sens : la question au poids le plus fort (en valeur absolue) du côté positif.
    const iMax = w.reduce((im, x, i) => (Math.abs(x) > Math.abs(w[im]) ? i : im), 0);
    if (w[iMax] < 0) w = w.map((x) => -x);
    axes.push({ poids: Object.fromEntries(qids.map((q, i) => [q, w[i]])), variance: propre / trace });
    // Déflation : on retire la composante trouvée.
    m = m.map((l, i) => l.map((c, j) => c - propre * w[i] * w[j]));
  }

  const coords: Record<string, [number, number]> = {};
  const nonPlaces: string[] = [];
  for (const c of candidats) {
    const reponses = Object.fromEntries(qids.map((q) => [q, val(c.positions, q)]));
    const p = projeter(reponses, { qids, moyennes, axes: axes as [Axe, Axe] }, MIN_POSITIONS);
    if (p) coords[c.slug] = p;
    else nonPlaces.push(c.slug);
  }
  return { qids, moyennes, axes: axes as [Axe, Axe], coords, nonPlaces };
}

/** Place une série de réponses (de -2 à 2, null = inconnue) sur la carte ; null si trop peu de réponses. */
export function projeter(
  reponses: Record<string, number | null | undefined>,
  carte: Pick<Carte, 'qids' | 'moyennes' | 'axes'>,
  minimum = 3,
): [number, number] | null {
  const connues = carte.qids.filter((q) => reponses[q] !== null && reponses[q] !== undefined);
  if (connues.length < minimum) return null;
  return carte.axes.map((a) => {
    const num = connues.reduce((s, q) => s + (reponses[q]! - carte.moyennes[q]) * a.poids[q], 0);
    const den = connues.reduce((s, q) => s + a.poids[q] ** 2, 0);
    return den ? num / den : 0;
  }) as [number, number];
}

/** Les questions qui pèsent le plus de chaque côté d'un axe (pour décrire l'axe sans l'étiqueter). */
export function questionsMarquantes(axe: Axe, n = 2) {
  const tri = Object.entries(axe.poids).sort((a, b) => b[1] - a[1]);
  return { positif: tri.slice(0, n).map(([q]) => q), negatif: tri.slice(-n).reverse().map(([q]) => q) };
}
