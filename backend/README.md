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
