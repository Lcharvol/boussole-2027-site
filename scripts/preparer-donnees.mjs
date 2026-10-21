#!/usr/bin/env node
// Prépare les données du site à partir du dépôt du skill (source unique, jamais recopiée à la main).
//
// 1. Récupère le dépôt Lcharvol/boussole-presidentielle-2027 (branche main) dans .donnees/, sauf si
//    BOUSSOLE_SKILL_DIR pointe déjà vers un clone (cas de la CI, qui le récupère avec actions/checkout).
// 2. Écrit src/generated/donnees.json (lu par les pages au build) et src/generated/audit.md (sortie de
//    scripts/audit_biais.py, les chiffres de neutralité sont donc toujours ceux des données publiées).
// 3. Écrit les données ouvertes dans public/donnees/ (JSON complet, JSON de calcul, CSV).
//
// Options : --rafraichir (met à jour le clone local), --sans-audit (n'exécute pas Python).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RACINE = resolve(import.meta.dirname, '..');
const DEPOT = 'https://github.com/Lcharvol/boussole-presidentielle-2027';
const args = new Set(process.argv.slice(2));
const strict = process.env.CI === 'true';

function git(...a) {
  return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

let skill = process.env.BOUSSOLE_SKILL_DIR ? resolve(process.env.BOUSSOLE_SKILL_DIR) : join(RACINE, '.donnees', 'skill');
if (!process.env.BOUSSOLE_SKILL_DIR) {
  if (!existsSync(skill)) {
    console.log(`Clonage de ${DEPOT} (main)…`);
    mkdirSync(join(RACINE, '.donnees'), { recursive: true });
    git('clone', '--depth', '1', '--branch', 'main', DEPOT, skill);
  } else if (args.has('--rafraichir')) {
    git('-C', skill, 'pull', '--ff-only');
  }
}
const dossierSkill = join(skill, 'skills', 'boussole-presidentielle-2027');
const dossierDonnees = join(dossierSkill, 'data');
if (!existsSync(join(dossierDonnees, 'questions.json'))) {
  console.error(`Données introuvables dans ${dossierDonnees}`);
  process.exit(1);
}

let commit = null;
let dateCommit = null;
try {
  [commit, dateCommit] = git('-C', skill, 'log', '-1', '--format=%H|%cI').split('|');
} catch {
  /* dossier sans historique git : on publie sans référence de commit */
}

const lire = (f) => JSON.parse(readFileSync(f, 'utf8'));
const questions = lire(join(dossierDonnees, 'questions.json'));
// Même ordre que score.py : fichiers triés par nom.
const fichiers = readdirSync(join(dossierDonnees, 'candidats'))
  .filter((f) => f.endsWith('.json'))
  .sort();
const candidats = fichiers.map((f) => lire(join(dossierDonnees, 'candidats', f)));

// Contrôles minimaux : le site refuse de se construire sur des données incohérentes.
const ids = new Set(questions.questions.map((q) => q.id));
for (const c of candidats) {
  for (const qid of Object.keys(c.positions ?? {})) {
    if (!ids.has(qid)) throw new Error(`${c.slug} : question inconnue ${qid}`);
  }
}

let version = null;
try {
  version = lire(join(skill, '.claude-plugin', 'plugin.json')).version;
} catch {
  /* sans manifeste */
}

const nbPositions = candidats.reduce(
  (n, c) => n + Object.values(c.positions ?? {}).filter((p) => p && p.valeur !== null && p.valeur !== undefined).length,
  0,
);
const nbRelues = candidats.reduce(
  (n, c) => n + Object.values(c.positions ?? {}).filter((p) => p && p.valeur != null && p.relu === true).length,
  0,
);
const meta = {
  depot: DEPOT,
  commit,
  date_commit: dateCommit,
  version_questions: questions.version,
  version_plugin: version,
  nb_questions: questions.questions.length,
  nb_candidats: candidats.filter((c) => c.statut !== 'retiré').length,
  nb_positions: nbPositions,
  nb_positions_relues: nbRelues,
  genere_le: new Date().toISOString(),
};

// Audit de neutralité, calculé par le script du skill lui-même.
let audit = null;
if (!args.has('--sans-audit')) {
  try {
    console.log('Audit de neutralité (scripts/audit_biais.py)…');
    audit = execFileSync('python3', ['-I', join(dossierSkill, 'scripts', 'audit_biais.py')], {
      encoding: 'utf8',
      cwd: dossierSkill,
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (e) {
    if (strict) throw e;
    console.warn("Audit non calculé (python3 indisponible ?) : la page Méthode l'indiquera.");
  }
}

const gen = join(RACINE, 'src', 'generated');
mkdirSync(gen, { recursive: true });
writeFileSync(join(gen, 'donnees.json'), JSON.stringify({ meta, questions, candidats }));
writeFileSync(join(gen, 'audit.md'), audit ?? '');

// --- Données ouvertes -----------------------------------------------------------------------
const pub = join(RACINE, 'public', 'donnees');
mkdirSync(pub, { recursive: true });
writeFileSync(join(pub, 'boussole-2027.json'), JSON.stringify({ meta, questions, candidats }, null, 1));
// Version allégée pour le calcul dans le navigateur : valeur et confiance seulement.
writeFileSync(
  join(pub, 'calcul.json'),
  JSON.stringify({
    commit,
    questions: questions.questions.map(({ id, theme, niveau }) => ({ id, theme, niveau })),
    candidats: candidats.map((c) => ({
      slug: c.slug,
      nom: c.nom,
      parti: c.parti,
      statut: c.statut,
      positions: Object.fromEntries(
        Object.entries(c.positions ?? {}).map(([k, p]) => [k, p ? { valeur: p.valeur ?? null, confiance: p.confiance ?? null } : null]),
      ),
    })),
  }),
);

const csv = (rows) =>
  '﻿' +
  rows
    .map((r) =>
      r
        .map((v) => {
          const s = v === null || v === undefined ? '' : String(v);
          return /[",;\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n') +
  '\r\n';
const themes = questions.themes;
writeFileSync(
  join(pub, 'questions.csv'),
  csv([
    ['id', 'theme', 'theme_libelle', 'niveau', 'texte'],
    ...questions.questions.map((q) => [q.id, q.theme, themes[q.theme], q.niveau, q.texte]),
  ]),
);
writeFileSync(
  join(pub, 'candidats.csv'),
  csv([
    ['slug', 'nom', 'parti', 'statut', 'programme', 'programme_url', 'mis_a_jour', 'notes'],
    ...candidats.map((c) => [c.slug, c.nom, c.parti, c.statut, c.programme, c.programme_url, c.mis_a_jour, c.notes]),
  ]),
);
const lignes = [['candidat', 'nom', 'question', 'theme', 'valeur', 'confiance', 'relu', 'date_source', 'source', 'citation', 'resume']];
for (const c of candidats) {
  for (const q of questions.questions) {
    const p = c.positions?.[q.id] ?? {};
    lignes.push([c.slug, c.nom, q.id, q.theme, p.valeur ?? '', p.confiance ?? '', p.relu ?? '', p.date_source ?? '', p.source ?? '', p.citation ?? '', p.resume ?? '']);
  }
}
writeFileSync(join(pub, 'positions.csv'), csv(lignes));

console.log(
  `Données prêtes : ${meta.nb_questions} questions, ${meta.nb_candidats} candidats, ${nbPositions} positions` +
    (commit ? ` (commit ${commit.slice(0, 7)})` : '') +
    (audit ? ', audit calculé.' : ', sans audit.'),
);
