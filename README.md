# ✦ Discord Orb Studio

<div align="center">
  <img src="desktop-app/assets/icon.png" width="96" height="96" alt="Discord Orb Studio Logo" />
  <h3>Votre compagnon Discord pour vos quêtes et récompenses</h3>
  <p>Application de bureau moderne et fluide conçue pour automatiser, suivre et réclamer vos quêtes Discord sans lancer ni installer de jeux volumineux.</p>

  <p>
    <img src="https://img.shields.io/badge/Platform-Windows_x64-blue?style=flat-square&logo=windows" alt="Platform Windows" />
    <img src="https://img.shields.io/badge/Electron-v45.0.0-47848F?style=flat-square&logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D24.22.1-339933?style=flat-square&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Version-3.3.0-b8adf2?style=flat-square" alt="Version 3.3.0" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License MIT" />
  </p>
</div>

---

## 🌟 Points Clés

- **⚡ Automatisation des quêtes en tâche de fond** : Terminez vos quêtes de jeux ou de vidéos Discord avec émulation intelligente des sessions d'activité et des paquets de heartbeat.
- **🌌 Visualiseur orbital interactif** : Suivi de la progression en temps réel avec anneaux orbitaux animés et égaliseur dynamique.
- **🎨 Thèmes dynamiques multi-couleurs** : Personnalisez l'ambiance avec 4 palettes exclusives (*Pervenche*, *Sauge*, *Pêche*, *Rose*) modifiant les reflets d'accentuation, boutons et barres de progression.
- **🔘 Ergonomie soignée** : Bouton d'enregistrement des préférences flottant centré, masquage à la demande des détails système et transition fluide entre les vues.
- **🛡️ Sécurité & Discrétion** : Mode furtif configurable (*Turbo* ou *Équilibré*), rotation d'empreintes et support multi-comptes sécurisé (connexion par mot de passe ou scan QR).
- **📦 Installateur sur mesure haute définition** : Installation plein écran sous Windows 10 & 11 avec thème sombre natif DWM, bannière graphique et sélecteur de dossier direct.

---

## 🖥️ Organisation du Projet

```text
DISCORD ORB APP/
├── desktop-app/              # Application principale (Electron)
│   ├── src/                  # Interfaces, styles et logique de rendu
│   │   ├── index.html        # Vue principale du studio
│   │   ├── app.js            # Contrôleur d'interface et événements
│   │   ├── ui-redesign.css   # Styles de base du studio
│   │   └── ui-theme-plus.css # Thèmes dynamiques, animations et bouton flottant
│   ├── assets/               # Icônes, bannières et scripts de l'installateur
│   │   ├── icon.ico / .png   # Identité visuelle du studio
│   │   ├── installer.nsh     # Personnalisation NSIS moderne (plein écran, dark mode)
│   │   └── installerBanner.bmp
│   ├── main.js               # Processus principal Electron
│   ├── quest-engine.js       # Moteur autonome d'exécution des quêtes
│   └── qr-auth.js            # Système d'authentification par QR code
├── research/                 # Scripts d'analyse, d'inspection et de tests
│   ├── inspect_heartbeat.js  # Télémétrie et analyse de flux
│   └── test_increment.js
├── dummy-games/              # Utilitaires de simulation de jeux locaux
├── Compiler-Nouveau-Exe.bat  # Script rapide de compilation .exe
├── Lancer-Discord-Orb-Studio.bat # Script de lancement rapide en local
└── README.md
```

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** (version >= 24 recommandée)
- **npm** (inclus avec Node.js)
- Système d'exploitation : **Windows 10 / 11 (64 bits)**

### 1. Installation des dépendances
```bash
cd desktop-app
npm install
```

### 2. Lancer l'application en développement
```bash
npm start
```
*Ou double-cliquez simplement sur `Lancer-Discord-Orb-Studio.bat` à la racine.*

---

## 🏗️ Compilation & Déploiement

### Générer l'installateur Windows (`Setup.exe`)
Pour créer le package d'installation complet autonome sous `dist/` :
```bash
cd desktop-app
npm run build
```
*Ou exécutez `Compiler-Nouveau-Exe.bat`.*

Le fichier d'installation généré est :
`dist/Discord Orb Studio Setup.exe`

---

## 🔒 Confidentialité & Sécurité

- Les identifiants et jetons de session sont chiffrés et stockés localement sur votre ordinateur.
- Aucune donnée personnelle ni télémétrie externe n'est collectée par des tiers.
- Le mode de simulation respecte scrupuleusement la structure des échanges officiels Discord pour assurer une progression sécurisée.

---

## 📄 Licence

Ce projet est distribué sous licence [MIT](LICENSE).
Développé par **Byte & SamChico** (2026).
