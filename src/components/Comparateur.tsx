// Comparateur de 2 ou 3 candidats, question par question (îlot React).
// La sélection est gardée dans l'adresse (?c=slug1,slug2) pour pouvoir la partager.
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { CONFIANCE, type Candidat, type Photos, type Question } from '@/lib/types';
import { PortraitMini } from './Portrait';

interface Props {
  questions: Question[];
  themes: Record<string, string>;
  echelle: Record<string, string>;
  base: string;
  photos: Photos;
  liste: { slug: string; nom: string }[]; // ordre alphabétique du nom de famille
}

const MAX = 3;

export default function Comparateur({ questions, themes, echelle, base, photos, liste }: Props) {
  const [choix, setChoix] = useState<string[]>(['', '', '']);
  const [candidats, setCandidats] = useState<Record<string, Candidat> | null>(null);
  const [erreur, setErreur] = useState(false);
  const [theme, setTheme] = useState('');
  const [divergences, setDivergences] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(location.search).get('c');
    const valides = new Set(liste.map((x) => x.slug));
    if (c) {
      const s = c.split(',').filter((x) => valides.has(x)).slice(0, MAX);
      setChoix([...s, '', '', ''].slice(0, MAX));
    }
    fetch(`${base}donnees/boussole-2027.json`)
      .then((r) => r.json())
      .then((d) => setCandidats(Object.fromEntries(d.candidats.map((x: Candidat) => [x.slug, x]))))
      .catch(() => setErreur(true));
  }, [base, liste]);

  const actifs = choix.filter(Boolean);
  useEffect(() => {
    const url = new URL(location.href);
    if (actifs.length) url.searchParams.set('c', actifs.join(','));
    else url.searchParams.delete('c');
    history.replaceState(null, '', url);
  }, [actifs.join(',')]);

  const qs = useMemo(
    () =>
      questions.filter((q) => {
        if (theme && q.theme !== theme) return false;
        if (!divergences || !candidats) return true;
        // Divergence : les candidats choisis n'ont pas tous la même position (inconnue comprise).
        return new Set(actifs.map((s) => candidats[s]?.positions[q.id]?.valeur ?? null)).size > 1;
      }),
    [questions, theme, divergences, candidats, actifs.join(',')],
  );

  return (
    <div>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-semibold">Choisissez jusqu'à trois candidats</legend>
        {choix.map((v, i) => (
          <label key={i} className="grid gap-1 text-sm font-semibold">
            Candidat {i + 1}
            <NativeSelect
              className="w-full"
              value={v}
              onChange={(e) => setChoix((c) => c.map((x, k) => (k === i ? e.target.value : x)))}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {liste.map((c) => (
                <NativeSelectOption key={c.slug} value={c.slug} disabled={choix.includes(c.slug) && v !== c.slug}>
                  {c.nom}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
      <label className="grid w-full max-w-sm gap-1 text-sm font-semibold">
        Thème
        <NativeSelect value={theme} onChange={(e) => setTheme(e.target.value)}>
          <NativeSelectOption value="">Tous les thèmes</NativeSelectOption>
          {Object.entries(themes).map(([k, l]) => (
            <NativeSelectOption key={k} value={k}>
              {l}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={divergences} onChange={(e) => setDivergences(e.target.checked)} />
        Seulement les questions où ils divergent
      </label>
      </div>

      {erreur && <p className="mt-6 font-semibold">Les données n'ont pas pu être chargées. Rechargez la page.</p>}
      {actifs.length < 2 && <p className="mt-8 text-muted-foreground">Choisissez au moins deux candidats pour les comparer.</p>}
      {actifs.length >= 2 && !candidats && !erreur && (
        <p role="status" className="mt-8">
          Chargement des positions…
        </p>
      )}
      {actifs.length >= 2 && candidats && (
        <div className="mt-8">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {qs.length} question{qs.length > 1 ? 's' : ''} affichée{qs.length > 1 ? 's' : ''}
          </p>
          <div className="sticky top-0 z-10 mt-2 hidden gap-3 border-b-[length:var(--brut-border)] border-border bg-background py-3 sm:grid" style={{ gridTemplateColumns: `repeat(${actifs.length}, minmax(0, 1fr))` }}>
            {actifs.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <PortraitMini slug={s} nom={candidats[s].nom} photos={photos} base={base} className="w-10" />
                <div className="min-w-0">
                  <a className="lien block truncate text-sm font-bold" href={`${base}candidats/${s}/`}>
                    {candidats[s].nom}
                  </a>
                  <span className="block truncate text-xs text-muted-foreground">{candidats[s].parti}</span>
                </div>
              </div>
            ))}
          </div>
          <ol className="grid gap-6 pt-4">
            {qs.map((q) => (
              <li key={q.id}>
                <h2 className="font-sans text-base font-bold">
                  <a className="lien" href={`${base}questions/${q.id}/`}>
                    {q.texte}
                  </a>{' '}
                  <span className="text-xs font-semibold text-muted-foreground">({themes[q.theme]})</span>
                </h2>
                <div className="mt-2 grid gap-2 sm:gap-3 sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]" style={{ ['--n' as string]: actifs.length }}>
                  {actifs.map((s) => {
                    const p = candidats[s].positions[q.id];
                    const connue = p && p.valeur !== null && p.valeur !== undefined;
                    return (
                      <div key={s} className="brut-surface min-w-0 bg-card p-3 text-sm">
                        <p className="mb-1 flex items-center gap-2 text-xs font-bold sm:sr-only">
                          <span className="sm:hidden">
                            <PortraitMini slug={s} nom={candidats[s].nom} photos={photos} base={base} className="w-6" />
                          </span>
                          {candidats[s].nom} :
                        </p>
                        <p className="font-bold">{connue ? echelle[String(p!.valeur)] : 'Position inconnue'}</p>
                        {connue && p!.citation && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs font-semibold">Citation et source</summary>
                            <blockquote className="mt-2 border-l-4 border-primary pl-2 text-xs">« {p!.citation} »</blockquote>
                            <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                              {p!.source && (
                                <a className="lien" href={p!.source}>
                                  Source<span className="sr-only"> (site externe)</span>
                                </a>
                              )}
                              {p!.confiance && <Badge variant="outline">{CONFIANCE[p!.confiance]?.libelle}</Badge>}
                              {p!.relu && <Badge>Relu</Badge>}
                            </p>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
