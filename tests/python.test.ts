import { describe, expect, it } from 'vitest';
import { PyRandom, pyRound, pyRoundN, pySum } from '../src/lib/python';

// Valeurs de référence obtenues avec CPython : random.Random(2027), round(), sum().
describe('primitives Python', () => {
  it('reproduit le Mersenne Twister de random.Random(2027)', () => {
    const r = new PyRandom(2027);
    expect([r.getrandbits(32), r.getrandbits(32), r.getrandbits(32)]).toEqual([465287435, 3981623986, 1993088378]);
    const s = new PyRandom(2027);
    expect(Array.from({ length: 10 }, () => s.randrange(40))).toEqual([6, 29, 5, 0, 20, 25, 11, 25, 11, 22]);
  });
  it('arrondit comme round()', () => {
    expect([pyRound(2.5), pyRound(3.5), pyRound(-0.4), pyRound(0.5)]).toEqual([2, 4, 0, 0]);
    expect([pyRoundN(0.025, 2), pyRoundN(0.125, 2), pyRoundN(2.675, 2), pyRoundN(1 / 3, 2)]).toEqual([0.03, 0.12, 2.67, 0.33]);
  });
  it('somme comme sum() (sommation compensée)', () => {
    expect(pySum([0.1, 0.2, 0.3])).toBe(0.6);
    expect(pySum([])).toBe(0);
  });
});
