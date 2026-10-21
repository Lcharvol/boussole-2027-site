import { describe, expect, it } from 'vitest';
import { decoder, encoder } from '../src/lib/partage';

const Q = ['a1', 'a2', 'b1', 'b2'];
const T = ['a', 'b'];

describe('encodage des réponses dans le lien', () => {
  it('fait un aller-retour sans perte', () => {
    const etat = { mode: 'moyen' as const, reponses: { a1: 2, a2: null, b1: -2 }, importance: { b: 3 } };
    const code = encoder(etat, Q, T, '2026-10-21');
    expect(code).toBe('1.20261021.m.exa_.13');
    const d = decoder(code, Q, T, '2026-10-21');
    expect(d?.etat).toEqual(etat);
    expect(d?.versionDifferente).toBe(false);
  });
  it('signale une autre version des questions', () => {
    expect(decoder('1.20250101.r.e___.11', Q, T, '2026-10-21')?.versionDifferente).toBe(true);
  });
  it('refuse un lien illisible', () => {
    expect(decoder('n-importe-quoi', Q, T, '2026-10-21')).toBeNull();
    expect(decoder('1.20261021.m.ezz_.11', Q, T, '2026-10-21')).toBeNull();
    expect(decoder('1.20261021.m.e__.11', Q, T, '2026-10-21')).toBeNull();
  });
});
