// Mesure d'audience anonyme (GoatCounter). Fonctions pures, testées par tests/audience.test.ts.
//
// Règle absolue : aucune donnée d'opinion ne part. Le résultat partageable encode les réponses dans
// l'adresse (fragment #…), le test peut porter un fragment de reprise, le comparateur une requête ?c=… :
// seul le chemin, sans requête ni fragment, est envoyé, et les événements passent par une liste blanche.
import { MODES } from './tirage';

/** Code du site GoatCounter, lu au build (variable de dépôt GOATCOUNTER_CODE). Vide = aucune mesure. */
export function lireCode(brut: string | undefined): string | null {
  const c = (brut ?? '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,48}$/.test(c) ? c : null;
}

/** Chemin envoyé pour une page vue : le chemin seul, sans requête ni fragment. */
export function cheminNettoye(url: string): string {
  const sansFragment = url.split('#')[0];
  const sansRequete = sansFragment.split('?')[0];
  try {
    return new URL(sansRequete, 'https://exemple.invalid').pathname;
  } catch {
    return '/';
  }
}

/** Valeur du paramètre ?ref=… (liens tagués), si elle est bien formée ; sinon null. */
export function lireRef(search: string): string | null {
  const v = new URLSearchParams(search).get('ref');
  return v && /^[a-z0-9][a-z0-9-]{0,39}$/i.test(v) ? v.toLowerCase() : null;
}

/** Requête sans le paramètre ref (les autres paramètres sont gardés tels quels). */
export function sansRef(search: string): string {
  const p = new URLSearchParams(search);
  p.delete('ref');
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Référent externe réduit au nom de domaine (jamais le chemin ni la requête de la page d'origine). */
export function referentExterne(referrer: string, hoteDuSite: string): string {
  if (!referrer) return '';
  try {
    const u = new URL(referrer);
    return u.hostname && u.hostname !== hoteDuSite ? u.hostname : '';
  } catch {
    return '';
  }
}

const FICHIERS = /^donnees\/[a-z0-9-]+\.(json|csv)$/;
const TESTS = new RegExp(`^test-(commence|termine)/(${MODES.join('|')})$`);

/** Seuls ces événements peuvent être envoyés : test commencé/terminé (mode) et téléchargement de données. */
export function evenementAutorise(nom: string): boolean {
  return TESTS.test(nom) || FICHIERS.test(nom);
}

/** Do Not Track (et Global Privacy Control) : si le navigateur le demande, rien n'est compté. */
export function nePasSuivre(nav: { doNotTrack?: string | null; globalPrivacyControl?: boolean; msDoNotTrack?: string }, win?: { doNotTrack?: string }): boolean {
  return nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || nav.msDoNotTrack === '1' || win?.doNotTrack === '1' || nav.globalPrivacyControl === true;
}
