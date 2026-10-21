# Boussole présidentielle 2027 — le site

Site vitrine de la [Boussole présidentielle 2027](https://github.com/Lcharvol/boussole-presidentielle-2027), une boussole électorale neutre pour la présidentielle française de 2027 : 40 affirmations, 25 candidats, chaque position sourcée par une citation exacte et relue par un humain.

**En ligne : https://lcharvol.github.io/boussole-2027-site/**

Le résultat mesure une proximité avec des programmes, pas une consigne de vote. Le site ne collecte rien : pas de cookie, pas de traceur, pas de mesure d'audience, pas de sondage. Le calcul se fait dans le navigateur.

## Ce que contient le site

| Page | Rôle |
|---|---|
| `/` | Promesse, accès au test, ce qui distingue cette boussole |
| `/test/` | Questionnaire : mode rapide (8), moyen (24) ou long (40), thème par thème, « je passe », 3 priorités au plus |
| `/resultat/<mode>/#…` | Classement avec marge et couverture, alertes, accords et désaccords avec citation, source, confiance et relecture ; partage par lien ; passage au mode supérieur sans recommencer |
| `/candidats/<slug>/` | Fiche par candidat : statut, programme, positions par thème, photo avec crédit |
| `/questions/<id>/` | « Qui pense quoi » : une page par affirmation |
| `/comparer/` | 2 ou 3 candidats côte à côte (`?c=slug1,slug2`) |
| `/methode/` | Méthode complète et audit de neutralité (sortie de `audit_biais.py`, recalculée au build) |
| `/calendrier/` | Dates officielles sourcées, et ce qui n'est pas encore fixé par décret |
| `/classe/` | Mode classe : fiches neutres par thème, déroulé de séance, test sans résultat nominatif |
| `/skill-claude/` | Installer le plugin ou le skill |
| `/donnees/` | Données ouvertes (JSON et CSV générés au build) |
| `/a-propos/`, `/confidentialite/`, `/mentions-legales/` | Informations (mentions légales : gabarit à compléter) |

## Architecture

- **[Astro](https://astro.build) + TypeScript**, site entièrement statique. Les pages de contenu sont rendues au build, sans JavaScript.
- **Îlots React** pour ce qui doit tourner chez le visiteur : le test (`src/components/Test.tsx`), le résultat (`Resultat.tsx`), le comparateur (`Comparateur.tsx`) et la carte du mode classe (`CarteClasse.tsx`).
- **Interface : [Brut/UI](https://www.brut-ui.site/)** (registre shadcn, Base UI, Tailwind CSS v4), palette Paper. Les composants installés sont dans `src/components/ui/` et la feuille de style du thème dans `src/components/styles/brutalist.css`. Brut/UI n'ayant pas de thème sombre, il est défini dans `src/styles/global.css`.
- **Polices** Inter et Source Serif 4 servies par le site (aucune ressource tierce).

```
scripts/
  preparer-donnees.mjs   récupère le dépôt du skill, écrit src/generated/ et public/donnees/, lance l'audit
  images-partage.mjs     images Open Graph (générique + une par mode) avec satori et resvg
  concordance.ts         compare score.ts et score.py sur des profils fixes et aléatoires
  concordance_python.py  côté Python du test de concordance
  verifier-liens.mjs     vérifie les liens et ancres internes de dist/
  serveur-test.mjs       sert dist/ sous /boussole-2027-site/ pour Lighthouse
  photos.py              met à jour les photos Wikimedia Commons (lancé à la main)
src/
  lib/score.ts           portage à l'identique de scripts/score.py
  lib/python.ts          primitives CPython (Mersenne Twister, round, sum) pour un résultat identique au bit près
  lib/partage.ts         encodage des réponses dans le fragment de l'URL
  lib/donnees.ts         accès aux données au build, tri alphabétique des candidats
  data/calendrier.ts     calendrier électoral et ses sources
  data/classe.ts         fiches pédagogiques du mode classe
  data/photos.json       photos retenues : fichier, auteur, licence, lien
```

### Le calcul

`src/lib/score.ts` reprend `scripts/score.py` ligne à ligne : accord `1 - |écart| / 4` corrigé du hasard, pondération importance × confiance (programme 1, déclaration 0,85, déduite 0,6), positions inconnues au poids √2 - 1, couverture minimale de 50 %, marge bootstrap (1 000 tirages, graine 2027, intervalle à 90 %), peloton de tête et thèmes prioritaires sans donnée. Pour que le bootstrap donne exactement les mêmes tirages, `src/lib/python.ts` réimplémente le générateur de `random.Random` de Python, ainsi que `round()` et `sum()`.

Le test de concordance (`npm run test:concordance`) exécute `score.py` du skill et `score.ts` sur une série de profils (profils fixes, profils constants, et profils aléatoires à graine fixe avec « je passe » et priorités) : les sorties doivent être identiques. **Toute modification de `score.py` doit être reportée dans `score.ts`**, sinon la CI échoue.

### Confidentialité par construction

- Les réponses sont encodées après le `#` de l'URL de résultat (format décrit dans `src/lib/partage.ts`). Le navigateur ne transmet jamais cette partie au serveur.
- Aucun cookie, aucun script tiers. Seul le choix du thème clair/sombre est gardé dans le `localStorage`.
- Aucune statistique sur les résultats des visiteurs n'est calculée ni publiée : le site ne doit pas pouvoir être assimilé à un sondage en période électorale.

### Neutralité

- Mêmes gabarits, même taille et même cadrage de photo pour tous ; ordre alphabétique du nom de famille partout, sauf dans le résultat personnel.
- Affirmations et citations reprises mot pour mot depuis les données du skill.
- Photos : uniquement des fichiers Wikimedia Commons sous CC BY, CC BY-SA, CC0 ou domaine public, avec auteur, licence et lien affichés ; à défaut, les initiales.

## Mise à jour des données

Les données ne sont **jamais recopiées à la main** : le dépôt du skill [`Lcharvol/boussole-presidentielle-2027`](https://github.com/Lcharvol/boussole-presidentielle-2027) (branche `main`, dossier `skills/boussole-presidentielle-2027/data/`) est la source unique. À chaque build, `scripts/preparer-donnees.mjs` :

1. récupère le dépôt (en CI par `actions/checkout`, en local par `git clone` dans `.donnees/`) ;
2. écrit `src/generated/donnees.json` (questions, fiches, métadonnées dont le commit du skill) ;
3. exécute `scripts/audit_biais.py` du skill et garde sa sortie pour la page Méthode ;
4. génère les données ouvertes dans `public/donnees/`.

Le site se reconstruit :

- à chaque push sur `main` ;
- chaque jour à 4 h 17 UTC (cron) ;
- sur un événement `repository_dispatch` de type `donnees-mises-a-jour`, envoyé par le dépôt du skill quand ses données changent (workflow proposé dans une PR séparée du dépôt du skill ; il nécessite un secret `SITE_DISPATCH_TOKEN`, un jeton à grain fin avec le droit « Contents: write » sur ce dépôt) ;
- à la main : onglet Actions → Site → Run workflow.

**Photos** : `python3 scripts/photos.py` (après `npm run donnees`) cherche les nouveaux candidats sur Wikidata, ne retient que les licences libres et met à jour `src/data/photos.json` et `public/photos/`. Les éléments Wikidata trouvés par recherche sont à vérifier ; un fichier précis peut être imposé avec la clé `fichier` dans `photos.json`. Le résultat est commité.

**Calendrier et fiches du mode classe** : `src/data/calendrier.ts` et `src/data/classe.ts`, à mettre à jour à la main (dates officielles sourcées, faits datés).

## Développement

Node 22 et Python 3 (pour l'audit et le test de concordance).

```bash
npm ci
npm run dev          # données (sans audit) + serveur de développement
npm run build        # données + audit + images de partage + vérification des types + build
npm test             # tests unitaires (primitives Python, encodage des liens)
npm run test:concordance
npm run liens        # après un build
npx lhci autorun     # Lighthouse (accessibilité, bonnes pratiques, SEO), après un build
```

Pour travailler sur un clone local du skill : `BOUSSOLE_SKILL_DIR=../boussole-presidentielle-2027 npm run build`.

## Déploiement

GitHub Pages, par GitHub Actions (`.github/workflows/site.yml`). Sur chaque pull request, la CI construit le site et vérifie : tests unitaires, types, concordance TS/Python, liens internes, accessibilité Lighthouse (thèmes clair et sombre, score minimal 0,95 et aucun défaut de contraste). Sur `main`, après les mêmes vérifications, le site est publié. Dans les réglages du dépôt, *Pages → Source* doit être « GitHub Actions ».

Pour un domaine personnalisé : ajouter un fichier `public/CNAME`, le configurer dans *Settings → Pages*, et modifier `site` et `base` dans `astro.config.mjs` (et `BASE` dans `scripts/verifier-liens.mjs`, `scripts/serveur-test.mjs` et les URL de `lighthouserc*.json`).

## Reste à compléter

- **Mentions légales** (`src/pages/mentions-legales/index.astro`) : éditeur, directeur de publication, contact, hébergeur.
- Domaine personnalisé éventuel.

## Licence

[MIT](LICENSE). Les photos restent sous leurs licences respectives (indiquées sur chaque fiche).
