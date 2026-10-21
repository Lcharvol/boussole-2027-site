// Encodage des réponses dans l'URL (après le #) : rien n'est envoyé ni stocké côté serveur.
// Le fragment (partie après #) n'est jamais transmis au serveur par le navigateur.
//
// Format : 1.<version des questions>.<mode>.<réponses>.<importances>
//   mode        : r (rapide), m (moyen), l (long)
//   réponses    : un caractère par question, dans l'ordre de questions.json :
//                 a=-2, b=-1, c=0, d=+1, e=+2, x=« je passe », _=non posée
//   importances : un chiffre (1 à 3) par thème, dans l'ordre de questions.json
import type { Mode } from './types';

export interface Etat {
  mode: Mode;
  reponses: Record<string, number | null>; // null = « je passe » ; absente = non posée
  importance: Record<string, number>;
}

const LETTRES = 'abcde';
const MODE_CODE: Record<Mode, string> = { rapide: 'r', moyen: 'm', long: 'l' };
const CODE_MODE: Record<string, Mode> = { r: 'rapide', m: 'moyen', l: 'long' };

export function versionCourte(version: string) {
  return version.replaceAll('-', '');
}

export function encoder(etat: Etat, ordreQuestions: string[], ordreThemes: string[], version: string): string {
  const rep = ordreQuestions
    .map((q) => {
      if (!(q in etat.reponses)) return '_';
      const v = etat.reponses[q];
      return v === null || v === undefined ? 'x' : LETTRES[v + 2];
    })
    .join('');
  const imp = ordreThemes.map((t) => String(Math.min(3, Math.max(1, etat.importance[t] ?? 1)))).join('');
  return ['1', versionCourte(version), MODE_CODE[etat.mode], rep, imp].join('.');
}

export interface Decodage {
  etat: Etat;
  /** Le lien a été créé avec une autre version des questions : le résultat peut différer. */
  versionDifferente: boolean;
}

export function decoder(code: string, ordreQuestions: string[], ordreThemes: string[], version: string): Decodage | null {
  const parties = code.replace(/^#/, '').split('.');
  if (parties.length !== 5 || parties[0] !== '1') return null;
  const [, ver, m, rep, imp] = parties;
  const mode = CODE_MODE[m];
  if (!mode || rep.length !== ordreQuestions.length || imp.length !== ordreThemes.length) return null;
  if (!/^[a-ex_]+$/.test(rep) || !/^[1-3]+$/.test(imp)) return null;
  const reponses: Record<string, number | null> = {};
  ordreQuestions.forEach((q, i) => {
    const ch = rep[i];
    if (ch === '_') return;
    reponses[q] = ch === 'x' ? null : LETTRES.indexOf(ch) - 2;
  });
  const importance: Record<string, number> = {};
  ordreThemes.forEach((t, i) => {
    const v = Number(imp[i]);
    if (v > 1) importance[t] = v;
  });
  return { etat: { mode, reponses, importance }, versionDifferente: ver !== versionCourte(version) };
}
