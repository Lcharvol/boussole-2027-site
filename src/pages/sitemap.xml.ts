// Plan du site pour les moteurs de recherche (pages de résultat exclues : elles dépendent des réponses).
import type { APIRoute } from 'astro';
import { candidats, candidatsRetires, enjeuxParTheme, listeEnjeux } from '../lib/donnees';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const chemins = [
    '', 'test/', 'candidats/', 'questions/', 'comparer/', 'methode/', 'calendrier/', 'classe/', 'classe/test/',
    'skill-claude/', 'donnees/', 'a-propos/', 'confidentialite/', 'mentions-legales/',
    ...[...candidats, ...candidatsRetires].map((c) => `candidats/${c.slug}/`),
    ...listeEnjeux.map((q) => `questions/${q.id}/`),
    ...enjeuxParTheme.map((t) => `classe/${t.theme}/`),
  ];
  const urls = chemins.map((c) => `  <url><loc>${new URL(`${base}/${c}`, site)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
