// Accès aux données au moment du build (pages statiques). Les données viennent de
// src/generated/donnees.json, produit par scripts/preparer-donnees.mjs à partir du dépôt du skill.
import brut from '../generated/donnees.json';
import photosBrut from '../data/photos.json';
import type { Candidat, Donnees, Photos, Question } from './types';

const donnees = brut as unknown as Donnees;
export const meta = donnees.meta;
export const questions = donnees.questions;
export const themes = questions.themes;
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

export const listeQuestions: Question[] = questions.questions;
export const questionsParTheme = Object.keys(themes).map((t) => ({
  theme: t,
  libelle: themes[t],
  questions: listeQuestions.filter((q) => q.theme === t),
}));

export const libelleValeur = (v: number | null | undefined) =>
  v === null || v === undefined ? 'Position inconnue' : questions.echelle[String(v)];

export function positionsConnues(c: Candidat) {
  return listeQuestions.filter((q) => c.positions[q.id]?.valeur != null).length;
}

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
