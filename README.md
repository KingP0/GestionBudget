# Budget

Application de budget mensuel personnelle. Un seul fichier HTML, aucune dépendance,
aucune donnée envoyée nulle part : tout vit dans le `localStorage` du navigateur.

## Mise en ligne (GitHub Pages)

1. Créer un dépôt, y déposer ces fichiers à la racine.
2. Settings → Pages → Source : `Deploy from a branch`, branche `main`, dossier `/ (root)`.
3. Ouvrir l'URL fournie sur le téléphone, puis Chrome ⋮ → « Ajouter à l'écran d'accueil ».

## Sauvegarde

Réglages → Exporter en JSON. Le fichier contient l'intégralité de l'historique
et se réimporte par le bouton voisin.

## Structure des données

```
{ settings, categories[], recurring[], months: { "2026-09": { incomes[], budgets{}, expenses[], closed } } }
```
