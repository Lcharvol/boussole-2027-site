#!/usr/bin/env node
// Génère au build les images de partage (Open Graph, 1200 × 630) : une générique et une par mode.
// Elles ne contiennent aucun résultat ni aucun nom de candidat : le résultat reste dans le lien.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const RACINE = resolve(import.meta.dirname, '..');
const police = (poids) => readFileSync(join(RACINE, 'node_modules/@fontsource/inter/files', `inter-latin-${poids}-normal.woff`));
const fonts = [
  { name: 'Inter', data: police(400), weight: 400, style: 'normal' },
  { name: 'Inter', data: police(800), weight: 800, style: 'normal' },
];
const { meta } = JSON.parse(readFileSync(join(RACINE, 'src/generated/donnees.json'), 'utf8'));

const C = { fond: '#fbf9f1', encre: '#1d1a16', jaune: '#f2c230', cyan: '#a6e3f2', carte: '#ffffff' };
const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

function image(surtitre, titre, sousTitre) {
  return h(
    'div',
    { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.fond, padding: 64, fontFamily: 'Inter', color: C.encre },
    h(
      'div',
      { display: 'flex', alignItems: 'center', gap: 20 },
      h('div', { width: 64, height: 64, borderRadius: 32, border: `5px solid ${C.encre}`, background: C.jaune, display: 'flex' }),
      h('div', { fontSize: 34, fontWeight: 800 }, 'Boussole présidentielle 2027'),
    ),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: 18 },
      h('div', { display: 'flex', alignSelf: 'flex-start', fontSize: 26, fontWeight: 800, background: C.cyan, border: `4px solid ${C.encre}`, padding: '6px 16px', textTransform: 'uppercase', letterSpacing: 1 }, surtitre),
      h('div', { fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }, titre),
      h('div', { fontSize: 32, lineHeight: 1.3, maxWidth: 1000 }, sousTitre),
    ),
    h(
      'div',
      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.jaune, border: `5px solid ${C.encre}`, boxShadow: `8px 8px 0 ${C.encre}`, padding: '16px 24px', fontSize: 25, fontWeight: 800 },
      h('div', {}, 'Proximité avec des programmes, pas une consigne de vote'),
      h('div', { fontWeight: 400 }, 'Rien n’est collecté'),
    ),
  );
}

const sous = `${meta.nb_questions} affirmations, ${meta.nb_candidats} candidats, ${meta.nb_positions} positions sourcées par une citation exacte et relues par un humain.`;
const images = {
  generique: image('Présidentielle 2027', 'De quels programmes êtes-vous proche ?', sous),
  'resultat-rapide': image('Mode rapide · 8 questions', 'J’ai fait la boussole. Et vous ?', sous),
  'resultat-moyen': image('Mode moyen · 24 questions', 'J’ai fait la boussole. Et vous ?', sous),
  'resultat-long': image('Mode long · 40 questions', 'J’ai fait la boussole. Et vous ?', sous),
};

const dossier = join(RACINE, 'public', 'og');
mkdirSync(dossier, { recursive: true });
for (const [nom, el] of Object.entries(images)) {
  const svg = await satori(el, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(join(dossier, `${nom}.png`), png);
}
console.log(`Images de partage : ${Object.keys(images).length} fichiers dans public/og/`);
