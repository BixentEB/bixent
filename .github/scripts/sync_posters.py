"""Met data/posters.json à jour d'après les images de img/affiches/.

- Une nouvelle image est ajoutée au carrousel, avec une citation tirée
  du nom du fichier (stay-curious.webp -> « Stay curious »).
- Une image supprimée est retirée du carrousel.
- Les textes déjà saisis (citation, traduction, auteur) sont conservés.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "posters.json"
FOLDER = ROOT / "img" / "affiches"
EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png", ".avif"}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    posters = data.get("posters", [])
    files = sorted(
        "img/affiches/" + p.name
        for p in FOLDER.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )
    kept = [p for p in posters if p.get("image") in files]
    known = {p["image"] for p in kept}
    for f in files:
        if f not in known:
            stem = pathlib.Path(f).stem.replace("-", " ").replace("_", " ").strip()
            kept.append({"image": f, "quote": stem[:1].upper() + stem[1:], "fr": "", "author": ""})
    if kept != posters:
        data["posters"] = kept
        DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"posters.json mis à jour : {len(kept)} affiche(s)")
    else:
        print("posters.json déjà à jour")


if __name__ == "__main__":
    main()
