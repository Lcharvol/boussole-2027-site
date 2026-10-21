import { describe, expect, it } from 'vitest';
import { PyRandom, pyPstdev, pyRound, pyRoundN, pySum } from '../src/lib/python';

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

describe('primitives Python du tirage', () => {
  it('initialise random.Random(chaîne) comme CPython (SHA-512)', () => {
    const r = new PyRandom('42/eco_retraite');
    expect([r.getrandbits(32), r.getrandbits(32), r.getrandbits(32)]).toEqual([580770826, 156432199, 3285415361]);
  });
  it('reproduit random(), shuffle() et choice()', () => {
    const r = new PyRandom('7/socle');
    expect([r.random(), r.random()]).toEqual([0.18512379060169204, 0.06922450170467631]);
    const l = Array.from({ length: 10 }, (_, i) => i);
    r.shuffle(l);
    expect(l).toEqual([9, 0, 3, 2, 5, 7, 6, 4, 1, 8]);
    expect([r.choice(['a', 'b']), r.choice([1, 2, 3])]).toEqual(['b', 3]);
  });
  it('calcule statistics.pstdev() à l’identique', () => {
    expect(pyPstdev([2, 1, 0, -1, -2, 2, 2])).toBe(1.498298354528788);
    expect(pyPstdev([1, 2])).toBe(0.5);
    expect(pyPstdev([-2, 1, 1, 0, 2, -1, 2, 2, 0, 1, -2])).toBe(1.4316377952748747);
  });
});
