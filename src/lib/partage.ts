// Encodage des réponses dans l'URL (après le #) : rien n'est envoyé ni stocké côté serveur.
// Le fragment (partie après #) n'est jamais transmis au serveur par le navigateur.
//
// Format 2 (dilemmes) : 2.<version des enjeux>.<mode>.<graine>.<réponses>.<importances>
//   mode        : r (rapide), a (adaptatif), c (complet)
//   graine      : graine du tirage (enjeux posés, ordre, formulations, côté des pôles), pour qu'un lien
//                 rejoue exactement le même questionnaire
//   réponses    : un caractère par enjeu, dans l'ordre de enjeux.json, sur l'axe des pôles :
//                 a=-2 (pôle A nettement), b=-1, c=0, d=+1, e=+2 (pôle B nettement), x=« je passe », _=non posé
//   importances : un chiffre (1 à 3) par thème, dans l'ordre de enjeux.json
// Les liens du format 1 (affirmations, « 1.… ») ne sont plus lisibles : les valeurs n'ont plus le même sens.
import type { Mode } from './types';

export const VERSION_LIEN = '2';

export interface Etat {
  mode: Mode;
  graine: number;
  reponses: Record<string, number | null>; // null = « je passe » ; absente = non posée
  importance: Record<string, number>;
}

const LETTRES = 'abcde';
const MODE_CODE: Record<Mode, string> = { rapide: 'r', adaptatif: 'a', complet: 'c' };
const CODE_MODE: Record<string, Mode> = { r: 'rapide', a: 'adaptatif', c: 'complet' };

export function versionCourte(version: string) {
  return version.replaceAll('-', '');
}

export function encoder(etat: Etat, ordreEnjeux: string[], ordreThemes: string[], version: string): string {
  const rep = ordreEnjeux
    .map((q) => {
      if (!(q in etat.reponses)) return '_';
      const v = etat.reponses[q];
      return v === null || v === undefined ? 'x' : LETTRES[v + 2];
    })
    .join('');
  const imp = ordreThemes.map((t) => String(Math.min(3, Math.max(1, etat.importance[t] ?? 1)))).join('');
  return [VERSION_LIEN, versionCourte(version), MODE_CODE[etat.mode], String(etat.graine), rep, imp].join('.');
}

export interface Decodage {
  etat: Etat;
  /** Le lien a été créé avec une autre version des enjeux : le résultat peut différer. */
  versionDifferente: boolean;
}

/** Lien créé avec l'ancien questionnaire (format 1, affirmations) : il ne peut plus être relu. */
export function estAncienLien(code: string): boolean {
  return /^1\.\d{8}\.[rml]\./.test(code.replace(/^#/, ''));
}

export function decoder(code: string, ordreEnjeux: string[], ordreThemes: string[], version: string): Decodage | null {
  const parties = code.replace(/^#/, '').split('.');
  if (parties.length !== 6 || parties[0] !== VERSION_LIEN) return null;
  const [, ver, m, g, rep, imp] = parties;
  const mode = CODE_MODE[m];
  if (!mode || !/^[1-9]\d{0,8}$/.test(g)) return null;
  if (rep.length !== ordreEnjeux.length || imp.length !== ordreThemes.length) return null;
  if (!/^[a-ex_]+$/.test(rep) || !/^[1-3]+$/.test(imp)) return null;
  const reponses: Record<string, number | null> = {};
  ordreEnjeux.forEach((q, i) => {
    const ch = rep[i];
    if (ch === '_') return;
    reponses[q] = ch === 'x' ? null : LETTRES.indexOf(ch) - 2;
  });
  const importance: Record<string, number> = {};
  ordreThemes.forEach((t, i) => {
    const v = Number(imp[i]);
    if (v > 1) importance[t] = v;
  });
  return { etat: { mode, graine: Number(g), reponses, importance }, versionDifferente: ver !== versionCourte(version) };
}
