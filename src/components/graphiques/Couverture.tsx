// Fiche candidat : couverture (positions connues sur le total) et répartition des confiances
// (programme, déclaration, déduite), plus la part relue par un humain. Échelle ordinale à une seule
// teinte (plus contrastée avec le fond = plus sûre, en clair comme en sombre). Rendu au build (aucun JavaScript).
import Figure from './Figure';

interface Props {
  total: number;
  programme: number;
  declaration: number;
  deduite: number;
  relues: number;
}

const SEGMENTS = [
  { cle: 'programme', libelle: 'Programme', couleur: 'var(--viz-ord-3)' },
  { cle: 'declaration', libelle: 'Déclaration', couleur: 'var(--viz-ord-2)' },
  { cle: 'deduite', libelle: 'Déduite', couleur: 'var(--viz-ord-1)' },
] as const;

export default function Couverture({ total, programme, declaration, deduite, relues }: Props) {
  const n = { programme, declaration, deduite };
  const connues = programme + declaration + deduite;
  const inconnues = total - connues;
  return (
    <Figure
      id="graph-couverture"
      niveau={2}
      titre="Couverture et confiance des positions"
      description={
        <>
          {connues} positions connues sur {total} questions. Une position « programme » est écrite dans le programme 2027 ; « déclaration » vient d'un entretien, d'un discours
          ou d'un vote récent ; « déduite », du parti ou du programme 2022. Plus le segment tranche avec le fond, plus la position est sûre (ordre : programme, déclaration, déduite).
        </>
      }
      tableau={{
        entetes: ['Catégorie', 'Questions', 'Part'],
        lignes: [
          ...SEGMENTS.map((s) => [s.libelle, n[s.cle], `${Math.round((100 * n[s.cle]) / total)} %`]),
          ['Position inconnue', inconnues, `${Math.round((100 * inconnues) / total)} %`],
          ['Relues par un humain (parmi les connues)', relues, connues ? `${Math.round((100 * relues) / connues)} %` : '—'],
        ],
      }}
    >
      <div aria-hidden="true" className="text-sm">
        <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px]" style={{ background: 'var(--viz-grille)' }}>
          {SEGMENTS.map((s) =>
            n[s.cle] ? <span key={s.cle} title={`${s.libelle} : ${n[s.cle]}`} style={{ width: `${(100 * n[s.cle]) / total}%`, background: s.couleur }} /> : null,
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {SEGMENTS.map((s) => (
            <li key={s.cle} className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px]" style={{ background: s.couleur }} />
              {s.libelle} <span className="font-semibold tabular-nums">{n[s.cle]}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] border border-border/40" style={{ background: 'var(--viz-grille)' }} />
            Inconnue <span className="font-semibold tabular-nums">{inconnues}</span>
          </li>
        </ul>
        <p className="mt-4 text-xs font-semibold">
          Relues par un humain : {relues} sur {connues}
        </p>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-[4px]" style={{ background: 'var(--viz-grille)' }}>
          <span className="block h-full" style={{ width: `${connues ? (100 * relues) / connues : 0}%`, background: 'var(--viz-marque)' }} />
        </div>
      </div>
    </Figure>
  );
}
