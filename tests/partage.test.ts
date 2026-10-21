import { describe, expect, it } from 'vitest';
import { decoder, encoder, estAncienLien } from '../src/lib/partage';

const Q = ['a1', 'a2', 'b1', 'b2'];
const T = ['a', 'b'];

describe('encodage des réponses dans le lien', () => {
  it('fait un aller-retour sans perte, graine du tirage comprise', () => {
    const etat = { mode: 'adaptatif' as const, graine: 4821, reponses: { a1: 2, a2: null, b1: -2 }, importance: { b: 3 } };
    const code = encoder(etat, Q, T, '2026-10-21');
    expect(code).toBe('2.20261021.a.4821.exa_.13');
    const d = decoder(code, Q, T, '2026-10-21');
    expect(d?.etat).toEqual(etat);
    expect(d?.versionDifferente).toBe(false);
  });
  it('signale une autre version des enjeux', () => {
    expect(decoder('2.20250101.r.7.e___.11', Q, T, '2026-10-21')?.versionDifferente).toBe(true);
  });
  it('refuse un lien illisible', () => {
    expect(decoder('n-importe-quoi', Q, T, '2026-10-21')).toBeNull();
    expect(decoder('2.20261021.c.7.ezz_.11', Q, T, '2026-10-21')).toBeNull();
    expect(decoder('2.20261021.c.7.e__.11', Q, T, '2026-10-21')).toBeNull();
    expect(decoder('2.20261021.c.0.e___.11', Q, T, '2026-10-21')).toBeNull();
    expect(decoder('2.20261021.m.7.e___.11', Q, T, '2026-10-21')).toBeNull();
  });
  it("reconnaît les liens de l'ancien questionnaire (format 1)", () => {
    expect(estAncienLien('1.20261021.m.exa_.13')).toBe(true);
    expect(decoder('1.20261021.m.exa_.13', Q, T, '2026-10-21')).toBeNull();
    expect(estAncienLien('2.20261021.a.4821.exa_.13')).toBe(false);
  });
});
