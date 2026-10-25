# Orb Studio — Orbital library

## Direction

Un studio de bureau graphite pour parcourir des quêtes Discord, suivre une session et conserver ses récompenses. La navigation reste calme ; les visuels des jeux et l’orbe portent l’identité. La couleur pervenche souligne les actions et la sélection. Une touche pêche accompagne les récompenses.

## Références étudiées

- [Linear : navigation et préférences](https://linear.app/changelog/2024-12-18-personalized-sidebar) — hiérarchie de navigation, groupes lisibles, réglages structurés.
- [Raycast : nouvelle interface](https://manual.raycast.com/new-in-v2) — commandes compactes, contrôles précis, densité maîtrisée.
- [Arc](https://arc.net/) — composition de marque et relation entre rail latéral et espace de travail. La référence porte sur le langage visuel, pas sur ses fonctionnalités.

Ces références ont été interprétées dans les composants locaux. Aucun code, logo ou visuel de ces produits n’est intégré à l’application.

## Système visuel

| Rôle | Valeur |
| --- | --- |
| Fond | `#171719` |
| Espace de travail | `#1c1c1f` |
| Surface | `#212124` |
| Contour | `#333338` |
| Texte | `#f4f2ee` |
| Secondaire | `#a6a5ad` |
| Accent pervenche | `#b8adf2` |
| Réussite / sauge | `#a8cbb4` |
| Récompense / pêche | `#e2b69b` |
| Erreur | `#ed9eaa` |

Typographie locale : Segoe UI Variable Text pour les contrôles, Segoe UI Variable Display pour les titres, Segoe UI en repli. Aucun téléchargement de police au démarrage. Les chiffres de progression utilisent un espacement tabulaire.

Les thèmes sauge, pêche et rose modifient uniquement les variables d’accent. Les fenêtres, contrôles, cartes, badges et états suivent les mêmes règles. Animations limitées aux chargements et aux retours de session ; préférence de mouvement réduit respectée.

## Composition

```text
┌ Barre de fenêtre / outils rapides ───────────────────────┐
│ Orb Studio   │ Chemin de navigation                     │
│              │ Titre et contexte                       │
│ Votre espace │ Résumé des quêtes                       │
│ Quêtes       │ Recherche / tri / actions               │
│ En direct    │ Filtres                                 │
│ Récompenses  │ Visuels des jeux / progression / actions │
│              │                                         │
│ Personnel    │                                         │
│ Comptes      │                                         │
│ Préférences  │                                         │
│ Profil       │                                         │
└──────────────┴─────────────────────────────────────────┘
```

La bibliothèque affiche trois colonnes à 1140 px et deux à 980 px. Le suivi de session devient horizontal quand les deux panneaux ne tiennent plus côte à côte. Les préférences conservent leur action d’enregistrement au bord inférieur de l’espace défilant. Le rail masque son illustration décorative sur les petites hauteurs pour garder le compte accessible.

## Surfaces livrées

- Bibliothèque de quêtes : recherche, tri, sélection, modes, filtres, progression, chargement, absence de connexion, liste vide et fin de toutes les quêtes.
- Suivi en direct : visualiseur orbital, progression, métriques, commandes et journal filtrable.
- Récompenses : collection en tickets, recherche, copie, export, utilisation, suppression et confirmation intégrée.
- Comptes : profil actif, sessions enregistrées, panneau de profil, connexion QR, expiration, confirmation mobile, résultats locaux et connexion manuelle.
- Préférences : trois profils, paramètres, notifications, quatre accents, enregistrement.
- Fenêtres de détails, coffre et notifications discrètes.
- Démarrage : huit états, dont mises à jour disponibles, installation, hors connexion, échec et redémarrage ; fenêtre 660 × 440.
- Installation Windows et désinstallation : accueil, dossier, progression et fin avec couleurs, textes et illustrations cohérents. Les contrôles système conservent leur comportement Windows.

## Mise en œuvre

`src/style.css` contient les variables et les composants de base. `src/ui-redesign.css` contient les compositions de l’application. `src/interface.js` ajoute les étiquettes d’accessibilité, la navigation clavier, la gestion du focus et la confirmation du coffre. Les identifiants des contrôles et les appels IPC existants sont conservés ; le doublon d’identifiant du bouton de copie du profil est corrigé.

`generate-installer-art.ps1` régénère les illustrations BMP attendues par NSIS et leurs aperçus PNG. `assets/installer.nsh` personnalise l’assistant réel. Les instantanés de contrôle utilisent des quêtes et comptes fictifs uniquement dans `work/interface-refonte/qa`, jamais dans les sources de production.
