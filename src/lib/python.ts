// Primitives qui reproduisent exactement le comportement de CPython (3.12, la version de la CI du
// skill), pour que score.ts donne au bit près les mêmes résultats que scripts/score.py.

/** Générateur Mersenne Twister MT19937, initialisé comme random.Random(entier) de Python. */
export class PyRandom {
  private mt = new Uint32Array(624);
  private mti = 625;

  constructor(graine: number) {
    // random.seed(n) avec un entier : init_by_array sur les mots de 32 bits de |n| (poids faible d'abord).
    let n = BigInt(Math.abs(graine));
    const cle: number[] = [];
    do {
      cle.push(Number(n & 0xffffffffn));
      n >>= 32n;
    } while (n > 0n);
    this.initParTableau(cle);
  }

  private initGenrand(s: number) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = 624;
  }

  private initParTableau(cle: number[]) {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    const len = cle.length;
    for (let k = Math.max(624, len); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + cle[j] + j) >>> 0;
      i++;
      j++;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
      if (j >= len) j = 0;
    }
    for (let k = 623; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  }

  private genrandUint32(): number {
    const mt = this.mt;
    if (this.mti >= 624) {
      let kk = 0;
      let y: number;
      for (; kk < 624 - 397; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + 397] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      for (; kk < 623; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + (397 - 624)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      y = (mt[623] & 0x80000000) | (mt[0] & 0x7fffffff);
      mt[623] = mt[396] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** random.getrandbits(k) pour 1 ≤ k ≤ 32. */
  getrandbits(k: number): number {
    return this.genrandUint32() >>> (32 - k);
  }

  /** random.randrange(n) : _randbelow_with_getrandbits (rejet). */
  randrange(n: number): number {
    const k = 32 - Math.clz32(n); // n.bit_length()
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }
}

/** sum() de CPython ≥ 3.12 sur des flottants : sommation compensée de Neumaier. */
export function pySum(valeurs: number[]): number {
  if (valeurs.length === 0) return 0;
  let f = 0 + valeurs[0];
  let c = 0;
  for (let i = 1; i < valeurs.length; i++) {
    const x = valeurs[i];
    const t = f + x;
    if (Math.abs(f) >= Math.abs(x)) c += f - t + x;
    else c += x - t + f;
    f = t;
  }
  if (c && Number.isFinite(c)) f += c;
  return f;
}

/** round(x) de Python : arrondi au pair le plus proche, sur la valeur binaire exacte. */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f; // exact pour |x| < 2^52
  let r: number;
  if (d > 0.5) r = f + 1;
  else if (d < 0.5) r = f;
  else r = f % 2 === 0 ? f : f + 1;
  return r === 0 ? 0 : r; // pas de -0
}

/** round(x, n) de Python : arrondi correct de la valeur binaire exacte, égalité au pair. */
export function pyRoundN(x: number, n: number): number {
  if (!Number.isFinite(x) || x === 0) return x;
  // x = m × 2^e exactement.
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0);
  const lo = buf.getUint32(4);
  const signe = hi >>> 31 ? -1n : 1n;
  const expBrut = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e: number;
  if (expBrut === 0) e = -1074;
  else {
    m |= 1n << 52n;
    e = expBrut - 1075;
  }
  const p10 = 10n ** BigInt(n);
  let num = m * p10;
  let den = 1n;
  if (e >= 0) num <<= BigInt(e);
  else den <<= BigInt(-e);
  let q = num / den;
  const reste = num - q * den;
  const deux = 2n * reste;
  if (deux > den || (deux === den && q % 2n === 1n)) q += 1n;
  const r = Number(signe * q) / Number(p10);
  return r === 0 ? 0 : r;
}
