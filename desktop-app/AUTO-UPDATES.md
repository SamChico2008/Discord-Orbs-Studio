# Mises a jour au lancement

Au démarrage depuis les sources (`npm start`), une fenêtre affiche « Recherche de mises à jour… ». Si une nouvelle version de Node.js LTS, d'Electron ou d'un Next.js déjà déclaré est disponible, l'application demande confirmation avant l'installation. « Plus tard » laisse les versions inchangées. Après installation, l'application redémarre.

Next.js n'est actuellement déclaré dans aucun des manifestes racine, `desktop-app` ou `discord-quest-bot`; le contrôle ne l'ajoute pas. Node.js est proposé via `winget` uniquement sous Windows. Les vérifications sont non bloquantes en cas d'erreur réseau.

Les exécutables NSIS/portables ne disposent pas encore d'un flux hébergé de mises à jour de l'application. Dans ces versions, l'écran signale que les mises à jour automatiques ne sont pas configurées; il faut publier les mises à jour de l'application sur un serveur/feed avant qu'un exécutable installé puisse les télécharger.
