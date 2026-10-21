#!/usr/bin/env python3
"""Calcule avec scripts/score.py du skill les résultats d'une série de profils (test de concordance).

Usage : python3 -I concordance_python.py <dossier du skill> <profils.json> <sortie.json>
"""
import json
import sys
from pathlib import Path

dossier = Path(sys.argv[1]).resolve() / "skills" / "boussole-presidentielle-2027" / "scripts"
sys.path.insert(0, str(dossier))
from score import calculer, charger  # noqa: E402

questions, candidats = charger()
profils = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
sorties = [calculer(p, questions, candidats) for p in profils]
Path(sys.argv[3]).write_text(json.dumps({"python": sys.version.split()[0], "resultats": sorties}, ensure_ascii=False), encoding="utf-8")
