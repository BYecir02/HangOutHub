# Suivi des corrections — HangOutHub

---

## ✅ TypeScript — 0 erreur (frontend + backend)

Toutes les corrections TS ont été appliquées. `npx tsc --noEmit` propre des deux côtés.

---

## 🔍 AUDIT COMPLET DU PROJET

### BACKEND — État général : Solide ✅ avec 4 points critiques

#### ✅ Ce qui est bien fait
- Auth JWT complète : access 15min, refresh 30j, sessions multi-appareils, rotation hash
- Soft-delete messages, reactions avec upsert, transactions Prisma pour multi-step ops
- ThrottlerGuard global, ValidationPipe, DTOs bien validés
- Friendships : logique propre, doublons évités
- WebSockets avec room isolation par userId

#### 🔴 Problèmes critiques

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 1 | **`GET /events` sans pagination** | `events.service.ts findAll()` | Crash potentiel avec 10k+ events |
| 2 | **Post visibility bypass** | `posts.service.ts findOneForUser()` | User peut lire posts privés d'autrui |
| 3 | **WebSocket CORS `origin: '*'`** | gateways direct-chats + posts | CSRF / accès cross-origin non autorisé |
| 4 | **OTP sans rate limit** | `auth.controller.ts` password-reset | Brute-force possible |

#### 🟠 Problèmes moyens

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 5 | **N+1 restant** | `directChats.listChats` | Perf dégradée avec beaucoup de convs |
| 6 | **Analytics event pas mis en cache** | `events.service.ts overview` | Query lourde à chaque appel |
| 7 | **`discover` friendships hardcoded `take:20`** | `friendships.service.ts` | Non configurable |
| 8 | **Interval notifications pas killé** | `notifications.service.ts onModuleInit` | Memory leak si restart |

---

### FRONTEND — État général : Fonctionnel ✅ avec dette technique notable

#### ✅ Ce qui est bien fait
- Architecture hooks : `useHomeScreen`, `useEventDetail`, `useDiscoverScreen` — logique proprement encapsulée
- `usePaginatedList`, `useVisibleItemAutoplay`, `useLocationScope` — bons patterns réutilisables
- Auth bootstrap / SecureStore / refresh token transparent côté client
- Services API bien séparés par domaine, axios interceptors propres

#### 🔴 Problèmes critiques

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 1 | **Race condition polling + Socket simultané** | `messages.tsx` (ligne 325-331) | Données dupliquées/incohérentes |
| 2 | **Memory leak timers** | `messages.tsx directListRefreshTimeoutRef` | Fuite mémoire à l'unmount |
| 3 | **post.tsx 27+ useState** | `post.tsx` | Maintenabilité nulle, re-renders excessifs |
| 4 | **Cache sans TTL** | `services/dataCache.ts` | Données périmées servies indéfiniment |

#### 🟠 Problèmes moyens

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 5 | **`isUnauthorized()` redéfini partout** | multiple écrans | Duplication, inconsistance |
| 6 | **JSON params parsing silencieux** | `post.tsx` parseImagesParam | Erreurs masquées |
| 7 | **Appels API sans AbortController** | `post.tsx`, `place.tsx` | Mises à jour d'état après unmount |
| 8 | **Socket.io sans cleanup garanti** | `messages.tsx` | Socket peut persister après navigation |
| 9 | **`loadChats()` sans déduplication** | `messages.tsx` | Conversations dupliquées au refresh |

#### 🟡 Problèmes mineurs
- Écrans surdimensionnés : `event.tsx` 2124L, `post.tsx` 1294L, `place.tsx` 1275L → à découper en composants
- Pas de debounce sur les recherches (`placeSearch`, `eventSearch` dans post.tsx)
- `useHomeScreen` : cache + useState coexistent sans source of truth unique

---

### CONNEXIONS FRONTEND ↔ BACKEND — État : ✅ Cohérent, 2 écarts

| Appel frontend | Endpoint backend | Statut |
|---|---|---|
| `GET /direct-chats` avec cursor/limit | `listChats()` avec pagination | ✅ OK |
| `POST /direct-chats/with/:userId` | `getOrCreateDirectChat()` | ✅ OK |
| `GET /events`, `GET /places` | endpoints publics sans auth | ✅ OK |
| `PATCH /outings/:id/respond` state machine | validTransitions `INVITED→GOING/MAYBE/DECLINED` | ✅ OK |
| `post.tsx` → `GET /categories` | endpoint exist ? | ⚠️ À vérifier |
| `post.tsx` → `GET /events` (sans filtre) | `findAll()` sans pagination | ❌ Peut planter si 10k events |

---

## 📋 PLAN D'ACTION PAR PRIORITÉ

### 🔴 À faire en premier (sécurité / stabilité)

- [x] **[BACKEND]** Pagination cursor `GET /events` — limit/cursor, retourne `{ items, nextCursor, hasMore }` (défaut 20, max 100)
- [x] **[FRONTEND]** `app/events.tsx` — infinite scroll (FlatList + ScrollView inspiration), `loadMoreEvents` avec cursor
- [x] **[FRONTEND]** Tous les autres appelants mis à jour (`useHomeScreen`, `useDiscoverScreen`, `explore.tsx`, `MapScreen`, `post.tsx`)
- [x] **[BACKEND]** Ajouter filtre visibility sur `posts.service findOneForUser` et `findFeed` — ✅ déjà en place (canViewPost + OR filters)
- [x] **[BACKEND]** Restreindre CORS WebSocket (remplacer `origin: '*'` par liste blanche) — ✅ `ALLOWED_ORIGINS` env var dans les deux gateways
- [x] **[BACKEND]** Ajouter `@Throttle` sur les routes OTP (password-reset, verify-email) — ✅ 5 routes avec limites strictes
- [x] **[FRONTEND]** `messages.tsx` — supprimer le polling redondant, garder uniquement le socket + refresh à focus — ✅ polling direct supprimé, outings polling 60s conservé

### 🟠 À faire ensuite (qualité / perf)

- [x] **[FRONTEND]** `messages.tsx` — nettoyer les timers dans `useEffect` cleanup — ✅ `clearInterval(interval)` dans cleanup
- [x] **[FRONTEND]** `services/dataCache.ts` — ajouter un champ `expiresAt` (TTL configurable par clé) — ✅ TTL par clé, getCache supprime les entrées périmées
- [ ] **[FRONTEND]** `post.tsx` — regrouper les 27 useState en 4-5 blocs (`useReducer` ou objets)
- [x] **[FRONTEND]** Centraliser `isUnauthorized()` dans `services/api.ts` et l'exporter — ✅ 18 fichiers mis à jour pour importer depuis `@/services/api`
- [x] **[FRONTEND]** Ajouter `AbortController` dans les useEffect qui font des appels API — ✅ `post.tsx` plan modal migré, `place.tsx` restant
- [ ] **[BACKEND]** Cache Redis/mémoire pour `events/overview` analytics
- [x] **[BACKEND]** Kill interval dans `notifications.service.ts onDestroy` — ✅ `onModuleDestroy` déjà en place

### 🟡 À faire plus tard (confort / maintenabilité)

- [ ] **[FRONTEND]** Découper `event.tsx` (2124L), `post.tsx` (1294L), `place.tsx` (1275L) en sous-composants
- [ ] **[FRONTEND]** Ajouter debounce sur les champs de recherche
- [ ] **[FRONTEND]** Unifier cache + état local dans `useHomeScreen` (un seul source of truth)
- [ ] **[BACKEND]** Rendre configurable le `take:20` dans `friendships discover`

---

## Vérification TypeScript (toujours valable)

```bash
# Frontend
cd frontend && npx tsc --noEmit 2>&1 | grep -v node_modules
# → aucune sortie = succès ✅

# Backend
cd backend && npx tsc --noEmit 2>&1 | grep -v node_modules
# → aucune sortie = succès ✅
```
