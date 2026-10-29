# Discord Orb Studio

## 3.3.11

### Manual update checks
- Added a Check for updates button in Settings, under Application Updates.
- Check GitHub at any time, including after choosing Later for an available update.
- See clear feedback when the application is up to date, a release is being prepared, or the update service is unavailable.
- Available updates still require your confirmation before installation and restart.
- The installed version appears in the title bar, and the update summary appears on the main menu after installation.

## 3.3.10

### Première version officielle
- Interface Windows pour sélectionner les quêtes, gérer les comptes et suivre les sessions en direct.
- Vérification des nouvelles Releases GitHub au démarrage et toutes les 15 minutes, avec confirmation avant installation.
- Affichage du numéro complet de la version installée dans la barre du haut.
- Résumé des nouveautés après une mise à jour, disponible hors ligne et mémorisé une fois lu.

### Fiabilité
- Le relais Windows démarre indépendamment du logiciel et confirme sa présence avant que l'application se ferme.
- L'application redémarre après installation et un journal conserve les étapes du relais de mise à jour.
- Les fenêtres de l'interface et de démarrage utilisent l'isolation standard d'Electron.
- Le téléchargement de chaque installateur est vérifié par sa taille et son empreinte SHA-256.

## 3.3.9

### Nouveautés
- Un résumé des nouveautés s'affiche dans le menu principal après chaque mise à jour.
- Le résumé reprend les notes de la Release GitHub installée et s'affiche une seule fois par version.

### Mises à jour
- Les notes sont conservées avant l'installation pour rester disponibles même sans connexion au redémarrage.
- Un résumé inclus dans le logiciel accompagne les mises à jour installées manuellement.
- La barre du haut affiche le numéro complet de la version installée.

### Confort d'utilisation
- Le résumé se consulte au clavier et se ferme avec Échap ou le bouton de confirmation.
- L'avis bêta laisse la priorité au résumé des nouveautés au démarrage.
- Les fenêtres de l'interface et de démarrage utilisent l'isolation standard d'Electron.
- Le relais de mise à jour confirme son démarrage avant la fermeture du logiciel et conserve un journal pour le redémarrage après installation.
