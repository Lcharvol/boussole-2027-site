// Primitives qui reproduisent exactement le comportement de CPython (3.12, la version de la CI du
// skill), pour que score.ts donne au bit près les mêmes résultats que scripts/score.py.

/** Générateur Mersenne Twister MT19937, initialisé comme random.Random(graine) de Python
 * (graine entière, ou chaîne : version 2 de random.seed, avec SHA-512). */
export class PyRandom {
  private mt = new Uint32Array(624);
  private mti = 625;

  constructor(graine: number | string) {
    // random.seed(n) avec un entier : init_by_array sur les mots de 32 bits de |n| (poids faible d'abord).
    // Avec une chaîne s : n = int.from_bytes(s.encode() + sha512(s.encode()).digest(), 'big').
    let n: bigint;
    if (typeof graine === 'string') {
      const octets = new TextEncoder().encode(graine);
      const tout = new Uint8Array(octets.length + 64);
      tout.set(octets);
      tout.set(sha512(octets), octets.length);
      n = 0n;
      for (const o of tout) n = (n << 8n) | BigInt(o);
    } else n = BigInt(Math.abs(graine));
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

  /** random.random() : flottant de 53 bits dans [0, 1). */
  random(): number {
    const a = this.genrandUint32() >>> 5;
    const b = this.genrandUint32() >>> 6;
    return (a * 67108864 + b) * (1 / 9007199254740992);
  }

  /** random.choice(seq). */
  choice<T>(seq: readonly T[]): T {
    return seq[this.randrange(seq.length)];
  }

  /** random.shuffle(x), en place (Fisher-Yates de CPython, de la fin vers le début). */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randrange(i + 1);
      [x[i], x[j]] = [x[j], x[i]];
    }
  }
}

/** SHA-512 (synchrone, pour random.seed(chaîne)). */
export function sha512(message: Uint8Array): Uint8Array {
  const M = (1n << 64n) - 1n;
  const K = [
    '428a2f98d728ae22', '7137449123ef65cd', 'b5c0fbcfec4d3b2f', 'e9b5dba58189dbbc', '3956c25bf348b538', '59f111f1b605d019', '923f82a4af194f9b', 'ab1c5ed5da6d8118',
    'd807aa98a3030242', '12835b0145706fbe', '243185be4ee4b28c', '550c7dc3d5ffb4e2', '72be5d74f27b896f', '80deb1fe3b1696b1', '9bdc06a725c71235', 'c19bf174cf692694',
    'e49b69c19ef14ad2', 'efbe4786384f25e3', '0fc19dc68b8cd5b5', '240ca1cc77ac9c65', '2de92c6f592b0275', '4a7484aa6ea6e483', '5cb0a9dcbd41fbd4', '76f988da831153b5',
    '983e5152ee66dfab', 'a831c66d2db43210', 'b00327c898fb213f', 'bf597fc7beef0ee4', 'c6e00bf33da88fc2', 'd5a79147930aa725', '06ca6351e003826f', '142929670a0e6e70',
    '27b70a8546d22ffc', '2e1b21385c26c926', '4d2c6dfc5ac42aed', '53380d139d95b3df', '650a73548baf63de', '766a0abb3c77b2a8', '81c2c92e47edaee6', '92722c851482353b',
    'a2bfe8a14cf10364', 'a81a664bbc423001', 'c24b8b70d0f89791', 'c76c51a30654be30', 'd192e819d6ef5218', 'd69906245565a910', 'f40e35855771202a', '106aa07032bbd1b8',
    '19a4c116b8d2d0c8', '1e376c085141ab53', '2748774cdf8eeb99', '34b0bcb5e19b48a8', '391c0cb3c5c95a63', '4ed8aa4ae3418acb', '5b9cca4f7763e373', '682e6ff3d6b2b8a3',
    '748f82ee5defb2fc', '78a5636f43172f60', '84c87814a1f0ab72', '8cc702081a6439ec', '90befffa23631e28', 'a4506cebde82bde9', 'bef9a3f7b2c67915', 'c67178f2e372532b',
    'ca273eceea26619c', 'd186b8c721c0c207', 'eada7dd6cde0eb1e', 'f57d4f7fee6ed178', '06f067aa72176fba', '0a637dc5a2c898a6', '113f9804bef90dae', '1b710b35131c471b',
    '28db77f523047d84', '32caab7b40c72493', '3c9ebe0a15c9bebc', '431d67c49c100d4c', '4cc5d4becb3e42b6', '597f299cfc657e2a', '5fcb6fab3ad6faec', '6c44198c4a475817',
  ].map((h) => BigInt('0x' + h));
  const H = [
    '6a09e667f3bcc908', 'bb67ae8584caa73b', '3c6ef372fe94f82b', 'a54ff53a5f1d36f1', '510e527fade682d1', '9b05688c2b3e6c1f', '1f83d9abfb41bd6b', '5be0cd19137e2179',
  ].map((h) => BigInt('0x' + h));
  const rotr = (x: bigint, n: bigint) => ((x >> n) | (x << (64n - n))) & M;
  const longueur = message.length;
  const total = Math.ceil((longueur + 17) / 128) * 128;
  const bloc = new Uint8Array(total);
  bloc.set(message);
  bloc[longueur] = 0x80;
  let bits = BigInt(longueur) * 8n;
  for (let i = total - 1; bits > 0n; i--, bits >>= 8n) bloc[i] = Number(bits & 0xffn);
  const W = new Array<bigint>(80);
  for (let d = 0; d < total; d += 128) {
    for (let t = 0; t < 16; t++) {
      let w = 0n;
      for (let k = 0; k < 8; k++) w = (w << 8n) | BigInt(bloc[d + t * 8 + k]);
      W[t] = w;
    }
    for (let t = 16; t < 80; t++) {
      const s0 = rotr(W[t - 15], 1n) ^ rotr(W[t - 15], 8n) ^ (W[t - 15] >> 7n);
      const s1 = rotr(W[t - 2], 19n) ^ rotr(W[t - 2], 61n) ^ (W[t - 2] >> 6n);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) & M;
    }
    let [a, b, c, e0, e, f, g, h] = H;
    for (let t = 0; t < 80; t++) {
      const S1 = rotr(e, 14n) ^ rotr(e, 18n) ^ rotr(e, 41n);
      const ch = (e & f) ^ (~e & M & g);
      const t1 = (h + S1 + ch + K[t] + W[t]) & M;
      const S0 = rotr(a, 28n) ^ rotr(a, 34n) ^ rotr(a, 39n);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) & M;
      h = g;
      g = f;
      f = e;
      e = (e0 + t1) & M;
      e0 = c;
      c = b;
      b = a;
      a = (t1 + t2) & M;
    }
    [a, b, c, e0, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) & M));
  }
  const sortie = new Uint8Array(64);
  H.forEach((v, i) => {
    for (let k = 7; k >= 0; k--, v >>= 8n) sortie[i * 8 + k] = Number(v & 0xffn);
  });
  return sortie;
}

/** Valeur exacte d'un flottant fini : x = m × 2^e (m entier signé). */
function exact(x: number): [bigint, number] {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0);
  const lo = buf.getUint32(4);
  const expBrut = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e: number;
  if (expBrut === 0) e = -1074;
  else {
    m |= 1n << 52n;
    e = expBrut - 1075;
  }
  return [hi >>> 31 ? -m : m, e];
}

/** Flottant suivant (vers +∞) ou précédent (vers -∞), pour x > 0. */
function voisin(x: number, sens: 1 | -1): number {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  buf.setBigUint64(0, buf.getBigUint64(0) + BigInt(sens));
  return buf.getFloat64(0);
}

/** statistics.pstdev() de CPython 3.12 sur des entiers : racine correctement arrondie de la variance exacte. */
export function pyPstdev(valeurs: number[]): number {
  const n = valeurs.length;
  if (n < 1) throw new Error('pstdev requires at least one data point');
  let s = 0n;
  let s2 = 0n;
  for (const v of valeurs) {
    s += BigInt(v);
    s2 += BigInt(v) * BigInt(v);
  }
  // variance = N / n², donc écart-type = √N / n, arrondi correct de la valeur exacte.
  const N = BigInt(n) * s2 - s * s;
  if (N === 0n) return 0;
  const nn = BigInt(n) * BigInt(n);
  let r = Math.sqrt(Number(N)) / n;
  // r est à au plus un ulp du résultat correct : on choisit, parmi r et ses voisins, le plus proche.
  // t est plus proche de c1 que de c2 (c1 < c2 adjacents) si et seulement si milieu² × n² > N.
  const auDessusDuMilieu = (c1: number, c2: number) => {
    const [m1, e1] = exact(c1);
    const [m2, e2] = exact(c2);
    const e = Math.min(e1, e2);
    // c1 + c2 = somme × 2^e, donc milieu = somme × 2^(e-1) et milieu² × n² = somme² × n² × 2^p.
    const somme = (m1 << BigInt(e1 - e)) + (m2 << BigInt(e2 - e));
    const p = 2 * (e - 1);
    const gauche = somme * somme * nn;
    return p >= 0 ? N > gauche << BigInt(p) : N << BigInt(-p) > gauche;
  };
  for (let k = 0; k < 4; k++) {
    if (auDessusDuMilieu(r, voisin(r, 1))) r = voisin(r, 1);
    else if (!auDessusDuMilieu(voisin(r, -1), r)) r = voisin(r, -1);
    else break;
  }
  return r;
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
