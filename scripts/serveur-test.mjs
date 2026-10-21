#!/usr/bin/env node
// Petit serveur statique pour les tests (Lighthouse) : sert dist/ sous /boussole-2027-site/, comme GitHub Pages.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createGzip } from 'node:zlib';
import { extname, join, normalize, resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', process.env.DIST ?? 'dist');
const BASE = '/boussole-2027-site/';
const PORT = Number(process.env.PORT ?? 4322);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!url.startsWith(BASE)) {
    res.writeHead(302, { location: BASE }).end();
    return;
  }
  let f = normalize(join(DIST, url.slice(BASE.length)));
  if (!f.startsWith(DIST)) return res.writeHead(403).end();
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    createReadStream(join(DIST, '404.html')).pipe(res);
    return;
  }
  // Compression gzip comme GitHub Pages, pour des mesures de performance réalistes.
  const type = TYPES[extname(f)] ?? 'application/octet-stream';
  if (/text|javascript|json|svg|csv/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
    res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', vary: 'accept-encoding' });
    createReadStream(f).pipe(createGzip()).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type });
  createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`Site servi sur http://localhost:${PORT}${BASE}`));
