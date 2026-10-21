// Lecture des chiffres du rapport d'audit (sortie Markdown de scripts/audit_biais.py, calculée au
// build) pour les graphiques de la page Méthode. Si le format du rapport change, les graphiques
// disparaissent proprement (le rapport complet reste affiché).

export interface Tiers {
  tiers: string;
  observe: number;
  attendu: number;
  ratio: number | null;
}
/** Section 2 du rapport (format 2) : pôle de chaque enjeu proche du côté « gauche » de l'axe calculé. */
export interface Poles {
  a: number;
  b: number;
  transversaux: number;
  indetermines: number;
}
export const MODES_AUDIT = ['complet', 'rapide', 'adaptatif'] as const;
export type ModeAudit = (typeof MODES_AUDIT)[number];
export interface ChiffresAudit {
  /** Modes présents dans le rapport (complet et rapide au moins), dans cet ordre. */
  modes: ModeAudit[];
  tiers: Partial<Record<ModeAudit, Tiers[]>>;
  /** Nombre de profils aléatoires par mode. */
  profils: Partial<Record<ModeAudit, number>>;
  poles: Poles;
}

const cellules = (ligne: string) => ligne.split('|').slice(1, -1).map((c) => c.trim());
const nombre = (s: string) => (s === '—' ? null : Number(s.replace(',', '.')));

function tableApres(md: string, repere: string, entete: string): string[][] {
  const i = md.indexOf(repere);
  if (i < 0) return [];
  const j = md.indexOf(entete, i);
  if (j < 0) return [];
  const lignes = md.slice(j).split('\n');
  const res: string[][] = [];
  for (const l of lignes.slice(2)) {
    if (!l.startsWith('|')) break;
    res.push(cellules(l));
  }
  return res;
}

export function lireAudit(md: string): ChiffresAudit | null {
  if (!md.trim()) return null;
  const tiers = (mode: string) =>
    tableApres(md, `### Mode ${mode}`, "| Tiers de l'axe | 1er observé | Attendu | Ratio |")
      .filter((c) => c[0] !== 'non placé')
      .map((c) => ({ tiers: c[0], observe: Number(c[1]), attendu: Number(c[2]), ratio: nombre(c[3]) }));
  const t: Partial<Record<ModeAudit, Tiers[]>> = {};
  const profils: Partial<Record<ModeAudit, number>> = {};
  for (const m of MODES_AUDIT) {
    const l = tiers(m);
    if (l.length) t[m] = l;
    const n = md.match(new RegExp(`### Mode ${m} \\((\\d+) profils`));
    if (n) profils[m] = Number(n[1]);
  }
  const p = md.match(/Pôle proche de la gauche de l'axe : A pour (\d+) enjeux, B pour (\d+), (\d+) transversaux, (\d+) indéterminés/);
  if (!t.complet || !t.rapide || !p) return null;
  return {
    modes: MODES_AUDIT.filter((m) => t[m]),
    tiers: t,
    profils,
    poles: { a: Number(p[1]), b: Number(p[2]), transversaux: Number(p[3]), indetermines: Number(p[4]) },
  };
}
