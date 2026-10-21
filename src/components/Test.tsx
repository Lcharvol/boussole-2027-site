// Questionnaire (îlot React). Tout se passe dans le navigateur : rien n'est envoyé ni enregistré.
// À la fin, les réponses sont encodées dans le fragment de l'URL de la page de résultat (#…),
// que le navigateur ne transmet jamais au serveur.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const titreRef = useRef<HTMLHeadingElement>(null);
  const premierRendu = useRef(true);

  // Reprise : #reprendre=<code>&vers=<mode> (depuis la page de résultat).
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get('reprendre');
    const vers = params.get('vers') as Mode | null;
    if (!code || !vers || !(vers in NB)) return;
    const d = decoder(code, ordreQ, ordreT, version);
    if (!d) return;
    setReponses(d.etat.reponses);
    setImportance(d.etat.importance);
    setDejaPosees(new Set(Object.keys(d.etat.reponses)));
    setRepriseDe(d.etat.mode);
    setMode(vers);
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
    location.assign(`${base}${cible}#${code}`);
  }

  const nbPrio = Object.values(importance).filter((v) => v > 1).length;
  const themesRepondus = ordreT.filter((t) =>
    questions.some((q) => q.theme === t && (reponses[q.id] !== undefined || aPoser.some((a) => a.id === q.id))),
  );

  if (etape.type === 'mode') {
    return (
      <section aria-labelledby="titre-etape">
        <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          Choisissez un mode
        </h2>
        <p className="mt-2 text-muted-foreground">Vous pourrez passer au mode supérieur à la fin, sans recommencer.</p>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {MODES.map((m) => (
            <li key={m.id} className="brut-panel flex flex-col bg-card p-5">
              <h3 className="font-serif text-2xl font-bold">{m.titre}</h3>
              <p className="mt-1 text-sm font-semibold">
                {NB[m.id]} questions · {m.duree}
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{m.fiabilite}</p>
              <Button className="mt-5 h-11 w-full text-base" variant={m.id === 'moyen' ? 'default' : 'outline'} onClick={() => choisirMode(m.id)}>
                Commencer en mode {m.titre.toLowerCase()}
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Les modes courts gardent, dans chaque thème, les questions qui départagent le plus les candidats. Sans préférence, le mode moyen est un bon choix.
        </p>
      </section>
    );
  }

  const progression = (
    <Progress value={aPoser.length ? Math.round((100 * repondues) / aPoser.length) : 0} className="mb-6">
      <ProgressLabel>
        Mode {mode}
        {repriseDe && ` (suite du mode ${repriseDe})`}
      </ProgressLabel>
      <span className="ml-auto text-sm text-muted-foreground tabular-nums">
        {repondues} / {aPoser.length} réponses
      </span>
    </Progress>
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
        {progression}
        <p className="text-sm font-semibold text-muted-foreground">
          Thème {etape.i + 1} sur {etapesThemes.length}
        </p>
        <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="mt-1 scroll-mt-4 text-3xl font-bold outline-none">
          {themes[e.theme]}
        </h2>
        <ol className="mt-6 grid gap-6">
          {e.questions.map((q) => {
            const v = reponses[q.id];
            const valeur = v === undefined ? null : v === null ? 'passe' : String(v);
            return (
              <li key={q.id} className="brut-panel bg-card p-4 sm:p-5">
                <p id={`q-${q.id}`} className="text-lg leading-snug font-semibold text-pretty">
                  {q.texte}
                </p>
                <RadioGroup
                  aria-labelledby={`q-${q.id}`}
                  value={valeur}
                  onValueChange={(nv) => setReponses((r) => ({ ...r, [q.id]: nv === 'passe' ? null : Number(nv) }))}
                  className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6"
                >
                  {OPTIONS.map((o) => (
                    <label
                      key={o.v}
                      className="brut-questionnaire-choice flex min-h-11 cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-medium has-[[data-checked]]:bg-primary has-[[data-checked]]:text-primary-foreground hover:bg-muted"
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
        <div className="mt-6 flex flex-wrap justify-between gap-4">
          <Button variant="outline" className="h-11 px-5" onClick={() => setEtape(etape.i === 0 ? (repriseDe ? { type: 'theme', i: 0 } : { type: 'mode' }) : { type: 'theme', i: etape.i - 1 })} disabled={etape.i === 0 && !!repriseDe}>
            ← {etape.i === 0 ? 'Changer de mode' : 'Thème précédent'}
          </Button>
          <Button className="h-11 px-5" onClick={() => setEtape(dernier ? { type: 'priorites' } : { type: 'theme', i: etape.i + 1 })}>
            {dernier ? 'Mes priorités →' : 'Thème suivant →'}
          </Button>
        </div>
      </section>
    );
  }

  // Priorités
  return (
    <section aria-labelledby="titre-etape">
      {progression}
      <h2 id="titre-etape" ref={titreRef} tabIndex={-1} className="text-3xl font-bold outline-none">
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
              <li key={t} className="brut-surface bg-card p-3">
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
      <div className="mt-8 flex flex-wrap justify-between gap-4">
        <Button variant="outline" className="h-11 px-5" onClick={() => setEtape({ type: 'theme', i: Math.max(0, etapesThemes.length - 1) })}>
          ← Revenir aux questions
        </Button>
        <Button className="h-12 px-6 text-base" onClick={terminer}>
          {classe ? 'Voir la carte des positions' : 'Voir mon résultat'}
        </Button>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Le calcul se fait dans votre navigateur. Vos réponses ne sont ni envoyées, ni enregistrées.
      </p>
    </section>
  );
}
