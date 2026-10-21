// Lecture des chiffres du rapport d'audit (sortie Markdown de scripts/audit_biais.py, calculée au
// build) pour les graphiques de la page Méthode. Si le format du rapport change, les graphiques
// disparaissent proprement (le rapport complet reste affiché).

export interface Tiers {
  tiers: string;
  observe: number;
  attendu: number;
  ratio: number | null;
}
export interface Equilibre {
  mode: string;
  questions: number;
  poleA: number;
  poleB: number;
  transversales: number;
  indeterminees: number;
}
export interface ChiffresAudit {
  tiers: Record<'long' | 'rapide', Tiers[]>;
  equilibre: Equilibre[];
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
  const equilibre = tableApres(md, '**Équilibre global**', '| Mode | Questions |').map((c) => ({
    mode: c[0],
    questions: Number(c[1]),
    poleA: Number(c[2]),
    poleB: Number(c[3]),
    transversales: Number(c[4]),
    indeterminees: Number(c[5]),
  }));
  const res = { tiers: { long: tiers('long'), rapide: tiers('rapide') }, equilibre };
  if (!res.tiers.long.length || !res.tiers.rapide.length || !res.equilibre.length) return null;
  return res;
}
