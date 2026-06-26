# HangOutHub · Admin

Back-office d'administration de HangOutHub : **modération et validation** (organisateurs,
revendications de lieux, signalements) + gestion des utilisateurs. Se connecte au même
backend NestJS (`/api/v1`) avec l'authentification JWT existante et exige le rôle `ADMIN`.

## Stack

- **Vite + React 19 + TypeScript**
- **TanStack Query** (state serveur : cache, mutations, invalidation)
- **React Router** (routing + gardes)
- **Tailwind CSS** — thème clair/sombre via tokens CSS (`darkMode: 'class'`)
- **react-hook-form + zod** (formulaires validés)
- **axios** (client API + refresh token automatique)
- **lucide-react** (icônes)

## Mise en route

```bash
cd hangouthub-admin
cp .env.example .env      # ajuste VITE_API_URL si besoin
npm install
npm run dev               # http://localhost:5174
```

Le backend HangOutHub doit tourner (par défaut `http://localhost:3000`).
Connecte-toi avec un compte dont le rôle est `ADMIN`.

### Scripts

| Script              | Rôle                              |
| ------------------- | --------------------------------- |
| `npm run dev`       | Serveur de dev (HMR)              |
| `npm run build`     | Build de production (`dist/`)     |
| `npm run preview`   | Prévisualise le build             |
| `npm run typecheck` | Vérifie les types                 |

## Architecture (feature-first)

```
src/
  app/         → App (providers) + router
  config/      → env typé, navigation
  lib/         → api (axios + refresh, tokens), query, theme, format, media, utils
  components/
    ui/        → design system (Button, Card, Table, Badge, StatusBadge, états…)
    layout/    → AppShell, Sidebar, Topbar, ThemeToggle
    common/    → composants transverses (ComingSoon…)
  features/    → 1 dossier par domaine, autonome :
    <feature>/
      <feature>.api.ts   → appels backend typés
      use<Feature>.ts    → hooks React Query (query + mutations)
      <Feature>Page.tsx  → écran
```

### Principes

- **Séparation nette** données (`*.api.ts`) / état serveur (`use*.ts`) / UI (`*Page.tsx`).
- **Design system tokenisé** : les couleurs viennent de variables CSS (`src/index.css`),
  donc le thème clair/sombre et le rebranding se font à un seul endroit.
- **Auth centralisée** : `lib/api/client.ts` gère le refresh token et la déconnexion
  forcée ; `features/auth` gère la session et la garde de rôle `ADMIN`.

## Ajouter une nouvelle file/section

1. Crée `src/features/maFeature/maFeature.api.ts` (appels backend typés).
2. Crée `src/features/maFeature/useMaFeature.ts` (hooks Query/Mutation).
3. Crée `src/features/maFeature/MaFeaturePage.tsx` (réutilise `components/ui`).
4. Ajoute la route dans `src/app/router.tsx` et l'entrée dans `src/config/nav.ts`.

## Endpoints backend utilisés

| Domaine        | Méthode & route                              |
| -------------- | -------------------------------------------- |
| Auth           | `POST /auth/login`, `POST /auth/refresh`     |
| Organisateurs  | `GET /users/admin/organizers`, `PATCH /users/organizers/:id/status` |
| Revendications | `GET /places/admin/claims`, `PATCH /places/admin/claims/:id/status` |
| Signalements   | `GET /reports/admin`, `PATCH /reports/:id`   |
| Utilisateurs   | `GET /users/admin`, `DELETE /users/:id`      |

## À compléter (backend)

- **Modération des lieux** (`/places`) : la page existe (placeholder) mais attend un
  endpoint admin « lister les lieux `moderationStatus = PENDING` » + mise à jour du statut.
- **Suspension d'utilisateur** : prévoir un endpoint dédié (`isSuspended`) ; pour l'instant
  la gestion des users se limite à la recherche et à la suppression.
