// Configuration de la mesure d'audience, lue au build. Sans code, aucune mesure et aucun script.
import { lireCode } from './audience';

export const CODE_GOATCOUNTER = lireCode(process.env.GOATCOUNTER_CODE);
export const AUDIENCE_ACTIVE = CODE_GOATCOUNTER !== null;
/** Empreinte SRI publiée par GoatCounter pour count.v5.js (vérifiée en CI par scripts/verifier-goatcounter.mjs). */
export const INTEGRITE_COUNT_JS = 'sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ';
