#!/usr/bin/env node
// Génère au build les images de partage (Open Graph, 1200 × 630) :
// - une générique et une par mode de résultat : aucun résultat ni aucun nom (le résultat reste dans le lien) ;
// - une par candidat : même gabarit pour tous (portrait au même cadrage, nom, parti, statut, couverture,
//   crédit de la photo) ;
// - une par enjeu : les deux pôles, à égalité, et la répartition des positions sur l'axe A … B, sans aucun nom.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const police = (poids) => readFileSync(join(RACINE, 'node_modules/@fontsource/inter/files', `inter-latin-${poids}-normal.woff`));
const fonts = [
  { name: 'Inter', data: police(400), weight: 400, style: 'normal' },
  { name: 'Inter', data: police(800), weight: 800, style: 'normal' },
];
const { meta, enjeux, candidats } = JSON.parse(readFileSync(join(RACINE, 'src/generated/donnees.json'), 'utf8'));
const photos = JSON.parse(readFileSync(join(RACINE, 'src/data/photos.json'), 'utf8'));

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
      h('div', { fontWeight: 400 }, 'Aucune réponse collectée'),
    ),
  );
}

const sous = `${meta.nb_enjeux} dilemmes, ${meta.nb_candidats} candidats, ${meta.nb_positions} positions sourcées par une citation exacte.`;
const images = {
  generique: image('Présidentielle 2027', 'De quels programmes êtes-vous proche ?', sous),
  'resultat-rapide': image('Mode rapide · 12 questions', 'J’ai fait la boussole. Et vous ?', sous),
  'resultat-adaptatif': image('Mode adaptatif · 12 à 32 questions', 'J’ai fait la boussole. Et vous ?', sous),
  'resultat-complet': image(`Mode complet · ${meta.nb_enjeux} questions`, 'J’ai fait la boussole. Et vous ?', sous),
};

const dossier = join(RACINE, 'public', 'og');
mkdirSync(join(dossier, 'candidats'), { recursive: true });
mkdirSync(join(dossier, 'questions'), { recursive: true });
const rendre = async (el, chemin) => {
  const svg = await satori(el, { width: 1200, height: 630, fonts });
  writeFileSync(chemin, new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
};
for (const [nom, el] of Object.entries(images)) await rendre(el, join(dossier, `${nom}.png`));

// --- Gabarit commun aux fiches (candidats et questions) ------------------------------------------
const entete = h(
  'div',
  { display: 'flex', alignItems: 'center', gap: 16 },
  h('div', { width: 44, height: 44, borderRadius: 22, border: `4px solid ${C.encre}`, background: C.jaune, display: 'flex' }),
  h('div', { fontSize: 26, fontWeight: 800 }, 'Boussole présidentielle 2027'),
);
const pied = (texte) =>
  h(
    'div',
    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.jaune, border: `4px solid ${C.encre}`, boxShadow: `6px 6px 0 ${C.encre}`, padding: '12px 20px', fontSize: 22, fontWeight: 800 },
    h('div', {}, texte),
    h('div', { fontWeight: 400 }, 'Sources et citations exactes'),
  );
const puce = (texte) =>
  h('div', { display: 'flex', alignSelf: 'flex-start', fontSize: 22, fontWeight: 800, background: C.cyan, border: `4px solid ${C.encre}`, padding: '4px 14px', textTransform: 'uppercase', letterSpacing: 1 }, texte);
const gabarit = (...contenu) =>
  h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.fond, padding: '48px 56px', fontFamily: 'Inter', color: C.encre }, ...contenu);

const initiales = (n) => n.split(/[\s-]+/).filter((m) => /^[A-ZÀ-Ý]/.test(m)).map((m) => m[0]).join('').slice(0, 3);
async function portrait(slug, nom) {
  const p = photos[slug]?.photo;
  const cadre = { width: 280, height: 350, border: `5px solid ${C.encre}`, boxShadow: `8px 8px 0 ${C.encre}`, background: '#efe9d8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
  if (!p) return h('div', { ...cadre, fontSize: 96, fontWeight: 800, color: '#6b6355' }, initiales(nom));
  // Même cadrage que sur le site : 4:5, centré, au quart supérieur.
  const source = sharp(join(RACINE, 'public', 'photos', p.image));
  const { width: w, height: hh } = await source.metadata();
  let cw = w, ch = Math.round((w * 5) / 4);
  if (ch > hh) { ch = hh; cw = Math.round((hh * 4) / 5); }
  const png = await sharp(join(RACINE, 'public', 'photos', p.image))
    .extract({ left: Math.round((w - cw) / 2), top: Math.round((hh - ch) * 0.25), width: cw, height: ch })
    .resize(540, 675).png().toBuffer();
  return h('div', cadre, { type: 'img', props: { src: `data:image/png;base64,${png.toString('base64')}`, width: 270, height: 340, style: { objectFit: 'cover' } } });
}

const ids = enjeux.enjeux.map((e) => e.id);
const connue = (c, id) => c.positions?.[id]?.valeur !== null && c.positions?.[id]?.valeur !== undefined;
let n = 0;
for (const c of candidats) {
  const nbConnues = ids.filter((id) => connue(c, id)).length;
  const nbRelues = ids.filter((id) => connue(c, id) && c.positions[id].relu).length;
  const p = photos[c.slug]?.photo;
  const credit = p ? `Photo : ${p.auteur}, ${p.licence}, Wikimedia Commons` : 'Pas de photo sous licence libre';
  const el = gabarit(
    entete,
    h(
      'div',
      { display: 'flex', gap: 48, alignItems: 'center' },
      await portrait(c.slug, c.nom),
      h(
        'div',
        { display: 'flex', flexDirection: 'column', gap: 14, flex: 1 },
        puce('Fiche candidat'),
        h('div', { fontSize: c.nom.length > 20 ? 58 : 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }, c.nom),
        h('div', { fontSize: 32 }, c.parti),
        h('div', { fontSize: 24, color: '#4a443a' }, `Statut : ${c.statut}`),
        h('div', { fontSize: 26, fontWeight: 800, marginTop: 8 }, `${nbConnues} positions sourcées sur ${ids.length}, ${nbRelues} relues par un humain`),
        h('div', { fontSize: 17, color: '#4a443a', marginTop: 6 }, credit.length > 90 ? credit.slice(0, 89) + '…' : credit),
      ),
    ),
    pied('Ses positions, thème par thème'),
  );
  await rendre(el, join(dossier, 'candidats', `${c.slug}.png`));
  n++;
}

const actifs = candidats.filter((c) => c.statut !== 'retiré');
const taillePole = (t) => (t.length > 60 ? 28 : t.length > 40 ? 32 : 38);
const pole = (lettre, texte, aDroite) =>
  h(
    'div',
    { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, alignItems: aDroite ? 'flex-end' : 'flex-start', textAlign: aDroite ? 'right' : 'left', background: C.carte, border: `4px solid ${C.encre}`, boxShadow: `5px 5px 0 ${C.encre}`, padding: '14px 20px' },
    h('div', { fontSize: 20, fontWeight: 800, letterSpacing: 1 }, `PÔLE ${lettre}`),
    h('div', { fontSize: taillePole(texte), fontWeight: 800, lineHeight: 1.12 }, texte),
  );
for (const e of enjeux.enjeux) {
  const compte = (v) => actifs.filter((c) => connue(c, e.id) && c.positions[e.id].valeur === v).length;
  const crans = [
    ['A nettement', compte(-2)],
    ['Plutôt A', compte(-1)],
    ['Entre les deux', compte(0)],
    ['Plutôt B', compte(1)],
    ['B nettement', compte(2)],
  ];
  const inconnues = actifs.filter((c) => !connue(c, e.id)).length;
  const el = gabarit(
    entete,
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: 20 },
      puce(`Qui pense quoi · ${enjeux.themes[e.theme]}`),
      h('div', { display: 'flex', gap: 20, alignItems: 'stretch' }, pole('A', e.pole_a, false), h('div', { display: 'flex', alignItems: 'center', fontSize: 28, fontWeight: 800 }, 'ou'), pole('B', e.pole_b, true)),
      h(
        'div',
        { display: 'flex', gap: 10 },
        ...crans.map(([l, v], i) =>
          h(
            'div',
            { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, background: i === 2 ? '#efe9d8' : C.fond, border: `4px solid ${C.encre}`, padding: '6px 8px' },
            h('div', { fontSize: 40, fontWeight: 800 }, String(v)),
            h('div', { fontSize: 19 }, l),
          ),
        ),
      ),
      h('div', { fontSize: 22, color: '#4a443a' }, `Nombre de candidats par position, de A à B · position inconnue : ${inconnues}`),
    ),
    pied(`La position de chacun des ${actifs.length} candidats`),
  );
  await rendre(el, join(dossier, 'questions', `${e.id}.png`));
  n++;
}
console.log(`Images de partage : ${Object.keys(images).length} générales, ${n} fiches (candidats et questions) dans public/og/`);
