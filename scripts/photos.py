#!/usr/bin/env python3
"""Met à jour les photos des candidats depuis Wikimedia Commons (à lancer à la main, résultat commité).

Usage : python3 scripts/photos.py [dossier des fiches candidats]
  (par défaut .donnees/skill/skills/boussole-presidentielle-2027/data/candidats)

Pour chaque candidat : l'élément Wikidata (identifiant déjà connu dans src/data/photos.json, sinon
premier résultat de recherche par nom, à vérifier), puis les images de la propriété P18 dans l'ordre.
On ne retient que la première image dont la licence est clairement libre : CC BY, CC BY-SA, CC0 ou
domaine public. Sinon, le site affiche les initiales. Auteur, licence et lien sont enregistrés pour
être affichés sous chaque photo. Pour forcer un autre fichier : renseigner "fichier" dans photos.json.
"""
import html
import json
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
MANIFESTE = RACINE / "src" / "data" / "photos.json"
DOSSIER_IMAGES = RACINE / "public" / "photos"
UA = {"User-Agent": "boussole-2027-site/1.0 (https://github.com/Lcharvol/boussole-2027-site)"}
LICENCES = re.compile(r"^(CC BY(-SA)? \d(\.\d)?( [A-Za-z-]+)?|CC0( 1\.0)?|Public domain)$", re.I)
LARGEUR = 400


def api(url, **params):
    params["format"] = "json"
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def texte(m, cle):
    brut = m.get(cle, {}).get("value", "")
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", brut))).strip()
    return re.sub(r"\(\s+", "(", re.sub(r"\s+\)", ")", t))


def main():
    dossier = Path(sys.argv[1]) if len(sys.argv) > 1 else RACINE / ".donnees/skill/skills/boussole-presidentielle-2027/data/candidats"
    ancien = json.loads(MANIFESTE.read_text(encoding="utf-8")) if MANIFESTE.exists() else {}
    DOSSIER_IMAGES.mkdir(parents=True, exist_ok=True)
    sortie = {}
    for f in sorted(dossier.glob("*.json")):
        c = json.loads(f.read_text(encoding="utf-8"))
        slug, nom = c["slug"], c["nom"]
        prec = ancien.get(slug, {})
        qid = prec.get("wikidata")
        if not qid:
            res = api("https://www.wikidata.org/w/api.php", action="wbsearchentities", search=nom, language="fr", type="item", limit=1)["search"]
            qid = res[0]["id"] if res else None
            print(f"{slug} : élément Wikidata {qid} trouvé par recherche ({res[0].get('description', '') if res else '—'}) — à vérifier")
        fichiers = []
        if prec.get("fichier"):
            fichiers = [prec["fichier"]]
        elif qid:
            e = api("https://www.wikidata.org/w/api.php", action="wbgetentities", ids=qid, props="claims")["entities"][qid]
            fichiers = [x["mainsnak"]["datavalue"]["value"] for x in e["claims"].get("P18", []) if "datavalue" in x["mainsnak"]]
        entree = {"wikidata": qid, "photo": None}
        if prec.get("fichier"):
            entree["fichier"] = prec["fichier"]
        for fn in fichiers:
            pages = api("https://commons.wikimedia.org/w/api.php", action="query", titles="File:" + fn, prop="imageinfo",
                        iiprop="url|extmetadata", iiurlwidth=LARGEUR)["query"]["pages"]
            info = next(iter(pages.values()))["imageinfo"][0]
            m = info["extmetadata"]
            licence = texte(m, "LicenseShortName")
            if not LICENCES.match(licence):
                print(f"{slug} : {fn} écarté (licence « {licence} »)")
                continue
            ext = Path(urllib.parse.urlparse(info["thumburl"]).path).suffix.lower() or ".jpg"
            image = f"{slug}{ext}"
            req = urllib.request.Request(info["thumburl"], headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                (DOSSIER_IMAGES / image).write_bytes(r.read())
            if ext == ".png" and shutil.which("sips"):
                # Portraits en PNG : convertis en JPEG (bien plus légers) quand l'outil macOS sips est là.
                jpg = f"{slug}.jpg"
                subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", str(DOSSIER_IMAGES / image),
                                "--out", str(DOSSIER_IMAGES / jpg)], check=True, capture_output=True)
                (DOSSIER_IMAGES / image).unlink()
                image = jpg
            entree["photo"] = {
                "image": image,
                "fichier": fn,
                "page": info["descriptionurl"],
                "auteur": texte(m, "Artist") or "auteur inconnu",
                "licence": licence,
                "licence_url": texte(m, "LicenseUrl") or None,
            }
            print(f"{slug} : {fn} ({licence}, {entree['photo']['auteur']})")
            break
        if not entree["photo"]:
            print(f"{slug} : aucune photo sous licence libre, initiales affichées")
        sortie[slug] = entree
    MANIFESTE.write_text(json.dumps(sortie, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
