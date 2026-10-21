// Mesure d'audience anonyme avec GoatCounter (script officiel count.js v5, servi par le site).
// Chargé seulement si un code est configuré au build, et jamais si le navigateur envoie Do Not Track.
//
// count.js envoie toujours location.search (paramètre q) en plus du chemin : on compte donc sur une
// adresse momentanément réduite au chemin (history.replaceState, synchrone), rétablie aussitôt après.
// Aucune réponse, aucun score, aucun candidat, aucun thème : seulement le chemin et les événements
// de la liste blanche (src/lib/audience.ts).
import { cheminNettoye, evenementAutorise, lireRef, nePasSuivre, referentExterne, sansRef } from '../lib/audience';

declare global {
  interface Window {
    goatcounter?: { no_onload?: boolean; count?: (v: Record<string, unknown>) => void };
    boussoleAudience?: { compter: (evenement: string) => void };
  }
}

const racine = document.documentElement;
const endpoint = racine.dataset.goatcounter;
const script = racine.dataset.goatcounterScript;
const integrite = racine.dataset.goatcounterIntegrite;

function surAdresseNettoyee(f: () => void) {
  const avant = location.href;
  history.replaceState(history.state, '', cheminNettoye(location.pathname));
  try {
    f();
  } finally {
    history.replaceState(history.state, '', avant);
  }
}

// Refus explicite sur ce navigateur (bouton de la page Confidentialité).
let refus = false;
try {
  refus = localStorage.getItem('boussole-audience') === 'refus';
} catch {
  /* stockage indisponible : pas de refus enregistré */
}

if (endpoint && script && !refus && !nePasSuivre(navigator as never, window as never)) {
  // Référent : le paramètre ?ref= des liens tagués s'il existe, sinon le domaine du site d'origine.
  const ref = lireRef(location.search);
  if (ref !== null || new URLSearchParams(location.search).has('ref')) {
    history.replaceState(history.state, '', location.pathname + sansRef(location.search) + location.hash);
  }
  const referent = ref ?? referentExterne(document.referrer, location.hostname);

  const envoyer = (vars: Record<string, unknown>) => {
    const gc = window.goatcounter;
    if (!gc?.count) return;
    surAdresseNettoyee(() => gc.count!(vars));
  };

  window.boussoleAudience = {
    compter(evenement: string) {
      if (!evenementAutorise(evenement)) return;
      envoyer({ path: evenement, title: evenement, event: true, referrer: '' });
    },
  };

  // Téléchargements des données ouvertes : donnees/<fichier>.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    const m = a && new URL(a.href, location.href).pathname.match(/\/donnees\/([a-z0-9-]+\.(?:json|csv))$/);
    if (m) window.boussoleAudience?.compter(`donnees/${m[1]}`);
  });

  window.goatcounter = { no_onload: true };
  const s = document.createElement('script');
  s.async = true;
  s.src = script;
  if (integrite) {
    s.integrity = integrite;
    s.crossOrigin = 'anonymous';
  }
  s.dataset.goatcounter = endpoint;
  s.addEventListener('load', () => envoyer({ path: cheminNettoye(location.pathname), title: document.title, referrer: referent }));
  document.head.appendChild(s);
}
