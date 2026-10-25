# ⚡ Operator Vault — Portfolio & Distribution de Projets

Plateforme web moderne, ultra-légère et responsive pour exposer et distribuer vos projets personnels, outils et artefacts de recherche.

---

## 🚀 1. Tester en local immédiatement

Vous pouvez tester le site de deux manières :

### Option A : Serveur local rapide (recommandé)
Dans un terminal (PowerShell / Bash) dans ce dossier :
```bash
python -m http.server 8080
```
Puis ouvrez votre navigateur sur : **[http://localhost:8080](http://localhost:8080)**

### Option B : Double-clic direct
Double-cliquez simplement sur `index.html`. Un fallback intégré charge automatiquement vos projets même sans serveur web.

---

## 🌐 2. Déployer en ligne pour le monde entier (Gratuit)

### Via GitHub Pages (2 minutes)
1. Créez un nouveau dépôt sur GitHub (ex: `mes-projets` ou `<votre-pseudo>.github.io`).
2. Poussez tous les fichiers de ce dossier :
   ```bash
   git init
   git add .
   git commit -m "Initial release Operator Vault"
   git branch -M main
   git remote add origin https://github.com/<votre-pseudo>/<votre-repo>.git
   git push -u origin main
   ```
3. Allez dans les **Paramètres (Settings)** du dépôt sur GitHub -> **Pages**.
4. Sous **Build and deployment**, sélectionnez la branche `main` et le dossier `/ (root)`.
5. Cliquez sur **Save**. Votre site est en ligne à l'adresse `https://<votre-pseudo>.github.io/<votre-repo>/` !

### Via Vercel ou Netlify
- Glissez-déposez simplement ce dossier sur [app.netlify.com/drop](https://app.netlify.com/drop) ou importez le dépôt dans [vercel.com](https://vercel.com).
- Le déploiement est instantané (zéro configuration requise).

---

## 🛠️ 3. Comment ajouter / modifier vos projets

Vous avez deux méthodes très simples :

### Méthode 1 : Directement depuis l'interface web (Visuelle)
1. Cliquez sur le bouton **"Ajouter un Projet"** en haut à droite du site.
2. Remplissez le formulaire (Titre, Catégorie, Tags, Dépôt GitHub, Commandes...).
3. Validez : le projet s'affiche immédiatement sur votre page !
4. Cliquez ensuite sur **"Exporter JSON"** pour télécharger le fichier `projects.json` à jour et remplacez celui du dossier.

### Méthode 2 : En modifiant `projects.json`
Ouvrez simplement `projects.json` avec n'importe quel éditeur et dupliquez un bloc existant :
```json
{
  "id": "mon-nouveau-projet",
  "title": "Nom de mon projet",
  "category": "security",
  "categoryLabel": "Sécurité & Kernel",
  "status": "stable",
  "statusLabel": "Stable v1.0",
  "date": "2026-04",
  "shortDesc": "Résumé pour la carte d'accueil...",
  "fullDesc": "Description détaillée affichée dans la modale...",
  "tags": ["C++", "Windows", "Reverse"],
  "features": [
    "Fonctionnalité 1",
    "Fonctionnalité 2"
  ],
  "repoUrl": "https://github.com/votre-user/mon-repo",
  "demoUrl": "https://...",
  "downloadUrl": "#",
  "instructions": "# Commandes de compilation\ncargo build --release"
}
```

---

## 📁 Structure des fichiers

```text
├── index.html        # Structure HTML5 & templates de modales
├── style.css         # Système de design Dark Obsidian / Glassmorphism
├── app.js            # Moteur JavaScript : filtres, recherche, modales, ajout
├── projects.json     # Base de données de vos projets
└── README.md         # Guide de déploiement et d'administration
```
