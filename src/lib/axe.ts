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
