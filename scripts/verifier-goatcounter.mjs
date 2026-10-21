#!/usr/bin/env node
// Vérifie que la copie de count.js servie par le site est bien la version officielle épinglée :
// son empreinte SHA-384 doit être celle publiée par GoatCounter (https://www.goatcounter.com/help/countjs-versions).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RACINE = resolve(import.meta.dirname, '..');
const attendu = readFileSync(join(RACINE, 'src/lib/config-audience.ts'), 'utf8').match(/sha384-[A-Za-z0-9+/=]+/)[0];
const obtenu = 'sha384-' + createHash('sha384').update(readFileSync(join(RACINE, 'public/vendor/goatcounter/count.v5.js'))).digest('base64');
if (obtenu !== attendu) {
  console.error(`✗ count.v5.js ne correspond pas à l'empreinte publiée (${obtenu} ≠ ${attendu}).`);
  process.exit(1);
}
console.log('✓ count.v5.js : version officielle, empreinte SRI vérifiée.');
