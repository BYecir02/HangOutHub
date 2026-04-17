# HangOutHub - Backend API 🚀

Bienvenue sur le backend de **HangOutHub**, l'API RESTful qui gère les données de l'application mobile (Utilisateurs, Événements, Lieux, etc.).

Ce projet est construit avec :
* **NestJS** (Framework Node.js)
* **Prisma** (ORM)
* **PostgreSQL** (Base de données)

## 🚀 Prérequis

Avant de commencer, assurez-vous d'avoir installé :
- [Node.js](https://nodejs.org/) (Version LTS)
- [PostgreSQL](https://www.postgresql.org/) (ou un accès à une instance Postgres)
- [Ngrok](https://ngrok.com/) (Optionnel : pour tester sur mobile via 4G)

## 🛠️ Installation

1.  **Accéder au dossier backend** :
    ```bash
    cd backend
    ```

2.  **Installer les dépendances** :
    ```bash
    npm install
    ```

## ⚙️ Configuration (.env)

1.  Dupliquez le fichier `.env.example` (s'il existe) ou créez un fichier `.env` à la racine du dossier `backend`.
2.  Configurez la connexion à la base de données :

```dotenv
DATABASE_URL="postgresql://utilisateur:motdepasse@localhost:5432/hangouthub?schema=public"
```

## 🗄️ Base de Données (Prisma)

Une fois le `.env` configuré :

1.  **Créer les tables** (Migration) :
    ```bash
    npx prisma migrate dev
    ```

2.  **Remplir la base de données** (Seeding : Villes, Catégories, Rôles) :
    ```bash
    npx prisma db seed
    ```

## 🌍 Lancement du Serveur

### 1. Mode Développement (Local)
```bash
npm run start:dev
```
Le serveur écoute sur `http://localhost:3000`.

### 2. Accès à Distance (Ngrok)
Pour connecter l'application mobile (Frontend) depuis un téléphone physique ou un réseau différent :

1.  Lancez le serveur backend (`npm run start:dev`).
2.  Dans un **nouveau terminal**, lancez :
    ```bash
    npx ngrok http 3000
    ```
3.  Copiez l'URL HTTPS (ex: `https://xxxx.ngrok-free.app`) et collez-la dans le fichier `.env` du **Frontend**.

## 🧪 Tests

```bash
npm run test      # Tests unitaires
npm run test:e2e  # Tests bout-en-bout
```

## 🚀 Déploiement sur Render

Pour ce projet, Render est adapté au backend NestJS. Le frontend peut rester sur Vercel, tandis que l'API tourne sur Render.

### 1. Créer le service

1. Crée un **Web Service** sur Render.
2. Connecte le dépôt GitHub du projet.
3. Mets le **Root Directory** sur `backend`.
4. Choisis **Node** comme runtime.

### 2. Commandes Render

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Health Check Path**: `/api/v1`

Le backend Nest écoute déjà sur la variable `PORT` fournie par Render dans [src/main.ts](src/main.ts).

### 3. Variables d'environnement

Configure les variables suivantes dans Render:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_ACCESS_TOKEN_TTL_SECONDS` si tu veux ajuster la durée du token access
- `JWT_REFRESH_TOKEN_TTL_SECONDS` si tu veux ajuster la durée du refresh token
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `EMAIL_VERIFICATION_OTP_TTL_MINUTES` si besoin
- `PASSWORD_RESET_OTP_TTL_MINUTES` si besoin
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CORS_ORIGINS`

Le backend utilise Supabase pour le stockage média via [src/storage/storage.service.ts](src/storage/storage.service.ts), donc garde ces variables si tu continues avec Supabase Storage.

### 4. CORS

Dans `CORS_ORIGINS`, ajoute les domaines du frontend et du backoffice en production. Par exemple:

```dotenv
CORS_ORIGINS=https://ton-frontend.vercel.app,https://ton-backoffice.vercel.app
```

Le fichier [src/cors-options.ts](src/cors-options.ts) autorise déjà `localhost` et les domaines listés ici, mais Render doit recevoir les vrais domaines de prod.

### 5. Migrations Prisma

Avant ou juste après le premier déploiement, lance:

```bash
npx prisma migrate deploy
```

Render ne doit pas utiliser `migrate dev` en production.

### 6. Vérification

Après le déploiement, teste en priorité:

- `GET /api/v1`
- `GET /api/v1/cities`
- `GET /api/v1/categories`
- `POST /api/v1/auth/login`

Si ces routes répondent, le backend est correctement déployé.
