# Portail Codex Mental — bixent.codexmental.com

Page d'accueil unique (cible du QR code des cartes de visite) qui présente Codex Mental, le Laboratoire et l'Observatoire. HTML, CSS et JavaScript sans dépendance, hébergés sur GitHub Pages.

## Modifier le contenu sans toucher au HTML

Tout passe par les fichiers de `data/` :

| Fichier | Rôle |
|---|---|
| `config.json` | Interrupteurs des blocs (`features`), adresse de contact, dernière nouveauté (pastille NEW jusqu'à `newUntil`), lien de partage |
| `posters.json` | Affiches : image, citation, traduction, auteur ; rotation et pause |
| `stats.json` | Chiffres de secours ou saisis à la main (`null` = masqué) |
| `socials.json` | Réseaux de la bande du bas (une entrée sans `url` n'apparaît pas) |
| `nox.json` | Humeurs de Nox et leurs images |
| `works.json` | Atelier d'écriture : informations **publiques uniquement** |

### Atelier d'écriture

Masqué par défaut : `"atelier": false` dans `config.json`. Pour l'afficher, passer la valeur à `true` **et** remplir `works.json`. Tant que la liste est vide, rien n'apparaît.

### Statistiques en direct

Les articles (Codex Mental) et les idées et hypothèses (Atelier de Codex et hypothèses de l'Observatoire) sont recalculés depuis les sites publics, mis en cache 6 h dans le navigateur. En cas d'échec, les valeurs de `stats.json` s'affichent.

## Arborescence

```
index.html        page
css/style.css     styles (grille Bento, mobile d'abord pour le QR code)
js/app.js         affiches, Nox, boîte, statistiques, partage
data/             contenus modifiables
img/affiches/     affiches (portrait 2:3, .webp)
img/nox/          visuels de Nox
img/qr-bixent.svg  QR code vers ce portail
fonts/            polices auto-hébergées (licence OFL)
```

## Ajouter un bloc

La mosaïque fait 12 colonnes et place les blocs toute seule, dans l'ordre du HTML. Pour en ajouter un, insère une `<section class="card s-4">…</section>` à l'endroit voulu :

- largeur : `s-2`, `s-3`, `s-4`, `s-5`, `s-6`, `s-8` ou `s-12` (en colonnes) ;
- hauteur double : ajoute `r-2`.

Sur tablette, les blocs passent sur 6 colonnes ; sur mobile, ils s'empilent automatiquement.
