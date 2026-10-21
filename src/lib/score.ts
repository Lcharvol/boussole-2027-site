// Portage à l'identique de skills/boussole-presidentielle-2027/scripts/score.py.
//
// Toute modification de score.py doit être reportée ici : le test de concordance de la CI
// (scripts/concordance.mjs) compare les deux sorties sur une série de profils et échoue au moindre écart.
// Les commentaires de score.py font foi pour la méthode ; ce fichier suit sa structure ligne à ligne.
import { PyRandom, pyRound, pyRoundN, pySum } from './python';

export const COUVERTURE_MIN = 0.5;
export const POIDS_INCONNUE = 2 ** 0.5 - 1;
export const POIDS_CONFIANCE = { programme: 1.0, declaration: 0.85, deduite: 0.6 } as const;
export type Confiance = keyof typeof POIDS_CONFIANCE;
export const TIRAGES = 1000;
export const NIVEAU = 0.9;
export const GRAINE = 2027;

export type Valeur = -2 | -1 | 0 | 1 | 2;
export interface PositionCalcul {
  valeur?: number | null;
  confiance?: string | null;
}
export interface CandidatCalcul {
  slug: string;
  nom: string;
  parti?: string | null;
  statut?: string | null;
  positions?: Record<string, PositionCalcul | null | undefined>;
}
export interface QuestionCalcul {
  id: string;
  theme: string;
}
export interface Profil {
  reponses?: Record<string, number | null | undefined>;
  importance?: Record<string, number>;
}
export interface ResultatCandidat {
  slug: string;
  nom: string;
  parti: string | null;
  statut: string | null;
  score: number | null;
  marge: number | null;
  couverture: number;
  par_theme: Record<string, number>;
  par_confiance: Record<Confiance, number>;
  accords: string[];
  desaccords: string[];
  prioritaires_sans_donnee: string[];
}
export interface Resultat {
  nb_reponses: number;
  classement: ResultatCandidat[];
  donnees_insuffisantes: ResultatCandidat[];
  peloton_de_tete: string[];
  marge: { niveau: number; tirages: number };
}

export function accordHasard(v: number): number {
  const termes: number[] = [];
  for (let u = -2; u < 3; u++) termes.push(1 - Math.abs(u - v) / 4);
  return pySum(termes) / 5;
}

export function accordCorrige(u: number, v: number): number {
  const e = accordHasard(v);
  return (1 - Math.abs(u - v) / 4 - e) / (1 - e);
}

export function pourcentage(moyenne: number): number {
  return Math.min(100.0, Math.max(0.0, 50 + 50 * moyenne));
}

/** Candidats retenus par score.py (charger) : tous sauf le statut « retiré », dans l'ordre des fichiers. */
export function candidatsActifs<T extends CandidatCalcul>(candidats: T[]): T[] {
  return candidats.filter((c) => c.statut !== 'retiré');
}

function quantile(triees: number[], p: number): number {
  const x = (triees.length - 1) * p;
  const i = Math.trunc(x);
  if (i + 1 >= triees.length) return triees[triees.length - 1];
  return triees[i] + (triees[i + 1] - triees[i]) * (x - i);
}

type Contribution = [number, number];

function margeBootstrap(contributions: Contribution[], tirages: number, graine: number): number | null {
  const n = contributions.length;
  const rng = new PyRandom(graine);
  const scores: number[] = [];
  for (let t = 0; t < tirages; t++) {
    let p = 0.0;
    let w = 0.0;
    for (let k = 0; k < n; k++) {
      const c = contributions[rng.randrange(n)];
      p += c[0];
      w += c[1];
    }
    if (w) scores.push(pourcentage(p / w));
  }
  if (!scores.length) return null;
  scores.sort((a, b) => a - b);
  const alpha = (1 - NIVEAU) / 2;
  return pyRound((quantile(scores, 1 - alpha) - quantile(scores, alpha)) / 2);
}

const valeurDe = (c: CandidatCalcul, qid: string) => {
  const v = c.positions?.[qid]?.valeur;
  return v === undefined ? null : v;
};

export function calculer(
  user: Profil,
  questions: { questions: QuestionCalcul[] },
  candidats: CandidatCalcul[],
  tirages = TIRAGES,
  graine = GRAINE,
): Resultat {
  const reponses: Record<string, number> = {};
  for (const [k, v] of Object.entries(user.reponses ?? {})) if (v !== null && v !== undefined) reponses[k] = v;
  const importance = user.importance ?? {};
  const imp = (t: string) => Number(importance[t] ?? 1);
  const themeDe: Record<string, string> = {};
  for (const q of questions.questions) themeDe[q.id] = q.theme;
  const inconnues = Object.keys(reponses)
    .filter((k) => !(k in themeDe))
    .sort();
  if (inconnues.length) throw new Error(`Identifiants de question inconnus : ${inconnues.join(', ')}`);
  const qids = Object.keys(reponses).sort();

  const resultats: ResultatCandidat[] = [];
  for (const c of candidats) {
    let totalP = 0.0;
    let totalW = 0.0;
    const poidsConnus: number[] = [];
    const sansPosition: [number, number][] = [];
    const parTheme = new Map<string, [number, number]>();
    const accords: string[] = [];
    const desaccords: string[] = [];
    const parConfiance: Record<Confiance, number> = { programme: 0, declaration: 0, deduite: 0 };
    const contributions: (Contribution | null)[] = [];
    for (const qid of qids) {
      const u = reponses[qid];
      const pos = c.positions?.[qid] || {};
      const v = pos.valeur;
      const theme = themeDe[qid];
      if (v === null || v === undefined) {
        sansPosition.push([contributions.length, imp(theme)]);
        contributions.push(null);
        continue;
      }
      const confiance: Confiance =
        pos.confiance && pos.confiance in POIDS_CONFIANCE ? (pos.confiance as Confiance) : 'deduite';
      parConfiance[confiance] += 1;
      poidsConnus.push(POIDS_CONFIANCE[confiance]);
      const w = imp(theme) * POIDS_CONFIANCE[confiance];
      const accord = accordCorrige(u, v);
      contributions.push([w * accord, w]);
      totalP += w * accord;
      totalW += w;
      let t = parTheme.get(theme);
      if (!t) {
        t = [0.0, 0];
        parTheme.set(theme, t);
      }
      t[0] += accord;
      t[1] += 1;
      if (Math.abs(u - v) <= 1 && u !== 0) accords.push(qid);
      else if (Math.abs(u - v) >= 3) desaccords.push(qid);
    }
    const confianceMoyenne = poidsConnus.length ? pySum(poidsConnus) / poidsConnus.length : 0.0;
    let totalWInconnues = 0.0;
    for (const [i, im] of sansPosition) {
      const w = im * POIDS_INCONNUE * confianceMoyenne;
      contributions[i] = [0.0, w];
      totalWInconnues += w;
    }
    const couvertes = qids.filter((qid) => valeurDe(c, qid) !== null).length;
    const themesRepondus = new Set(qids.map((qid) => themeDe[qid]));
    const prioritaires = [...themesRepondus].filter((t) => imp(t) > 1 && !parTheme.has(t)).sort();
    resultats.push({
      slug: c.slug,
      nom: c.nom,
      parti: c.parti ?? null,
      statut: c.statut ?? null,
      score: totalW ? pyRound(pourcentage(totalP / (totalW + totalWInconnues))) : null,
      marge: totalW ? margeBootstrap(contributions as Contribution[], tirages, graine) : null,
      couverture: qids.length ? pyRoundN(couvertes / qids.length, 2) : 0,
      par_theme: Object.fromEntries([...parTheme].map(([t, [s, n]]) => [t, pyRound(pourcentage(s / n))])),
      par_confiance: parConfiance,
      accords,
      desaccords,
      prioritaires_sans_donnee: prioritaires,
    });
  }

  const fiables = resultats.filter((r) => r.score !== null && r.couverture >= COUVERTURE_MIN);
  const peuFiables = resultats.filter((r) => !fiables.includes(r));
  fiables.sort((a, b) => b.score! - a.score! || b.couverture - a.couverture);
  peuFiables.sort((a, b) => (b.score || 0) - (a.score || 0));
  let peloton: string[] = [];
  if (fiables.length) {
    const plancher = fiables[0].score! - (fiables[0].marge || 0);
    peloton = fiables.filter((r) => r.score! + (r.marge || 0) >= plancher).map((r) => r.nom);
  }
  return {
    nb_reponses: qids.length,
    classement: fiables,
    donnees_insuffisantes: peuFiables,
    peloton_de_tete: peloton,
    marge: { niveau: NIVEAU, tirages },
  };
}
