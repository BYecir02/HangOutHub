
# HangOutHub - Mobile Frontend 🌍

Bienvenue sur le frontend mobile de **HangOutHub**, l'application sociale ultime pour découvrir des événements, organiser des sorties et rencontrer du monde autour de chez vous.

Ce projet est construit avec :
* **React Native** & **Expo**
* **TypeScript**
* **NativeWind** (Tailwind CSS)

## 🚀 Prérequis

Avant de commencer, assurez-vous d'avoir installé :
- [Node.js](https://nodejs.org/) (Version LTS recommandée)
- **Expo Go** sur votre téléphone (disponible sur Google Play ou App Store)

## 🛠️ Installation

1.  **Accéder au dossier frontend** :
    ```bash
    cd frontend
    ```

2.  **Installer les dépendances** :
    ```bash
    npm install
    ```

## ⚙️ Configuration (.env)

Pour que l'application puisse communiquer avec le backend (NestJS), vous devez configurer l'URL de l'API.

1.  Créez un fichier `.env` à la racine du dossier `frontend`.
2.  Ajoutez la variable `EXPO_PUBLIC_API_URL` selon votre situation :

**Option A : Développement Local (Même Wi-Fi)**
Utilisez l'adresse IP locale de votre ordinateur.
*(Astuce : tapez `ipconfig` sous Windows ou `ifconfig` sous Mac/Linux pour la trouver)*.
```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.XX:3000

```

**Option B : Développement à Distance (Ngrok)**
Si vous testez sur un réseau différent (4G, etc.), utilisez l'URL fournie par Ngrok.

```dotenv
EXPO_PUBLIC_API_URL=[https://votre-id-ngrok.ngrok-free.app](https://votre-id-ngrok.ngrok-free.app)

```

---

## 🌍 Lancement (Backend & Frontend)

Pour que l'application fonctionne, le backend et le frontend doivent tourner en parallèle.

### 1. Démarrer le Backend

Dans un terminal séparé, allez dans le dossier `backend` :

```bash
# Lancement classique
npm run start:dev

# OU (si besoin d'accès à distance)
npx ngrok http 3000

```

### 2. Démarrer le Frontend (Application Mobile)

Dans le dossier `frontend` :

```bash
npx expo start

```

> **Astuce :** Si vous utilisez Ngrok ou avez des soucis de connexion, forcez le mode tunnel :
> ```bash
> npx expo start --tunnel
> 
> ```
> 
> 

### 3. Ouvrir sur votre téléphone

Scannez le **QR code** affiché dans le terminal avec :

* L'application **Expo Go** (Android).
* L'application **Appareil Photo** (iOS).

---

## 📂 Structure du projet

Voici un aperçu de l'organisation des fichiers :

```text
frontend/
├── app/                  # Écrans et Navigation (Expo Router)
│   ├── (tabs)/           # Écrans principaux (Accueil, Carte, Social, Profil)
│   ├── event/            # Pages de détails d'événements
│   └── _layout.tsx       # Configuration globale du layout
├── components/           # Composants réutilisables
│   ├── ui/               # Éléments d'interface (Cartes, Boutons, etc.)
│   └── ...
├── services/             # Gestion des appels API (Axios)
├── assets/               # Images et polices
└── ...

```

---
