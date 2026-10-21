#!/usr/bin/env node
// Génère au build des portraits WebP recadrés en 4:5 aux tailles affichées (96, 192 et 320 px de
// large), à partir des photos Wikimedia Commons de public/photos/. Même cadrage pour tous : centré
// horizontalement, au quart supérieur verticalement (comme object-position: 50% 25%).
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const RACINE = resolve(import.meta.dirname, '..');
const photos = JSON.parse(readFileSync(join(RACINE, 'src/data/photos.json'), 'utf8'));
const sortie = join(RACINE, 'public', 'portraits');
mkdirSync(sortie, { recursive: true });
export const LARGEURS = [96, 192, 320];

let n = 0;
for (const [slug, { photo }] of Object.entries(photos)) {
  if (!photo) continue;
  const source = sharp(join(RACINE, 'public', 'photos', photo.image));
  const { width: w, height: h } = await source.metadata();
  // Plus grand rectangle 4:5 contenu dans la photo.
  let cw = w, ch = Math.round((w * 5) / 4);
  if (ch > h) { ch = h; cw = Math.round((h * 4) / 5); }
  const left = Math.round((w - cw) / 2);
  const top = Math.round((h - ch) * 0.25);
  for (const l of LARGEURS) {
    await sharp(join(RACINE, 'public', 'photos', photo.image))
      .extract({ left, top, width: cw, height: ch })
      .resize(l, Math.round((l * 5) / 4))
      .webp({ quality: 78 })
      .toFile(join(sortie, `${slug}-${l}.webp`));
  }
  n++;
}
console.log(`Portraits : ${n} photos × ${LARGEURS.length} tailles dans public/portraits/`);
