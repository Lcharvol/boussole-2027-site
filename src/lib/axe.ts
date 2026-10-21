// Lecture d'une valeur sur l'axe d'un enjeu : -2 = pôle A nettement … +2 = pôle B nettement.
export interface Poles {
  pole_a: string;
  pole_b: string;
}

export function libellePosition(v: number | null | undefined, e: Poles): string {
  if (v === null || v === undefined) return 'Position inconnue';
  if (v === 0) return 'Entre les deux';
  const pole = v < 0 ? e.pole_a : e.pole_b;
  return Math.abs(v) === 2 ? `Nettement : ${pole}` : `Plutôt : ${pole}`;
}

/** Libellé court de la valeur, sans le texte du pôle (« A nettement », « plutôt B »…). */
export function libelleCourt(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'inconnue';
  return ['A nettement', 'plutôt A', 'entre les deux', 'plutôt B', 'B nettement'][v + 2];
}

/** Titre court d'un enjeu : « Revenir à 62 ans ou garder 64 ans ou plus ». La majuscule du pôle B n'est
 * retirée que pour un mot ordinaire (pas un sigle comme « SMIC » ou « RSA »). */
export function titreEnjeu(e: Poles): string {
  const b = /^\p{Lu}\p{Ll}/u.test(e.pole_b) ? e.pole_b[0].toLowerCase() + e.pole_b.slice(1) : e.pole_b;
  return `${e.pole_a} ou ${b}`;
}

/** Initiales d'un nom (« Marine Tondelier » → « MT »), pour la marque d'un candidat sur l'axe. */
export function initiales(nom: string): string {
  return nom
    .split(/[\s-]+/)
    .filter((m) => m && m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase())
    .map((m) => m[0])
    .join('')
    .slice(0, 3);
}
