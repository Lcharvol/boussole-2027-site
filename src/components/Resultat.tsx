// Page de résultat (îlot React). Les réponses sont lues dans le fragment de l'URL (#…), le calcul
// (portage exact de score.py) tourne dans le navigateur. Rien n'est envoyé ni enregistré.
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { initiales, libellePosition, titreEnjeu } from '@/lib/axe';
import { decoder, encoder, estAncienLien, type Etat } from '@/lib/partage';
import { calculer, candidatsActifs, NIVEAU, type CandidatCalcul, type Resultat as Res, type ResultatCandidat } from '@/lib/score';
import { MAX_ADAPTATIF } from '@/lib/tirage';
import { CONFIANCE, type Candidat, type Mode, type Photos } from '@/lib/types';
import Axe from './Axe';
import Icone from './Icone';
import CarteAxes from './graphiques/CarteAxes';
import GrilleThemes from './graphiques/GrilleThemes';
import Proximite from './graphiques/Proximite';
import type { Carte } from '@/lib/acp';
import { PortraitMini } from './Portrait';

export interface EnjeuResume {
  id: string;
  theme: string;
  pole_a: string;
  pole_b: string;
}

interface Props {
  enjeux: EnjeuResume[];
  themes: Record<string, string>;
  version: string;
  base: string;
  photos: Photos;
  carte: Carte;
}

const SUIVANT: Partial<Record<Mode, Mode[]>> = { rapide: ['adaptatif', 'complet'], adaptatif: ['complet'] };

function Barre({ score, marge, delai = 0 }: { score: number; marge: number | null; delai?: number }) {
  const m = marge ?? 0;
  const g = Math.max(0, score - m);
  const d = Math.min(100, score + m);
  return (
    <div className="brut-progress relative h-5 w-full" aria-hidden="true">
      <div className="barre-anim h-full bg-primary" style={{ width: `${score}%`, ['--delai' as string]: `${delai}ms` }} />
      <div className="absolute -inset-y-0.5 left-1/2 w-0.5 bg-foreground/45" />
      {m > 0 && (
        <div className="apparition absolute top-1/2 h-2.5 -translate-y-1/2 border-x-2 border-foreground" style={{ left: `${g}%`, width: `${d - g}%`, ['--delai' as string]: `${delai + 600}ms` }}>
          <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 bg-foreground" />
        </div>
      )}
    </div>
  );
}

/** Nombre qui compte de 0 à sa valeur (immobile si le visiteur demande de réduire les animations). */
function Compteur({ valeur }: { valeur: number }) {
  const [v, setV] = useState(() => (typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? valeur : 0));
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(valeur);
      return;
    }
    let t0: number | null = null;
    let id = 0;
    const pas = (t: number) => {
      if (t0 === null) t0 = t;
      const x = Math.min(1, (t - t0) / 900);
      setV(Math.round(valeur * (1 - Math.pow(1 - x, 3))));
      if (x < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [valeur]);
  return <>{v}</>;
}

export default function Resultat({ enjeux, themes, version, base, photos, carte }: Props) {
  const ordreQ = useMemo(() => enjeux.map((q) => q.id), [enjeux]);
  const ordreT = useMemo(() => Object.keys(themes), [themes]);
  const parId = useMemo(() => Object.fromEntries(enjeux.map((q) => [q.id, q])), [enjeux]);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [versionDiff, setVersionDiff] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Calcul à partir de la version allégée (valeurs et confiance, ~4 ko compressés) ; les fiches complètes
  // (citations, sources) ne servent qu'au détail et se chargent ensuite, sans bloquer le classement.
  const [candidats, setCandidats] = useState<CandidatCalcul[] | null>(null);
  const [fiches, setFiches] = useState<Record<string, Candidat> | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [detail, setDetail] = useState<string[]>([]);
  const [copie, setCopie] = useState<'' | 'ok' | 'ko'>('');
  const [choix, setChoix] = useState('');

  useEffect(() => {
    const lire = () => {
      const code = location.hash.slice(1);
      if (!code) {
        setErreur('vide');
        return;
      }
      const d = decoder(code, ordreQ, ordreT, version);
      if (!d) {
        setErreur(estAncienLien(code) ? 'ancien' : 'invalide');
        return;
      }
      setErreur(null);
      setEtat(d.etat);
      setVersionDiff(d.versionDifferente);
    };
    lire();
    window.addEventListener('hashchange', lire);
    return () => window.removeEventListener('hashchange', lire);
  }, [ordreQ, ordreT, version]);

  useEffect(() => {
    fetch(`${base}donnees/calcul.json`)
      .then((r) => r.json())
      .then((d) => setCandidats(d.candidats))
      .catch(() => setErreur('donnees'));
    fetch(`${base}donnees/boussole-2027.json`)
      .then((r) => r.json())
      .then((d) => setFiches(Object.fromEntries(d.candidats.map((c: Candidat) => [c.slug, c]))))
      .catch(() => {});
  }, [base]);

  useEffect(() => {
    if (!etat || !candidats) return;
    // Laisse le navigateur afficher « calcul en cours » avant le bootstrap (1 000 tirages par candidat).
    const t = setTimeout(() => {
      const r = calculer({ reponses: etat.reponses, importance: etat.importance }, { enjeux }, candidatsActifs(candidats));
      setRes(r);
      const n = Math.min(Math.max(3, r.peloton_de_tete.length), 5);
      setDetail(r.classement.slice(0, n).map((x) => x.slug));
    }, 30);
    return () => clearTimeout(t);
  }, [etat, candidats, enjeux]);

  if (erreur === 'ancien') {
    return (
      <Alert role="status">
        <AlertTitle>Ce lien vient de l'ancien questionnaire</AlertTitle>
        <AlertDescription>
          Le questionnaire est passé des affirmations (« d'accord / pas d'accord ») aux dilemmes entre deux options : les réponses de ce lien n'ont plus le même sens et ne peuvent pas être recalculées.{' '}
          <a href={`${base}test/`}>Refaire le test</a>
        </AlertDescription>
      </Alert>
    );
  }
  if (erreur === 'vide' || erreur === 'invalide') {
    return (
      <Alert role="status">
        <AlertTitle>{erreur === 'vide' ? 'Aucune réponse dans ce lien' : 'Ce lien de résultat est illisible'}</AlertTitle>
        <AlertDescription>
          Le résultat est calculé à partir des réponses contenues dans l'adresse de la page.{' '}
          <a href={`${base}test/`}>Faire le test</a>
        </AlertDescription>
      </Alert>
    );
  }
  if (erreur === 'donnees') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Les données n'ont pas pu être chargées</AlertTitle>
        <AlertDescription>Rechargez la page. Vos réponses sont toujours dans l'adresse.</AlertDescription>
      </Alert>
    );
  }
  if (!etat || !res || !candidats) {
    return (
      // Hauteur réservée : le classement remplace ce bloc sans faire sauter la mise en page.
      <div className="min-h-[150vh]">
        <p role="status" className="brut-surface bg-card p-4 font-semibold">
          Calcul en cours, dans votre navigateur…
        </p>
      </div>
    );
  }

  const nom = fiches ?? {};
  const nbPasse = Object.values(etat.reponses).filter((v) => v === null).length;
  const prio = Object.entries(etat.importance).filter(([, v]) => v > 1);
  const code = encoder(etat, ordreQ, ordreT, version);
  const urlPartage = `${location.origin}${base}resultat/${etat.mode}/#${code}`;
  const niveau = Math.round(NIVEAU * 100);
  const peloton = new Set(res.peloton_de_tete);

  async function copier() {
    try {
      await navigator.clipboard.writeText(urlPartage);
      setCopie('ok');
    } catch {
      setCopie('ko');
    }
  }

  // Affiche (au besoin) la fiche détaillée d'un candidat et y amène l'écran.
  function voirDetail(slug: string) {
    if (!detail.includes(slug)) setDetail((d) => [...d, slug]);
    setTimeout(() => {
      const el = document.getElementById(`detail-${slug}`);
      el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      el?.focus({ preventScroll: true });
    }, 60);
  }

  const ligne = (r: ResultatCandidat, rang: number | null) => (
    <li
      key={r.slug}
      style={{ ['--delai' as string]: `${Math.min((rang ?? 12) - 1, 12) * 45}ms` }}
      className="entree survol brut-surface grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 bg-card p-3 sm:grid-cols-[2rem_auto_1fr_14rem_auto] sm:items-center sm:gap-x-4">
      <span className="hidden text-right font-serif text-xl font-bold text-muted-foreground sm:block">{rang ?? '—'}</span>
      <PortraitMini slug={r.slug} nom={r.nom} photos={photos} base={base} eager={rang !== null && rang <= 10} />
      <div className="min-w-0">
        <p className="font-bold leading-tight">
          <span className="sm:hidden">{rang ? `${rang}. ` : ''}</span>
          <a className="lien" href={`${base}candidats/${r.slug}/`}>
            {r.nom}
          </a>
        </p>
        <p className="text-sm text-muted-foreground">{r.parti}</p>
        {r.prioritaires_sans_donnee.length > 0 && (
          <p className="mt-1 text-xs font-semibold">
            <span aria-hidden="true">⚠ </span>
            Aucune position connue sur votre priorité : {r.prioritaires_sans_donnee.map((t) => themes[t]).join(', ')}
          </p>
        )}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <p className="flex items-baseline justify-between text-sm">
          <span className="text-lg font-bold tabular-nums">
            {r.score === null ? '—' : `${r.score} %`}
            {r.marge !== null && <span className="text-sm font-semibold"> ± {r.marge}</span>}
          </span>
          <span className="text-xs text-muted-foreground">couverture {Math.round(r.couverture * 100)} %</span>
        </p>
        {r.score !== null && <Barre score={r.score} marge={r.marge} delai={Math.min((rang ?? 12) - 1, 12) * 45 + 150} />}
        <p className="sr-only">
          Proximité {r.score ?? 'non calculable'} pour cent{r.marge !== null ? `, plus ou moins ${r.marge} points` : ''}, position connue sur {Math.round(r.couverture * 100)} % de vos réponses.
        </p>
      </div>
      <Button variant="outline" size="sm" className="col-span-2 justify-self-start sm:col-span-1" onClick={() => voirDetail(r.slug)}>
        <Icone nom="search" taille={15} />
        Détail<span className="sr-only"> pour {r.nom}</span>
      </Button>
    </li>
  );

  const carteDetail = (slug: string) => {
    const r = [...res.classement, ...res.donnees_insuffisantes].find((x) => x.slug === slug);
    const c = nom[slug];
    if (!r) return null;
    if (!c)
      return (
        <p key={slug} role="status" className="brut-surface bg-card p-4 text-sm">
          Chargement des citations…
        </p>
      );
    const bloc = (qid: string) => {
      const q = parId[qid];
      const p = c.positions[qid]!;
      return (
        <li key={qid} className="border-t-[length:var(--brut-border)] border-border pt-3">
          <p className="font-semibold">
            <a className="lien" href={`${base}questions/${qid}/`}>
              {titreEnjeu(q)}
            </a>
          </p>
          <p className="mt-1 text-sm">
            Vous : <strong>{libellePosition(etat.reponses[qid], q)}</strong> · {c.nom} : <strong>{libellePosition(p.valeur, q)}</strong>
          </p>
          <div className="mt-2 max-w-md">
            <Axe e={q} marques={[{ valeur: etat.reponses[qid], signe: 'Vous', plein: true }, { valeur: p.valeur, signe: initiales(c.nom) }]} />
          </div>
          {p.citation && <blockquote className="mt-2 border-l-4 border-primary pl-3 text-sm">« {p.citation} »</blockquote>}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {p.source && (
              <a className="lien inline-flex items-center gap-1 font-semibold text-foreground" href={p.source}>
                Source<span className="sr-only"> (site externe)</span>
                <Icone nom="external-link" taille={13} />
              </a>
            )}
            {p.date_source && <span>{p.date_source}</span>}
            {p.confiance && <Badge variant="outline">Confiance : {CONFIANCE[p.confiance]?.libelle}</Badge>}
            {p.relu ? <Badge>Relu par un humain</Badge> : <Badge variant="outline">Non relu</Badge>}
          </p>
        </li>
      );
    };
    return (
      <article key={slug} id={`detail-${slug}`} tabIndex={-1} className="entree brut-panel scroll-mt-6 bg-card p-4 outline-none sm:p-5" aria-labelledby={`d-${slug}`}>
        <header className="flex items-center gap-3">
          <PortraitMini slug={slug} nom={c.nom} photos={photos} base={base} className="w-14" sizes="56px" />
          <div>
            <h3 id={`d-${slug}`} className="text-xl font-bold">
              {c.nom}
            </h3>
            <p className="text-sm text-muted-foreground">
              {r.score !== null ? `${r.score} ± ${r.marge} %` : 'score non calculable'} · {c.parti}
            </p>
          </div>
        </header>
        {Object.keys(r.par_theme).length > 0 && (
          <div className="mt-4">
            <h4 className="font-sans text-sm font-bold">Proximité par thème</h4>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {ordreT
                .filter((t) => t in r.par_theme)
                .map((t) => (
                  <li key={t} className="flex justify-between gap-3">
                    <span>{themes[t]}</span>
                    <span className="font-semibold tabular-nums">{r.par_theme[t]} %</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
        <details className="mt-4" open={r.accords.length <= 6}>
          <summary className="cursor-pointer font-bold">Principaux accords ({r.accords.length})</summary>
          {r.accords.length ? <ul className="mt-3 grid gap-3">{r.accords.map(bloc)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Aucun accord net.</p>}
        </details>
        <details className="mt-3" open={r.desaccords.length <= 6}>
          <summary className="cursor-pointer font-bold">Principaux désaccords ({r.desaccords.length})</summary>
          {r.desaccords.length ? <ul className="mt-3 grid gap-3">{r.desaccords.map(bloc)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Aucun désaccord net.</p>}
        </details>
        <p className="mt-4 text-sm">
          <a className="lien" href={`${base}candidats/${slug}/`}>
            Toutes les positions de {c.nom}
          </a>
        </p>
      </article>
    );
  };

  const tous = [...res.classement, ...res.donnees_insuffisantes];
  const pelotonListe = res.classement.filter((r) => peloton.has(r.nom));
  const autres = res.classement.filter((r) => !peloton.has(r.nom));
  const tete = res.classement.slice(0, 3);
  // Les trois premiers sont dans la marge du premier : on le dit avant de montrer les visages.
  const indiscernables = tete.length === 3 && tete.every((r) => peloton.has(r.nom));

  return (
    <div className="grid gap-10">
      <section aria-labelledby="titre-resume" className="grid gap-5">
        <p className="brut-surface bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Ce résultat mesure une proximité avec des programmes. Ce n'est pas une consigne de vote.
        </p>
        <p className="text-sm text-muted-foreground">
          Mode {etat.mode} · {res.nb_reponses} réponse{res.nb_reponses > 1 ? 's' : ''} prise{res.nb_reponses > 1 ? 's' : ''} en compte
          {nbPasse > 0 && ` · ${nbPasse} question${nbPasse > 1 ? 's' : ''} passée${nbPasse > 1 ? 's' : ''}`}
          {prio.length > 0 && ` · priorités : ${prio.map(([t, v]) => `${themes[t]}${v === 3 ? ' (décisif)' : ''}`).join(', ')}`}
        </p>
        {versionDiff && (
          <Alert role="note">
            <AlertTitle>Lien créé avec une version antérieure des enjeux</AlertTitle>
            <AlertDescription>Les positions des candidats ont pu évoluer depuis : le résultat est recalculé avec les données actuelles.</AlertDescription>
          </Alert>
        )}
        {res.nb_reponses === 0 && (
          <Alert role="note">
            <AlertTitle>Aucune réponse</AlertTitle>
            <AlertDescription>Vous avez passé toutes les questions : il n'y a rien à comparer.</AlertDescription>
          </Alert>
        )}
        {tete.length > 0 && (
          <div className="brut-panel bg-card p-5 sm:p-6">
            <h2 id="titre-resume" className="text-2xl font-bold sm:text-3xl">
              {indiscernables ? 'En tête de votre classement' : 'Les programmes les plus proches de vos réponses'}
            </h2>
            {indiscernables && (
              <p className="mt-2 text-sm font-semibold">
                Ces trois-là, comme {res.peloton_de_tete.length - 3 > 0 ? `${res.peloton_de_tete.length - 3} autre${res.peloton_de_tete.length - 3 > 1 ? 's' : ''}` : 'les autres du peloton'}, ne peuvent pas être départagés : leur ordre n'est pas significatif.{etat.mode !== 'complet' && ' Le mode complet resserre les marges.'}
              </p>
            )}
            {res.nb_reponses < 10 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Avec {res.nb_reponses} réponse{res.nb_reponses > 1 ? 's' : ''}, ce résultat donne une tendance. Le mode adaptatif ou complet le précise.
              </p>
            )}
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:gap-6">
              {tete.map((r, i) => (
                <li key={r.slug} className="entree min-w-0" style={{ ['--delai' as string]: `${i * 120}ms` }}>
                  <a href={`#detail-${r.slug}`} onClick={(e) => (e.preventDefault(), voirDetail(r.slug))} className="survol-photo group block">
                    <PortraitMini slug={r.slug} nom={r.nom} photos={photos} base={base} className="w-full max-w-36" sizes="(min-width: 640px) 144px, 30vw" eager />
                    <span className="mt-2 block text-sm leading-tight font-bold group-hover:underline sm:text-base">
                      {i + 1}. {r.nom}
                    </span>
                    <span className="block text-xs text-muted-foreground sm:text-sm">{r.parti}</span>
                    <span className="mt-1 block font-bold tabular-nums">
                      <span aria-hidden="true">
                        <Compteur valeur={r.score ?? 0} /> %
                      </span>
                      <span className="sr-only">{r.score} %</span> <span className="text-sm font-semibold">± {r.marge}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {!indiscernables && (
            <p className="mt-5 text-sm">
              {res.peloton_de_tete.length > 1 ? (
                <>
                  <strong>
                    {res.peloton_de_tete.length} candidats sont dans la marge d'incertitude du premier
                  </strong>{' '}
                  : leur ordre n'est pas significatif.{etat.mode !== 'complet' && ' Le mode complet resserre les marges.'}
                </>
              ) : (
                <>Le premier se détache : aucun autre candidat n'est dans sa marge d'incertitude.</>
              )}
            </p>
            )}
          </div>
        )}
      </section>

      {res.classement.length > 0 && (
        <section aria-labelledby="titre-graphiques" className="grid gap-6">
          <h2 id="titre-graphiques" className="text-3xl font-bold">
            En un coup d'œil
          </h2>
          <Proximite classement={res.classement} peloton={peloton} niveau={niveau} />
          <CarteAxes
            carte={carte}
            noms={Object.fromEntries(candidats.map((c) => [c.slug, c.nom]))}
            poles={Object.fromEntries(enjeux.map((q) => [q.id, { pole_a: q.pole_a, pole_b: q.pole_b }]))}
            reponses={etat.reponses}
          />
          <GrilleThemes candidats={res.classement.slice(0, Math.min(8, Math.max(5, res.peloton_de_tete.length)))} themes={themes} />
        </section>
      )}

      {res.classement.length > 0 && (
        <section aria-labelledby="titre-classement">
          <h2 id="titre-classement" className="text-3xl font-bold">
            Proximité avec chaque candidat
          </h2>
          <details className="brut-surface mt-4 bg-card px-4 py-3 text-sm">
            <summary className="cursor-pointer font-bold">Comment lire ce résultat</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-[16rem_1fr] sm:items-center">
              <div aria-hidden="true">
                <Barre score={62} marge={12} />
                <div className="mt-1 flex justify-between text-[0.7rem] text-muted-foreground tabular-nums">
                  <span>0 %</span>
                  <span>50 % (hasard)</span>
                  <span>100 %</span>
                </div>
              </div>
              <ul className="grid gap-1.5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">La barre</strong> : votre proximité avec le programme. 50 % (trait vertical) veut dire « pas plus proche que des réponses au hasard », 100 % « mêmes réponses partout ».
                </li>
                <li>
                  <strong className="text-foreground">Le trait noir (±)</strong> : la marge d'incertitude. Elle contient {niveau} % des scores obtenus en rééchantillonnant vos questions.
                </li>
                <li>
                  <strong className="text-foreground">La couverture</strong> : la part de vos réponses pour lesquelles la position du candidat est connue.
                </li>
              </ul>
            </div>
          </details>
          {pelotonListe.length > 1 && (
            <>
              <h3 className="mt-8 font-sans text-lg font-bold">
                Peloton de tête{' '}
                <span className="text-sm font-semibold text-muted-foreground">
                  · {pelotonListe.length} candidats, ordre non significatif
                </span>
              </h3>
              <ol className="mt-3 grid gap-3">{pelotonListe.map((r) => ligne(r, res.classement.indexOf(r) + 1))}</ol>
            </>
          )}
          {(pelotonListe.length > 1 ? autres : res.classement).length > 0 && (
            <>
              {pelotonListe.length > 1 && <h3 className="mt-8 font-sans text-lg font-bold">Autres candidats</h3>}
              <ol className="mt-3 grid gap-3" start={pelotonListe.length > 1 ? pelotonListe.length + 1 : 1}>
                {(pelotonListe.length > 1 ? autres : res.classement).map((r) => ligne(r, res.classement.indexOf(r) + 1))}
              </ol>
            </>
          )}
        </section>
      )}

      {res.donnees_insuffisantes.length > 0 && (
        <section aria-labelledby="titre-insuffisant">
          <h2 id="titre-insuffisant" className="text-2xl font-bold">
            Positions connues insuffisantes
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Pour ces candidats, une position sourcée n'est connue que sur moins de la moitié de vos réponses : leur score n'est pas fiable et ils sont classés à part.
          </p>
          <ul className="mt-4 grid gap-3">{res.donnees_insuffisantes.map((r) => ligne(r, null))}</ul>
        </section>
      )}

      {res.nb_reponses > 0 && (
        <section aria-labelledby="titre-detail">
          <h2 id="titre-detail" className="text-3xl font-bold">
            Accords et désaccords, sources à l'appui
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Accord : votre réponse et la position du candidat sont du même côté, à un cran près. Désaccord : au moins trois crans d'écart. Chaque position est donnée avec sa citation exacte.
          </p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (choix && !detail.includes(choix)) setDetail((d) => [...d, choix]);
            }}
          >
            <label className="grid gap-1 text-sm font-semibold">
              Ajouter le détail d'un autre candidat
              <NativeSelect value={choix} onChange={(e) => setChoix(e.target.value)}>
                <NativeSelectOption value="">Choisir…</NativeSelectOption>
                {tous
                  .filter((r) => !detail.includes(r.slug))
                  .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
                  .map((r) => (
                    <NativeSelectOption key={r.slug} value={r.slug}>
                      {r.nom}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </label>
            <Button type="submit" variant="outline">
              Afficher
            </Button>
          </form>
          <div className="mt-5 grid gap-6">{detail.map(carteDetail)}</div>
        </section>
      )}

      <section aria-labelledby="titre-suite" className="grid gap-6 lg:grid-cols-2">
        <div className="brut-panel bg-card p-5">
          <h2 id="titre-suite" className="text-2xl font-bold">
            Partager ce résultat
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Le lien contient vos réponses, encodées après le « # » : elles ne sont stockées nulle part, mais toute personne qui ouvre le lien les verra.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={copier}>
              <Icone nom="copy" taille={16} />
              Copier le lien
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button variant="outline" onClick={() => navigator.share({ title: 'Ma boussole présidentielle 2027', url: urlPartage }).catch(() => {})}>
                <Icone nom="send" taille={16} />
                Partager…
              </Button>
            )}
          </div>
          <p aria-live="polite" className="mt-2 text-sm font-semibold">
            {copie === 'ok' ? 'Lien copié.' : copie === 'ko' ? "La copie a échoué : copiez l'adresse de la page." : ''}
          </p>
        </div>
        <div className="brut-panel bg-card p-5">
          <h2 className="text-2xl font-bold">Aller plus loin</h2>
          {SUIVANT[etat.mode] ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Répondez aux questions supplémentaires sans recommencer : vos réponses sont gardées.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {SUIVANT[etat.mode]!.map((m) => {
                  const posees = Object.keys(etat.reponses).length;
                  const nouvelles = m === 'complet' ? `+${enjeux.length - posees} questions` : `jusqu'à ${Math.max(0, MAX_ADAPTATIF - posees)} questions de plus`;
                  return (
                    <a key={m} className="brut-control brut-focus inline-flex h-10 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground" href={`${base}test/#reprendre=${code}&vers=${m}`}>
                      Passer au mode {m} ({nouvelles})
                      <Icone nom="arrow-right" taille={16} />
                    </a>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Vous avez répondu au mode le plus complet ({enjeux.length} questions).</p>
          )}
          <ul className="mt-4 grid gap-2 text-sm">
            <li>
              <a className="lien inline-flex items-center gap-1.5" href={`${base}test/#reprendre=${code}&modifier=1`}>
                <Icone nom="rotate-ccw" taille={16} />
                Modifier mes réponses
              </a>
            </li>
            <li>
              <a className="lien inline-flex items-center gap-1.5" href={`${base}test/`}>
                <Icone nom="arrow-right" taille={16} />
                Refaire le test depuis le début
              </a>
            </li>
            <li>
              <a className="lien inline-flex items-center gap-1.5" href={`${base}comparer/?c=${res.classement.slice(0, 3).map((r) => r.slug).join(',')}`}>
                <Icone nom="git-compare-arrows" taille={16} />
                Comparer les premiers côte à côte
              </a>
            </li>
            <li>
              <a className="lien inline-flex items-center gap-1.5" href={`${base}methode/`}>
                <Icone nom="flask" taille={16} />
                Comment le score est calculé
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
