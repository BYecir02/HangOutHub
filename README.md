# HangOutHub 🌍

Application sociale pour découvrir des événements et organiser des sorties.

Ce dépôt contient deux parties principales :
- **Backend** : API NestJS (`/backend`)
- **Frontend** : Application Mobile React Native / Expo (`/frontend`)

---

## ⚠️ RÈGLES D'OR POUR LE DÉVELOPPEMENT (À LIRE ABSOLUMENT)

Pour éviter que le pipeline CI/CD (GitHub Actions) ne plante à chaque commit, voici les règles strictes à suivre.

### 1. Règle "Constructeur = Test" 🧪
**Si tu modifies le constructeur d'un Service ou d'un Contrôleur** (ex: ajout de `PrismaService`), tu **DOIS** mettre à jour le fichier de test correspondant (`.spec.ts`).

*   **Pourquoi ?** NestJS ne devine pas les dépendances dans les tests unitaires. Il faut les mocker manuellement.
*   **Comment ?** Ajoute un mock dans le tableau `providers` du module de test.

```typescript
// Exemple dans users.service.spec.ts
providers: [
  UsersService,
  {
    provide: PrismaService, // La dépendance manquante
    useValue: { ... }       // Le mock (objet vide ou avec des jest.fn())
  }
]
```

### 2. Règle du Linter (Police du Code) 👮‍♂️
Le projet est configuré en mode strict. Le code "sale" empêchera le déploiement.

*   **Variables inutilisées** : Interdit.
    *   *Solution* : Supprime-la ou préfixe-la avec `_` (ex: `_req`).
    *   *Exemple* : `const { password: _password, ...result } = user;`
*   **Types `any`** : À éviter au maximum.

### 3. Règle des Imports 📦
**N'utilise JAMAIS de chemins absolus** commençant par `src/...` dans le backend.

*   **Mauvais** : `import { User } from 'src/users/entities/user.entity';`
*   **Bon** : `import { User } from '../users/entities/user.entity';`
*   **Pourquoi ?** Jest (le testeur) se perd avec les chemins absolus et fait échouer les tests.

### 4. Le Rituel Avant de Push 🙏
Ne laisse pas GitHub te dire que tu as échoué 5 minutes après. Vérifie en local !

Avant chaque `git push`, lance ces commandes dans le dossier `backend` :

```bash
cd backend
npm run lint   # Vérifie le style
npm run test   # Vérifie que rien n'est cassé
```

Si ça passe ici, ça passera sur GitHub.

---

## 🚀 Documentation Spécifique

- Documentation du Backend (API)
- Documentation du Frontend (Mobile)