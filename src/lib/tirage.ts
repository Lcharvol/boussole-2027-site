// Portage à l'identique de skills/boussole-presidentielle-2027/scripts/tirage.py : quels enjeux poser,
// dans quel ordre, avec quelle formulation et quel pôle à gauche.
//
// Toute modification de tirage.py doit être reportée ici : le test de concordance de la CI
// (scripts/concordance.ts) compare les deux tirages, à graine égale, et échoue au moindre écart.
// Les commentaires de tirage.py font foi pour la méthode ; ce fichier suit sa structure.
import { PyRandom, pyPstdev, pySum } from './python';
import { calculer, type CandidatCalcul, type Profil } from './score';

export const RAPIDE = 12;
export const LOT = 4;
export const MAX_ADAPTATIF = 32;
export const GAIN_MIN = 0.4;
export const PLANCHER_POIDS = 0.1;
export const TIRAGES_ADAPTATIF = 300;
export const MODES = ['rapide', 'adaptatif', 'complet'] as const;
export type ModeTirage = (typeof MODES)[number];

export interface VarianteTirage {
  id: string;
  question: string;
  a: string;
  b: string;
  validee?: boolean;
}
export interface EnjeuTirage {
  id: string;
  theme: string;
  contexte?: string | null;
  variantes: VarianteTirage[];
}
export interface ReferentielTirage {
  themes: Record<string, string>;
  enjeux: EnjeuTirage[];
}
export interface QuestionTiree {
  enjeu: string;
  theme: string;
  theme_libelle: string;
  variante: string;
  question: string;
  contexte: string | null;
  gauche: { pole: 'a' | 'b'; texte: string };
  droite: { pole: 'a' | 'b'; texte: string };
  options: { libelle: string; valeur: number }[];
}
export interface Tirage {
  mode: ModeTirage;
  graine: number;
  posees: number;
  fin: boolean;
  raison: string | null;
  questions: QuestionTiree[];
}

const valeurDe = (c: CandidatCalcul, id: string) => {
  const v = c.positions?.[id]?.valeur;
  return v === undefined ? null : v;
};

export function pouvoir(enjeuId: string, candidats: CandidatCalcul[]): number {
  const vals = candidats.map((c) => valeurDe(c, enjeuId)).filter((v): v is number => v !== null);
  if (vals.length < 2 || !candidats.length) return 0.0;
  return (pyPstdev(vals) * vals.length) / candidats.length;
}

export function variantesUtilisables(enjeu: EnjeuTirage): VarianteTirage[] {
  const validees = enjeu.variantes.filter((v) => v.validee);
  return validees.length ? validees : enjeu.variantes;
}

export function presenter(enjeu: EnjeuTirage, themes: Record<string, string>, graine: number): QuestionTiree {
  const rng = new PyRandom(`${graine}/${enjeu.id}`);
  const v = rng.choice(variantesUtilisables(enjeu));
  const gauche = rng.choice(['a', 'b'] as const);
  const droite = gauche === 'a' ? 'b' : 'a';
  const signe = gauche === 'a' ? -1 : 1;
  const textes = { a: v.a, b: v.b };
  const libelles = [
    `${textes[gauche]} — nettement`,
    `Plutôt : ${textes[gauche]}`,
    'Entre les deux',
    `Plutôt : ${textes[droite]}`,
    `${textes[droite]} — nettement`,
  ];
  return {
    enjeu: enjeu.id,
    theme: enjeu.theme,
    theme_libelle: themes[enjeu.theme],
    variante: v.id,
    question: v.question,
    contexte: enjeu.contexte ?? null,
    gauche: { pole: gauche, texte: textes[gauche] },
    droite: { pole: droite, texte: textes[droite] },
    // signe × s, sans « -0 » (Python n'a pas de zéro négatif entier).
    options: libelles.map((libelle, i) => ({ libelle, valeur: signe * [2, 1, 0, -1, -2][i] || 0 })),
  };
}

function tiragePondere(rng: PyRandom, ids: string[], poids: Record<string, number>, k: number): string[] {
  const reste = [...ids];
  const choisis: string[] = [];
  while (reste.length && choisis.length < k) {
    const total = pySum(reste.map((i) => poids[i]));
    const x = rng.random() * total;
    let cumul = 0.0;
    let i = reste[0];
    for (i of reste) {
      cumul += poids[i];
      if (x <= cumul) break;
    }
    choisis.push(i);
    reste.splice(reste.indexOf(i), 1);
  }
  return choisis;
}

function ordonner(rng: PyRandom, enjeux: string[], themeDe: Record<string, string>): string[] {
  const reste = [...enjeux];
  rng.shuffle(reste);
  const ordre: string[] = [];
  while (reste.length) {
    const precedent = ordre.length ? themeDe[ordre[ordre.length - 1]] : null;
    const restant: Record<string, number> = {};
    for (const e of reste) restant[themeDe[e]] = (restant[themeDe[e]] ?? 0) + 1;
    let possibles = reste.map((_, k) => k).filter((k) => themeDe[reste[k]] !== precedent);
    if (!possibles.length) possibles = [0];
    // max(possibles, key=(restant, -k)) : le plus d'enjeux restants, à égalité le premier.
    let i = possibles[0];
    for (const k of possibles) if (restant[themeDe[reste[k]]] > restant[themeDe[reste[i]]]) i = k;
    ordre.push(reste.splice(i, 1)[0]);
  }
  return ordre;
}

export function socle(ref: ReferentielTirage, candidats: CandidatCalcul[], graine: number): string[] {
  const rng = new PyRandom(`${graine}/socle`);
  const enjeux = ref.enjeux;
  const themeDe = Object.fromEntries(enjeux.map((e) => [e.id, e.theme]));
  const poids = Object.fromEntries(enjeux.map((e) => [e.id, pouvoir(e.id, candidats) + PLANCHER_POIDS]));
  const choisis: string[] = [];
  for (const theme of Object.keys(ref.themes)) {
    const duTheme = enjeux.filter((e) => e.theme === theme).map((e) => e.id);
    choisis.push(...tiragePondere(rng, duTheme, poids, 1));
  }
  while (choisis.length < Math.min(RAPIDE, enjeux.length)) {
    const pris: Record<string, number> = {};
    for (const t of Object.keys(ref.themes)) pris[t] = choisis.filter((c) => themeDe[c] === t).length;
    let dispo = enjeux.filter((e) => !choisis.includes(e.id) && pris[e.theme] < 2).map((e) => e.id);
    if (!dispo.length) dispo = enjeux.filter((e) => !choisis.includes(e.id)).map((e) => e.id);
    choisis.push(...tiragePondere(rng, dispo, poids, 1));
  }
  return ordonner(rng, choisis, themeDe);
}

function departage(enjeuId: string, peloton: CandidatCalcul[], importance: Record<string, number>, theme: string): number {
  const vals = peloton.map((c) => valeurDe(c, enjeuId)).filter((v): v is number => v !== null);
  if (vals.length < 2) return 0.0;
  return ((pyPstdev(vals) * vals.length) / peloton.length) * Math.sqrt(Number(importance[theme] ?? 1));
}

export function suivantes(
  ref: ReferentielTirage,
  candidats: CandidatCalcul[],
  user: Profil,
  graine: number,
  tirages = TIRAGES_ADAPTATIF,
): [string[], string | null] {
  const posees = new Set(Object.keys(user.reponses ?? {}));
  const resteSocle = socle(ref, candidats, graine).filter((e) => !posees.has(e));
  if (resteSocle.length) return [resteSocle, null];
  if (posees.size >= MAX_ADAPTATIF) return [[], `${MAX_ADAPTATIF} enjeux posés, le maximum du mode adaptatif`];
  const res = calculer(user, ref, candidats, tirages, graine);
  const noms = new Set(res.peloton_de_tete);
  const peloton = candidats.filter((c) => noms.has(c.nom));
  if (peloton.length < 2) return [[], "le premier candidat se détache : sa marge ne recouvre plus celle d'aucun autre"];
  const themeDe = Object.fromEntries(ref.enjeux.map((e) => [e.id, e.theme]));
  const importance = user.importance ?? {};
  const rng = new PyRandom(`${graine}/adaptatif/${posees.size}`);
  const gains: Record<string, number> = {};
  for (const e of ref.enjeux) if (!posees.has(e.id)) gains[e.id] = departage(e.id, peloton, importance, e.theme) + rng.random() * 1e-6;
  const utiles = Object.keys(gains)
    .filter((i) => gains[i] >= GAIN_MIN)
    .sort((x, y) => gains[y] - gains[x]);
  if (!utiles.length) return [[], 'les enjeux restants ne départagent plus les candidats en tête'];
  const lot: string[] = [];
  const themesPris = new Set<string>();
  for (const i of utiles) {
    if (!themesPris.has(themeDe[i])) {
      lot.push(i);
      themesPris.add(themeDe[i]);
    }
    if (lot.length === Math.min(LOT, MAX_ADAPTATIF - posees.size)) break;
  }
  return [ordonner(rng, lot, themeDe), null];
}

/** tirer() de tirage.py. `candidats` : les candidats actifs, dans l'ordre des fichiers (comme charger()). */
export function tirer(mode: ModeTirage, graine: number, user: Profil, ref: ReferentielTirage, candidats: CandidatCalcul[]): Tirage {
  if (!MODES.includes(mode)) throw new Error(`Mode inconnu : ${mode} (attendu : ${MODES.join(', ')})`);
  const parId = Object.fromEntries(ref.enjeux.map((e) => [e.id, e]));
  const inconnus = Object.keys(user.reponses ?? {})
    .filter((k) => !(k in parId))
    .sort();
  if (inconnus.length) throw new Error(`Identifiants d'enjeu inconnus : ${inconnus.join(', ')}`);
  const posees = new Set(Object.keys(user.reponses ?? {}));
  let raison: string | null = null;
  let ids: string[];
  if (mode === 'rapide') ids = socle(ref, candidats, graine).filter((e) => !posees.has(e));
  else if (mode === 'complet') {
    const rng = new PyRandom(`${graine}/complet`);
    const themeDe = Object.fromEntries(ref.enjeux.map((e) => [e.id, e.theme]));
    ids = ordonner(rng, Object.keys(parId).filter((e) => !posees.has(e)), themeDe);
  } else [ids, raison] = suivantes(ref, candidats, user, graine);
  if (!ids.length && raison === null) raison = `tous les enjeux du mode ${mode} ont été posés`;
  return {
    mode,
    graine,
    posees: posees.size,
    fin: !ids.length,
    raison,
    questions: ids.map((i) => presenter(parId[i], ref.themes, graine)),
  };
}

/** Nouvelle graine, comme random.SystemRandom().randrange(1, 10**6) dans tirage.py. */
export function nouvelleGraine(): number {
  const t = new Uint32Array(1);
  crypto.getRandomValues(t);
  return 1 + (t[0] % 999_999);
}
