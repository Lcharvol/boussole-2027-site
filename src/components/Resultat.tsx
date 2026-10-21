// Page de résultat (îlot React). Les réponses sont lues dans le fragment de l'URL (#…), le calcul
// (portage exact de score.py) tourne dans le navigateur. Rien n'est envoyé ni enregistré.
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { decoder, encoder, type Etat } from '@/lib/partage';
import { calculer, candidatsActifs, NIVEAU, type Resultat as Res, type ResultatCandidat } from '@/lib/score';
import { CONFIANCE, NIVEAUX_DU_MODE, type Candidat, type Mode, type Photos, type Question } from '@/lib/types';
import { PortraitMini } from './Portrait';

interface Props {
  questions: Question[];
  themes: Record<string, string>;
  echelle: Record<string, string>;
  version: string;
  base: string;
  photos: Photos;
}

const NB: Record<Mode, number> = { rapide: 8, moyen: 24, long: 40 };
const SUIVANT: Partial<Record<Mode, Mode[]>> = { rapide: ['moyen', 'long'], moyen: ['long'] };
const signe = (v: number) => (v > 0 ? `+${v}` : String(v));

function Barre({ score, marge }: { score: number; marge: number | null }) {
  const m = marge ?? 0;
  const g = Math.max(0, score - m);
  const d = Math.min(100, score + m);
  return (
    <div className="brut-progress relative h-5 w-full" aria-hidden="true">
      <div className="h-full bg-primary" style={{ width: `${score}%` }} />
      <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-muted-foreground/70" title="50 % : pas plus proche que le hasard" />
      {m > 0 && (
        <div className="absolute top-1/2 h-2.5 -translate-y-1/2 border-x-2 border-foreground" style={{ left: `${g}%`, width: `${d - g}%` }}>
          <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 bg-foreground" />
        </div>
      )}
    </div>
  );
}

export default function Resultat({ questions, themes, echelle, version, base, photos }: Props) {
  const ordreQ = useMemo(() => questions.map((q) => q.id), [questions]);
  const ordreT = useMemo(() => Object.keys(themes), [themes]);
  const parId = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [versionDiff, setVersionDiff] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [candidats, setCandidats] = useState<Candidat[] | null>(null);
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
        setErreur('invalide');
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
    fetch(`${base}donnees/boussole-2027.json`)
      .then((r) => r.json())
      .then((d) => setCandidats(d.candidats))
      .catch(() => setErreur('donnees'));
  }, [base]);

  useEffect(() => {
    if (!etat || !candidats) return;
    // Laisse le navigateur afficher « calcul en cours » avant le bootstrap (1 000 tirages par candidat).
    const t = setTimeout(() => {
      const r = calculer({ reponses: etat.reponses, importance: etat.importance }, { questions }, candidatsActifs(candidats));
      setRes(r);
      const n = Math.min(Math.max(3, r.peloton_de_tete.length), 5);
      setDetail(r.classement.slice(0, n).map((x) => x.slug));
    }, 30);
    return () => clearTimeout(t);
  }, [etat, candidats, questions]);

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
      <p role="status" className="brut-surface bg-card p-4 font-semibold">
        Calcul en cours, dans votre navigateur…
      </p>
    );
  }

  const nom = Object.fromEntries(candidats.map((c) => [c.slug, c]));
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

  const ligne = (r: ResultatCandidat, rang: number | null) => (
    <li key={r.slug} className="brut-surface grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 bg-card p-3 sm:grid-cols-[2rem_auto_1fr_13rem] sm:items-center sm:gap-x-4">
      <span className="hidden text-right font-serif text-xl font-bold sm:block">{rang ?? '—'}</span>
      <PortraitMini slug={r.slug} nom={r.nom} photos={photos} base={base} />
      <div className="min-w-0">
        <p className="font-bold leading-tight">
          <span className="sm:hidden">{rang ? `${rang}. ` : ''}</span>
          <a className="lien" href={`${base}candidats/${r.slug}/`}>
            {r.nom}
          </a>
        </p>
        <p className="text-sm text-muted-foreground">{r.parti}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {rang !== null && peloton.has(r.nom) && res.peloton_de_tete.length > 1 && <Badge variant="secondary">Peloton de tête</Badge>}
          {r.prioritaires_sans_donnee.length > 0 && (
            <Badge variant="outline" className="h-auto whitespace-normal text-left normal-case">
              Aucune position connue sur : {r.prioritaires_sans_donnee.map((t) => themes[t]).join(', ')}
            </Badge>
          )}
        </div>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <p className="flex items-baseline justify-between text-sm">
          <span className="text-lg font-bold tabular-nums">
            {r.score === null ? '—' : `${r.score} %`}
            {r.marge !== null && <span className="text-sm font-semibold"> ± {r.marge}</span>}
          </span>
          <span className="text-xs text-muted-foreground">couverture {Math.round(r.couverture * 100)} %</span>
        </p>
        {r.score !== null && <Barre score={r.score} marge={r.marge} />}
        <p className="sr-only">
          Proximité {r.score ?? 'non calculable'} pour cent{r.marge !== null ? `, plus ou moins ${r.marge} points` : ''}, position connue sur {Math.round(r.couverture * 100)} % de vos réponses.
        </p>
      </div>
    </li>
  );

  const carteDetail = (slug: string) => {
    const r = [...res.classement, ...res.donnees_insuffisantes].find((x) => x.slug === slug);
    const c = nom[slug];
    if (!r || !c) return null;
    const bloc = (qid: string) => {
      const q = parId[qid];
      const p = c.positions[qid]!;
      return (
        <li key={qid} className="border-t-[length:var(--brut-border)] border-border pt-3">
          <p className="font-semibold">
            <a className="lien" href={`${base}questions/${qid}/`}>
              {q.texte}
            </a>
          </p>
          <p className="mt-1 text-sm">
            Vous : <strong>{echelle[String(etat.reponses[qid])]}</strong> ({signe(etat.reponses[qid]!)}) · {c.nom} : <strong>{echelle[String(p.valeur)]}</strong> ({signe(p.valeur!)})
          </p>
          {p.citation && <blockquote className="mt-2 border-l-4 border-primary pl-3 text-sm">« {p.citation} »</blockquote>}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {p.source && (
              <a className="lien font-semibold text-foreground" href={p.source}>
                Source<span className="sr-only"> (site externe)</span>
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
      <article key={slug} className="brut-panel bg-card p-4 sm:p-5" aria-labelledby={`d-${slug}`}>
        <header className="flex items-center gap-3">
          <PortraitMini slug={slug} nom={c.nom} photos={photos} base={base} className="w-14" />
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

  return (
    <div className="grid gap-10">
      <section aria-labelledby="titre-resume" className="grid gap-4">
        <p className="brut-surface bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Ce résultat mesure une proximité avec des programmes. Ce n'est pas une consigne de vote.
        </p>
        <h2 id="titre-resume" className="sr-only">
          Résumé
        </h2>
        <p className="text-muted-foreground">
          Mode {etat.mode} · {res.nb_reponses} réponse{res.nb_reponses > 1 ? 's' : ''} prise{res.nb_reponses > 1 ? 's' : ''} en compte
          {nbPasse > 0 && ` · ${nbPasse} question${nbPasse > 1 ? 's' : ''} passée${nbPasse > 1 ? 's' : ''}`}
          {prio.length > 0 && ` · priorités : ${prio.map(([t, v]) => `${themes[t]}${v === 3 ? ' (décisif)' : ''}`).join(', ')}`}
        </p>
        {versionDiff && (
          <Alert role="note">
            <AlertTitle>Lien créé avec une version antérieure des questions</AlertTitle>
            <AlertDescription>Les positions des candidats ont pu évoluer depuis : le résultat est recalculé avec les données actuelles.</AlertDescription>
          </Alert>
        )}
        {res.nb_reponses === 0 && (
          <Alert role="note">
            <AlertTitle>Aucune réponse</AlertTitle>
            <AlertDescription>Vous avez passé toutes les questions : il n'y a rien à comparer.</AlertDescription>
          </Alert>
        )}
      </section>

      {res.classement.length > 0 && (
        <section aria-labelledby="titre-classement">
          <h2 id="titre-classement" className="text-3xl font-bold">
            Proximité avec chaque candidat
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            50 % : pas plus proche que des réponses au hasard (trait pointillé). 100 % : mêmes réponses partout. La marge (±) contient {niveau} % des scores obtenus en
            rééchantillonnant vos questions ; la couverture dit sur quelle part de vos réponses la position du candidat est connue.
          </p>
          {res.peloton_de_tete.length > 1 && (
            <Alert role="note" className="mt-4">
              <AlertTitle>Les {res.peloton_de_tete.length} premiers ne peuvent pas être départagés</AlertTitle>
              <AlertDescription>
                Leurs intervalles (score ± marge) recouvrent celui du premier : leur ordre n'est pas significatif.
                {etat.mode !== 'long' && ' Le mode long resserre les marges.'}
              </AlertDescription>
            </Alert>
          )}
          <ol className="mt-5 grid gap-3">{res.classement.map((r, i) => ligne(r, i + 1))}</ol>
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
            <Button onClick={copier}>Copier le lien</Button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button variant="outline" onClick={() => navigator.share({ title: 'Ma boussole présidentielle 2027', url: urlPartage }).catch(() => {})}>
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
                  const nouvelles = questions.filter((q) => NIVEAUX_DU_MODE[m].includes(q.niveau) && !(q.id in etat.reponses)).length;
                  return (
                    <a key={m} className="brut-control brut-focus inline-flex h-10 items-center bg-primary px-4 text-sm text-primary-foreground" href={`${base}test/#reprendre=${code}&vers=${m}`}>
                      Passer au mode {m} (+{nouvelles} questions)
                    </a>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Vous avez répondu au mode le plus complet ({NB.long} questions).</p>
          )}
          <p className="mt-4 text-sm">
            <a className="lien" href={`${base}test/`}>
              Refaire le test
            </a>{' '}
            ·{' '}
            <a className="lien" href={`${base}comparer/?c=${res.classement.slice(0, 3).map((r) => r.slug).join(',')}`}>
              Comparer les premiers côte à côte
            </a>{' '}
            ·{' '}
            <a className="lien" href={`${base}methode/`}>
              Comment le score est calculé
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
