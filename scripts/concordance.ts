// Test de concordance : src/lib/score.ts doit donner exactement les mêmes résultats que
// scripts/score.py du skill, sur des profils fixes et des profils aléatoires à graine fixe.
// Usage : npm run test:concordance  (nécessite python3 et les données préparées par npm run donnees)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { PyRandom } from '../src/lib/python';
import { calculer, candidatsActifs, type Profil } from '../src/lib/score';

const RACINE = resolve(import.meta.dirname, '..');
const skill = process.env.BOUSSOLE_SKILL_DIR ? resolve(process.env.BOUSSOLE_SKILL_DIR) : join(RACINE, '.donnees', 'skill');
const { questions, candidats } = JSON.parse(readFileSync(join(RACINE, 'src', 'generated', 'donnees.json'), 'utf8'));
const qs: { id: string; theme: string; niveau: string }[] = questions.questions;
const themes = Object.keys(questions.themes);
const NIVEAUX: Record<string, string[]> = { rapide: ['rapide'], moyen: ['rapide', 'moyen'], long: ['rapide', 'moyen', 'long'] };
const ids = (mode: string) => qs.filter((q) => NIVEAUX[mode].includes(q.niveau)).map((q) => q.id);

const profils: Profil[] = [
  { reponses: {} },
  { reponses: { eco_retraite: 2, imm_baisse: -2, eur_ukraine: 1, sec_cannabis: null }, importance: { economie: 2 } },
  ...[2, 1, 0, -1, -2].flatMap((v) => ['rapide', 'moyen', 'long'].map((m) => ({ reponses: Object.fromEntries(ids(m).map((q) => [q, v])) }))),
  { reponses: Object.fromEntries(ids('long').map((q) => [q, null])) },
  { reponses: { [qs[0].id]: 1 } },
  { reponses: Object.fromEntries(ids('long').map((q, i) => [q, (i % 5) - 2])), importance: Object.fromEntries(themes.map((t) => [t, 3])) },
];
// Profils aléatoires à graine fixe : mode, réponses (avec « je passe »), priorités de 0 à 3 thèmes.
const rng = new PyRandom(20270418);
const nAleatoires = Number(process.env.CONCORDANCE_PROFILS ?? 60);
for (let k = 0; k < nAleatoires; k++) {
  const mode = ['rapide', 'moyen', 'long'][rng.randrange(3)];
  const passe = rng.randrange(4) * 0.1;
  const reponses: Record<string, number | null> = {};
  for (const q of ids(mode)) reponses[q] = rng.randrange(1000) < passe * 1000 ? null : rng.randrange(5) - 2;
  const importance: Record<string, number> = {};
  const nPrio = rng.randrange(4);
  for (let i = 0; i < nPrio; i++) importance[themes[rng.randrange(themes.length)]] = 2 + rng.randrange(2);
  profils.push({ reponses, importance });
}

const dossier = join(RACINE, '.concordance');
mkdirSync(dossier, { recursive: true });
writeFileSync(join(dossier, 'profils.json'), JSON.stringify(profils));
console.log(`${profils.length} profils, calcul Python…`);
execFileSync('python3', ['-I', join(RACINE, 'scripts', 'concordance_python.py'), skill, join(dossier, 'profils.json'), join(dossier, 'python.json')], { stdio: 'inherit' });
const py = JSON.parse(readFileSync(join(dossier, 'python.json'), 'utf8'));
const actifs = candidatsActifs(candidats);
let ecarts = 0;
profils.forEach((p, i) => {
  const ts = JSON.parse(JSON.stringify(calculer(p, questions, actifs)));
  if (!isDeepStrictEqual(ts, py.resultats[i])) {
    ecarts++;
    if (ecarts <= 3) {
      console.error(`Écart sur le profil ${i} : ${JSON.stringify(p)}`);
      console.error('TS     :', JSON.stringify(ts).slice(0, 2000));
      console.error('Python :', JSON.stringify(py.resultats[i]).slice(0, 2000));
    }
  }
});
if (ecarts) {
  console.error(`✗ ${ecarts} profil(s) sur ${profils.length} diffèrent entre score.ts et score.py (Python ${py.python}).`);
  process.exit(1);
}
console.log(`✓ score.ts et score.py (Python ${py.python}) donnent des résultats identiques sur ${profils.length} profils.`);
