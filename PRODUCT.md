# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Les personnes qui utilisent Discord Orb Studio pour consulter et traiter des quêtes Discord. L’usage de l’application de bureau et la priorité donnée aux quêtes ont été confirmés par le demandeur; le profil plus précis du public est déduit des écrans existants.

## Product Purpose

D’après le code existant, l’application regroupe la consultation des quêtes, leur suivi et leur exécution, la gestion des récompenses obtenues, des comptes et des préférences dans un client de bureau.

## Positioning

Compagnon de bureau centré sur le parcours des quêtes : choisir une quête, suivre son état, puis retrouver les récompenses dans le même espace. Cette formulation décrit les fonctions visibles, sans revendiquer de relation officielle avec Discord.

## Operating Context

Application Electron sur ordinateur. L’écran Quêtes doit être le point d’entrée et permettre de voir et traiter les quêtes en priorité. Les autres surfaces visibles comprennent le suivi en direct, le coffre de récompenses, les comptes et les réglages.

## Capabilities and Constraints

- Le demandeur veut une refonte visuelle complète des interfaces, sans modifier le fonctionnement du système de l’application.
- Préserver les flux, contrôles, données, intégrations, sessions, stockage et comportements existants; ne pas changer la logique métier.
- Les interfaces exposent actuellement les quêtes, l’exécution et son suivi, les récompenses, les comptes et les réglages. Les détails sont vérifiables dans `desktop-app/src/index.html` et `desktop-app/src/app.js`.
- Le contexte confirmé n’autorise pas à ajouter de nouvelles fonctions ni à supprimer des comportements existants.

## Brand Commitments

Nom « Discord Orb Studio » et logo d’orbe conservés. Direction visuelle demandée : sombre, premium et orbitale. Cette direction s’applique à l’application, au lancement/mises à jour et à l’installateur.

## Evidence on Hand

Les écrans et comportements actuels sont présents dans `desktop-app/src/index.html`, `desktop-app/src/app.js`, `desktop-app/src/style.css` et `desktop-app/main.js`. Ne pas inventer de métriques, de témoignages ni de disponibilité de mises à jour qui ne soient pas vérifiables.

## Product Principles

1. Les quêtes sont immédiatement visibles et prioritaires.
2. Les états et prochaines actions restent explicites.
3. La refonte ne casse ni ne modifie les flux existants.
4. Les récompenses, comptes et réglages restent accessibles sans détour inutile.
5. Les erreurs et limites techniques sont présentées clairement.
