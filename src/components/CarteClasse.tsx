// Résultat du mode classe : aucun nom de candidat, aucun classement. Pour chaque affirmation répondue,
// la réponse de l'élève est placée à côté de la répartition des positions des programmes (des nombres).
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { decoder, type Etat } from '@/lib/partage';
import type { Question } from '@/lib/types';

interface Props {
  questions: Question[];
  themes: Record<string, string>;
  echelle: Record<string, string>;
  version: string;
  base: string;
  /** Pour chaque question : nombre de candidats par valeur ("2" … "-2", "inconnue"). */
  repartition: Record<string, Record<string, number>>;
}

const VALS = ['2', '1', '0', '-1', '-2'];

export default function CarteClasse({ questions, themes, echelle, version, base, repartition }: Props) {
  const ordreQ = useMemo(() => questions.map((q) => q.id), [questions]);
  const ordreT = useMemo(() => Object.keys(themes), [themes]);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    const d = decoder(location.hash.slice(1), ordreQ, ordreT, version);
    if (d) setEtat(d.etat);
    else setErreur(true);
  }, [ordreQ, ordreT, version]);

  if (erreur)
    return (
      <Alert role="status">
        <AlertTitle>Aucune réponse dans ce lien</AlertTitle>
        <AlertDescription>
          <a href={`${base}classe/test/`}>Faire le test en mode classe</a>
        </AlertDescription>
      </Alert>
    );
  if (!etat) return <p role="status">Chargement…</p>;

  const repondues = questions.filter((q) => q.id in etat.reponses);
  return (
    <div className="grid gap-8">
      <p className="brut-surface bg-secondary p-4 text-sm font-semibold text-secondary-foreground">
        Mode classe : pas de classement ni de nom de candidat. Pour chaque affirmation, votre réponse est placée à côté de la répartition des positions des {Object.values(repartition)[0] ? Object.values(Object.values(repartition)[0]).reduce((a, b) => a + b, 0) : ''} programmes suivis. De quoi lancer la discussion sur les arguments.
      </p>
      {ordreT.map((t) => {
        const qs = repondues.filter((q) => q.theme === t);
        if (!qs.length) return null;
        return (
          <section key={t} aria-labelledby={`c-${t}`}>
            <h2 id={`c-${t}`} className="text-2xl font-bold">
              {themes[t]}
            </h2>
            <ul className="mt-4 grid gap-4">
              {qs.map((q) => {
                const r = repartition[q.id];
                const total = Object.values(r).reduce((a, b) => a + b, 0);
                const v = etat.reponses[q.id];
                return (
                  <li key={q.id} className="brut-panel bg-card p-4">
                    <p className="font-semibold">{q.texte}</p>
                    <p className="mt-2 text-sm">
                      Votre réponse : <strong>{v === null ? 'je passe' : echelle[String(v)]}</strong>
                    </p>
                    <table className="mt-3 w-full text-sm">
                      <caption className="sr-only">Répartition des positions des programmes</caption>
                      <tbody>
                        {[...VALS, 'inconnue'].map((k) => (
                          <tr key={k} className={v !== null && String(v) === k ? 'font-bold' : ''}>
                            <th scope="row" className="w-44 py-0.5 pr-3 text-left font-normal sm:w-56">
                              {k === 'inconnue' ? 'Position inconnue' : echelle[k]}
                              {v !== null && String(v) === k && <span className="sr-only"> (votre réponse)</span>}
                            </th>
                            <td className="py-0.5">
                              <div className="flex items-center gap-2">
                                <div className="h-3 bg-primary brut-progress" style={{ width: `${(100 * (r[k] ?? 0)) / total}%`, minWidth: r[k] ? '4px' : 0 }} aria-hidden="true" />
                                <span className="tabular-nums">{r[k] ?? 0}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3 text-sm">
                      <a className="lien" href={`${base}classe/${t}/#${q.id}`}>
                        Contexte et arguments
                      </a>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-sm text-muted-foreground">
        Rien n'est enregistré ni transmis : ni l'enseignant ni le site ne voient ces réponses. <a className="lien" href={`${base}classe/`}>Retour au mode classe</a>
      </p>
    </div>
  );
}
