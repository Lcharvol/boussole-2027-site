#!/usr/bin/env node
// Prépare les données du site à partir du dépôt du skill (source unique, jamais recopiée à la main).
//
// 1. Récupère le dépôt Lcharvol/boussole-presidentielle-2027 dans .donnees/ (branche BOUSSOLE_SKILL_REF,
//    main par défaut), sauf si BOUSSOLE_SKILL_DIR pointe déjà vers un clone (cas de la CI).
//    Les données doivent être au format 2 (data/enjeux.json, fiches "format": 2) : sinon, arrêt avec un
//    message clair plutôt qu'un site construit sur des données mal lues.
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

const branche = process.env.BOUSSOLE_SKILL_REF || 'main';
let skill = process.env.BOUSSOLE_SKILL_DIR ? resolve(process.env.BOUSSOLE_SKILL_DIR) : join(RACINE, '.donnees', 'skill');
if (!process.env.BOUSSOLE_SKILL_DIR) {
  if (!existsSync(skill)) {
    console.log(`Clonage de ${DEPOT} (${branche})…`);
    mkdirSync(join(RACINE, '.donnees'), { recursive: true });
    git('clone', '--depth', '1', '--branch', branche, DEPOT, skill);
  } else if (args.has('--rafraichir')) {
    git('-C', skill, 'pull', '--ff-only');
  }
}
const dossierSkill = join(skill, 'skills', 'boussole-presidentielle-2027');
const dossierDonnees = join(dossierSkill, 'data');
function arret(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}
if (!existsSync(join(dossierDonnees, 'enjeux.json'))) {
  arret(
    existsSync(join(dossierDonnees, 'questions.json'))
      ? `Format de données non reconnu dans ${dossierDonnees} : data/questions.json (format 1) au lieu de data/enjeux.json (format 2). ` +
          'Ce site lit le format 2 (dilemmes) ; pointez BOUSSOLE_SKILL_REF ou BOUSSOLE_SKILL_DIR vers une version du skill au format 2.'
      : `Données introuvables dans ${dossierDonnees} (data/enjeux.json absent).`,
  );
}

let commit = null;
let dateCommit = null;
try {
  [commit, dateCommit] = git('-C', skill, 'log', '-1', '--format=%H|%cI').split('|');
} catch {
  /* dossier sans historique git : on publie sans référence de commit */
}

const lire = (f) => JSON.parse(readFileSync(f, 'utf8'));
const enjeux = lire(join(dossierDonnees, 'enjeux.json'));
if (enjeux.format !== 2 || !Array.isArray(enjeux.enjeux)) arret(`data/enjeux.json : format ${enjeux.format ?? 'absent'}, attendu 2 (liste "enjeux").`);
// Même ordre que score.py : fichiers triés par nom.
const fichiers = readdirSync(join(dossierDonnees, 'candidats'))
  .filter((f) => f.endsWith('.json'))
  .sort();
const candidats = fichiers.map((f) => lire(join(dossierDonnees, 'candidats', f)));

// Contrôles minimaux : le site refuse de se construire sur des données incohérentes.
const ids = new Set(enjeux.enjeux.map((e) => e.id));
for (const e of enjeux.enjeux) {
  if (!(e.theme in enjeux.themes)) arret(`${e.id} : thème inconnu ${e.theme}`);
  if (!e.pole_a || !e.pole_b) arret(`${e.id} : pôle A ou B manquant`);
  if (!e.variantes?.length) arret(`${e.id} : aucune variante`);
  for (const v of e.variantes) if (!v.question || !v.a || !v.b) arret(`${v.id} : question ou option manquante`);
}
for (const c of candidats) {
  if (c.format !== 2) arret(`${c.slug} : fiche au format ${c.format ?? '1'}, attendu 2.`);
  for (const [id, p] of Object.entries(c.positions ?? {})) {
    if (!ids.has(id)) arret(`${c.slug} : enjeu inconnu ${id}`);
    if (p && p.valeur != null && ![-2, -1, 0, 1, 2].includes(p.valeur)) arret(`${c.slug} / ${id} : valeur ${p.valeur} hors de l'échelle -2…2`);
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
  branche: process.env.BOUSSOLE_SKILL_DIR ? null : branche,
  version_enjeux: enjeux.version,
  version_plugin: version,
  nb_enjeux: enjeux.enjeux.length,
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
writeFileSync(join(gen, 'donnees.json'), JSON.stringify({ meta, enjeux, candidats }));
writeFileSync(join(gen, 'audit.md'), audit ?? '');

// --- Données ouvertes -----------------------------------------------------------------------
const pub = join(RACINE, 'public', 'donnees');
mkdirSync(pub, { recursive: true });
writeFileSync(join(pub, 'boussole-2027.json'), JSON.stringify({ meta, enjeux, candidats }, null, 1));
// Version allégée pour le calcul dans le navigateur : valeur et confiance seulement.
writeFileSync(
  join(pub, 'calcul.json'),
  JSON.stringify({
    commit,
    enjeux: enjeux.enjeux.map(({ id, theme }) => ({ id, theme })),
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
const themes = enjeux.themes;
writeFileSync(
  join(pub, 'enjeux.csv'),
  csv([
    ['id', 'theme', 'theme_libelle', 'pole_a', 'pole_b', 'contexte'],
    ...enjeux.enjeux.map((e) => [e.id, e.theme, themes[e.theme], e.pole_a, e.pole_b, e.contexte]),
  ]),
);
writeFileSync(
  join(pub, 'variantes.csv'),
  csv([
    ['id', 'enjeu', 'question', 'option_a', 'option_b', 'validee'],
    ...enjeux.enjeux.flatMap((e) => e.variantes.map((v) => [v.id, e.id, v.question, v.a, v.b, v.validee])),
  ]),
);
writeFileSync(
  join(pub, 'candidats.csv'),
  csv([
    ['slug', 'nom', 'parti', 'statut', 'programme', 'programme_url', 'mis_a_jour', 'notes'],
    ...candidats.map((c) => [c.slug, c.nom, c.parti, c.statut, c.programme, c.programme_url, c.mis_a_jour, c.notes]),
  ]),
);
// valeur : de -2 (pôle A nettement) à +2 (pôle B nettement), vide si la position est inconnue.
const lignes = [['candidat', 'nom', 'enjeu', 'theme', 'valeur', 'confiance', 'relu', 'date_source', 'source', 'citation', 'resume']];
for (const c of candidats) {
  for (const e of enjeux.enjeux) {
    const p = c.positions?.[e.id] ?? {};
    lignes.push([c.slug, c.nom, e.id, e.theme, p.valeur ?? '', p.confiance ?? '', p.relu ?? '', p.date_source ?? '', p.source ?? '', p.citation ?? '', p.resume ?? '']);
  }
}
writeFileSync(join(pub, 'positions.csv'), csv(lignes));

console.log(
  `Données prêtes (format 2) : ${meta.nb_enjeux} enjeux, ${meta.nb_candidats} candidats, ${nbPositions} positions` +
    (commit ? ` (commit ${commit.slice(0, 7)})` : '') +
    (audit ? ', audit calculé.' : ', sans audit.'),
);
