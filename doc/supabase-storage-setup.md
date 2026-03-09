# Supabase Storage Setup

Ce projet garde `NestJS + Prisma + PostgreSQL` pour la logique metier.
Supabase est utilise uniquement pour stocker les fichiers medias du MVP.

## Bucket a creer

Oui: cree un bucket sur Supabase.

Recommandation MVP:
- bucket unique: `hangouthub-media`
- visibilite: `public`

Le code backend utilise `hangouthub-media` par defaut si `SUPABASE_STORAGE_BUCKET`
est absent. Si tu choisis un autre nom, renseigne-le dans les variables
d environnement.

## Structure recommandee

Garde un seul bucket avec des dossiers logiques:
- `profiles/`
- `posts/`
- `places/`
- `events/`

Le backend genere ensuite des chemins uniques dans chaque dossier.

## Variables d environnement backend

Ajoute dans `backend/.env`:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=hangouthub-media
```

## Comment ca marche dans le projet

- avatars et covers utilisateur: dossier `profiles/`
- images de posts: dossier `posts/`
- covers et galeries des lieux: dossier `places/`
- covers et galeries des evenements: dossier `events/`

Les tables en base ne stockent que les URLs finales des medias.

## Important

- utilise la `SERVICE_ROLE_KEY` uniquement cote backend
- ne mets jamais cette cle dans le frontend Expo
- pour le MVP, un bucket public suffit
- plus tard, si tu veux proteger certains fichiers, tu pourras passer certains
  buckets ou chemins en prives et servir des URLs signees
