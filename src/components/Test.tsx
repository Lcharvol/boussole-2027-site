// Questionnaire (îlot React). Tout se passe dans le navigateur : rien n'est envoyé ni enregistré.
// À la fin, les réponses sont encodées dans le fragment de l'URL de la page de résultat (#…),
// que le navigateur ne transmet jamais au serveur.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import Icone from './Icone';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { decoder, encoder, type Etat } from '@/lib/partage';
import { MODES, NIVEAUX_DU_MODE, type Mode, type Question } from '@/lib/types';

interface Props {
  questions: Question[];
  themes: Record<string, string>;
  echelle: Record<string, string>;
  version: string;
  base: string;
  classe?: boolean;
}

const MAX_PRIORITES = 3;
const NB: Record<Mode, number> = { rapide: 8, moyen: 24, long: 40 };
const OPTIONS: { v: string; cle: string }[] = [
  { v: '2', cle: '2' },
  { v: '1', cle: '1' },
  { v: '0', cle: '0' },
  { v: '-1', cle: '-1' },
  { v: '-2', cle: '-2' },
  { v: 'passe', cle: 'null' },
];

type Etape = { type: 'mode' } | { type: 'theme'; i: number } | { type: 'priorites' };

export default function Test({ questions, themes, echelle, version, base, classe = false }: Props) {
  const ordreQ = useMemo(() => questions.map((q) => q.id), [questions]);
  const ordreT = useMemo(() => Object.keys(themes), [themes]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [reponses, setReponses] = useState<Record<string, number | null | undefined>>({});
  const [importance, setImportance] = useState<Record<string, number>>({});
  // Questions déjà posées lors d'un passage précédent (passage au mode supérieur) : on ne les repose pas.
  const [dejaPosees, setDejaPosees] = useState<Set<string>>(new Set());
  const [etape, setEtape] = useState<Etape>({ type: 'mode' });
  const [repriseDe, setRepriseDe] = useState<Mode | null>(null);
  const [modification, setModification] = useState(false);
  const titreRef = useRef<HTMLHeadingElement>(null);
  const premierRendu = useRef(true);

  // Reprise : #reprendre=<code>&vers=<mode> (depuis la page de résultat).
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get('reprendre');
    const vers = params.get('vers') as Mode | null;
    const modifier = params.has('modifier');
    if (!code || (!modifier && (!vers || !(vers in NB)))) return;
    const d = decoder(code, ordreQ, ordreT, version);
    if (!d) return;
    setReponses(d.etat.reponses);
    setImportance(d.etat.importance);
    if (modifier) {
      // Modification : toutes les questions du mode sont reposées, avec les réponses déjà données.
      setModification(true);
      setMode(d.etat.mode);
    } else {
      setDejaPosees(new Set(Object.keys(d.etat.reponses)));
      setRepriseDe(d.etat.mode);
      setMode(vers);
    }
    setEtape({ type: 'theme', i: 0 });
    history.replaceState(null, '', location.pathname);
  }, [ordreQ, ordreT, version]);

  const aPoser = useMemo(() => {
    if (!mode) return [];
    return questions.filter((q) => NIVEAUX_DU_MODE[mode].includes(q.niveau) && !dejaPosees.has(q.id));
  }, [mode, questions, dejaPosees]);
  const etapesThemes = useMemo(
    () => ordreT.map((t) => ({ theme: t, questions: aPoser.filter((q) => q.theme === t) })).filter((e) => e.questions.length),
    [aPoser, ordreT],
  );
  const repondues = aPoser.filter((q) => reponses[q.id] !== undefined).length;

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
    titreRef.current?.focus();
    titreRef.current?.scrollIntoView({ block: 'start' });
  }, [etape]);

  function choisirMode(m: Mode) {
    setMode(m);
    setEtape({ type: 'theme', i: 0 });
  }

  function terminer() {
    const final: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(reponses)) if (v !== undefined) final[k] = v;
    // Une question posée restée sans réponse compte comme « je passe ».
    for (const q of aPoser) if (!(q.id in final)) final[q.id] = null;
    const etat: Etat = { mode: mode!, reponses: final, importance };
    const code = encoder(etat, ordreQ, ordreT, version);
    const cible = classe ? 'classe/resultat/' : `resultat/${mode}/`;
    envoi.current = true;
    location.assign(`${base}${cible}#${code}`);
  }

  const nbPrio = Object.values(importance).filter((v) => v > 1).length;
  const themesRepondus = ordreT.filter((t) =>
    questions.some((q) => q.theme === t && (reponses[q.id] !== undefined || aPoser.some((a) => a.id === q.id))),
  );
  const numero = (qid: string) => aPoser.findIndex((q) => q.id === qid) + 1;
  const pourcent = aPoser.length ? Math.round((100 * repondues) / aPoser.length) : 0;

  // Après un clic sur une réponse, amène la question suivante sans réponse à l'écran (pas au clavier :
  // les flèches changent la réponse dans le groupe, on ne déplace donc rien).
  function suivanteApresClic(qid: string, liste: Question[]) {
    const i = liste.findIndex((q) => q.id === qid);
    const prochaine = liste.slice(i + 1).find((q) => reponses[q.id] === undefined);
    const cible = document.getElementById(prochaine ? `carte-${prochaine.id}` : 'barre-test');
    const doux = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => cible?.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: prochaine ? 'center' : 'end' }), 180);
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
                className={`brut-control brut-focus group flex w-full flex-col p-5 text-left ${m.id === 'moyen' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="font-serif text-3xl font-bold">{m.titre}</span>
                  {m.id === 'moyen' && <span className="brut-chip bg-card px-2 py-0.5 text-[0.65rem] text-foreground">Recommandé</span>}
                </span>
                <span className="mt-2 text-sm font-bold">
                  {NB[m.id]} questions · {m.duree}
                </span>
                <span className={`mt-3 flex-1 text-sm font-normal ${m.id === 'moyen' ? '' : 'text-muted-foreground'}`}>{m.fiabilite}</span>
                <span className="mt-5 inline-flex items-center gap-1 text-base font-bold underline decoration-2 underline-offset-4">
                  Commencer <Icone nom="arrow-right" taille={20} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Les modes courts gardent, dans chaque thème, les questions qui départagent le plus les candidats.
        </p>
      </section>
    );
  }

  // Fil des étapes : un bouton par thème, puis les priorités.
  const fil = (
    <nav aria-label="Étapes du test" className="relative -mx-4 mb-6 overflow-x-auto px-4 pb-2">
      <ol className="flex min-w-max gap-2">
        {etapesThemes.map((e, i) => {
          const faites = e.questions.filter((q) => reponses[q.id] !== undefined).length;
          const courant = etape.type === 'theme' && etape.i === i;
          const complet = faites === e.questions.length;
          return (
            <li key={e.theme}>
              <button
                type="button"
                onClick={() => setEtape({ type: 'theme', i })}
                aria-current={courant ? 'step' : undefined}
                className={`brut-focus relative flex h-9 items-center gap-1.5 rounded-[var(--radius)] border-[length:var(--brut-border)] border-border px-2.5 text-xs font-bold whitespace-nowrap ${courant ? 'bg-foreground text-background' : complet ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
              >
                {complet && !courant && <span aria-hidden="true">✓</span>}
                {themes[e.theme].split(/[ ,]/)[0]}
                <span className="sr-only">
                  {' '}
                  : {faites} réponse{faites > 1 ? 's' : ''} sur {e.questions.length}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setEtape({ type: 'priorites' })}
            aria-current={etape.type === 'priorites' ? 'step' : undefined}
            className={`brut-focus flex h-9 items-center rounded-[var(--radius)] border-[length:var(--brut-border)] border-border px-2.5 text-xs font-bold ${etape.type === 'priorites' ? 'bg-foreground text-background' : 'bg-card hover:bg-muted'}`}
          >
            Priorités
          </button>
        </li>
      </ol>
    </nav>
  );

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
          {repondues} / {aPoser.length} réponses
        </span>
      </Progress>
      <div className="flex items-center justify-between gap-3">
        {precedent}
        {suivant}
      </div>
    </div>
  );

  if (etape.type === 'theme') {
    const e = etapesThemes[etape.i];
    if (!e) {
      return (
        <section aria-labelledby="titre-etape">
          <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="text-2xl font-bold outline-none">
            Aucune nouvelle question
          </h2>
          <Button className="mt-6" onClick={() => setEtape({ type: 'priorites' })}>
            Continuer
          </Button>
        </section>
      );
    }
    const dernier = etape.i === etapesThemes.length - 1;
    return (
      <section aria-labelledby="titre-etape">
        {fil}
        <p className="text-sm font-semibold text-muted-foreground">
          Thème {etape.i + 1} sur {etapesThemes.length}
        </p>
        <h2 key={e.theme} id="titre-etape" ref={titreRef} tabIndex={-1} className="entree mt-1 scroll-mt-4 text-3xl font-bold outline-none sm:text-4xl">
          {themes[e.theme]}
        </h2>
        <ol className="mt-6 grid gap-6">
          {e.questions.map((q, iq) => {
            const v = reponses[q.id];
            const valeur = v === undefined ? null : v === null ? 'passe' : String(v);
            return (
              <li
                key={q.id}
                id={`carte-${q.id}`}
                className={`entree brut-panel scroll-mt-24 bg-card p-4 transition-colors sm:p-6 ${v !== undefined ? 'border-foreground' : ''}`}
                style={{ ['--delai' as string]: `${iq * 90}ms` }}
              >
                <p className="flex items-center justify-between text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  <span>
                    Question {numero(q.id)} / {aPoser.length}
                  </span>
                  {v !== undefined && (
                    <span className="apparition inline-flex items-center gap-1 normal-case">
                      <Icone nom="check" taille={14} />
                      {v === null ? 'Passée' : 'Répondu'}
                    </span>
                  )}
                </p>
                <p id={`q-${q.id}`} className="mt-2 font-serif text-xl leading-snug font-semibold text-pretty sm:text-2xl">
                  {q.texte}
                </p>
                <RadioGroup
                  aria-labelledby={`q-${q.id}`}
                  value={valeur}
                  onValueChange={(nv) => setReponses((r) => ({ ...r, [q.id]: nv === 'passe' ? null : Number(nv) }))}
                  className="mt-5 grid gap-2 sm:grid-cols-5"
                >
                  {OPTIONS.map((o) => (
                    <label
                      key={o.v}
                      onPointerUp={() => suivanteApresClic(q.id, e.questions)}
                      className={
                        o.v === 'passe'
                          ? 'brut-focus flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border-[length:var(--brut-border)] border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted has-[[data-checked]]:border-solid has-[[data-checked]]:bg-muted has-[[data-checked]]:text-foreground sm:col-span-5 sm:justify-self-start'
                          : 'brut-questionnaire-choice flex min-h-12 cursor-pointer items-center gap-2.5 bg-background px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted has-[[data-checked]]:bg-primary has-[[data-checked]]:text-primary-foreground motion-safe:has-[[data-checked]]:animate-[pop_0.28s_ease-out] sm:flex-col sm:justify-center sm:gap-2 sm:py-3 sm:text-center'
                      }
                    >
                      <RadioGroupItem value={o.v} />
                      <span>{o.v === 'passe' ? 'Je passe' : echelle[o.cle]}</span>
                    </label>
                  ))}
                </RadioGroup>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">Une question laissée sans réponse est comptée comme « je passe ».</p>
        {barre(
          <Button
            variant="outline"
            className="h-11 px-4"
            onClick={() => setEtape(etape.i === 0 ? (repriseDe ? { type: 'theme', i: 0 } : { type: 'mode' }) : { type: 'theme', i: etape.i - 1 })}
            disabled={etape.i === 0 && !!repriseDe}
          >
            <Icone nom="arrow-left" taille={18} />
            <span className="hidden sm:inline">{etape.i === 0 ? 'Changer de mode' : 'Thème précédent'}</span>
            <span className="sm:hidden">Retour</span>
          </Button>,
          <Button className="h-11 px-5" onClick={() => setEtape(dernier ? { type: 'priorites' } : { type: 'theme', i: etape.i + 1 })}>
            {dernier ? 'Mes priorités' : 'Thème suivant'}
            <Icone nom="arrow-right" taille={18} />
          </Button>,
        )}
      </section>
    );
  }

  // Priorités
  return (
    <section aria-labelledby="titre-etape">
      {fil}
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
        <Button variant="outline" className="h-11 px-4" onClick={() => setEtape({ type: 'theme', i: Math.max(0, etapesThemes.length - 1) })}>
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
