#!/usr/bin/env python3
"""Calcule avec scripts/score.py et scripts/tirage.py du skill les résultats d'une série de profils et de
tirages (test de concordance).

Usage : python3 -I concordance_python.py <dossier du skill> <entree.json> <sortie.json>
entree.json : {"profils": [profil, ...], "tirages": [{"mode", "graine", "user"}, ...]}
"""
import json
import sys
from pathlib import Path

dossier = Path(sys.argv[1]).resolve() / "skills" / "boussole-presidentielle-2027" / "scripts"
sys.path.insert(0, str(dossier))
from score import calculer, charger  # noqa: E402
from tirage import tirer  # noqa: E402

questions, candidats = charger()
entree = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
resultats = [calculer(p, questions, candidats) for p in entree["profils"]]
tirages = [tirer(t["mode"], t["graine"], t["user"], questions, candidats) for t in entree["tirages"]]
Path(sys.argv[3]).write_text(json.dumps({"python": sys.version.split()[0], "resultats": resultats, "tirages": tirages},
                                        ensure_ascii=False), encoding="utf-8")
