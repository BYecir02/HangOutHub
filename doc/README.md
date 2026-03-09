# HangOutHub

Application sociale pour decouvrir des evenements, des lieux et organiser des sorties.

## Structure

- `backend/` : API NestJS
- `frontend/` : application mobile Expo / React Native
- `doc/` : documentation projet et roadmap MVP

## Regles de base

### Constructeur = test

Si tu modifies le constructeur d un service ou d un controleur, mets aussi a jour le fichier `.spec.ts` correspondant pour mocker les nouvelles dependances.

### Lint et tests avant push

Avant chaque `git push`, verifie au minimum :

```bash
cd backend
npm run lint
npm run test
```

Et cote frontend :

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

### Imports backend

Dans le backend, utilise des imports relatifs. Evite les chemins du type `src/...` qui peuvent casser les tests.

## Seed de demo

Pour remplir rapidement la base avec des comptes, lieux, evenements et posts de demo :

```bash
cd backend
npx prisma db seed
```

Le seed cree notamment :
- un compte `USER`
- un compte `ORGANIZER`
- un compte `PLACE_OWNER`
- des lieux, des evenements, des posts, des likes et des commentaires

### Comptes de demo

- `USER` : `amina@hangouthub.dev` / `Demo12345!`
- `ORGANIZER` : `nova@hangouthub.dev` / `Demo12345!`
- `PLACE_OWNER` : `district@hangouthub.dev` / `Demo12345!`

Ces comptes sont recrees ou remis a jour a chaque execution du seed.

## Docs utiles

- `doc/mvp-roadmap-mai-2026.md`
- `doc/supabase-storage-setup.md`
