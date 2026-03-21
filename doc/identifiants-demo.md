# Identifiants de demo HangOutHub

Ces comptes sont crees par le seed backend pour tester la connexion selon chaque type de profil.

## Comptes

- USER
  - Email: amina@hangouthub.dev
  - Mot de passe: Demo12345!
  - Role attendu apres login: USER

- ORGANIZER
  - Email: nova@hangouthub.dev
  - Mot de passe: Demo12345!
  - Role attendu apres login: ORGANIZER

- PLACE_OWNER
  - Email: district@hangouthub.dev
  - Mot de passe: Demo12345!
  - Role attendu apres login: PLACE_OWNER

## Relancer le seed

Depuis le dossier backend:

```bash
npm run prisma:seed
```

Ce seed recree les donnees de demo (profils, lieux, evenements, sorties et posts).
