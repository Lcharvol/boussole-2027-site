// Accès aux données au moment du build (pages statiques). Les données viennent de
// src/generated/donnees.json, produit par scripts/preparer-donnees.mjs à partir du dépôt du skill.
import brut from '../generated/donnees.json';
import photosBrut from '../data/photos.json';
import type { Candidat, Donnees, Enjeu, Photos } from './types';
import { libellePosition, titreEnjeu } from './axe';
export { titreEnjeu };

const donnees = brut as unknown as Donnees;
export const meta = donnees.meta;
export const referentiel = donnees.enjeux;
export const themes = referentiel.themes;
export const photos = photosBrut as Photos;

/** Clé de tri par nom de famille (« Dominique de Villepin » → « villepin »), sans accents. */
export function cleNom(nom: string): string {
  const mots = nom.split(' ');
  let reste = mots.slice(1);
  while (reste.length > 1 && ['de', 'du', 'des', "d'"].includes(reste[0].toLowerCase())) reste = reste.slice(1);
  return reste.join(' ');
}
const coll = new Intl.Collator('fr', { sensitivity: 'base' });
export const parNom = (a: { nom: string }, b: { nom: string }) => coll.compare(cleNom(a.nom), cleNom(b.nom));

/** Candidats actifs, par ordre alphabétique du nom de famille (jamais par score ni par sondage). */
export const candidats: Candidat[] = donnees.candidats.filter((c) => c.statut !== 'retiré').sort(parNom);
export const candidatsRetires: Candidat[] = donnees.candidats.filter((c) => c.statut === 'retiré').sort(parNom);

export const listeEnjeux: Enjeu[] = referentiel.enjeux;
export const enjeuxParTheme = Object.keys(themes).map((t) => ({
  theme: t,
  libelle: themes[t],
  enjeux: listeEnjeux.filter((e) => e.theme === t),
}));
export const enjeuParId: Record<string, Enjeu> = Object.fromEntries(listeEnjeux.map((e) => [e.id, e]));

/** Libellé d'une position sur l'axe de l'enjeu (« Plutôt : <pôle B> »…). */
export const libelleValeur = (v: number | null | undefined, e: Enjeu) => libellePosition(v, e);

export function positionsConnues(c: Candidat) {
  return listeEnjeux.filter((e) => c.positions[e.id]?.valeur != null).length;
}

/** Données minimales du tirage et du calcul (valeur et confiance), candidats actifs dans l'ordre des
 * fichiers du skill, comme charger() dans score.py et tirage.py. */
export const candidatsCalcul = donnees.candidats
  .filter((c) => c.statut !== 'retiré')
  .map((c) => ({
    slug: c.slug,
    nom: c.nom,
    parti: c.parti,
    statut: c.statut,
    positions: Object.fromEntries(Object.entries(c.positions ?? {}).map(([k, p]) => [k, p ? { valeur: p.valeur ?? null, confiance: p.confiance ?? null } : null])),
  }));

/** Ce que le questionnaire reçoit : enjeux sans les champs inutiles, thèmes, version. */
export const referentielTest = {
  version: referentiel.version,
  themes,
  enjeux: listeEnjeux.map(({ id, theme, contexte, variantes }) => ({ id, theme, contexte, variantes })),
};

/** Chemin interne préfixé par la base du site (GitHub Pages sert le site sous /boussole-2027-site/). */
export function lien(chemin = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const c = chemin.replace(/^\//, '');
  return `${base}/${c}`;
}

export function dateFr(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, j] = iso.slice(0, 10).split('-');
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  if (!m) return a;
  if (!j) return `${mois[Number(m) - 1]} ${a}`;
  return `${Number(j) === 1 ? '1er' : Number(j)} ${mois[Number(m) - 1]} ${a}`;
}
