// Types des données du skill (data/questions.json et data/candidats/*.json).

export type Niveau = 'rapide' | 'moyen' | 'long';
export type Mode = Niveau;

export interface Question {
  id: string;
  theme: string;
  texte: string;
  niveau: Niveau;
}

export interface Questions {
  version: string;
  echelle: Record<string, string>;
  themes: Record<string, string>;
  questions: Question[];
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
  version_questions: string;
  version_plugin: string | null;
  nb_questions: number;
  nb_candidats: number;
  nb_positions: number;
  nb_positions_relues: number;
  genere_le: string;
}

export interface Donnees {
  meta: Meta;
  questions: Questions;
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

export const NIVEAUX_DU_MODE: Record<Mode, Niveau[]> = {
  rapide: ['rapide'],
  moyen: ['rapide', 'moyen'],
  long: ['rapide', 'moyen', 'long'],
};

export const MODES: { id: Mode; titre: string; duree: string; fiabilite: string }[] = [
  { id: 'rapide', titre: 'Rapide', duree: '≈ 2 min', fiabilite: 'Une tendance : les écarts entre candidats proches ne sont pas significatifs.' },
  { id: 'moyen', titre: 'Moyen', duree: '≈ 6 min', fiabilite: "Bon compromis pour départager des candidats d'une même famille politique." },
  { id: 'long', titre: 'Long', duree: '≈ 12 min', fiabilite: 'Le plus fiable. Recommandé si vous hésitez entre plusieurs candidats.' },
];

export const CONFIANCE: Record<string, { libelle: string; aide: string }> = {
  programme: { libelle: 'Programme', aide: 'Écrit dans le programme officiel 2027 (poids 1).' },
  declaration: { libelle: 'Déclaration', aide: 'Entretien, discours ou vote récent (poids 0,85).' },
  deduite: { libelle: 'Déduite', aide: 'Position du parti ou programme 2022, non démentie (poids 0,6).' },
};

export const VALEURS = [2, 1, 0, -1, -2] as const;
