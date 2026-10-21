import { describe, expect, it } from 'vitest';
import { cheminNettoye, evenementAutorise, lireCode, lireRef, nePasSuivre, referentExterne, sansRef } from '../src/lib/audience';

describe("mesure d'audience : aucune donnée d'opinion", () => {
  it('ne garde que le chemin, sans requête ni fragment', () => {
    const cas = [
      '/boussole-2027-site/resultat/rapide/#2.20261021.r.abc.123',
      '/boussole-2027-site/resultat/?r=abcdef',
      '/boussole-2027-site/test/#reprendre=2.x.y&vers=complet',
      '/boussole-2027-site/comparer/?c=marine-tondelier,edouard-philippe#x',
      'https://lcharvol.github.io/boussole-2027-site/?ref=tiktok-story-1#a?b',
    ];
    for (const u of cas) {
      const c = cheminNettoye(u);
      expect(c).not.toMatch(/[?#]/);
    }
    expect(cheminNettoye('/boussole-2027-site/resultat/?r=abcdef')).toBe('/boussole-2027-site/resultat/');
    expect(cheminNettoye('/boussole-2027-site/resultat/rapide/#2.x')).toBe('/boussole-2027-site/resultat/rapide/');
  });
  it("n'autorise que les événements de la liste blanche", () => {
    for (const ok of ['test-commence/rapide', 'test-termine/adaptatif', 'test-termine/complet', 'donnees/boussole-2027.json', 'donnees/positions.csv']) expect(evenementAutorise(ok)).toBe(true);
    for (const ko of ['test-termine/rapide/marine-le-pen', 'test-commence/rapide?x=1', 'resultat/66', 'test-termine/rapide#1.2', 'priorite/economie', 'donnees/../x.json', 'donnees/x.json?a', '']) expect(evenementAutorise(ko)).toBe(false);
  });
  it('lit ref seulement comme référent, et le retire de la requête', () => {
    expect(lireRef('?ref=tiktok-story-1')).toBe('tiktok-story-1');
    expect(lireRef('?ref=../etc')).toBeNull();
    expect(lireRef('?c=a,b')).toBeNull();
    expect(sansRef('?ref=tiktok-story-1')).toBe('');
    expect(sansRef('?c=a&ref=x')).toBe('?c=a');
  });
  it('réduit le référent externe au nom de domaine', () => {
    expect(referentExterne('https://www.tiktok.com/@compte/video/123?lang=fr', 'lcharvol.github.io')).toBe('www.tiktok.com');
    expect(referentExterne('https://lcharvol.github.io/boussole-2027-site/test/', 'lcharvol.github.io')).toBe('');
    expect(referentExterne('', 'lcharvol.github.io')).toBe('');
  });
  it('respecte Do Not Track et Global Privacy Control', () => {
    expect(nePasSuivre({ doNotTrack: '1' })).toBe(true);
    expect(nePasSuivre({ globalPrivacyControl: true })).toBe(true);
    expect(nePasSuivre({}, { doNotTrack: '1' })).toBe(true);
    expect(nePasSuivre({ doNotTrack: '0' })).toBe(false);
    expect(nePasSuivre({ doNotTrack: null })).toBe(false);
  });
  it('valide le code du site', () => {
    expect(lireCode('boussole2027')).toBe('boussole2027');
    expect(lireCode('')).toBeNull();
    expect(lireCode(undefined)).toBeNull();
    expect(lireCode('x"><script>')).toBeNull();
  });
});
