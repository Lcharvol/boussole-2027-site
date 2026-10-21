import { describe, expect, it } from 'vitest';
import { lireAudit } from '../src/lib/audit';

// Extrait du rapport de scripts/audit_biais.py au format 2 (dilemmes).
const tiers = (o: number[]) =>
  `| Tiers de l'axe | 1er observé | Attendu | Ratio |\n|---|---|---|---|\n| gauche | ${o[0]} | 100 | 1.10 |\n| centre | ${o[1]} | 100 | 0.93 |\n| droite | ${o[2]} | 100 | — |\n| non placé | 0 | 0 | — |\n`;
const rapport = `# Audit de neutralité

## 2. Pôles des enjeux

Pôle proche de la gauche de l'axe : A pour 16 enjeux, B pour 17, 5 transversaux, 2 indéterminés. Ce décompte ne joue pas sur le résultat.

## 3. Profils aléatoires

### Mode complet (2000 profils, 40.0 enjeux posés en moyenne, de 40 à 40)

${tiers([110, 93, 95])}
### Mode rapide (2000 profils, 12.0 enjeux posés en moyenne, de 12 à 12)

${tiers([100, 102, 98])}
### Mode adaptatif (200 profils, 31.8 enjeux posés en moyenne, de 19 à 32)

${tiers([119, 97, 86])}
`;

describe("lecture du rapport d'audit", () => {
  it('lit les tiers des trois modes et le décompte des pôles', () => {
    const c = lireAudit(rapport)!;
    expect(c.modes).toEqual(['complet', 'rapide', 'adaptatif']);
    expect(c.tiers.adaptatif?.map((t) => t.observe)).toEqual([119, 97, 86]);
    expect(c.tiers.complet?.[2].ratio).toBeNull();
    expect(c.profils).toEqual({ complet: 2000, rapide: 2000, adaptatif: 200 });
    expect(c.poles).toEqual({ a: 16, b: 17, transversaux: 5, indetermines: 2 });
  });
  it("renvoie null si le format du rapport n'est pas reconnu", () => {
    expect(lireAudit('')).toBeNull();
    expect(lireAudit(rapport.replace('Pôle proche', 'Autre chose'))).toBeNull();
    expect(lireAudit(rapport.replace('### Mode rapide', '### Mode moyen'))).toBeNull();
  });
});
