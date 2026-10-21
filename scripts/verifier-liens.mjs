#!/usr/bin/env node
// Vérifie les liens internes du site construit (dist/) : chaque href/src interne doit pointer vers un
// fichier existant, et chaque ancre (#id) vers un id présent dans la page cible.
// Les liens externes ne sont pas vérifiés ici (ils dépendent de sites tiers).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const BASE = '/boussole-2027-site/';
if (!existsSync(DIST)) {
  console.error('dist/ introuvable : lancez npm run build.');
  process.exit(1);
}

const pages = [];
(function parcourir(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
})(DIST);

const ids = new Map();
const idsDe = (fichier) => {
  if (!ids.has(fichier)) {
    const html = readFileSync(fichier, 'utf8');
    ids.set(fichier, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(fichier);
};

function cible(url, depuis) {
  let chemin;
  if (url.startsWith(BASE)) chemin = join(DIST, url.slice(BASE.length));
  else if (url.startsWith('/')) return { erreur: 'lien absolu hors de la base du site' };
  else chemin = resolve(dirname(depuis), url);
  if (existsSync(chemin) && statSync(chemin).isDirectory()) chemin = join(chemin, 'index.html');
  return { chemin };
}

let erreurs = 0;
let liens = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const urls = [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
  for (const brut of urls) {
    if (!brut || /^(https?:|mailto:|tel:|data:|javascript:)/.test(brut)) continue;
    // Les URL de résultat portent les réponses après # : ce n'est pas une ancre.
    const [sansAncre, ancre] = brut.split('#');
    const url = sansAncre.split('?')[0];
    liens++;
    const pageCible = url === '' ? { chemin: page } : cible(decodeURI(url), page);
    const nom = relative(DIST, page);
    if (pageCible.erreur) {
      console.error(`✗ ${nom} → ${brut} : ${pageCible.erreur}`);
      erreurs++;
      continue;
    }
    if (!existsSync(pageCible.chemin)) {
      console.error(`✗ ${nom} → ${brut} : fichier introuvable`);
      erreurs++;
      continue;
    }
    const estResultat = /resultat\/$|resultat\/[a-z]+\/$/.test(url);
    if (ancre && pageCible.chemin.endsWith('.html') && !estResultat && !idsDe(pageCible.chemin).has(decodeURIComponent(ancre))) {
      console.error(`✗ ${nom} → ${brut} : ancre #${ancre} absente`);
      erreurs++;
    }
  }
}
if (erreurs) {
  console.error(`${erreurs} lien(s) interne(s) cassé(s) sur ${liens}, dans ${pages.length} pages.`);
  process.exit(1);
}
console.log(`✓ ${liens} liens internes vérifiés dans ${pages.length} pages, aucun lien cassé.`);
