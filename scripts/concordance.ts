// Test de concordance : src/lib/score.ts et src/lib/tirage.ts doivent donner exactement les mêmes résultats
// que scripts/score.py et scripts/tirage.py du skill : même tirage (enjeux, ordre, formulation, côté des
// pôles) et mêmes scores, à graine égale.
// Usage : npm run test:concordance  (nécessite Python 3.12 et les données préparées par npm run donnees ;
// PYTHON=python3.12 pour choisir l'interpréteur)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { PyRandom } from '../src/lib/python';
import { calculer, candidatsActifs, type Profil } from '../src/lib/score';
import { MODES, tirer, type ModeTirage } from '../src/lib/tirage';

const RACINE = resolve(import.meta.dirname, '..');
const skill = process.env.BOUSSOLE_SKILL_DIR ? resolve(process.env.BOUSSOLE_SKILL_DIR) : join(RACINE, '.donnees', 'skill');
const { enjeux: referentiel, candidats } = JSON.parse(readFileSync(join(RACINE, 'src', 'generated', 'donnees.json'), 'utf8'));
const es: { id: string; theme: string }[] = referentiel.enjeux;
const themes = Object.keys(referentiel.themes);
const actifs = candidatsActifs(candidats);

// Déroulés complets du questionnaire, comme dans le navigateur : on tire, on répond, on retire… jusqu'à la
// fin du mode. Chaque appel à tirer() est rejoué en Python avec la même entrée.
interface Appel {
  mode: ModeTirage;
  graine: number;
  user: Profil;
}
const appels: Appel[] = [];
const tiragesTs: unknown[] = [];
function derouler(mode: ModeTirage, graine: number, repondre: (enjeu: string, valeurs: number[]) => number | null, depart: Record<string, number | null> = {}) {
  const reponses: Record<string, number | null> = { ...depart };
  for (;;) {
    const user = { reponses: { ...reponses } };
    const t = tirer(mode, graine, user, referentiel, actifs);
    appels.push({ mode, graine, user });
    tiragesTs.push(JSON.parse(JSON.stringify(t)));
    if (t.fin) return reponses;
    for (const q of t.questions) reponses[q.enjeu] = repondre(q.enjeu, q.options.map((o) => o.valeur));
  }
}

const rng = new PyRandom(20270418);
const profils: Profil[] = [
  { reponses: {} },
  { reponses: { eco_retraite: 2, imm_baisse: -2, eur_ukraine: 1, sec_cannabis: null }, importance: { economie: 2 } },
  ...[2, 1, 0, -1, -2].map((v) => ({ reponses: Object.fromEntries(es.map((e) => [e.id, v])) })),
  { reponses: Object.fromEntries(es.map((e) => [e.id, null])) },
  { reponses: { [es[0].id]: 1 } },
  { reponses: Object.fromEntries(es.map((e, i) => [e.id, (i % 5) - 2])), importance: Object.fromEntries(themes.map((t) => [t, 3])) },
];
// Un profil qui reprend les positions d'un candidat (le mode adaptatif doit alors s'arrêter tôt).
for (const c of actifs.slice(0, 4)) {
  const r = derouler('adaptatif', 4, (id) => c.positions?.[id]?.valeur ?? [-1, 0, 1][rng.randrange(3)]);
  profils.push({ reponses: r });
}
// Déroulés aléatoires à graine fixe : mode, graine du tirage, réponses (avec « je passe »), passage au mode
// supérieur, priorités de 0 à 3 thèmes.
const nAleatoires = Number(process.env.CONCORDANCE_PROFILS ?? 60);
for (let k = 0; k < nAleatoires; k++) {
  const mode = MODES[rng.randrange(3)];
  const graine = 1 + rng.randrange(999_999);
  const passe = rng.randrange(4) * 0.1;
  const repondre = (_: string, valeurs: number[]) => (rng.randrange(1000) < passe * 1000 ? null : valeurs[rng.randrange(5)]);
  let reponses = derouler(mode, graine, repondre);
  if (mode !== 'complet' && rng.randrange(3) === 0) reponses = derouler(mode === 'rapide' ? 'adaptatif' : 'complet', graine, repondre, reponses);
  const importance: Record<string, number> = {};
  const nPrio = rng.randrange(4);
  for (let i = 0; i < nPrio; i++) importance[themes[rng.randrange(themes.length)]] = 2 + rng.randrange(2);
  profils.push({ reponses, importance });
}

const dossier = join(RACINE, '.concordance');
mkdirSync(dossier, { recursive: true });
writeFileSync(join(dossier, 'entree.json'), JSON.stringify({ profils, tirages: appels }));
console.log(`${profils.length} profils et ${appels.length} tirages, calcul Python…`);
execFileSync(process.env.PYTHON ?? 'python3', ['-I', join(RACINE, 'scripts', 'concordance_python.py'), skill, join(dossier, 'entree.json'), join(dossier, 'python.json')], {
  stdio: 'inherit',
});
const py = JSON.parse(readFileSync(join(dossier, 'python.json'), 'utf8'));
// Le navigateur calcule à partir de public/donnees/calcul.json (valeurs et confiance seulement) :
// on vérifie aussi ce chemin-là.
const leger = JSON.parse(readFileSync(join(RACINE, 'public', 'donnees', 'calcul.json'), 'utf8'));
const actifsLegers = candidatsActifs(leger.candidats);
let ecarts = 0;
const signaler = (quoi: string, entree: unknown, ts: unknown, p: unknown) => {
  ecarts++;
  if (ecarts <= 3) {
    console.error(`Écart sur ${quoi} : ${JSON.stringify(entree).slice(0, 600)}`);
    console.error('TS     :', JSON.stringify(ts).slice(0, 2000));
    console.error('Python :', JSON.stringify(p).slice(0, 2000));
  }
};
profils.forEach((p, i) => {
  const ts = JSON.parse(JSON.stringify(calculer(p, referentiel, actifs)));
  const tsLeger = JSON.parse(JSON.stringify(calculer(p, leger, actifsLegers)));
  if (!isDeepStrictEqual(ts, tsLeger)) signaler(`le profil ${i} (données complètes / calcul.json)`, p, ts, tsLeger);
  if (!isDeepStrictEqual(ts, py.resultats[i])) signaler(`le score du profil ${i}`, p, ts, py.resultats[i]);
});
appels.forEach((a, i) => {
  if (!isDeepStrictEqual(tiragesTs[i], py.tirages[i])) signaler(`le tirage ${i}`, a, tiragesTs[i], py.tirages[i]);
});
if (ecarts) {
  console.error(`✗ ${ecarts} écart(s) entre score.ts/tirage.ts et score.py/tirage.py (Python ${py.python}).`);
  process.exit(1);
}
console.log(
  `✓ score.ts et tirage.ts (données complètes et calcul.json) donnent les mêmes résultats que score.py et tirage.py (Python ${py.python}) : ${profils.length} profils, ${appels.length} tirages.`,
);
