// Calendrier iCalendar des étapes à venir, datées et officielles (à importer dans un agenda). Généré au build.
import type { APIRoute } from 'astro';
import { calendrier } from '../../data/calendrier';

const echapper = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
// Lignes de 75 octets au plus (RFC 5545) : repli simple par caractères, suffisant ici.
const plier = (l: string) => l.match(/.{1,70}/gu)!.join('\r\n ');

export const GET: APIRoute = ({ site }) => {
  const page = new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/calendrier/`, site).toString();
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boussole presidentielle 2027//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Présidentielle 2027'];
  const aujourdhui = new Date().toISOString().slice(0, 10);
  calendrier.forEach((e, i) => {
    if (!e.date || e.statut !== 'officiel' || e.date < aujourdhui) return;
    const jour = e.date.replaceAll('-', '');
    const lendemain = new Date(`${e.date}T12:00:00Z`);
    lendemain.setUTCDate(lendemain.getUTCDate() + 1);
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${jour}-${i}@boussole-2027`,
      'DTSTAMP:20261021T000000Z',
      `DTSTART;VALUE=DATE:${jour}`,
      `DTEND;VALUE=DATE:${lendemain.toISOString().slice(0, 10).replaceAll('-', '')}`,
      plier(`SUMMARY:${echapper(e.titre)}`),
      plier(`DESCRIPTION:${echapper(`${e.detail} Sources : ${e.sources.map((s) => s.url).join(' ')}`)}`),
      plier(`URL:${page}`),
      'END:VEVENT',
    );
  });
  lignes.push('END:VCALENDAR');
  return new Response(lignes.join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
