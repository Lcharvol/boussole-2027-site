import { candidats, listeEnjeux } from './donnees';

/** Nombre de candidats par valeur (de -2, pôle A, à +2, pôle B) pour chaque enjeu (sans aucun nom). */
export const repartition: Record<string, Record<string, number>> = Object.fromEntries(
  listeEnjeux.map((q) => {
    const r: Record<string, number> = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, inconnue: 0 };
    for (const c of candidats) {
      const v = c.positions[q.id]?.valeur;
      r[v == null ? 'inconnue' : String(v)]++;
    }
    return [q.id, r];
  }),
);
