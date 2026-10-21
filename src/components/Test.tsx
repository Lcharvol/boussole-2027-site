// Questionnaire (îlot React). Tout se passe dans le navigateur : rien n'est envoyé ni enregistré.
// Chaque question est un dilemme entre deux pôles, sur 5 crans. Le tirage (enjeux posés, ordre mêlant les
// thèmes, formulation, côté de chaque pôle) reproduit scripts/tirage.py du skill à partir d'une graine.
// À la fin, les réponses et la graine sont encodées dans le fragment de l'URL de la page de résultat (#…),
// que le navigateur ne transmet jamais au serveur.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Icone from './Icone';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { decoder, encoder, estAncienLien, type Etat } from '@/lib/partage';
import type { CandidatCalcul } from '@/lib/score';
import { MAX_ADAPTATIF, MODES as MODES_TIRAGE, nouvelleGraine, presenter, RAPIDE, tirer, type EnjeuTirage, type QuestionTiree } from '@/lib/tirage';
import { MODES, type Mode } from '@/lib/types';

interface Props {
  referentiel: { version: string; themes: Record<string, string>; enjeux: EnjeuTirage[] };
  candidats: CandidatCalcul[];
  base: string;
  classe?: boolean;
}

const MAX_PRIORITES = 3;
// Crans de gauche à droite ; touche : raccourci clavier (1 à 5 de gauche à droite, 0 pour passer).
const CRANS = [
  { court: 'Nettement', touche: '1' },
  { court: 'Plutôt', touche: '2' },
  { court: 'Entre les deux', touche: '3' },
  { court: 'Plutôt', touche: '4' },
  { court: 'Nettement', touche: '5' },
];
// Affiché seulement sur les appareils avec souris (et donc, en général, un clavier).
const SI_CLAVIER = 'hidden [@media(hover:hover)_and_(pointer:fine)]:inline-flex';

type Etape = { type: 'mode' } | { type: 'question'; i: number } | { type: 'priorites' } | { type: 'ancien' };

/** Ordre dans lequel des enjeux déjà posés l'ont été, rejoué à partir de la graine (modification des réponses). */
function ordreRejoue(mode: Mode, graine: number, reponses: Record<string, number | null>, ref: Props['referentiel'], candidats: CandidatCalcul[]): string[] {
  const ordre: string[] = [];
  if (mode === 'adaptatif') {
    const rep: Record<string, number | null> = {};
    for (;;) {
      const t = tirer('adaptatif', graine, { reponses: rep }, ref, candidats);
      const lot = t.questions.map((q) => q.enjeu).filter((e) => e in reponses);
      if (t.fin || !lot.length) break;
      for (const e of lot) {
        rep[e] = reponses[e];
        ordre.push(e);
      }
    }
  } else ordre.push(...tirer(mode, graine, {}, ref, candidats).questions.map((q) => q.enjeu).filter((e) => e in reponses));
  // Enjeux posés dans un autre mode (passage au mode supérieur) : à la suite, dans l'ordre des données.
  return [...ordre, ...ref.enjeux.map((e) => e.id).filter((e) => e in reponses && !ordre.includes(e))];
}

export default function Test({ referentiel, candidats, base, classe = false }: Props) {
  const { version, themes } = referentiel;
  const ordreE = useMemo(() => referentiel.enjeux.map((e) => e.id), [referentiel]);
  const ordreT = useMemo(() => Object.keys(themes), [themes]);
  const parId = useMemo(() => Object.fromEntries(referentiel.enjeux.map((e) => [e.id, e])), [referentiel]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [graine, setGraine] = useState(0);
  // Réponses sur l'axe des pôles (-2 = pôle A nettement … +2 = pôle B nettement), null = « je passe ».
  const [reponses, setReponses] = useState<Record<string, number | null | undefined>>({});
  const [importance, setImportance] = useState<Record<string, number>>({});
  // Questions de ce passage, dans l'ordre du tirage (les lots du mode adaptatif s'ajoutent au fur et à mesure).
  const [file, setFile] = useState<QuestionTiree[]>([]);
  // Enjeux posés lors d'un passage précédent (passage au mode supérieur) : gardés, pas reposés.
  const [anciennes, setAnciennes] = useState<string[]>([]);
  const [etape, setEtape] = useState<Etape>({ type: 'mode' });
  const [repriseDe, setRepriseDe] = useState<Mode | null>(null);
  const [modification, setModification] = useState(false);
  const [raisonFin, setRaisonFin] = useState<string | null>(null);
  const titreRef = useRef<HTMLHeadingElement>(null);
  const premierRendu = useRef(true);

  // Reprise : #reprendre=<code>&vers=<mode> ou &modifier=1 (depuis la page de résultat).
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get('reprendre');
    const vers = params.get('vers') as Mode | null;
    const modifier = params.has('modifier');
    if (!code) return;
    history.replaceState(null, '', location.pathname);
    if (estAncienLien(code)) {
      setEtape({ type: 'ancien' });
      return;
    }
    if (!modifier && (!vers || !MODES_TIRAGE.includes(vers))) return;
    const d = decoder(code, ordreE, ordreT, version);
    if (!d) return;
    const { etat } = d;
    setReponses(etat.reponses);
    setImportance(etat.importance);
    setGraine(etat.graine);
    if (modifier) {
      // Modification : les questions déjà posées sont reposées, dans leur ordre, avec les réponses données.
      setModification(true);
      setMode(etat.mode);
      setFile(ordreRejoue(etat.mode, etat.graine, etat.reponses, referentiel, candidats).map((e) => presenter(parId[e], themes, etat.graine)));
      setEtape({ type: 'question', i: 0 });
    } else {
      setAnciennes(Object.keys(etat.reponses));
      setRepriseDe(etat.mode);
      setMode(vers);
      const t = tirer(vers!, etat.graine, { reponses: etat.reponses }, referentiel, candidats);
      setFile(t.questions);
      if (t.fin) setRaisonFin(t.raison);
      setEtape(t.fin ? { type: 'priorites' } : { type: 'question', i: 0 });
    }
  }, [ordreE, ordreT, version, referentiel, candidats, parId, themes]);

  const repondues = file.filter((q) => reponses[q.enjeu] !== undefined).length;

  // Les réponses ne sont gardées nulle part : on prévient avant de quitter la page en cours de test.
  const envoi = useRef(false);
  useEffect(() => {
    if (!repondues) return;
    const avertir = (e: BeforeUnloadEvent) => {
      if (envoi.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [repondues]);

  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    // Le haut de l'étape (numéro de la question, thème) revient à l'écran, puis le focus va au titre.
    const zone = titreRef.current?.closest('section');
    zone?.scrollIntoView({ block: 'start', behavior: 'auto' });
    titreRef.current?.focus({ preventScroll: true });
  }, [etape]);

  function choisirMode(m: Mode) {
    // Mesure d'audience : uniquement « test commencé » et le mode, rien d'autre (voir src/lib/audience.ts).
    window.boussoleAudience?.compter(`test-commence/${m}`);
    const g = nouvelleGraine();
    setMode(m);
    setGraine(g);
    setFile(tirer(m, g, {}, referentiel, candidats).questions);
    setEtape({ type: 'question', i: 0 });
  }

  /** Réponses à transmettre au tirage et au calcul : toute question posée sans réponse vaut « je passe ». */
  function posees(rep = reponses): Record<string, number | null> {
    const r: Record<string, number | null> = {};
    for (const e of anciennes) r[e] = rep[e] ?? null;
    for (const q of file) r[q.enjeu] = rep[q.enjeu] ?? null;
    return r;
  }

  /** Après la dernière question de la file : lot suivant (mode adaptatif), sinon les priorités. */
  function apresDerniere(rep = reponses) {
    const t = tirer(mode!, graine, { reponses: posees(rep) }, referentiel, candidats);
    if (t.questions.length) {
      setFile((f) => [...f, ...t.questions]);
      setEtape({ type: 'question', i: file.length });
    } else {
      setRaisonFin(t.raison);
      setEtape({ type: 'priorites' });
    }
  }

  function suivante(i: number, rep = reponses) {
    if (i + 1 < file.length) setEtape({ type: 'question', i: i + 1 });
    else apresDerniere(rep);
  }

  function repondre(i: number, valeur: number | null, avancer: boolean) {
    const q = file[i];
    const rep = { ...reponses, [q.enjeu]: valeur };
    setReponses(rep);
    if (avancer) {
      const doux = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => suivante(i, rep), doux ? 260 : 60);
    }
  }

  function terminer() {
    const etat: Etat = { mode: mode!, graine, reponses: posees(), importance };
    const code = encoder(etat, ordreE, ordreT, version);
    const cible = classe ? 'classe/resultat/' : `resultat/${mode}/`;
    envoi.current = true;
    // Mesure d'audience : uniquement « test terminé » et le mode ; jamais les réponses ni le résultat.
    window.boussoleAudience?.compter(`test-termine/${mode}`);
    location.assign(`${base}${cible}#${code}`);
  }

  // Raccourcis clavier : 1 à 5 de gauche à droite, 0 pour passer ; la question suivante s'affiche ensuite.
  const courante = etape.type === 'question' ? etape.i : -1;
  useEffect(() => {
    if (courante < 0) return;
    const surTouche = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
      const t = ev.target instanceof Element ? ev.target : null;
      if (t?.closest('textarea, select, [contenteditable="true"], input:not([type="radio"]):not([type="checkbox"])')) return;
      const q = file[courante];
      if (!q) return;
      if (ev.key === '0') {
        ev.preventDefault();
        repondre(courante, null, true);
        return;
      }
      const k = CRANS.findIndex((c) => c.touche === ev.key);
      if (k < 0) return;
      ev.preventDefault();
      repondre(courante, q.options[k].valeur, true);
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  });

  if (etape.type === 'ancien') {
    return (
      <section aria-labelledby="titre-etape" className="grid gap-6">
        <Alert role="status">
          <AlertTitle>
            <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="font-sans text-lg font-bold outline-none">
              Ce lien vient de l'ancien questionnaire
            </h2>
          </AlertTitle>
          <AlertDescription>
            Le questionnaire est passé des affirmations (« d'accord / pas d'accord ») aux dilemmes entre deux options : les anciennes réponses ne peuvent pas être reprises telles quelles. Refaites le test, il ne prend que quelques minutes.
          </AlertDescription>
        </Alert>
        <Button className="h-11 justify-self-start px-5" onClick={() => setEtape({ type: 'mode' })}>
          Refaire le test
          <Icone nom="arrow-right" taille={18} />
        </Button>
      </section>
    );
  }

  if (etape.type === 'mode') {
    return (
      <section aria-labelledby="titre-etape">
        <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          Choisissez un mode
        </h2>
        <p className="mt-2 text-muted-foreground">Vous pourrez passer au mode supérieur à la fin, sans recommencer.</p>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {MODES.map((m, i) => (
            <li key={m.id} className="entree flex" style={{ ['--delai' as string]: `${i * 90}ms` }}>
              <button
                type="button"
                onClick={() => choisirMode(m.id)}
                className={`brut-control brut-focus group flex w-full flex-col p-5 text-left ${m.id === 'adaptatif' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="font-serif text-3xl font-bold">{m.titre}</span>
                  {m.id === 'adaptatif' && <span className="brut-chip bg-card px-2 py-0.5 text-[0.65rem] text-foreground">Recommandé</span>}
                </span>
                <span className="mt-2 text-sm font-bold">
                  {m.nb} · {m.duree}
                </span>
                <span className={`mt-3 flex-1 text-sm font-normal ${m.id === 'adaptatif' ? '' : 'text-muted-foreground'}`}>{m.fiabilite}</span>
                <span className="mt-5 inline-flex items-center gap-1 text-base font-bold underline decoration-2 underline-offset-4">
                  Commencer <Icone nom="arrow-right" taille={20} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
          Chaque question oppose deux options. Les enjeux sont tirés au hasard, en mêlant les thèmes ; la formulation et le côté où chaque option apparaît changent d'un passage à l'autre, pour qu'aucune ne soit toujours présentée en premier.
        </p>
      </section>
    );
  }

  const nbTotal = anciennes.length + file.length;
  const enCours = mode === 'adaptatif' && etape.type === 'question' && !raisonFin && nbTotal < MAX_ADAPTATIF;
  const pourcent = file.length ? Math.round((100 * repondues) / file.length) : 0;

  // Barre collée en bas de l'écran : progression et navigation toujours à portée de main.
  const barre = (precedent: ReactNode, suivant: ReactNode) => (
    <div id="barre-test" className="sticky bottom-0 z-20 -mx-4 mt-8 border-t-[length:var(--brut-border)] border-border bg-card px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.08)]">
      <Progress value={pourcent} className="mb-3 gap-1.5">
        <ProgressLabel className="text-xs">
          Mode {mode}
          {repriseDe && ` (suite du mode ${repriseDe})`}
          {modification && ' (modification)'}
        </ProgressLabel>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {repondues} / {file.length} réponses{enCours && ' pour l’instant'}
        </span>
      </Progress>
      <div className="flex items-center justify-between gap-3">
        {precedent}
        {suivant}
      </div>
    </div>
  );

  if (etape.type === 'question') {
    const i = etape.i;
    const q = file[i];
    if (!q) return null;
    const v = reponses[q.enjeu];
    const k = v === undefined || v === null ? null : q.options.findIndex((o) => o.valeur === v);
    const valeur = v === undefined ? null : v === null ? 'passe' : String(k);
    const derniere = i === file.length - 1;
    return (
      <section aria-labelledby="titre-etape" className="scroll-mt-4">
        <p className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          <span>
            Question {anciennes.length + i + 1}
            {mode === 'adaptatif' && !modification ? (enCours ? ` · ${RAPIDE} à ${MAX_ADAPTATIF} au total` : ` sur ${nbTotal}`) : ` sur ${nbTotal}`}
          </span>
          <span className="brut-chip bg-secondary px-2 py-0.5 text-[0.7rem] text-secondary-foreground normal-case">{q.theme_libelle}</span>
        </p>
        <article key={q.enjeu} id={`carte-${q.enjeu}`} className="entree brut-panel mt-3 bg-card p-4 sm:p-6">
          {q.contexte && <p className="text-sm leading-relaxed text-muted-foreground">{q.contexte}</p>}
          <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className={`scroll-mt-4 font-serif text-2xl leading-snug font-semibold text-pretty outline-none sm:text-3xl ${q.contexte ? 'mt-3' : ''}`}>
            {q.question}
          </h2>
          {/* Les deux options, à égalité : même style, côté tiré au hasard. */}
          <div className="mt-5 hidden items-stretch gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]" aria-hidden="true">
            <p className="brut-surface flex items-center gap-2 bg-background p-3 font-semibold">
              <Icone nom="arrow-left" taille={18} />
              {q.gauche.texte}
            </p>
            <span className="self-center text-sm font-bold text-muted-foreground">ou</span>
            <p className="brut-surface flex items-center justify-end gap-2 bg-background p-3 text-right font-semibold">
              {q.droite.texte}
              <Icone nom="arrow-right" taille={18} />
            </p>
          </div>
          <RadioGroup
            aria-labelledby="titre-etape"
            value={valeur}
            onValueChange={(nv) => repondre(i, nv === 'passe' ? null : q.options[Number(nv)].valeur, false)}
            className="mt-5 grid gap-2 sm:grid-cols-5"
          >
            {q.options.map((o, n) => (
              <label
                key={n}
                onPointerUp={() => repondre(i, o.valeur, true)}
                className="brut-questionnaire-choice flex min-h-12 cursor-pointer items-center gap-2.5 bg-background px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted has-[[data-checked]]:bg-primary has-[[data-checked]]:text-primary-foreground motion-safe:has-[[data-checked]]:animate-[pop_0.28s_ease-out] sm:flex-col sm:justify-center sm:gap-2 sm:py-3 sm:text-center"
              >
                <RadioGroupItem value={String(n)} aria-label={o.libelle} aria-keyshortcuts={CRANS[n].touche} />
                <span className="sm:hidden">{o.libelle}</span>
                <span className="hidden sm:block" aria-hidden="true">
                  {CRANS[n].court}
                  {n !== 2 && <span className="block text-xs font-normal">{n < 2 ? '← à gauche' : 'à droite →'}</span>}
                </span>
                <kbd aria-hidden="true" className={`${SI_CLAVIER} brut-kbd ml-auto px-1.5 font-mono text-[0.7rem] opacity-70 sm:ml-0`}>
                  {CRANS[n].touche}
                </kbd>
              </label>
            ))}
            <label
              onPointerUp={() => repondre(i, null, true)}
              className="brut-focus flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border-[length:var(--brut-border)] border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted has-[[data-checked]]:border-solid has-[[data-checked]]:bg-muted has-[[data-checked]]:text-foreground sm:col-span-5 sm:justify-self-start"
            >
              <RadioGroupItem value="passe" aria-keyshortcuts="0" />
              <span>Je passe</span>
              <kbd aria-hidden="true" className={`${SI_CLAVIER} brut-kbd ml-auto px-1.5 font-mono text-[0.7rem] opacity-70 sm:ml-0`}>
                0
              </kbd>
            </label>
          </RadioGroup>
        </article>
        <p className={`${SI_CLAVIER} mt-3 flex-wrap items-center gap-1.5 text-sm text-muted-foreground`}>
          Au clavier : <kbd className="brut-kbd px-1.5 font-mono text-xs">1</kbd> à <kbd className="brut-kbd px-1.5 font-mono text-xs">5</kbd> de gauche à droite,{' '}
          <kbd className="brut-kbd px-1.5 font-mono text-xs">0</kbd> pour passer.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Une question laissée sans réponse est comptée comme « je passe ».</p>
        {barre(
          <Button
            variant="outline"
            className="h-11 px-4"
            onClick={() => setEtape(i === 0 ? (repriseDe || modification ? { type: 'question', i: 0 } : { type: 'mode' }) : { type: 'question', i: i - 1 })}
            disabled={i === 0 && (!!repriseDe || modification)}
          >
            <Icone nom="arrow-left" taille={18} />
            <span className="hidden sm:inline">{i === 0 ? 'Changer de mode' : 'Question précédente'}</span>
            <span className="sm:hidden">Retour</span>
          </Button>,
          <Button id="bouton-suivant" className="h-11 px-5" onClick={() => suivante(i)}>
            {derniere && !enCours ? 'Mes priorités' : 'Question suivante'}
            <Icone nom="arrow-right" taille={18} />
          </Button>,
        )}
      </section>
    );
  }

  // Priorités
  const nbPrio = Object.values(importance).filter((x) => x > 1).length;
  const themesRepondus = ordreT.filter((t) => [...anciennes, ...file.map((q) => q.enjeu)].some((e) => parId[e]?.theme === t));
  return (
    <section aria-labelledby="titre-etape">
      {raisonFin && mode === 'adaptatif' && (
        <p className="mb-4 text-sm text-muted-foreground">
          Fin des questions du mode adaptatif après {nbTotal} questions : {raisonFin}.
        </p>
      )}
      <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="text-3xl font-bold outline-none sm:text-4xl">
        Quels thèmes comptent le plus pour vous ?
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {MAX_PRIORITES} au maximum : si tout est prioritaire, la pondération ne change plus rien. Un thème prioritaire compte double ; « décisif », il compte triple. Vous pouvez aussi n'en choisir aucun.
      </p>
      <fieldset className="mt-6">
        <legend className="sr-only">Thèmes prioritaires ({MAX_PRIORITES} au maximum)</legend>
        <p aria-live="polite" className="mb-3 text-sm font-semibold">
          {nbPrio} / {MAX_PRIORITES} thèmes choisis
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {themesRepondus.map((t) => {
            const choisi = (importance[t] ?? 1) > 1;
            const bloque = !choisi && nbPrio >= MAX_PRIORITES;
            return (
              <li
                key={t}
                className={`entree brut-surface p-3 transition-colors ${choisi ? 'bg-primary/25' : 'bg-card'} ${bloque ? 'opacity-60' : ''}`}
                style={{ ['--delai' as string]: `${themesRepondus.indexOf(t) * 50}ms` }}
              >
                <label className="flex cursor-pointer items-center gap-3 font-semibold">
                  <Checkbox
                    checked={choisi}
                    disabled={bloque}
                    onCheckedChange={(c) =>
                      setImportance((imp) => {
                        const n = { ...imp };
                        if (c) n[t] = 2;
                        else delete n[t];
                        return n;
                      })
                    }
                  />
                  {themes[t]}
                </label>
                {choisi && (
                  <label className="mt-2 ml-8 flex cursor-pointer items-center gap-3 text-sm">
                    <Checkbox checked={importance[t] === 3} onCheckedChange={(c) => setImportance((imp) => ({ ...imp, [t]: c ? 3 : 2 }))} />
                    Décisif pour moi (compte triple)
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>
      <p className="mt-6 text-sm text-muted-foreground">Le calcul se fait dans votre navigateur. Vos réponses ne sont ni envoyées, ni enregistrées.</p>
      {barre(
        <Button variant="outline" className="h-11 px-4" disabled={!file.length} onClick={() => setEtape({ type: 'question', i: Math.max(0, file.length - 1) })}>
          <Icone nom="arrow-left" taille={18} />
          <span className="hidden sm:inline">Revenir aux questions</span>
          <span className="sm:hidden">Retour</span>
        </Button>,
        <Button className="h-11 px-5 text-base" onClick={terminer}>
          {classe ? 'Voir la carte' : 'Voir mon résultat'}
          <Icone nom="arrow-right" taille={20} />
        </Button>,
      )}
    </section>
  );
}
