#!/usr/bin/env node
// Test de bout en bout de la mesure d'audience : aucune donnée d'opinion ne doit partir.
//
// Le site est construit avec un code de test (dist-audience/), servi sous un nom d'hôte non local
// (boussole.test, sinon count.js ne compte pas), et toutes les requêtes vers GoatCounter sont
// interceptées (rien n'est réellement envoyé). On vérifie, pour chaque requête :
// - chemin (p) et référent (r) sans « ? » ni « # » ; requête de la page (q) vide ;
// - événements limités à la liste blanche ; aucune trace du fragment de résultat ni de reprise ;
// - aucune autre ressource externe ; et, avec Do Not Track, aucune requête du tout.
//
// Usage : npm run test:audience (construit dist-audience/ avec un code de test, puis lance ce test)
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { evenementAutorise } from '../src/lib/audience.ts';

const RACINE = resolve(import.meta.dirname, '..');
const PORT = 4323;
const B = `http://boussole.test:${PORT}/boussole-2027-site/`;
const CHROME = process.env.CHROME_PATH ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');

const serveur = spawn('node', ['scripts/serveur-test.mjs'], { cwd: RACINE, env: { ...process.env, DIST: 'dist-audience', PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const erreurs = [];
const verifier = (cond, msg) => {
  if (!cond) erreurs.push(msg);
};

const navigateur = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', `--host-resolver-rules=MAP boussole.test 127.0.0.1`],
});

/** Ouvre une page, intercepte GoatCounter, exécute le scénario, renvoie les requêtes envoyées. */
async function scenario(nom, url, actions = async () => {}, { dnt = false, refus = false } = {}) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  if (dnt) await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
  if (refus) await page.evaluateOnNewDocument(() => localStorage.setItem('boussole-audience', 'refus'));
  const envoyees = [];
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.hostname.endsWith('goatcounter.com')) {
      envoyees.push(u);
      return req.respond({ status: 204, body: '' });
    }
    if (u.hostname !== 'boussole.test') {
      erreurs.push(`${nom} : ressource externe inattendue ${u.href}`);
      return req.abort();
    }
    req.continue();
  });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  await actions(page);
  await new Promise((r) => setTimeout(r, 600));
  await page.close();
  for (const u of envoyees) {
    const p = u.searchParams.get('p') ?? '';
    const r = u.searchParams.get('r') ?? '';
    const q = u.searchParams.get('q') ?? '';
    const t = u.searchParams.get('t') ?? '';
    const e = u.searchParams.get('e') === 'true';
    verifier(!/[?#]/.test(p), `${nom} : chemin envoyé avec requête ou fragment : ${p}`);
    verifier(!/[?#/]/.test(r), `${nom} : référent avec chemin, requête ou fragment : ${r}`);
    verifier(q === '', `${nom} : requête de la page envoyée (q=${q})`);
    verifier(!/[#?]/.test(t), `${nom} : titre suspect : ${t}`);
    verifier(!/reprendre|\b2\.\d{8}\./.test(u.href), `${nom} : trace de réponses dans la requête : ${u.href}`);
    if (e) verifier(evenementAutorise(p), `${nom} : événement hors liste blanche : ${p}`);
    else verifier(p.startsWith('/boussole-2027-site/'), `${nom} : chemin de page inattendu : ${p}`);
  }
  return envoyees.map((u) => ({ p: u.searchParams.get('p'), r: u.searchParams.get('r'), e: u.searchParams.get('e') === 'true' }));
}

// 1. Lien tagué : ref devient le référent, et disparaît de l'adresse.
let adresseApres = '';
const r1 = await scenario('ref', `${B}?ref=tiktok-story-1`, async (page) => {
  adresseApres = await page.evaluate(() => location.href);
});
verifier(r1.length === 1 && r1[0].p === '/boussole-2027-site/' && r1[0].r === 'tiktok-story-1', `ref : attendu une page vue avec r=tiktok-story-1, obtenu ${JSON.stringify(r1)}`);
verifier(!adresseApres.includes('ref='), `ref : le paramètre reste dans l'adresse (${adresseApres})`);

// 2. Comparateur : ?c=… n'est pas envoyé, mais reste dans l'adresse (le partage fonctionne toujours).
let adresseComparateur = '';
const r2 = await scenario('comparateur', `${B}comparer/?c=marine-tondelier,edouard-philippe`, async (page) => {
  adresseComparateur = await page.evaluate(() => location.search);
});
verifier(r2.length === 1 && r2[0].p === '/boussole-2027-site/comparer/', `comparateur : ${JSON.stringify(r2)}`);
verifier(adresseComparateur.includes('c=marine-tondelier'), `comparateur : la sélection a disparu de l'adresse (${adresseComparateur})`);

// 3. Parcours complet du test (mode rapide) : test commencé, test terminé, puis page de résultat sans fragment.
const r3 = await scenario('test', `${B}test/`, async (page) => {
  await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Rapide'))?.click());
  await new Promise((r) => setTimeout(r, 400));
  for (let i = 0; i < 60; i++) {
    const fini = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Voir mon résultat')));
    if (fini) break;
    await page.keyboard.press(String((i % 5) + 1));
    await new Promise((r) => setTimeout(r, 350));
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
    page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Voir mon résultat'))?.click()),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  verifier(/#/.test(await page.evaluate(() => location.href)), 'test : la page de résultat devrait porter ses réponses dans le fragment');
});
const evts = r3.filter((x) => x.e).map((x) => x.p);
verifier(evts.includes('test-commence/rapide') && evts.includes('test-termine/rapide'), `test : événements attendus, obtenu ${JSON.stringify(evts)}`);
verifier(r3.some((x) => !x.e && x.p === '/boussole-2027-site/resultat/rapide/'), `test : page vue du résultat sans fragment attendue, obtenu ${JSON.stringify(r3)}`);

// 4. Téléchargement des données ouvertes.
const r4 = await scenario('donnees', `${B}donnees/`, async (page) => {
  await page.evaluate(() => {
    const a = document.querySelector('a[href$="positions.csv"]');
    a?.addEventListener('click', (e) => e.preventDefault(), { once: true });
    a?.click();
  });
});
verifier(r4.some((x) => x.e && x.p === 'donnees/positions.csv'), `données : événement attendu, obtenu ${JSON.stringify(r4)}`);

// 5. Do Not Track : rien n'est compté, et count.js n'est même pas chargé.
const r5 = await scenario('dnt', `${B}?ref=tiktok-story-1`, async () => {}, { dnt: true });
verifier(r5.length === 0, `Do Not Track : ${r5.length} requête(s) envoyée(s)`);

// 6. Refus enregistré sur ce navigateur (bouton de la page Confidentialité) : rien n'est compté.
const r6 = await scenario('refus', `${B}test/`, async () => {}, { refus: true });
verifier(r6.length === 0, `refus : ${r6.length} requête(s) envoyée(s)`);

await navigateur.close();
serveur.kill();

if (erreurs.length) {
  console.error(`✗ Mesure d'audience : ${erreurs.length} problème(s)\n  - ${erreurs.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ Mesure d'audience : ${r1.length + r2.length + r3.length + r4.length} requêtes vérifiées, aucune requête ni fragment ni donnée d'opinion ; Do Not Track respecté.`);
