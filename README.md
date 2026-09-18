# Budget

Application de budget mensuel personnelle. Un seul fichier HTML, aucune dépendance,
aucune donnée envoyée nulle part : tout vit dans le `localStorage` du navigateur,
avec en option une copie dans un dossier du téléphone.

## Mise en ligne (GitHub Pages)

1. Créer un dépôt, y déposer ces fichiers à la racine.
2. Settings → Pages → Source : `Deploy from a branch`, branche `main`, dossier `/ (root)`.
3. Ouvrir l'URL fournie sur le téléphone, puis Chrome ⋮ → « Ajouter à l'écran d'accueil ».

Installer l'app (plutôt que l'ouvrir dans un onglet) n'est pas cosmétique : c'est ce
qui permet à Chrome de conserver durablement l'autorisation d'écrire dans le dossier
de sauvegarde.

## Salaire

Réglages → Revenus → la ligne Salaire. Le salaire est un **profil annuel**, pas un
montant recopié chaque mois :

- un net mensuel ;
- un nombre de mois par an (12, 13, 14) ;
- le ou les **mois de versement, libres** : n'importe quels mois, en une ou
  plusieurs fois. Juin et novembre ne sont qu'un pré-remplissage quand on passe à
  13 mois — tout se change en touchant les puces de mois ;
- chaque montant est modifiable (répartition inégale, demi 13ᵉ mois…) ;
- le nom du complément est libre : « 13ᵉ mois », « prime de vacances »…

Deux façons de le compter :

| Mode | Effet |
| --- | --- |
| Aux mois réels | Le complément apparaît comme revenu sur les mois de versement, où le reste à vivre est donc plus élevé. |
| Lissé sur 12 mois | Un douzième est ajouté chaque mois : budget stable, mais les versements réels n'apparaissent plus tels quels. |

Une modification s'applique au mois affiché et aux suivants ; les mois passés gardent
ce qui a réellement été perçu. Les revenus exceptionnels (heures supplémentaires,
prime) s'ajoutent à part, avec la case « Reprendre chaque mois » décochée.

## Apparence

Réglages → Apparence : mode sombre ou clair, et huit teintes (vert, océan, bleu,
violet, rose, rouge, ambre, graphite). Toute la palette — fonds, textes, accents —
est calculée à partir d'une teinte et d'un mode par `palette()`, en haut du fichier ;
ajouter une variante tient en une ligne dans le tableau `THEMES`. Les 16 combinaisons
respectent les contrastes AA (vérifié : texte principal ≥ 7:1, textes secondaires et
boutons accentués ≥ 4.5:1).

Sur Android, Chrome colore l'écran de démarrage **et les barres système** (heure en
haut, navigation en bas) avec les couleurs de `manifest.json`, figées à
l'installation : il ignore la couleur que l'app règle pendant qu'elle tourne. Elles
valent donc le fond du thème par défaut (vert sombre, `#0f241f`), pour que la barre
d'onglets se prolonge sans raccord dans la barre de navigation Android. Avec un autre
thème, une bande de couleur différente reste visible en bas : pour l'effacer, mettre
le fond de ce thème dans le manifeste. Toute modification du manifeste demande
d'incrémenter `V` dans `sw.js`, puis que Chrome mette à jour l'app installée (jusqu'à
un jour) ou une réinstallation.

## Icône

Une tirelire blanche sur fond noir, volontairement sans couleur pour rester neutre
quel que soit le thème. Elle n'est pas dessinée à la main : `make-icon.js` la
compose en primitives géométriques (ellipses, capsules, rectangles arrondis),
la rend avec un suréchantillonnage 4×4 et encode le PNG via `zlib` — aucune
dépendance.

```
node make-icon.js .            # réécrit icon-180/192/512.png
node make-icon.js . --previews # + aperçus 384 px, 48 px et inversé
```

Le dessin tient dans le cercle central de 80 % du carré, ce qui le rend utilisable
comme icône `maskable` (Android peut la rogner en cercle sans couper la tirelire).

**Après toute modification d'icône, incrémenter `V` dans `sw.js`** : les icônes font
partie du *shell* mis en cache, sinon l'ancienne reste servie.

## Clôturer un mois

Facultatif. Clôturer verrouille le mois : plus d'ajout ni de modification de dépense
ou de revenu, et les changements d'enveloppe, de récurrence ou de salaire ne le
réécrivent plus — ses chiffres restent ceux qu'on a réellement vécus. Le report de
solde vers le mois suivant continue de fonctionner. Réversible à tout moment.

## Sauvegarde

Réglages → Sauvegarde.

- **Chrome (Android 132+, ordinateur)** : « Choisir un dossier de sauvegarde », une
  fois, n'importe où. L'app y écrit **un seul `budget.json`, réécrit** à chaque
  modification (jamais de copie datée), et le relit à l'ouverture. L'écriture passe
  par `createWritable()`, qui remplace le fichier de façon atomique : une écriture
  interrompue ne laisse pas un fichier à moitié écrit.
  Sur un appareil vierge (réinstallation, nouveau téléphone) les données sont
  reprises automatiquement ; si le fichier est plus récent que l'appareil, l'app
  demande avant d'écraser. Pointer ce dossier sur un dossier synchronisé (Drive,
  Syncthing, FolderSync…) suffit à partager le budget entre deux appareils.
- **Firefox, Safari iOS** : pas de dossier possible — Mozilla a classé ces API
  « harmful » et ne les implémentera pas, Safari ne fournit que l'OPFS (invisible
  depuis le gestionnaire de fichiers). Deux replis :
  - **Téléchargement quotidien** (case à cocher) : une fois par jour, au premier
    appui dans l'app, la sauvegarde part dans le dossier *Téléchargements*. Le
    déclenchement est accroché à un geste de l'utilisateur, parce qu'un
    téléchargement sans geste est souvent bloqué. Restauration : bouton Importer.
    Cette option accumule un fichier daté par jour : elle n'est donc proposée
    **que** là où l'accès à un dossier est impossible, et ne se déclenche jamais
    sur un navigateur qui sait écrire dans un dossier, même si le réglage traîne
    dans les données.
  - **Partage** (si le navigateur accepte les fichiers) vers Fichiers, iCloud, Drive.
- Un rappel s'affiche sur l'écran Mois après N jours sans sauvegarde (réglable, ou
  désactivable).
- Exporter / Importer un JSON reste disponible dans tous les cas.

## Structure des données

```
{
  v: 2,
  updatedAt: "2026-09-12T…",        // départage appareil et fichier de sauvegarde
  settings: {
    alert, carry, theme, mode,
    salary: { label, net, months, mode: "reel"|"lisse", bonusLabel,
              parts: [{ month, amount }, …] },   // mois libres, montants libres
    backup: { auto, daily, name, lastAt, remindDays }
  },
  categories: [...],
  recurring: [...],
  months: {
    "2026-09": {
      incomes: [ { id, sid?, label, amount, keep? } ],   // sid = ligne issue du profil de salaire
      budgets: {}, expenses: [], closed: false
    }
  }
}
```

Les lignes de revenu portant un `sid` sont régénérées depuis le profil de salaire ;
celles sans `sid` sont saisies à la main et ne sont jamais réécrites. `keep: false`
marque un revenu qui ne doit pas être reporté au mois suivant.

Le dossier de sauvegarde (un `FileSystemDirectoryHandle`) est conservé dans
IndexedDB, base `budget.fs` — il ne peut pas être stocké dans `localStorage`.

## Tests

Il n'y a pas de dépendance ni d'outillage dans le dépôt. Les modifications de ce
fichier ont été validées par trois suites exécutées hors dépôt avec `jsdom`
(logique du salaire et des palettes, parcours d'interface, sauvegarde fichier avec
API simulée). À refaire de la même façon en cas de changement important.
