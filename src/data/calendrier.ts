// Calendrier électoral de la présidentielle 2027, vérifié sur les sources officielles le 21 octobre 2026.
// statut : "officiel" = date annoncée par une source officielle ; "calcule" = déduite d'un texte en vigueur,
// à confirmer par le décret de convocation ; "a_venir" = pas encore fixée.

export interface Etape {
  date: string | null; // AAAA-MM-JJ
  titre: string;
  detail: string;
  statut: 'officiel' | 'calcule' | 'a_venir';
  sources: { libelle: string; url: string }[];
}

const INFO_GOUV = { libelle: 'info.gouv.fr, « Élection présidentielle 2027 » (modifié le 6 octobre 2026)', url: 'https://www.info.gouv.fr/actualite/election-presidentielle-2027' };
const INTERIEUR = { libelle: 'Ministère de l’Intérieur, « L’élection présidentielle »', url: 'https://www.elections.interieur.gouv.fr/scrutins/lelection-presidentielle' };
const LOI_1962 = { libelle: 'Loi n° 62-1292 du 6 novembre 1962 (Légifrance)', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000684037' };
const DECRET_2001 = { libelle: 'Décret n° 2001-213 du 8 mars 2001, article 10 (recherche Légifrance)', url: 'https://www.legifrance.gouv.fr/search/all?tab_selection=all&searchField=ALL&query=d%C3%A9cret+2001-213' };
const CONSTITUTION = { libelle: 'Constitution, article 7 (Conseil constitutionnel)', url: 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur' };
const CC = { libelle: 'Conseil constitutionnel', url: 'https://www.conseil-constitutionnel.fr/' };

export const calendrier: Etape[] = [
  {
    date: '2026-07-01',
    titre: 'Dates du scrutin arrêtées en Conseil des ministres',
    detail: 'Le Gouvernement retient les dimanches 18 avril et 2 mai 2027.',
    statut: 'officiel',
    sources: [INFO_GOUV, INTERIEUR],
  },
  {
    date: null,
    titre: 'Décret de convocation des électeurs',
    detail:
      "Il ouvre officiellement la période de présentation des candidats (parrainages). Il doit être publié au Journal officiel au moins dix semaines avant le premier tour, soit au plus tard le 7 février 2027 pour un premier tour le 18 avril. Pas encore publié au 21 octobre 2026.",
    statut: 'a_venir',
    sources: [LOI_1962],
  },
  {
    date: '2027-03-12',
    titre: 'Clôture des parrainages (présentations des candidats)',
    detail:
      "Les présentations d'au moins 500 élus, issus d'au moins 30 départements ou collectivités d'outre-mer, doivent parvenir au Conseil constitutionnel au plus tard le sixième vendredi précédant le premier tour, à 18 heures. Les candidats y déposent aussi leurs déclarations de situation patrimoniale et d'intérêts. Le Conseil constitutionnel publie au fil de l'eau les noms des élus ayant présenté un candidat.",
    statut: 'officiel',
    sources: [INFO_GOUV, LOI_1962, CC],
  },
  {
    date: '2027-03-12',
    titre: "Date limite d'inscription sur les listes électorales",
    detail: "Date limite de droit commun pour pouvoir voter au premier tour (inscription en ligne, en mairie ou par courrier). Des exceptions existent (déménagement, majorité atteinte…).",
    statut: 'officiel',
    sources: [INFO_GOUV],
  },
  {
    date: '2027-03-26',
    titre: 'Publication de la liste officielle des candidats',
    detail: 'Le Conseil constitutionnel arrête la liste des candidats ; elle est publiée au plus tard le 26 mars 2027. Avant cette date, la boussole suit les candidatures déclarées ou pressenties.',
    statut: 'officiel',
    sources: [INFO_GOUV],
  },
  {
    date: '2027-04-05',
    titre: 'Ouverture de la campagne officielle (date attendue)',
    detail:
      "Selon la règle habituelle (deuxième lundi précédant le premier tour), la campagne officielle s'ouvrirait le lundi 5 avril 2027 : égalité stricte du temps de parole, affichage officiel, professions de foi. Date à confirmer par le décret de convocation.",
    statut: 'calcule',
    sources: [DECRET_2001],
  },
  {
    date: '2027-04-17',
    titre: 'Premier tour en Guadeloupe, Martinique, Guyane, Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin et Polynésie française',
    detail: 'Vote le samedi pour tenir compte du décalage horaire.',
    statut: 'officiel',
    sources: [INFO_GOUV],
  },
  {
    date: '2027-04-18',
    titre: 'Premier tour',
    detail: 'Si aucun candidat n’obtient la majorité absolue des suffrages exprimés, les deux candidats arrivés en tête (après d’éventuels retraits) sont qualifiés pour le second tour.',
    statut: 'officiel',
    sources: [INFO_GOUV, INTERIEUR, CONSTITUTION],
  },
  {
    date: '2027-05-01',
    titre: 'Second tour dans les mêmes collectivités d’outre-mer',
    detail: 'Vote le samedi 1er mai.',
    statut: 'officiel',
    sources: [INFO_GOUV],
  },
  {
    date: '2027-05-02',
    titre: 'Second tour',
    detail: 'Les résultats officiels sont proclamés ensuite par le Conseil constitutionnel.',
    statut: 'officiel',
    sources: [INFO_GOUV, INTERIEUR],
  },
  {
    date: '2027-05-13',
    titre: 'Fin du mandat en cours',
    detail: "Le mandat d'Emmanuel Macron, commencé le 14 mai 2022, prend fin. La Constitution impose que l'élection ait lieu 20 à 35 jours avant cette échéance.",
    statut: 'calcule',
    sources: [CONSTITUTION],
  },
];
