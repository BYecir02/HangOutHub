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

- TEAM_MANAGER (equipe lieu)
  - Email: manager.place@hangouthub.dev
  - Mot de passe: Demo12345!
  - Role attendu apres login: USER
  - Role equipe lieu (Code District Rooftop): MANAGER

- TEAM_STAFF (equipe lieu)
  - Email: staff.place@hangouthub.dev
  - Mot de passe: Demo12345!
  - Role attendu apres login: USER
  - Role equipe lieu (Code District Rooftop): STAFF

- TEAM_SCANNER (equipe lieu)
  - Email: scanner.place@hangouthub.dev
  - Mot de passe: Demo12345!
  - Role attendu apres login: USER
  - Role equipe lieu (Code District Rooftop): SCANNER

## Relancer le seed

Depuis le dossier backend:

```bash
npm run prisma:seed
```

Ce seed recree les donnees de demo (profils, lieux, evenements, sorties et posts).
