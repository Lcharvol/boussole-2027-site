// Types des données du skill, format 2 (data/enjeux.json et data/candidats/*.json).
import type { ModeTirage } from './tirage';

export type Mode = ModeTirage;

export interface Variante {
  id: string;
  question: string;
  /** Formulation du pôle A (valeur -2). */
  a: string;
  /** Formulation du pôle B (valeur +2). */
  b: string;
  validee: boolean;
}

export interface Enjeu {
  id: string;
  theme: string;
  pole_a: string;
  pole_b: string;
  contexte: string | null;
  variantes: Variante[];
}

export interface Referentiel {
  version: string;
  format: 2;
  echelle: Record<string, string>;
  themes: Record<string, string>;
  enjeux: Enjeu[];
}

export interface Position {
  valeur: number | null;
  resume?: string | null;
  source?: string | null;
  citation?: string | null;
  date_source?: string | null;
  confiance?: 'programme' | 'declaration' | 'deduite' | null;
  relu?: boolean;
}

export interface Candidat {
  slug: string;
  nom: string;
  parti: string;
  statut: string;
  programme?: string | null;
  programme_url?: string | null;
  mis_a_jour?: string | null;
  notes?: string | null;
  positions: Record<string, Position | null>;
}

export interface Meta {
  depot: string;
  commit: string | null;
  date_commit: string | null;
  /** Branche du skill clonée (null si BOUSSOLE_SKILL_DIR fournit le clone). */
  branche: string | null;
  version_enjeux: string;
  version_plugin: string | null;
  nb_enjeux: number;
  nb_candidats: number;
  nb_positions: number;
  nb_positions_relues: number;
  genere_le: string;
}

export interface Donnees {
  meta: Meta;
  enjeux: Referentiel;
  candidats: Candidat[];
}

export interface Photo {
  image: string;
  fichier: string;
  page: string;
  auteur: string;
  licence: string;
  licence_url: string | null;
}

export type Photos = Record<string, { wikidata: string | null; photo: Photo | null }>;

export const MODES: { id: Mode; titre: string; nb: string; duree: string; fiabilite: string }[] = [
  { id: 'rapide', titre: 'Rapide', nb: '12 questions', duree: '≈ 3 min', fiabilite: 'Une tendance : les écarts entre candidats proches ne sont pas significatifs.' },
  { id: 'adaptatif', titre: 'Adaptatif', nb: '12 à 32 questions', duree: '≈ 4 à 8 min', fiabilite: "Après 12 questions, ajoute celles qui départagent les candidats encore proches de vous, jusqu'à ce que le premier se détache." },
  { id: 'complet', titre: 'Complet', nb: '40 questions', duree: '≈ 10 min', fiabilite: 'Tous les enjeux. Le plus fiable si vous hésitez entre plusieurs candidats.' },
];

export const CONFIANCE: Record<string, { libelle: string; aide: string }> = {
  programme: { libelle: 'Programme', aide: 'Écrit dans le programme officiel 2027 (poids 1).' },
  declaration: { libelle: 'Déclaration', aide: 'Entretien, discours ou vote récent (poids 0,85).' },
  deduite: { libelle: 'Déduite', aide: 'Position du parti ou programme 2022, non démentie (poids 0,6).' },
};

/** Valeurs de l'axe, du pôle A (-2) au pôle B (+2). */
export const VALEURS = [-2, -1, 0, 1, 2] as const;
