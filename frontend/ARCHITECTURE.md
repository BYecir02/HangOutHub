# HangOutHub — Frontend Architecture & Reorganization Guide

> **Ce document est la référence vivante du projet frontend.**  
> Il doit être mis à jour à chaque session de travail, à chaque fichier migré, à chaque décision d'architecture.  
> Il est conçu pour être lisible par Claude, GitHub Copilot, ou tout autre assistant IA reprenant le projet.

---

## ⚡ PROCHAINES TÂCHES (lire en premier)

> **Pour GitHub Copilot / Claude qui reprend le projet** : commence ici.  
> `cd frontend && npx tsc --noEmit` doit rendre 0 erreur avant et après chaque modification.

### Tâches en attente (dans cet ordre)

| # | Priorité | Tâche | Fichier cible | Détail |
|---|----------|-------|---------------|--------|
| 1 | 🟠 Moyen | Refactor `post.tsx` — 30 useState → 4 groupes d'objets | `app/post.tsx` | Voir §13 "Refactor post.tsx" |
| 2 | 🟠 Moyen | Cache en mémoire pour analytics `events/overview` | `backend/src/events/events.service.ts` | Query lourde appelée sans cache |
| 3 | 🟡 Faible | Debounce recherche `placeSearch` et `eventSearch` | `app/post.tsx` (300ms) | `setTimeout` + `clearTimeout` dans handler |
| 4 | 🟡 Faible | Unifier cache + état local dans `useHomeScreen` | `hooks/useHomeScreen.ts` | `getCache('homeEvents')` et `setEvents` sont deux sources différentes |
| 5 | 🔵 Archi | **Phase 3 migration** — extraire les 6 gros écrans vers `features/*/screens/` | Voir §5 Phase 3 | Commencer par `admin/place-claims.tsx` (plus simple, isolé) |

### Ce qui a DÉJÀ été fait (ne pas refaire)

- ✅ TypeScript 0 erreur frontend + backend
- ✅ Pagination cursor `GET /events` (limit=20, cursor=ISO date)
- ✅ Infinite scroll `app/events.tsx`
- ✅ WebSocket CORS (`ALLOWED_ORIGINS` env var)
- ✅ OTP rate limit (5 req / 15 min sur les routes password-reset)
- ✅ `isUnauthorizedError` centralisé dans `services/api.ts` (18 fichiers mis à jour)
- ✅ `dataCache.ts` — TTL par clé
- ✅ `messages.tsx` — polling direct supprimé (socket suffit), outings polling 60s conservé
- ✅ `post.tsx` — AbortController dans le useEffect plan modal
- ✅ `place.tsx` — AbortController dans `loadCategories`, `availableTags` wrappé dans `useMemo`
- ✅ **Phase 1 migration** — `services/` restructuré en 9 sous-dossiers avec stubs rétro-compatibles (TypeScript 0 erreur)
- ✅ **Phase 2 migration** — `components/` → `features/` + `shared/ui/` avec stubs rétro-compatibles (TypeScript 0 erreur)

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Stack technique](#2-stack-technique)
3. [Commandes essentielles](#3-commandes-essentielles)
4. [Architecture cible — Feature-Sliced Design](#4-architecture-cible--feature-sliced-design)
5. [Plan de migration — 4 phases](#5-plan-de-migration--4-phases)
6. [Inventaire complet — état ACTUEL](#6-inventaire-complet--état-actuel)
7. [Carte de navigation (User Flows)](#7-carte-de-navigation-user-flows)
8. [Registre des écrans](#8-registre-des-écrans)
9. [Registre des composants](#9-registre-des-composants)
10. [Registre des hooks](#10-registre-des-hooks)
11. [Registre des services](#11-registre-des-services)
12. [Conventions de code](#12-conventions-de-code)
13. [Patterns de state management](#13-patterns-de-state-management)
14. [Suivi de migration — progression](#14-suivi-de-migration--progression)

---

## 1. Vue d'ensemble du projet

HangOutHub est une application mobile React Native (iOS + Android) permettant de :
- Découvrir des **événements** et des **lieux** autour de soi
- Créer et gérer des **sorties** avec ses amis
- Interagir via un **fil social** (posts, stories, commentaires)
- **Chatter** en direct (DM 1-on-1 + chat de groupe par sortie)
- Gérer un **espace organisateur** (vente de billets, scan QR, analytics)

### Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `USER` | Tabs principales, social, messaging, réservations |
| `ORGANIZER` | + Espace organisateur (events, dashboard, scanner) |
| `PLACE_OWNER` | + Gestion de lieux, équipe, place-team |
| `ADMIN` | + Place claims, modération globale |

L'app est en **français** (langue principale). Les clés i18n sont dans `services/i18n.ts`.

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | React Native 0.76+ via Expo SDK 52 |
| Routing | Expo Router v4 (file-based, stack/tab/modal) |
| Styling | NativeWind (TailwindCSS pour React Native) + classes `className` |
| State | `useState` / `useReducer` locaux — pas de store global (Redux/Zustand) |
| HTTP | Axios via `services/api.ts` avec intercepteur de refresh token |
| Realtime | Socket.io (direct-chat, posts feed) |
| Cache | In-memory `services/dataCache.ts` avec TTL configurable |
| Auth | JWT Access (15min) + Refresh (30j) stockés en SecureStore |
| Médias | `expo-image-picker`, `expo-file-system`, upload multipart |
| Maps | `react-native-maps` (iOS/Android natif) |
| QR | `expo-camera` / `expo-barcode-scanner` |
| Tests | Jest + React Native Testing Library |
| Lint | ESLint avec règles strictes TypeScript |
| CI/CD | EAS Build (preview + production) |

---

## 3. Commandes essentielles

```bash
# Développement local (backend LAN)
cd frontend && npm run start:lan:auto

# Vérification TypeScript (0 erreur obligatoire)
cd frontend && npx tsc --noEmit 2>&1 | grep -v node_modules

# Tests unitaires
cd frontend && npm test

# OTA update vers testeurs Android (changements JS/TS/UI)
cd frontend && npm run eas:update:preview

# Rebuild natif (nouveau plugin Expo, changement app.json, dépendance native)
cd frontend && npm run eas:build:preview
```

> **Règle absolue** : `npx tsc --noEmit` doit retourner 0 erreur avant tout commit.

---

## 4. Architecture cible — Feature-Sliced Design

### Principe

> **Un domaine métier = un dossier auto-suffisant.**  
> Chaque feature contient ses propres composants, hooks, services et types.  
> `app/` ne contient QUE du routing (wrappers légers de 20–80 lignes max).

### Arborescence cible

```
frontend/
│
├── app/                          # Expo Router — ROUTING UNIQUEMENT
│   ├── _layout.tsx               # Root Stack + auth bootstrap
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar glassmorphism
│   │   ├── home.tsx              # → importe HomeScreen depuis features/
│   │   ├── social.tsx            # → importe SocialScreen
│   │   ├── map.tsx / .native / .web
│   │   ├── create.tsx
│   │   └── profile.tsx
│   ├── organizer/
│   │   ├── _layout.tsx           # Role-based workspace tabs
│   │   └── *.tsx                 # Thin wrappers (20-50 lignes)
│   ├── event/[id].tsx            # → EventDetailScreen
│   ├── place/[id].tsx            # → PlaceDetailScreen
│   ├── direct-chat/[id].tsx      # → DirectChatScreen
│   └── *.tsx                     # Tous les autres écrans (thin wrappers)
│
├── features/                     # ← CŒUR DU PROJET (à créer)
│   │
│   ├── auth/
│   │   ├── components/           # AuthBrandBadge, AuthHeroLayout, AuthTextField, RoleOptionCard
│   │   ├── hooks/                # useAuthBootstrap (extrait de _layout.tsx)
│   │   ├── services/             # user-session.ts, app-preferences.ts
│   │   └── types.ts
│   │
│   ├── events/
│   │   ├── components/           # EventCard, EventInspirationCard, EventDetailContent,
│   │   │                         # EventDetailHero, EventDetailInfoTab, EventDetailTicketsTab,
│   │   │                         # EventDetailGalleryTab, EventPublicationsPanel, EventFormWizard
│   │   ├── hooks/                # useEventDetail.ts
│   │   ├── screens/              # EventCreateScreen (ex-app/event.tsx 2121L)
│   │   │                         # EventEditScreen (ex-app/event-edit/[id].tsx 1388L)
│   │   ├── services/             # event-bookings.ts, event-collaborators.ts, event-revisions.ts
│   │   └── types.ts
│   │
│   ├── places/
│   │   ├── components/           # PlaceCard, PlaceInspirationCard, PlaceDetailContent,
│   │   │                         # PlaceDetailHero, PlaceDetailInfoTab, PlaceDetailEventsTab,
│   │   │                         # PlaceDetailReviewsTab, PlaceGalleryModal, PlaceReviewModal,
│   │   │                         # PlacePublicationCard, PlacePublicationsMasonry,
│   │   │                         # PlacePublicationsPanel, PlacePublicationsPreviewGrid,
│   │   │                         # PlaceSaveButton, PlaceCoverFallback
│   │   ├── hooks/                # usePlaceDetail.ts
│   │   ├── screens/              # PlaceCreateScreen (ex-app/place.tsx 1275L)
│   │   ├── services/             # place-team.ts, place-claims.ts
│   │   └── types.ts
│   │
│   ├── social/
│   │   ├── components/           # SocialFeed, PostItem, PostMediaGallery, PostMediaViewer,
│   │   │                         # CommentItem, SocialCountChip, SocialEmptyState,
│   │   │                         # SocialFeedEmptyState, SocialFeedFiltersSheet, SocialFeedHeader,
│   │   │                         # PostCustomAudienceModal, PostVisibilityModal,
│   │   │                         # social-feed.utils.ts
│   │   ├── hooks/                # (usePaginatedList déplacé ici ou shared/)
│   │   ├── screens/              # PostCreateScreen (ex-app/post.tsx 1286L)
│   │   ├── services/             # posts.ts, post-events.ts, post-realtime.ts
│   │   └── types.ts              # (ex-types/social.ts)
│   │
│   ├── messaging/
│   │   ├── components/           # ChatComposer, ChatMedia, DirectConversationCard,
│   │   │                         # OutingConversationCard, ChatScreenShell
│   │   ├── hooks/
│   │   ├── screens/              # DirectChatScreen (ex-app/direct-chat/[id].tsx 2148L)
│   │   ├── services/             # direct-chats.ts, direct-chat-meta.ts,
│   │   │                         # direct-chat-realtime.ts, outings.ts
│   │   └── types.ts
│   │
│   ├── discover/
│   │   ├── components/           # DiscoverEmptyState, DiscoverFiltersModal,
│   │   │                         # DiscoverInspirationMasonry
│   │   ├── hooks/                # useDiscoverScreen.ts
│   │   └── types.ts              # discover.types.ts
│   │
│   ├── organizer/
│   │   ├── components/           # OrganizerClaimHistory, OrganizerExitPanelButton,
│   │   │                         # AdminAnalyticsPanel, AdminAnalyticsTree,
│   │   │                         # scanner/ScannerEventPickerModal,
│   │   │                         # scanner/ScannerRecentScansPanel,
│   │   │                         # scanner/ScannerScanResultCard
│   │   ├── hooks/                # useOrganizerGuard.ts, useScannerFlow.ts
│   │   ├── screens/              # (organizer/settings.tsx 936L → à décomposer plus tard)
│   │   ├── services/             # organizer-access.ts, organizer-notifications.ts,
│   │   │                         # organizer-scanner.ts, scanner-preferences.ts,
│   │   │                         # scanner-status.ts, admin-users.ts,
│   │   │                         # admin-organizers.ts, admin-analytics.ts
│   │   └── types.ts
│   │
│   └── user/
│       ├── components/           # ProfileHeader, ProfileStats, PersonRow,
│       │                         # PersonActionButton, SettingsSection, SettingsToggleRow
│       ├── hooks/                # useUserProfile.ts, useHomeScreen.ts
│       ├── services/             # friendships.ts, reports.ts
│       └── types.ts
│
├── shared/                       # Tout ce qui est vraiment transversal (à créer)
│   ├── ui/                       # ← ex-components/ui/ complet
│   │   ├── primitives/           # Avatar, Badge, Button, Divider, ListItem,
│   │   │                         # PriceDisplay, RatingDisplay
│   │   ├── BottomSheetModal.tsx
│   │   ├── BottomSheetListModal.tsx
│   │   ├── CatalogScreenLayout.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── EntityCard.tsx
│   │   ├── FilterChipsBar.tsx
│   │   ├── Header.tsx
│   │   ├── HeroBackground.tsx
│   │   ├── LocationFilterSheet.tsx
│   │   ├── LocationScopeBar.tsx
│   │   ├── MasonryGrid.tsx
│   │   ├── MediaFrame.tsx
│   │   ├── ReportReasonSheet.tsx
│   │   ├── ScreenHeader.tsx
│   │   ├── ScreenState.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── SuggestionCard.tsx
│   │   ├── Tabs.tsx
│   │   ├── TicketStatusBadge.tsx
│   │   └── collapsible.tsx
│   │
│   ├── hooks/                    # Hooks vraiment transversaux
│   │   ├── useColorScheme.ts     # + use-color-scheme.web.ts
│   │   ├── use-i18n.ts
│   │   ├── use-app-language.ts
│   │   ├── use-theme-color.ts
│   │   ├── useLocationScope.ts
│   │   ├── useScreenAsync.ts
│   │   ├── usePaginatedList.ts
│   │   └── useVisibleItemAutoplay.ts (+ .logic.ts)
│   │
│   ├── services/                 # Services vraiment transversaux
│   │   ├── api.ts                # Client HTTP Axios + auth interceptors
│   │   ├── dataCache.ts          # Cache in-memory avec TTL
│   │   ├── formatters.ts         # formatEventDate, formatEventCardPriceLabel…
│   │   ├── navigation.ts         # safeReplace, helpers de navigation
│   │   ├── media.ts              # Fetch + cache médias
│   │   ├── media-upload.ts       # buildMediaUploadPayload, inferMediaKind
│   │   ├── i18n.ts               # Dictionnaire FR/EN + TranslationKey type
│   │   ├── location-preferences.ts
│   │   ├── settings.ts           # getMySettings, updateMySettings
│   │   ├── ticket-status.ts
│   │   ├── recommendation-onboarding.ts
│   │   └── user-flow-analytics.ts
│   │
│   └── types/
│       └── social.ts             # (ex-types/social.ts)
│
├── theme/
│   ├── tokens.ts                 # Design tokens : spacing, colors, radii
│   └── (ex-constants/theme.ts)
│
├── context/
│   └── auth-bootstrap.tsx        # Provider auth + subscription resets
│
├── config/
│   └── react-native-warnings.ts
│
└── utils/
    └── category-animations.ts
```

---

## 5. Plan de migration — 4 phases

### Règles générales pour la migration

1. **Ne jamais casser TypeScript** — `npx tsc --noEmit` = 0 erreur après chaque fichier déplacé.
2. **Un fichier à la fois** — déplacer + mettre à jour tous les imports concernés dans la foulée.
3. **Mettre à jour ce document** dès qu'un fichier est migré (cocher la case ✅).
4. **Ne pas modifier la logique** pendant la migration — juste déplacer.
5. **Les alias `@/`** pointent vers la racine `frontend/` — vérifier `tsconfig.json` paths si besoin.

---

### Phase 1 — Restructuration de `services/` (PRIORITÉ HAUTE)

**Objectif** : Passer de 42 fichiers plats à 7 sous-dossiers domaine.  
**Risque** : Faible (imports à mettre à jour, logique intacte).  
**Durée estimée** : 1 session.

> **Statut : 🟡 En cours (sandbox frontend-temp)**

Créer les dossiers suivants dans `services/` :

```
services/
├── api/           → api.ts, navigation.ts, dataCache.ts
├── auth/          → user-session.ts, app-preferences.ts
├── events/        → event-bookings.ts, event-collaborators.ts, event-revisions.ts
├── places/        → place-team.ts, place-claims.ts
├── social/        → posts.ts, post-events.ts, post-realtime.ts, reports.ts
├── messaging/     → direct-chats.ts, direct-chat-meta.ts, direct-chat-realtime.ts,
│                    outings.ts
├── organizer/     → organizer-access.ts, organizer-notifications.ts,
│                    organizer-scanner.ts, scanner-preferences.ts,
│                    scanner-status.ts, admin-users.ts, admin-organizers.ts,
│                    admin-analytics.ts
├── user/          → friendships.ts, settings.ts
└── shared/        → formatters.ts, i18n.ts, media.ts, media-upload.ts,
                     location-preferences.ts, ticket-status.ts,
                     recommendation-onboarding.ts, user-flow-analytics.ts
```

**Checklist Phase 1** :

- [x] Créer `services/api/` — déplacer `api.ts`, `navigation.ts`, `dataCache.ts`
- [x] Créer `services/auth/` — déplacer `user-session.ts`, `app-preferences.ts`
- [x] Créer `services/events/` — déplacer `event-bookings.ts`, `event-collaborators.ts`, `event-revisions.ts`
- [x] Créer `services/places/` — déplacer `place-team.ts`, `place-claims.ts`
- [x] Créer `services/social/` — déplacer `posts.ts`, `post-events.ts`, `post-realtime.ts`, `reports.ts`
- [x] Créer `services/messaging/` — déplacer `direct-chats.ts`, `direct-chat-meta.ts`, `direct-chat-realtime.ts`, `outings.ts`
- [x] Créer `services/organizer/` — déplacer 10 fichiers (organizer-*, scanner-*, admin-*, organizer-ui, organizer-analytics)
- [x] Créer `services/user/` — déplacer `friendships.ts`, `settings.ts`
- [x] Créer `services/shared/` — déplacer les fichiers utilitaires restants
- [x] Stubs rétro-compatibles créés aux anciens chemins (0 import existant cassé)
- [x] Vérifier `npx tsc --noEmit` = 0 erreur ✅
- [x] Mettre à jour ce document

---

### Phase 2 — Migration de `components/` vers `features/` + `shared/ui/` (PRIORITÉ HAUTE)

**Objectif** : Regrouper les composants par domaine dans `features/`.  
**Risque** : Moyen (beaucoup d'imports à mettre à jour).  
**Durée estimée** : 2–3 sessions.

> **Statut : ✅ TERMINÉ (10/10 groupes) — 2026-05-03**

**Checklist Phase 2** :

**shared/ui/** (ex-`components/ui/`)
- [x] Créer `shared/ui/primitives/` — déplacer `Avatar`, `Badge`, `Button`, `Divider`, `ListItem`, `PriceDisplay`, `RatingDisplay`
- [x] Déplacer tous les autres fichiers de `components/ui/` vers `shared/ui/`
- [x] Déplacer `components/forms/` → `shared/ui/forms/`

**features/auth/** (ex-`components/auth/`)
- [x] Déplacer `AuthBrandBadge`, `AuthHeroLayout`, `AuthStepIndicator`, `AuthTextField`, `RoleOptionCard` → `features/auth/components/`

**features/events/** (ex-`components/event/`)
- [x] Déplacer `EventDetailContent`, `EventDetailGalleryTab`, `EventDetailHero`, `EventDetailInfoTab`, `EventDetailTicketsTab`, `EventPublicationsPanel` → `features/events/components/`
- [x] Déplacer `components/ui/EventCard.tsx`, `EventInspirationCard.tsx`, `EventFormWizard.tsx` → `features/events/components/`

**features/places/** (ex-`components/place/`)
- [x] Déplacer tous les fichiers `PlaceDetail*`, `PlacePublications*`, `PlaceGalleryModal`, `PlaceReviewModal`, `PlaceSaveButton`, `PlaceCoverFallback` → `features/places/components/`
- [x] Déplacer `components/ui/PlaceCard.tsx`, `PlaceInspirationCard.tsx` → `features/places/components/`

**features/social/** (ex-`components/social/`, `components/post/`)
- [x] Déplacer `SocialFeed`, `PostItem`, `PostMediaGallery`, `PostMediaViewer`, `CommentItem`, `SocialCountChip`, `SocialEmptyState*`, `SocialFeedFiltersSheet`, `SocialFeedHeader`, `PersonActionButton`, `PersonRow`, `social-feed.utils.ts`, `post-ownership.ts` → `features/social/components/`
- [x] Déplacer `PostCustomAudienceModal`, `PostVisibilityModal` → `features/social/components/`

**features/messaging/** (ex-`components/direct-chat/`, `components/messages/`)
- [x] Déplacer `ChatComposer`, `ChatMedia` → `features/messaging/components/`
- [x] Déplacer `DirectConversationCard`, `OutingConversationCard` → `features/messaging/components/`
- [x] Déplacer `components/ui/ChatScreenShell.tsx` → `features/messaging/components/`

**features/discover/** (ex-`components/discover/`)
- [x] Déplacer `DiscoverEmptyState`, `DiscoverFiltersModal`, `DiscoverInspirationMasonry`, `discover.types.ts`, `discover.scoring.ts` → `features/discover/components/`
- [x] Déplacer `MapScreen.native.tsx`, `MapScreen.web.tsx` → `features/discover/components/`

**features/organizer/** (ex-`components/organizer/`, `components/admin/`)
- [x] Déplacer `OrganizerClaimHistory`, `OrganizerExitPanelButton` → `features/organizer/components/`
- [x] Déplacer `scanner/*` → `features/organizer/components/scanner/`
- [x] Déplacer `AdminAnalyticsPanel`, `AdminAnalyticsTree` → `features/organizer/components/`

**features/user/** (ex-`components/profile/`, `components/settings/`, `components/home/`, `components/analytics/`)
- [x] Déplacer `ProfileHeader`, `ProfileStats` → `features/user/components/`
- [x] Déplacer `SettingsSection`, `SettingsToggleRow` → `features/user/components/`
- [x] Déplacer `HomeCategoriesSection`, `HomeContent`, `HomeFeaturedSection`, `HomeRecommendedSection`, `HomeSectionPlaceholder`, `home.types.ts`, `home.utils.ts` → `features/user/components/`
- [x] Déplacer `UserFlowTracker` → `features/user/components/`

**Composants racine** (`components/*.tsx`)
- [x] `external-link.tsx`, `haptic-tab.tsx`, `hello-wave.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`, `themed-view.tsx` → `shared/ui/`

- [x] Vérifier `npx tsc --noEmit` = 0 erreur ✅ (fix `_layout.tsx` ternaire → if/else pour Href)
- [x] Mettre à jour ce document

**Notes Phase 2** :
- Stubs rétro-compatibles créés à tous les anciens chemins `components/**` (0 import cassé)
- Barrel `index.ts` créé dans chaque nouveau dossier
- Fix `_layout.tsx` : ternaire complexe avec `Href` (type Expo Router énorme) remplacée par `if/else`
- Imports relatifs corrigés dans : `SocialFeed`, `PersonRow`, `PostItem`, `PostMediaGallery`, `PostMediaViewer`, `ProfileHeader`

---

### Phase 3 — Extraction des gros écrans vers `features/*/screens/` (PRIORITÉ MOYENNE)

**Objectif** : Les 6 écrans >1200 lignes deviennent de vrais composants dans `features/`, et `app/` ne garde qu'un wrapper de 20–50 lignes.  
**Risque** : Élevé (refactoring de logique). Faire **un écran à la fois**.  
**Durée estimée** : 4–6 sessions.

> **Statut : 🔲 Non commencé**

**Ordre recommandé** (du plus simple au plus complexe) :

| Priorité | Écran actuel | Taille | Destination | Notes |
|----------|-------------|--------|-------------|-------|
| 1 | `app/admin/place-claims.tsx` | 1257L | `features/organizer/screens/PlaceClaimsScreen.tsx` | Admin seulement, isolé |
| 2 | `app/post.tsx` | 1286L | `features/social/screens/PostCreateScreen.tsx` | fullScreenModal |
| 3 | `app/place.tsx` | 1275L | `features/places/screens/PlaceCreateScreen.tsx` | fullScreenModal |
| 4 | `app/event-edit/[id].tsx` | 1388L | `features/events/screens/EventEditScreen.tsx` | Paramètre [id] |
| 5 | `app/event.tsx` | 2121L | `features/events/screens/EventCreateScreen.tsx` | + décomposer en steps |
| 6 | `app/direct-chat/[id].tsx` | 2148L | `features/messaging/screens/DirectChatScreen.tsx` | Realtime + media |

**Pattern de migration pour chaque écran** :

```typescript
// AVANT — app/post.tsx (1286 lignes de logique)
export default function CreatePostScreen() {
  // 1286 lignes ici...
}

// APRÈS — app/post.tsx (wrapper de 25 lignes)
import { PostCreateScreen } from '@/features/social/screens/PostCreateScreen';
export default PostCreateScreen;

// features/social/screens/PostCreateScreen.tsx (1286 lignes, avec imports mis à jour)
export function PostCreateScreen() {
  // Même logique, imports mis à jour vers features/ et shared/
}
```

**Checklist Phase 3** :
- [ ] `place-claims.tsx` → `features/organizer/screens/PlaceClaimsScreen.tsx`
- [ ] `post.tsx` → `features/social/screens/PostCreateScreen.tsx`
- [ ] `place.tsx` → `features/places/screens/PlaceCreateScreen.tsx`
- [ ] `event-edit/[id].tsx` → `features/events/screens/EventEditScreen.tsx`
- [ ] `event.tsx` → `features/events/screens/EventCreateScreen.tsx`
- [ ] `direct-chat/[id].tsx` → `features/messaging/screens/DirectChatScreen.tsx`
- [ ] Vérifier `npx tsc --noEmit` = 0 erreur après chaque migration
- [ ] Mettre à jour ce document

---

### Phase 4 — Finalisation `shared/` + `hooks/` + nettoyage (PRIORITÉ BASSE)

**Objectif** : Migrer `hooks/` → `shared/hooks/` + feature-specific hooks, déplacer les autres répertoires.  
**Risque** : Faible.  
**Durée estimée** : 1 session.

> **Statut : 🔲 Non commencé**

**Checklist Phase 4** :
- [ ] `hooks/useColorScheme.ts` + `use-color-scheme.web.ts` → `shared/hooks/`
- [ ] `hooks/use-i18n.ts` → `shared/hooks/`
- [ ] `hooks/use-app-language.ts` → `shared/hooks/`
- [ ] `hooks/use-theme-color.ts` → `shared/hooks/`
- [ ] `hooks/useLocationScope.ts` → `shared/hooks/`
- [ ] `hooks/useScreenAsync.ts` → `shared/hooks/`
- [ ] `hooks/usePaginatedList.ts` → `shared/hooks/`
- [ ] `hooks/useVisibleItemAutoplay.ts` + `.logic.ts` → `shared/hooks/`
- [ ] `hooks/useHomeScreen.ts` → `features/user/hooks/`
- [ ] `hooks/useEventDetail.ts` → `features/events/hooks/`
- [ ] `hooks/usePlaceDetail.ts` → `features/places/hooks/`
- [ ] `hooks/useDiscoverScreen.ts` → `features/discover/hooks/`
- [ ] `hooks/useOrganizerGuard.ts` → `features/organizer/hooks/`
- [ ] `hooks/useScannerFlow.ts` → `features/organizer/hooks/`
- [ ] `hooks/useUserProfile.ts` → `features/user/hooks/`
- [ ] `types/social.ts` → `features/social/types.ts`
- [ ] `types.ts` (racine) → `shared/types/` ou intégrer dans les features
- [ ] `constants/theme.ts` → merger avec `theme/tokens.ts`
- [ ] Supprimer dossiers vides après migration
- [ ] Vérifier `npx tsc --noEmit` = 0 erreur
- [ ] Mettre à jour ce document

---

## 6. Inventaire complet — état ACTUEL

> Cette section décrit l'état **avant toute migration**. Elle sert de référence pour savoir d'où vient chaque fichier.

### `app/` — Écrans (Expo Router)

#### Tabs principales `(tabs)/`
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `(tabs)/_layout.tsx` | layout | 203 | Tab bar glassmorphism, 5 tabs |
| `(tabs)/home.tsx` | `/home` | 38 | Entry point → `useHomeScreen()` |
| `(tabs)/social.tsx` | `/social` | 12 | Feed social → `SocialFeed` |
| `(tabs)/map.tsx` | `/map` | 3 | Switcher plateforme |
| `(tabs)/map.native.tsx` | `/map` (iOS/Android) | 6 | Wrapper natif |
| `(tabs)/map.web.tsx` | `/map` (web) | 3 | Wrapper web |
| `(tabs)/create.tsx` | `/create` | 4 | Ouvre `/create-modal` |
| `(tabs)/profile.tsx` | `/profile` | 836 | Profil utilisateur **LARGE** |
| `(tabs)/explore.tsx` | `/explore` | 242 | Exploration (href: null) |

#### Espace organisateur `organizer/`
| Fichier | Lignes | Description |
|---------|--------|-------------|
| `organizer/_layout.tsx` | 436 | Workspace tabs, role-based access |
| `organizer/scanner.tsx` | 342 | Scan de billets QR |
| `organizer/events.tsx` | 573 | Liste des événements organisateur |
| `organizer/places.tsx` | 205 | Liste des lieux |
| `organizer/dashboard.tsx` | 373 | Analytics & KPIs |
| `organizer/notifications.tsx` | 646 | Notifications organisateur |
| `organizer/profile.tsx` | 361 | Profil organisateur |
| `organizer/settings.tsx` | 936 | Paramètres workspace **LARGE** |
| `organizer/action-center.tsx` | 202 | Lanceur d'actions rapides |
| `organizer/claim-place.tsx` | 443 | Revendiquer un lieu |
| `organizer/event-team.tsx` | 686 | Gestion des collaborateurs |
| `organizer/event-revisions.tsx` | 239 | Historique des modifications |
| `organizer/place-team.tsx` | 446 | Équipe du lieu |
| `organizer/place-profile/[id].tsx` | 577 | Profil d'un lieu (édition) |
| `organizer/place-onboarding.tsx` | 159 | Onboarding nouveau lieu |
| `organizer/create-place.tsx` | 1 | Stub → redirige |

#### Auth
| Fichier | Lignes | Description |
|---------|--------|-------------|
| `index.tsx` | 340 | Landing / Login |
| `register.tsx` | 565 | Inscription |
| `verify-email.tsx` | 312 | Vérification email OTP |
| `reset-password.tsx` | 293 | Reset mot de passe |
| `reset-password-confirm.tsx` | 202 | Confirmation reset |
| `forgot-password.tsx` | 153 | Saisie email oublié |
| `activate-pro.tsx` | 330 | Abonnement Pro (fullScreenModal) |

#### Événements
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `events.tsx` | `/events` | 695 | Liste publique des événements (infinite scroll) |
| `event.tsx` | `/event` | 2121 | Création événement (fullScreenModal) **XLARGE** |
| `event/[id].tsx` | `/event/:id` | 249 | Détail événement |
| `event-edit/[id].tsx` | `/event-edit/:id` | 1388 | Édition événement **XLARGE** |
| `event-booking/[id].tsx` | `/event-booking/:id` | 29 | Réservation billet |
| `event-scans/[id].tsx` | `/event-scans/:id` | 223 | Scans d'un événement |

#### Lieux
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `places.tsx` | `/places` | 710 | Liste publique des lieux |
| `place.tsx` | `/place` | 1275 | Création lieu (fullScreenModal) **XLARGE** |
| `place/[id].tsx` | `/place/:id` | 251 | Détail lieu |

#### Social & contenu
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `post.tsx` | `/post` | 1286 | Création post (fullScreenModal) **XLARGE** |
| `post-view/[id].tsx` | `/post-view/:id` | 291 | Vue d'un post |
| `comments.tsx` | `/comments` | 389 | Commentaires (transparentModal) |
| `discover.tsx` | `/discover` | 228 | Page discover/inspiration |
| `categories.tsx` | `/categories` | 142 | Navigation par catégories |
| `category/[id].tsx` | `/category/:id` | 1073 | Contenu d'une catégorie **LARGE** |

#### Messaging & sorties
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `messages.tsx` | `/messages` | 744 | Liste des conversations (DM + sorties) |
| `direct-chat/[id].tsx` | `/direct-chat/:id` | 2148 | DM 1-on-1 **XLARGE** |
| `outing.tsx` | `/outing` | 700 | Création sortie (fullScreenModal) |
| `outing/[id].tsx` | `/outing/:id` | 410 | Détail sortie |
| `outing-chat/[id].tsx` | `/outing-chat/:id` | 353 | Chat de groupe sortie |
| `outing-invitations.tsx` | `/outing-invitations` | 190 | Invitations aux sorties |
| `friend-requests.tsx` | `/friend-requests` | 175 | Demandes d'amitié |
| `search.tsx` | `/search` | 261 | Recherche globale |

#### Compte utilisateur
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `edit-profile.tsx` | `/edit-profile` | 272 | Édition profil |
| `preferences.tsx` | `/preferences` | 965 | Centres d'intérêt / onboarding **LARGE** |
| `settings.tsx` | `/settings` | 413 | Paramètres app |
| `notification-settings.tsx` | `/notification-settings` | 165 | Préférences notifs |
| `help-support.tsx` | `/help-support` | 69 | Aide |
| `user/[id].tsx` | `/user/:id` | 281 | Profil d'un autre utilisateur |
| `connections.tsx` | `/connections` | 227 | Liste d'amis |
| `my-tickets.tsx` | `/my-tickets` | 371 | Billets achetés |
| `my-ticket/[id].tsx` | `/my-ticket/:id` | 223 | Détail billet + QR |

#### Admin & spéciaux
| Fichier | Route | Lignes | Description |
|---------|-------|--------|-------------|
| `admin/place-claims.tsx` | `/admin/place-claims` | 1257 | Validation claims **XLARGE** |
| `create-modal.tsx` | `/create-modal` | 323 | Menu création (transparentModal) |
| `notifications.tsx` | `/notifications` | 357 | Notifications système |
| `location.tsx` | `/location` | 404 | Sélecteur de ville (fullScreenModal) |
| `_layout.tsx` | root | 407 | Bootstrap auth + root Stack |

---

### `components/` — État actuel

#### `components/ui/` (partagés)
`BottomSheetModal`, `BottomSheetListModal`, `CatalogScreenLayout`, `CategoryCard`, `ChatScreenShell`, `ContactAction`, `EntityCard`, `EventCard`, `EventFormWizard`, `EventInspirationCard`, `FilterChipsBar`, `Header`, `HeroBackground`, `LocationFilterSheet`, `LocationScopeBar`, `MasonryGrid`, `MediaFrame`, `PlaceCard`, `PlaceCoverFallback`, `PlaceInspirationCard`, `ReportReasonSheet`, `ScreenHeader`, `ScreenState`, `SearchBar`, `Skeleton`, `SuggestionCard`, `Tabs`, `TicketStatusBadge`, `collapsible`, `icon-symbol.ios`, `icon-symbol`  
+ `primitives/`: `Avatar`, `Badge`, `Button`, `Divider`, `ListItem`, `PriceDisplay`, `RatingDisplay`

#### `components/auth/`
`AuthBrandBadge`, `AuthHeroLayout`, `AuthStepIndicator`, `AuthTextField`, `RoleOptionCard`

#### `components/event/`
`EventDetailContent`, `EventDetailGalleryTab`, `EventDetailHero`, `EventDetailInfoTab`, `EventDetailTicketsTab`, `EventPublicationsPanel`

#### `components/place/`
`PlaceDetailContent`, `PlaceDetailEventsTab`, `PlaceDetailHero`, `PlaceDetailInfoTab`, `PlaceDetailReviewsTab`, `PlaceGalleryModal`, `PlacePublicationCard`, `PlacePublicationsMasonry`, `PlacePublicationsPanel`, `PlacePublicationsPreviewGrid`, `PlaceReviewModal`, `PlaceSaveButton`

#### `components/social/`
`CommentItem`, `PersonActionButton`, `PersonRow`, `PostItem` (646L), `PostMediaGallery`, `PostMediaViewer`, `SocialCountChip`, `SocialEmptyState`, `SocialFeed` (1451L), `SocialFeedEmptyState`, `SocialFeedFiltersSheet`, `SocialFeedHeader`, `social-feed.utils.ts`

#### `components/post/`
`PostCustomAudienceModal`, `PostVisibilityModal`

#### `components/messaging/` (`direct-chat/` + `messages/`)
`ChatComposer`, `ChatMedia`, `DirectConversationCard`, `OutingConversationCard`

#### `components/discover/`
`DiscoverEmptyState`, `DiscoverFiltersModal`, `DiscoverInspirationMasonry`

#### `components/organizer/`
`OrganizerClaimHistory`, `OrganizerExitPanelButton`  
+ `scanner/`: `ScannerEventPickerModal`, `ScannerRecentScansPanel`, `ScannerScanResultCard`

#### `components/admin/`
`AdminAnalyticsPanel` (868L), `AdminAnalyticsTree`

#### `components/profile/`
`ProfileHeader`, `ProfileStats`

#### `components/settings/`
`SettingsSection`, `SettingsToggleRow`

#### `components/home/`
`HomeCategoriesSection`, `HomeContent`, `HomeFeaturedSection`, `HomeRecommendedSection`, `HomeSectionPlaceholder`

#### `components/analytics/`
`UserFlowTracker`

#### `components/forms/`
`FormImagePicker`, `FormTextArea`, `FormTextField`

#### `components/screens/`
`MapScreen.native.tsx` (1427L), `MapScreen.web.tsx`

#### Racine `components/`
`external-link.tsx`, `haptic-tab.tsx`, `hello-wave.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`, `themed-view.tsx`

---

### `hooks/` — État actuel (18 hooks)

| Hook | Destination future |
|------|--------------------|
| `useHomeScreen.ts` | `features/user/hooks/` |
| `useEventDetail.ts` | `features/events/hooks/` |
| `usePlaceDetail.ts` | `features/places/hooks/` |
| `useDiscoverScreen.ts` | `features/discover/hooks/` |
| `useOrganizerGuard.ts` | `features/organizer/hooks/` |
| `useScreenAsync.ts` | `shared/hooks/` |
| `useUserProfile.ts` | `features/user/hooks/` |
| `useVisibleItemAutoplay.ts` + `.logic.ts` | `shared/hooks/` |
| `usePaginatedList.ts` | `shared/hooks/` |
| `useScannerFlow.ts` | `features/organizer/hooks/` |
| `useLocationScope.ts` | `shared/hooks/` |
| `useColorScheme.ts` + `.web.ts` | `shared/hooks/` |
| `use-i18n.ts` | `shared/hooks/` |
| `use-app-language.ts` | `shared/hooks/` |
| `use-theme-color.ts` | `shared/hooks/` |

---

### `services/` — État actuel (42 fichiers plats)

| Fichier | Domaine | Rôle |
|---------|---------|------|
| `api.ts` | shared | Client HTTP Axios, intercepteurs refresh token, `isUnauthorizedError`, `getApiErrorMessage`, `getImageUrl` |
| `dataCache.ts` | shared | Cache in-memory avec TTL par clé (`events` 5min, `categories` 30min, etc.) |
| `formatters.ts` | shared | `formatEventDate`, `formatEventCardPriceLabel` |
| `navigation.ts` | shared | `safeReplace`, helpers navigation |
| `i18n.ts` | shared | Dictionnaire FR/EN, type `TranslationKey` |
| `media.ts` | shared | Fetch médias avec cache |
| `media-upload.ts` | shared | `buildMediaUploadPayload`, `inferMediaKind`, `isMediaFileTooLarge` |
| `location-preferences.ts` | shared | Préférences de localisation |
| `ticket-status.ts` | shared | Statuts de billets |
| `recommendation-onboarding.ts` | shared | Logique onboarding goûts |
| `user-flow-analytics.ts` | shared | Tracking analytique |
| `user-session.ts` | auth | `resolveStoredUserSession`, `clearStoredUserSession` |
| `app-preferences.ts` | auth | Thème, langue, préférences app |
| `settings.ts` | user | `getMySettings`, `updateMySettings` |
| `friendships.ts` | user | `getFriendshipOverview`, demandes d'amitié |
| `reports.ts` | user | Signalements |
| `event-bookings.ts` | events | Réservation billets |
| `event-collaborators.ts` | events | Gestion collaborateurs événement |
| `event-revisions.ts` | events | Historique modifications événement |
| `place-team.ts` | places | Équipe d'un lieu |
| `place-claims.ts` | places | Revendications de lieu |
| `posts.ts` | social | CRUD posts |
| `post-events.ts` | social | Événements likes/commentaires |
| `post-realtime.ts` | social | WebSocket posts |
| `direct-chats.ts` | messaging | CRUD conversations DM |
| `direct-chat-meta.ts` | messaging | Métadonnées DM (statut lu) |
| `direct-chat-realtime.ts` | messaging | WebSocket DM |
| `outings.ts` | messaging | Gestion sorties |
| `organizer-access.ts` | organizer | Rôles et capacités organisateur |
| `organizer-notifications.ts` | organizer | Notifications organisateur |
| `organizer-scanner.ts` | organizer | Logique scanner QR |
| `scanner-preferences.ts` | organizer | Préférences scanner |
| `scanner-status.ts` | organizer | Statut scan billet |
| `admin-users.ts` | organizer | Gestion utilisateurs (admin) |
| `admin-organizers.ts` | organizer | Gestion organisateurs (admin) |
| `admin-analytics.ts` | organizer | Données analytics admin |

---

## 7. Carte de navigation (User Flows)

### Flux d'authentification

```
App launch
    └─ resolveStoredUserSession()
         ├─ Pas de token valide        → /index (login)
         ├─ Token valide, email non vérifié → /verify-email
         ├─ Token valide, onboarding pas fait → /preferences?mode=onboarding
         ├─ Token valide, organisateur nouveau → /organizer/place-onboarding
         └─ Token valide, profil complet → /(tabs)/home
```

### Navigation principale (Tabs)

```
/(tabs)/home
    ├─ Tap catégorie → /category/[id]
    ├─ Tap événement → /event/[id]
    ├─ Tap lieu → /place/[id]
    └─ Voir tout (events) → /events

/(tabs)/social
    ├─ Post → /post-view/[id]
    ├─ Commentaires → /comments (transparentModal)
    └─ Profil auteur → /user/[id]

/(tabs)/map
    ├─ Pin événement → /event/[id]
    └─ Pin lieu → /place/[id]

/(tabs)/create (bouton +)
    └─ /create-modal (transparentModal)
         ├─ Post → /post (fullScreenModal)
         ├─ Sortie → /outing (fullScreenModal)
         └─ Événement (si organisateur) → /event (fullScreenModal)

/(tabs)/profile
    ├─ Modifier → /edit-profile
    ├─ Paramètres → /settings
    ├─ Centres d'intérêt → /preferences
    ├─ Notifications → /notification-settings
    ├─ Mes billets → /my-tickets → /my-ticket/[id]
    ├─ Messages → /messages → /direct-chat/[id]
    ├─ Connexions → /connections → /user/[id]
    ├─ Demandes d'amitié → /friend-requests
    └─ Espace pro → /organizer/
```

### Flux organisateur

```
/organizer/ (layout role-based)
    ├─ Scanner (tous) → scan billet QR
    ├─ Événements (staff+) → /organizer/events
    │   ├─ Créer → /event (fullScreenModal)
    │   ├─ Modifier → /event-edit/[id]
    │   ├─ Scans → /event-scans/[id]
    │   ├─ Équipe → /organizer/event-team
    │   └─ Historique → /organizer/event-revisions
    ├─ Dashboard (staff+) → analytics
    ├─ Action Center (organizer) → modal raccourcis
    ├─ Profil → /organizer/profile
    ├─ Notifications → /organizer/notifications
    └─ Paramètres → /organizer/settings
```

### Modals et présentations

| Route | Présentation | Déclencheur |
|-------|-------------|-------------|
| `/event` | `fullScreenModal` | Bouton créer événement |
| `/place` | `fullScreenModal` | Bouton créer lieu |
| `/post` | `fullScreenModal` | Bouton créer post |
| `/outing` | `fullScreenModal` | Bouton créer sortie |
| `/location` | `fullScreenModal` | Sélecteur ville |
| `/activate-pro` | `fullScreenModal` | Upgrade pro |
| `/create-modal` | `transparentModal` | Tab create (animation: none) |
| `/comments` | `transparentModal` | Icône commentaires (animation: fade) |

---

## 8. Registre des écrans

> Référence rapide : quel hook/composant un écran utilise-t-il ?

| Écran | Hook principal | Composants clés | Services |
|-------|---------------|-----------------|---------|
| `(tabs)/home` | `useHomeScreen` | `HomeContent`, `HomeCategoriesSection`, `HomeFeaturedSection`, `HomeRecommendedSection` | `api`, `dataCache` |
| `(tabs)/social` | — | `SocialFeed`, `PostItem` | `post-realtime`, `posts` |
| `(tabs)/profile` | `useUserProfile` | `ProfileHeader`, `ProfileStats`, `SocialFeed` | `api`, `friendships` |
| `(tabs)/map` | — | `MapScreen.native` | `api` (events + places) |
| `event/[id]` | `useEventDetail` | `EventDetailContent`, `EventDetailHero`, `EventDetailInfoTab`, `EventDetailTicketsTab` | `event-bookings` |
| `place/[id]` | `usePlaceDetail` | `PlaceDetailContent`, `PlaceDetailHero` | `place-team`, `posts` |
| `discover` | `useDiscoverScreen` | `DiscoverInspirationMasonry`, `DiscoverFiltersModal` | `api` |
| `messages` | — | `DirectConversationCard`, `OutingConversationCard` | `direct-chats`, `direct-chat-realtime` |
| `direct-chat/[id]` | — | `ChatComposer`, `ChatMedia`, `ChatScreenShell` | `direct-chat-realtime`, `direct-chat-meta` |
| `organizer/scanner` | `useScannerFlow` | `ScannerEventPickerModal`, `ScannerRecentScansPanel`, `ScannerScanResultCard` | `organizer-scanner`, `scanner-preferences` |
| `organizer/dashboard` | — | `AdminAnalyticsPanel` | `admin-analytics` |
| `organizer/settings` | `useOrganizerGuard` | `SettingsSection`, `SettingsToggleRow` | `organizer-access`, `scanner-preferences`, `settings` |

---

## 9. Registre des composants

> Guide pour savoir où trouver/créer un composant selon son usage.

### Règle de placement

```
Est-ce que le composant est utilisé dans 2+ domaines différents ?
    OUI → shared/ui/
    NON → features/[domaine]/components/

Est-ce un primitif UI (Button, Badge, Avatar...) ?
    OUI → shared/ui/primitives/
```

### Composants partagés (`shared/ui/`)

| Composant | Usage | Notes |
|-----------|-------|-------|
| `BottomSheetModal` | Partout | NE PAS TOUCHER — @gorhom/bottom-sheet capricieux |
| `CatalogScreenLayout` | events, places, categories | Header + scroll layout |
| `EntityCard` | discover, events, places | Variantes: `cover`, `row` |
| `FilterChipsBar` | events, places, discover | Chips horizontaux filtrables |
| `LocationScopeBar` | events, places, discover | Filtre géographique |
| `MasonryGrid` | discover, social | Grille masonry variable |
| `MediaFrame` | post, direct-chat | Rendu image/vidéo |
| `ScreenState` | Partout | Loading / Error / Empty states |
| `ScreenHeader` | Partout | Header avec back + titre |
| `SearchBar` | messages, search, events | Input recherche |
| `Skeleton` | Partout | Placeholders chargement |

---

## 10. Registre des hooks

### Hooks domaine (`features/*/hooks/`)

| Hook | Domaine | Rôle |
|------|---------|------|
| `useHomeScreen` | user | Charge catégories + events + places pour le home |
| `useEventDetail` | events | Charge + manage état détail événement (bookings, tabs, réactions) |
| `usePlaceDetail` | places | Charge + manage état détail lieu (reviews, posts, équipe) |
| `useDiscoverScreen` | discover | Charge events + places pour discover, gère filtres |
| `useUserProfile` | user | Charge profil utilisateur + posts + stats |
| `useOrganizerGuard` | organizer | Vérifie rôle + capacités organisateur, redirige si non autorisé |
| `useScannerFlow` | organizer | Orchestration scan QR : événement sélectionné, résultat scan, offline |

### Hooks partagés (`shared/hooks/`)

| Hook | Rôle |
|------|------|
| `useColorScheme` | Détecte dark/light/system |
| `use-i18n` | Accès aux traductions typées (`t(key)`) |
| `use-app-language` | Sélection de langue persistée |
| `useLocationScope` | Filtre géographique (ville/pays/tout) |
| `useScreenAsync` | Pattern standard chargement async + états loading/error/refresh |
| `usePaginatedList` | Infinite scroll générique avec cursor |
| `useVisibleItemAutoplay` | Autoplay vidéo selon visibilité dans ScrollView |

---

## 11. Registre des services

### Services partagés (`services/` → `shared/services/`)

| Service | Export principal | Usage |
|---------|-----------------|-------|
| `api.ts` | `api` (default), `getApiErrorMessage`, `getImageUrl`, `isUnauthorizedError`, `BASE_URL` | **Partout** |
| `dataCache.ts` | `getCache`, `setCache`, `clearCache`, `getCategoryCache`, `setCategoryCache` | Screens avec cache |
| `formatters.ts` | `formatEventDate`, `formatEventCardPriceLabel` | Event/place cards |
| `i18n.ts` | `useI18n` (via hook), `TranslationKey` | Partout (via `use-i18n`) |
| `media-upload.ts` | `buildMediaUploadPayload`, `inferMediaKind`, `isMediaFileTooLarge` | post, direct-chat |

### Point d'attention : `isUnauthorizedError`

```typescript
// ✅ TOUJOURS importer depuis services/api — jamais redéfinir localement
import { isUnauthorizedError } from '@/services/api';
```

### TTL du cache (`dataCache.ts`)

| Clé | TTL |
|-----|-----|
| `events` | 5 minutes |
| `homeEvents` | 5 minutes |
| `exploreEvents` | 5 minutes |
| `places` | 10 minutes |
| `categories` | 30 minutes |
| `cities` | 60 minutes |
| `discover` | pas de TTL (null) |
| `explore` | pas de TTL (null) |

### Pagination curseur (`GET /events`)

Le backend renvoie `{ items: T[], nextCursor: string | null, hasMore: boolean }`.  
Tous les appelants qui n'ont pas besoin d'infinite scroll doivent passer `?limit=100`.

| Appelant | Paramètres |
|----------|-----------|
| `app/events.tsx` (feed principal) | `?limit=20` + cursor pour infinite scroll |
| `hooks/useHomeScreen.ts` | `?upcoming=true&limit=100` |
| `hooks/useDiscoverScreen.ts` | `?upcoming=true&limit=100` |
| `app/(tabs)/explore.tsx` | `?upcoming=true&limit=100` |
| `app/post.tsx` (picker) | `?limit=50` |
| `MapScreen.native.tsx` | `?limit=100` |

---

## 12. Conventions de code

### Nommage

```
Composant React    → PascalCase.tsx        (EventDetailHero.tsx)
Hook custom        → camelCase avec "use"  (useEventDetail.ts)
Service/utilitaire → kebab-case.ts         (event-bookings.ts)
Types globaux      → camelCase.ts ou .d.ts (social.ts)
Écran Expo Router  → kebab-case.tsx        (event-edit.tsx)
```

### Structure d'un composant

```typescript
// 1. Imports React
import React, { useCallback, useMemo, useState } from 'react';
// 2. Imports React Native
import { FlatList, Text, View } from 'react-native';
// 3. Imports tiers (expo, icons...)
import { Ionicons } from '@expo/vector-icons';
// 4. Imports features/ (si dans shared/) ou shared/ (si dans features/)
import { isUnauthorizedError } from '@/services/api';
// 5. Imports locaux (même domaine)
import { EventCard } from './EventCard';
// 6. Types
type Props = { ... };
// 7. Composant
export function MonComposant({ ... }: Props) { ... }
```

### Gestion des erreurs 401

```typescript
// ✅ Pattern standard — TOUJOURS utiliser ceci
import { isUnauthorizedError } from '@/services/api';

try {
  // appel API
} catch (error) {
  if (isUnauthorizedError(error)) {
    await clearAuthState();
    router.replace('/');
    return;
  }
  // gérer autres erreurs
}
```

### AbortController dans les useEffect

```typescript
// ✅ Pattern recommandé pour appels API dans useEffect
useEffect(() => {
  const controller = new AbortController();

  const load = async () => {
    try {
      const response = await api.get('/endpoint', { signal: controller.signal });
      setData(response.data);
    } catch {
      if (!controller.signal.aborted) {
        setData([]);
      }
    }
  };

  void load();

  return () => controller.abort();
}, [dependency]);
```

### Interdictions

- ❌ **Ne jamais** définir `isUnauthorized` localement dans un écran
- ❌ **Ne jamais** faire `api.get('/events')` sans `?limit=` (risque de crash avec 10k+ events)
- ❌ **Ne jamais** modifier `components/ui/BottomSheetModal.tsx` (@gorhom/bottom-sheet est instable)
- ❌ **Ne jamais** pousser du code avec `npx tsc --noEmit` qui échoue
- ❌ **Ne jamais** utiliser `origin: '*'` dans les WebSocket gateways (utiliser `ALLOWED_ORIGINS` env)

---

## 13. Patterns de state management

### Pas de store global — local state par écran

HangOutHub n'utilise **pas** de Redux, Zustand ou MobX.  
Chaque écran gère son propre état local via `useState` / `useReducer`.  
La communication entre écrans se fait via les paramètres de navigation ou le cache (`dataCache`).

### Pattern useReducer pour les grands écrans

Pour les écrans avec beaucoup d'états liés (ex: formulaire de création), préférer `useReducer` :

```typescript
// ❌ À éviter : 27 useState indépendants
const [title, setTitle] = useState('');
const [date, setDate] = useState('');
const [loading, setLoading] = useState(false);
// ... 24 autres

// ✅ Préférer : useReducer ou objets groupés
type FormState = {
  title: string;
  date: string;
  // ...
};
const [form, setForm] = useReducer(formReducer, initialForm);
```

### Cache et fraîcheur des données

```typescript
// TTL configuré dans dataCache.ts
// Pour forcer un refresh : clearCache('events') puis recharger
// Pour lire du cache : getCache<T>('events') retourne null si expiré
```

### Real-time

- **DM** : `direct-chat-realtime.ts` via Socket.io — rooms par `userId` + `conversationId`
- **Posts** : `post-realtime.ts` via Socket.io — events likes/comments
- **Outings** : polling 60s (pas de socket)
- **Notifs organisateur** : polling 30s

---

### Refactor `post.tsx` — 30 useState → 4 groupes (tâche en attente)

`app/post.tsx` contient ~30 `useState` indépendants. Le refactoring consiste à les regrouper en **4 objets + 1 bool** sans changer la logique. Chaque setter devient `setXState(prev => ({ ...prev, field: value }))`.

**Groupes cibles** :

```typescript
// Groupe 1 — Contenu du post (ce qui sera soumis à l'API)
type PostFormState = {
  content: string;
  mediaItems: PostMediaItem[];
  visibility: PostVisibility;
  selectedVisibilityUserIds: string[];
  placeId: string;
  eventId: string;
  eventTitle: string;
  placeName: string;
  cityName: string;
  ambiance: string;
};

// Groupe 2 — État UI (modales + étape du formulaire)
type PostUIState = {
  showCustomAudienceModal: boolean;
  showVisibilityModal: boolean;
  showPlanModal: boolean;
  currentStep: number;           // 1 = édition, 2 = prévisualisation
};

// Groupe 3 — Sélections dans la modale Plan
type PostPlanState = {
  planTarget: 'place' | 'event';
  placeSearch: string;
  selectedPlaceId: string | null;
  eventSearch: string;
  selectedEventId: string | null;
};

// Groupe 4 — Données chargées depuis l'API (catalogue)
type PostCatalogState = {
  categories: CategoryOption[];
  categoriesLoading: boolean;
  places: PlaceOption[];
  placesLoading: boolean;
  events: EventOption[];
  eventsLoading: boolean;
  audienceConnections: FriendshipItem[];
  audienceLoading: boolean;
  audienceSearch: string;
};

// + 1 bool simple (submit en cours)
const [submitting, setSubmitting] = useState(false);
```

**Valeurs initiales** :
```typescript
const [form, setForm] = useState<PostFormState>({
  content: params.content ? String(params.content) : '',
  mediaItems: parseImagesParam(params.images).map((uri) => ({ uri })),
  visibility: params.visibility || (params.postType === 'plan' ? 'friends' : 'public'),
  selectedVisibilityUserIds: parseIdArrayParam(params.visibilityUserIds),
  placeId: params.placeId ? String(params.placeId) : '',
  eventId: params.eventId ? String(params.eventId) : '',
  eventTitle: params.eventTitle ? String(params.eventTitle) : '',
  placeName: params.placeName ? String(params.placeName) : '',
  cityName: params.cityName ? String(params.cityName) : '',
  ambiance: params.ambiance ? String(params.ambiance) : '',
});

const [ui, setUI] = useState<PostUIState>({
  showCustomAudienceModal: false,
  showVisibilityModal: false,
  showPlanModal: false,
  currentStep: 1,
});

const [plan, setPlan] = useState<PostPlanState>({
  planTarget: params.eventId ? 'event' : 'place',
  placeSearch: '',
  selectedPlaceId: null,
  eventSearch: '',
  selectedEventId: null,
});

const [catalog, setCatalog] = useState<PostCatalogState>({
  categories: [],
  categoriesLoading: false,
  places: [],
  placesLoading: false,
  events: [],
  eventsLoading: false,
  audienceConnections: [],
  audienceLoading: false,
  audienceSearch: '',
});
```

**Exemple de mise à jour** :
```typescript
// Avant :  setContent('nouveau texte')
// Après :  setForm(prev => ({ ...prev, content: 'nouveau texte' }))

// Avant :  setShowPlanModal(true)
// Après :  setUI(prev => ({ ...prev, showPlanModal: true }))

// Avant :  setCategoriesLoading(true); setCategories(data)
// Après :  setCatalog(prev => ({ ...prev, categoriesLoading: true }))
//          setCatalog(prev => ({ ...prev, categoriesLoading: false, categories: data }))
```

**Points d'attention** :
- `publicationScope` reste une constante dérivée des params (pas dans les states)
- `loading` (renommé `submitting`) reste un `boolean` séparé pour clarté
- Chercher et remplacer : `setContent(`, `setVisibility(`, `setPlaceId(`, etc. dans tout le fichier
- Vérifier `npx tsc --noEmit` après le refactor

---

## 14. Suivi de migration — progression

> Mettre à jour cette section après chaque session de travail.  
> **Dernière mise à jour** : 2026-05-02 (session 2)

### Phase 1 — Restructuration services/

```
Statut global : ✅ TERMINÉ (9/9 tâches) — 2026-05-03
```

| Sous-dossier | Fichiers déplacés | Stubs créés | Barrel index.ts |
|---|---|---|---|
| `services/api/` | `api.ts`, `navigation.ts`, `dataCache.ts` | ✅ | ✅ |
| `services/auth/` | `user-session.ts`, `app-preferences.ts` | ✅ | ✅ |
| `services/events/` | `event-bookings.ts`, `event-collaborators.ts`, `event-revisions.ts` | ✅ | ✅ |
| `services/places/` | `place-team.ts`, `place-claims.ts` | ✅ | ✅ |
| `services/social/` | `posts.ts`, `post-events.ts`, `post-realtime.ts`, `reports.ts` | ✅ | ✅ |
| `services/messaging/` | `direct-chats.ts`, `direct-chat-meta.ts`, `direct-chat-realtime.ts`, `outings.ts` | ✅ | ✅ |
| `services/organizer/` | 10 fichiers (organizer-*, scanner-*, admin-*, organizer-ui, organizer-analytics) | ✅ | ✅ |
| `services/user/` | `friendships.ts`, `settings.ts` | ✅ | ✅ |
| `services/shared/` | `formatters.ts`, `i18n.ts`, `media.ts`, `media-upload.ts`, `location-preferences.ts`, `ticket-status.ts`, `recommendation-onboarding.ts`, `user-flow-analytics.ts` | ✅ | ✅ |

**Notes importantes** :
- Les stubs aux anciens chemins (`services/api.ts`, `services/dataCache.ts`, etc.) assurent la rétro-compatibilité — tous les imports existants fonctionnent sans changement
- `services/api/api.ts` : 3 imports relatifs cross-domaine corrigés (`../auth/app-preferences`, `../messaging/direct-chat-realtime`, `../social/post-realtime`)
- `services/user/friendships.ts` : import `../../types/social` corrigé (niveau de profondeur ajusté)
- TypeScript : **0 erreur** confirmé après migration

### Phase 2 — Migration components/

```
Statut global : 🔲 Non commencé (0/8 sous-tâches)
```

### Phase 3 — Extraction gros écrans

```
Statut global : 🔲 Non commencé (0/6 écrans)
```

### Phase 4 — Finalisation hooks/ + shared/

```
Statut global : 🔲 Non commencé (0/18 tâches)
```

### Améliorations qualité déjà appliquées (avant migration)

Ces corrections ont été faites sur la structure actuelle et doivent être **préservées** pendant la migration :

| Date | Correction | Fichiers |
|------|-----------|---------|
| 2026-05-02 | TypeScript 0 erreur (frontend + backend) | Tout le projet |
| 2026-05-02 | Pagination cursor `GET /events` (limit=20, max=100) | `events.service.ts`, `events.controller.ts` |
| 2026-05-02 | Infinite scroll `app/events.tsx` (FlatList + ScrollView) | `app/events.tsx` |
| 2026-05-02 | Tous les appelants `GET /events` mis à jour | `useHomeScreen`, `useDiscoverScreen`, `explore`, `MapScreen`, `post.tsx` |
| 2026-05-02 | WebSocket CORS — `ALLOWED_ORIGINS` env var | `direct-chats.gateway.ts`, `posts.gateway.ts` |
| 2026-05-02 | OTP rate limit renforcé (5 req / 15 min) | `auth.controller.ts` |
| 2026-05-02 | `isUnauthorizedError` centralisé dans `services/api.ts` | 18 fichiers mis à jour |
| 2026-05-02 | `dataCache` — TTL par clé (events 5min, categories 30min...) | `services/dataCache.ts` |
| 2026-05-02 | `messages.tsx` — polling direct supprimé (socket suffit) | `app/messages.tsx` |
| 2026-05-02 | `post.tsx` — `AbortController` dans useEffect | `app/post.tsx` |
| 2026-05-02 | `place.tsx` — `AbortController` dans `loadCategories` + `availableTags` → `useMemo` | `app/place.tsx` |

---

## Comment utiliser ce document (pour GitHub Copilot / Claude)

Si tu reprends ce projet sans contexte de session précédente :

1. **Lis d'abord le bloc ⚡ PROCHAINES TÂCHES** tout en haut — c'est la liste priorisée de ce qu'il reste à faire.
2. **Vérifie TypeScript** : `cd frontend && npx tsc --noEmit` doit retourner 0 erreur avant de commencer.
3. **Ne jamais refaire ce qui est déjà coché ✅** dans le bloc PROCHAINES TÂCHES.
4. Pour chaque fichier déplacé (phases 1-4) : mettre à jour tous ses imports et cocher la case dans ce document.
5. **Ne jamais déplacer sans vérifier TypeScript après**.
6. Mettre à jour la date "Dernière mise à jour" à chaque session.

### Règles absolues à ne jamais enfreindre

```
1. npx tsc --noEmit = 0 erreur avant tout commit
2. Ne jamais définir isUnauthorized() localement — importer depuis @/services/api
3. Ne jamais faire api.get('/events') sans ?limit= (crash avec 10k+ events)
4. Ne jamais modifier BottomSheetModal.tsx (@gorhom/bottom-sheet est instable)
5. Ne jamais utiliser origin: '*' dans les WebSocket gateways
6. Ne jamais déplacer plusieurs fichiers en même temps — un à la fois, TS check après chaque
```

### Contexte backend (pour les tâches backend)

Le backend est en NestJS + Prisma + PostgreSQL, dans `../backend/src/`.  
Structure : `src/[module]/[module].controller.ts + service.ts + gateway.ts (WebSocket)`.  
La tâche "cache analytics" concerne `src/events/events.service.ts` méthode `getEventOverview()`.

---

*Document généré le 2026-05-02 — HangOutHub Frontend Architecture v1.1*
