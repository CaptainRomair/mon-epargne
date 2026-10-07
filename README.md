# Mon Épargne — v0.1 (premier test)

Application web installable (PWA). Toutes les données restent sur le téléphone (stockage du navigateur).
Pense à exporter une sauvegarde de temps en temps (Réglages → Exporter une sauvegarde).

## Mettre en ligne avec GitHub Pages (gratuit, ~5 min, depuis un ordinateur)

1. Crée un compte sur github.com si besoin, puis un nouveau dépôt **public** nommé `mon-epargne`
   (« Add a README » décoché).
2. Sur la page du dépôt : **uploading an existing file** → glisse **le contenu** du dossier
   (index.html, app.js, styles.css, sw.js, manifest.webmanifest, le dossier icons) → **Commit changes**.
3. **Settings → Pages** → Source : *Deploy from a branch* → Branch : `main`, dossier `/ (root)` → **Save**.
4. Une à deux minutes plus tard, l'adresse apparaît en haut de la page Pages :
   `https://<ton-pseudo>.github.io/mon-epargne/`

Le dépôt est public : le code est visible, **pas tes données** (elles ne quittent jamais le téléphone).

## Installer sur le Redmi

1. Ouvre l'adresse dans **Chrome**.
2. Menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
3. Lance « Épargne » depuis l'écran d'accueil : elle s'ouvre en plein écran et fonctionne hors connexion.

## Tester sur ordinateur

Dans ce dossier : `python3 -m http.server 8000` puis http://localhost:8000
(ajoute `?today=2026-10-07` à l'adresse pour simuler une date).

## Mettre à jour

Remplace les fichiers dans le dépôt GitHub. Sur le téléphone, ferme et rouvre l'app (deux fois si besoin) :
la nouvelle version se charge, tes données sont conservées.
