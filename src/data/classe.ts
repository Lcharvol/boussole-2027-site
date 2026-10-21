// Fiches pédagogiques du mode classe : contexte factuel et un argument avancé en faveur de chacun des deux
// pôles, pour chaque enjeu (a : pôle A, b : pôle B, comme dans data/enjeux.json du skill). Règles de
// rédaction : faits vérifiables et datés, aucun nom de candidat ni de parti, arguments de longueur
// comparable, présentés comme « avancés par » et jamais comme vrais.
// Ces textes ne sont pas des positions de candidats : celles-ci sont sur les pages « Qui pense quoi ».

export interface FicheEnjeu {
  contexte: string;
  /** Argument avancé en faveur du pôle A. */
  a: string;
  /** Argument avancé en faveur du pôle B. */
  b: string;
}

export const introThemes: Record<string, string> = {
  economie: "Comment produire et répartir les richesses : âge de la retraite, salaires, impôts, dépenses publiques et temps de travail.",
  ecologie: "Comment produire l'énergie et réduire les émissions de gaz à effet de serre, et qui en supporte le coût.",
  securite: "Comment prévenir et sanctionner la délinquance, et jusqu'où l'État peut surveiller l'espace public.",
  immigration: "Combien d'étrangers accueillir, à quelles conditions, et quels droits leur ouvrir.",
  europe: "La place de la France dans l'Union européenne et dans les alliances, et les choix de défense.",
  social: "L'accès aux soins, la fin de vie, et les règles des aides sociales et de l'assurance chômage.",
  education: "Le financement de l'école, son organisation, la laïcité et l'aide aux jeunes en formation.",
  institutions: "Comment les citoyens élisent leurs représentants et participent aux décisions.",
};

export const fiches: Record<string, FicheEnjeu> = {
  eco_retraite: {
    contexte: "La réforme de 2023 relève progressivement l'âge légal de départ de 62 à 64 ans. Son calendrier d'application a fait l'objet de nouveaux débats depuis. L'équilibre financier des retraites dépend notamment du nombre de cotisants par retraité, qui diminue.",
    a: "Argument avancé : partir plus tôt est une question de justice pour ceux qui ont commencé jeunes ou exercent des métiers pénibles ; d'autres ressources (cotisations, impôts) peuvent financer le système.",
    b: "Argument avancé : l'espérance de vie augmente et le nombre de cotisants par retraité baisse ; avancer l'âge creuserait le déficit ou obligerait à baisser les pensions ou à augmenter les cotisations.",
  },
  eco_smic: {
    contexte: "Le SMIC est revalorisé automatiquement chaque 1er janvier en fonction de l'inflation et d'une partie de la hausse du pouvoir d'achat des salaires. Le Gouvernement peut décider d'une hausse supplémentaire (« coup de pouce »).",
    a: "Argument avancé : une hausse rapide alourdit le coût du travail, peut freiner l'embauche des moins qualifiés et tasser l'écart avec les salaires juste au-dessus.",
    b: "Argument avancé : une hausse nette améliore le pouvoir d'achat des salariés les moins payés et soutient la consommation.",
  },
  eco_depenses: {
    contexte: "Le déficit public de la France dépasse nettement le seuil de 3 % du PIB prévu par les règles européennes, et la dette publique dépasse 110 % du PIB. Pour le réduire, on peut augmenter les recettes (impôts) ou baisser les dépenses, ou combiner les deux.",
    a: "Argument avancé : la France a déjà l'un des niveaux de prélèvements obligatoires les plus élevés d'Europe ; augmenter encore les impôts pèserait sur l'activité et l'emploi.",
    b: "Argument avancé : des hausses d'impôts ciblées préservent les services publics et la protection sociale, alors que des coupes fortes pèsent surtout sur les plus modestes.",
  },
  eco_patrimoine: {
    contexte: "L'impôt de solidarité sur la fortune (ISF) a été remplacé en 2018 par l'impôt sur la fortune immobilière (IFI). L'économiste Gabriel Zucman propose un impôt plancher de 2 % sur les patrimoines de plus de 100 millions d'euros.",
    a: "Argument avancé : les plus grandes fortunes paient proportionnellement peu d'impôt par rapport à leur patrimoine ; les taxer davantage est juste et rapporte des recettes.",
    b: "Argument avancé : un tel impôt peut pousser des contribuables ou des capitaux à partir, et toucher des entreprises dont la valeur n'est pas disponible en liquide.",
  },
  eco_35h: {
    contexte: "Depuis les lois de 2000 et 2002, la durée légale du travail est de 35 heures par semaine. C'est le seuil au-delà duquel les heures sont payées en heures supplémentaires, pas un maximum : la durée maximale est de 48 heures sur une semaine.",
    a: "Argument avancé : la réduction du temps de travail protège la santé et la vie personnelle ; des heures supplémentaires sont déjà possibles et mieux payées.",
    b: "Argument avancé : assouplir la durée légale permettrait de produire davantage, de gagner plus et de rendre les entreprises plus compétitives.",
  },
  ecol_nucleaire: {
    contexte: "Le nucléaire produit environ deux tiers de l'électricité en France. Un programme de six nouveaux réacteurs de type EPR2 a été annoncé en 2022, avec l'option de huit autres.",
    a: "Argument avancé : le nucléaire produit une électricité pilotable et très peu émettrice de CO₂, nécessaire pour remplacer les énergies fossiles.",
    b: "Argument avancé : les nouveaux réacteurs coûtent cher, prennent longtemps à construire et produisent des déchets radioactifs à gérer sur de très longues durées.",
  },
  ecol_renouvelables: {
    contexte: "L'éolien et le solaire produisent une part croissante, mais encore minoritaire, de l'électricité en France. Leur production dépend du vent et de l'ensoleillement. La France n'a pas atteint son objectif européen de part d'énergies renouvelables pour 2020.",
    a: "Argument avancé : leur production est intermittente, elles demandent beaucoup d'espace et suscitent des oppositions locales (paysages, riverains).",
    b: "Argument avancé : ces énergies sont rapides à installer, leur coût a fortement baissé et elles réduisent la dépendance aux importations d'énergie.",
  },
  ecol_normes: {
    contexte: "Les normes environnementales encadrent par exemple l'usage des pesticides, la protection de l'eau ou des haies. Le mouvement des agriculteurs de l'hiver 2024 a notamment porté sur le poids de ces normes.",
    a: "Argument avancé : protéger l'eau, les sols, la biodiversité et la santé suppose des règles plus exigeantes, dont le coût d'inaction serait plus élevé.",
    b: "Argument avancé : des normes plus strictes qu'à l'étranger pénalisent les producteurs français face à des importations qui ne les respectent pas.",
  },
  ecol_thermique2035: {
    contexte: "Un règlement européen adopté en 2023 prévoit la fin de la vente de voitures neuves émettant du CO₂ à partir de 2035. Cette échéance fait l'objet de demandes de révision.",
    a: "Argument avancé : les voitures électriques restent plus chères, les bornes de recharge insuffisantes, et l'industrie automobile européenne pourrait en souffrir.",
    b: "Argument avancé : une échéance claire donne de la visibilité aux constructeurs et réduit les émissions des transports, première source de gaz à effet de serre en France.",
  },
  ecol_aerien: {
    contexte: "En France, une taxe de solidarité s'applique aux billets d'avion ; elle a été relevée en 2025. Le kérosène des vols commerciaux n'est pas soumis à l'accise sur les carburants, en vertu de règles européennes et internationales.",
    a: "Argument avancé : l'avion émet beaucoup de CO₂ par passager et bénéficie d'exonérations ; le taxer davantage rééquilibre avec le train et finance la transition.",
    b: "Argument avancé : des taxes plus fortes pénalisent le tourisme, les compagnies françaises et les territoires éloignés, notamment les outre-mer.",
  },
  sec_peines: {
    contexte: "Des peines planchers pour les récidivistes ont existé de 2007 à 2014. Aujourd'hui, le juge fixe la peine dans la limite d'un maximum prévu par la loi, en tenant compte de la personnalité de l'auteur.",
    a: "Argument avancé : des peines minimales garantissent une sanction certaine et dissuasive, surtout pour les récidivistes.",
    b: "Argument avancé : elles réduisent la liberté du juge d'adapter la peine, et leur effet sur la récidive n'a pas été démontré.",
  },
  sec_prisons: {
    contexte: "Les prisons françaises comptent plus de 80 000 personnes détenues pour un peu plus de 60 000 places (2025), soit une surpopulation importante, surtout en maisons d'arrêt.",
    a: "Argument avancé : de nouvelles places permettent d'exécuter les peines prononcées et d'offrir des conditions de détention dignes.",
    b: "Argument avancé : construire coûte cher et prend des années ; développer les peines alternatives réduirait davantage la surpopulation et la récidive.",
  },
  sec_cannabis: {
    contexte: "En France, l'usage de cannabis est interdit ; il peut être sanctionné par une amende forfaitaire délictuelle depuis 2020. Plusieurs pays (Canada, Malte, Allemagne en partie…) l'ont légalisé sous conditions.",
    a: "Argument avancé : légaliser banaliserait un produit nocif, surtout pour les jeunes, sans faire disparaître le marché noir.",
    b: "Argument avancé : légaliser permettrait de contrôler la qualité, de priver les trafiquants de revenus, et de financer la prévention.",
  },
  sec_mineurs: {
    contexte: "Le code de la justice pénale des mineurs (2021) prévoit des juridictions spécialisées et une atténuation des peines (« excuse de minorité ») que le juge peut écarter, dans certains cas, à partir de 16 ans.",
    a: "Argument avancé : un adolescent est encore en construction ; une justice spécialisée, tournée vers l'éducation, réduit la récidive.",
    b: "Argument avancé : pour les faits les plus graves commis à 16 ou 17 ans, la réponse devrait se rapprocher de celle prévue pour les majeurs.",
  },
  sec_videosurveillance: {
    contexte: "La loi relative aux Jeux olympiques de 2024 a autorisé à titre expérimental la vidéosurveillance algorithmique, sans reconnaissance faciale. La reconnaissance faciale en temps réel dans l'espace public n'est pas autorisée en France et le règlement européen sur l'IA l'encadre strictement.",
    a: "Argument avancé : l'analyse automatique des images aide à repérer rapidement des situations dangereuses et à retrouver des auteurs d'infractions.",
    b: "Argument avancé : ces outils menacent la vie privée et les libertés, avec un risque d'erreurs et de surveillance généralisée.",
  },
  imm_baisse: {
    contexte: "La France délivre chaque année plus de 300 000 premiers titres de séjour, principalement pour études, raisons familiales, travail et motifs humanitaires. Le regroupement familial permet à un étranger installé légalement de faire venir sa famille, sous conditions de ressources et de logement.",
    a: "Argument avancé : réduire l'immigration faciliterait l'intégration et allégerait la pression sur le logement et les services publics.",
    b: "Argument avancé : l'immigration répond à des besoins de main-d'œuvre, et le droit de vivre en famille est protégé par la Constitution et les conventions internationales.",
  },
  imm_ame: {
    contexte: "L'Aide médicale d'État prend en charge les soins des étrangers en situation irrégulière résidant en France depuis plus de trois mois, sous conditions de ressources. Elle compte plus de 400 000 bénéficiaires et coûte plus d'un milliard d'euros par an.",
    a: "Argument avancé : soigner tôt évite des urgences plus graves et plus coûteuses, et protège aussi la santé publique (maladies contagieuses).",
    b: "Argument avancé : il n'est pas logique de financer les soins courants de personnes qui n'ont pas le droit de séjourner en France, et l'AME peut constituer un facteur d'attraction.",
  },
  imm_regularisation: {
    contexte: "Un étranger sans titre de séjour peut, au cas par cas, être régularisé par le préfet (« admission exceptionnelle au séjour »), notamment par le travail. La loi de 2024 a créé, à titre expérimental, un titre pour les métiers en tension.",
    a: "Argument avancé : faciliter la régularisation encouragerait l'immigration irrégulière, en récompensant le non-respect des règles d'entrée.",
    b: "Argument avancé : ces personnes travaillent déjà, souvent dans des secteurs qui peinent à recruter ; les régulariser protège leurs droits et fait rentrer des cotisations.",
  },
  imm_droitdusol: {
    contexte: "En France, un enfant né en France de parents étrangers devient français à sa majorité s'il y a résidé au moins cinq ans depuis ses 11 ans (ou avant, sur demande). À Mayotte, ce droit est plus restreint.",
    a: "Argument avancé : le droit du sol est une tradition républicaine ancienne qui favorise l'intégration des enfants qui grandissent en France.",
    b: "Argument avancé : la nationalité devrait reposer sur une démarche volontaire ou la filiation, pas sur le lieu de naissance.",
  },
  imm_preference: {
    contexte: "Aujourd'hui, l'accès à la plupart des prestations sociales et au logement social dépend de la régularité et parfois de la durée du séjour, pas de la nationalité. Le principe d'égalité inscrit dans la Constitution et le droit européen encadrent ces distinctions.",
    a: "Argument avancé : les étrangers en situation régulière cotisent et paient des impôts comme les autres ; les exclure serait une discrimination, contraire à la Constitution selon de nombreux juristes.",
    b: "Argument avancé : les ressources publiques étant limitées, la solidarité nationale devrait d'abord bénéficier aux citoyens.",
  },
  eur_integration: {
    contexte: "Dans l'Union européenne, beaucoup de décisions sont prises à la majorité qualifiée, mais l'unanimité reste la règle en politique étrangère et en fiscalité. En 2020, l'Union a emprunté en commun pour financer le plan de relance après la crise sanitaire.",
    a: "Argument avancé : face aux grandes puissances, une Europe plus unie pèse davantage en matière de défense, d'économie et de climat.",
    b: "Argument avancé : chaque transfert de compétences réduit la souveraineté des États et éloigne les décisions des citoyens.",
  },
  eur_primaute: {
    contexte: "Selon la Cour de justice de l'Union européenne, le droit européen prime sur le droit national. Le Conseil constitutionnel français réserve toutefois le respect de « l'identité constitutionnelle de la France ».",
    a: "Argument avancé : sans primauté, les règles communes ne s'appliqueraient plus de la même façon partout, et le marché unique ne pourrait pas fonctionner.",
    b: "Argument avancé : le peuple français doit pouvoir décider en dernier ressort de ses lois, y compris quand elles contredisent des règles européennes.",
  },
  eur_ukraine: {
    contexte: "Depuis l'invasion de l'Ukraine par la Russie en février 2022, la France, comme ses alliés, livre des armes et forme des soldats ukrainiens.",
    a: "Argument avancé : soutenir l'Ukraine, c'est défendre le droit international et la sécurité de l'Europe face à une agression.",
    b: "Argument avancé : ce soutien coûte cher, vide les stocks de l'armée française et risque d'entraîner une escalade ; il faudrait privilégier la négociation.",
  },
  eur_otan: {
    contexte: "La France a quitté le commandement militaire intégré de l'OTAN en 1966 et l'a rejoint en 2009, tout en restant membre de l'Alliance pendant toute la période.",
    a: "Argument avancé : y rester donne à la France un poids dans les décisions et renforce la défense collective de l'Europe.",
    b: "Argument avancé : sortir du commandement intégré rendrait à la France une indépendance stratégique vis-à-vis des États-Unis.",
  },
  eur_defense3: {
    contexte: "La France consacre environ 2 % de son PIB à la défense. En 2025, les pays de l'OTAN se sont engagés à atteindre 5 % du PIB d'ici 2035, dont 3,5 % pour les dépenses militaires proprement dites.",
    a: "Argument avancé : la guerre en Ukraine et les tensions internationales imposent de renforcer nettement les armées.",
    b: "Argument avancé : avec un déficit élevé, il faut limiter la hausse des dépenses militaires au profit d'autres priorités.",
  },
  soc_medecins: {
    contexte: "Les médecins libéraux choisissent librement le lieu de leur installation. Des millions de personnes vivent dans des zones où l'accès à un médecin est difficile (« déserts médicaux »). Plusieurs propositions de loi visent à réguler l'installation.",
    a: "Argument avancé : réguler l'installation dans les zones déjà bien dotées orienterait les nouveaux médecins vers les territoires qui en manquent.",
    b: "Argument avancé : la liberté d'installation rend la profession attractive ; la contraindre découragerait les vocations sans créer de médecins supplémentaires.",
  },
  soc_findevie: {
    contexte: "L'enjeu porte sur l'aide à mourir, encadrée par la loi sous conditions strictes (maladie grave et incurable, souffrances, demande libre et éclairée, procédure médicale). Les soins palliatifs font l'objet de mesures distinctes.",
    a: "Argument avancé : une telle loi peut exercer une pression sur les personnes vulnérables ; la priorité devrait être l'accès aux soins palliatifs.",
    b: "Argument avancé : chacun devrait pouvoir choisir sa fin de vie face à des souffrances qu'on ne peut pas soulager, dans un cadre contrôlé.",
  },
  soc_rsa: {
    contexte: "Depuis le 1er janvier 2025, les allocataires du RSA sont inscrits à France Travail et doivent en principe réaliser au moins 15 heures d'activité par semaine (formation, immersion, démarches), adaptées à leur situation.",
    a: "Argument avancé : des contreparties favorisent le retour à l'emploi et renforcent l'acceptation de la solidarité.",
    b: "Argument avancé : conditionner un minimum vital peut exclure les plus fragiles, et l'accompagnement manque souvent de moyens.",
  },
  soc_100secu: {
    contexte: "L'Assurance maladie rembourse environ 80 % des dépenses de soins. Le reste est payé par les complémentaires santé (mutuelles, assurances) ou par les patients.",
    a: "Argument avancé : un remboursement intégral par la Sécurité sociale serait plus simple, plus égalitaire et éviterait les frais de gestion des complémentaires.",
    b: "Argument avancé : ce serait très coûteux pour les finances publiques et supprimerait des acteurs qui couvrent aussi d'autres besoins (prévoyance, optique…).",
  },
  soc_chomage: {
    contexte: "Les réformes de 2019 à 2023 ont modifié le calcul de l'allocation et lié la durée d'indemnisation à la situation du marché du travail : elle est réduite quand le chômage est bas.",
    a: "Argument avancé : l'assurance chômage protège face aux aléas ; réduire les droits appauvrit les demandeurs sans créer d'emplois.",
    b: "Argument avancé : des règles plus strictes incitent à reprendre plus vite un emploi, dans un contexte où des entreprises peinent à recruter.",
  },
  edu_prive: {
    contexte: "L'enseignement privé sous contrat scolarise environ un élève sur six. L'État rémunère ses enseignants et les collectivités participent à son fonctionnement ; en échange, il suit les programmes nationaux.",
    a: "Argument avancé : la liberté d'enseignement est un principe constitutionnel, et le privé sous contrat coûte moins cher par élève à l'État.",
    b: "Argument avancé : l'argent public devrait aller en priorité à l'école publique, et le privé sous contrat contribue à la ségrégation sociale entre établissements.",
  },
  edu_autorite: {
    contexte: "Des groupes de niveau ont été introduits au collège en 2024, et une tenue unique est expérimentée dans des établissements volontaires depuis 2024.",
    a: "Argument avancé : un cadre plus strict améliore le climat scolaire, les apprentissages et l'égalité entre élèves.",
    b: "Argument avancé : de petits effectifs et un accompagnement individualisé aident davantage les élèves en difficulté ; les groupes de niveau risquent de les enfermer, et l'uniforme a peu d'effet démontré.",
  },
  edu_signes: {
    contexte: "Depuis 2004, la loi interdit aux élèves des écoles publiques le port de signes religieux ostensibles. Les parents qui accompagnent les sorties scolaires ne sont pas soumis à la même règle, sauf restrictions justifiées par le bon fonctionnement du service.",
    a: "Argument avancé : ces parents ne sont pas des agents publics ; une interdiction les exclurait de la vie de l'école et découragerait leur participation.",
    b: "Argument avancé : lors d'une sortie scolaire, les accompagnateurs participent au service public de l'éducation et devraient respecter la même neutralité.",
  },
  edu_etudiants: {
    contexte: "Les bourses sur critères sociaux bénéficient à une partie des étudiants (plus de 600 000), selon les revenus de leurs parents. Beaucoup d'étudiants travaillent pendant leurs études.",
    a: "Argument avancé : une allocation pour tous permettrait d'étudier sans dépendre des parents ni d'un emploi qui nuit à la réussite.",
    b: "Argument avancé : une allocation universelle coûterait très cher et bénéficierait aussi aux étudiants aisés ; mieux vaut cibler les aides.",
  },
  edu_apprentissage: {
    contexte: "L'apprentissage est en principe possible à partir de 16 ans, ou dès 15 ans pour un jeune qui a terminé la classe de troisième.",
    a: "Argument avancé : à 14 ans, les élèves doivent acquérir un socle commun de connaissances ; une orientation trop précoce réduit leurs choix futurs.",
    b: "Argument avancé : un accès plus précoce permettrait aux jeunes qui s'ennuient à l'école de se former à un métier et d'éviter le décrochage.",
  },
  ins_proportionnelle: {
    contexte: "Les députés sont élus au scrutin majoritaire à deux tours, dans 577 circonscriptions. La proportionnelle a été utilisée une seule fois sous la Ve République, en 1986.",
    a: "Argument avancé : la proportionnelle donne à chaque courant politique un nombre de sièges conforme à son poids électoral.",
    b: "Argument avancé : le scrutin majoritaire favorise des majorités stables et un lien direct entre le député et sa circonscription.",
  },
  ins_ric: {
    contexte: "Depuis 2008, un référendum d'initiative partagée peut être organisé à l'initiative d'un cinquième des parlementaires soutenus par un dixième des électeurs (près de 5 millions de signatures). Le RIC permettrait à des citoyens seuls de déclencher un référendum.",
    a: "Argument avancé : le RIC donnerait aux citoyens un moyen direct de proposer ou d'abroger des lois entre deux élections.",
    b: "Argument avancé : il pourrait affaiblir le Parlement, se prêter à des questions simplistes ou remettre en cause des droits fondamentaux.",
  },
  ins_6e: {
    contexte: "La Ve République date de 1958. Le président est élu au suffrage universel direct depuis 1962 ; il nomme le Premier ministre et peut dissoudre l'Assemblée nationale.",
    a: "Argument avancé : les institutions actuelles ont assuré la stabilité du pays ; un changement de régime ouvrirait une longue période d'incertitude.",
    b: "Argument avancé : le pouvoir est trop concentré dans les mains du président ; une nouvelle Constitution redonnerait du poids au Parlement et aux citoyens.",
  },
  ins_parlementaires: {
    contexte: "Le Parlement compte 577 députés et 348 sénateurs. Des projets de réduction de leur nombre ont été présentés en 2018 et 2019, sans aboutir.",
    a: "Argument avancé : moins de parlementaires, ce serait moins de dépenses et un travail parlementaire plus efficace.",
    b: "Argument avancé : moins de parlementaires, ce serait des circonscriptions plus grandes et un lien affaibli avec les citoyens, surtout dans les territoires ruraux.",
  },
  ins_voteblanc: {
    contexte: "Depuis 2014, les votes blancs sont comptés à part des votes nuls et mentionnés dans les résultats, mais ils ne sont pas comptés dans les suffrages exprimés.",
    a: "Argument avancé : reconnaître le vote blanc permettrait d'exprimer un refus de l'offre politique sans s'abstenir.",
    b: "Argument avancé : compter les blancs comme exprimés pourrait empêcher toute majorité au second tour et bloquer l'élection.",
  },
};
