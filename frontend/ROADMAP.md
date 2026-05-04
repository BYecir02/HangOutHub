# HangOutHub Frontend — Roadmap

## ✅ Fait

### Architecture FSD
- [x] Migration de tous les écrans `app/` → `features/*/screens/`
- [x] Suppression des anciens dossiers stubs (`hooks/`, `components/`, `services/*.ts` flat)
- [x] `tailwind.config.cjs` — ajout de `features/`, `shared/`, `context/`, `config/` dans `content`
- [x] ESLint — règles de boundaries FSD (features → screens/hooks privés, shared → pas de features)
- [x] Suppression de 11 fichiers barrel inutiles (`types.ts`, `types/social.ts`, `constants/theme.ts`, `services/*/index.ts`)
- [x] Correction des 18+ imports cassés après suppression des barrels

### Refactoring
- [x] `PostCreateScreen` — 30 useState → 5 groupes avec alias setters
- [x] `CategoryScreen` (1073L) → split `category-scoring.ts` + `CategoryEmptyBlock`
- [x] `MessagesScreen` (744L) → split `MessagesTabBar`, `MessagesOutingsList`, `MessagesDirectChatsList`
- [x] `OrganizerSettingsScreen` (936L) → split 5 sections + `settings-helpers.ts`

### Page d'accueil
- [x] Section "À la une" — carte unique centrée horizontalement
- [x] Section "À la une" — point de pagination masqué si 1 seul item
- [x] Section "À la une" — skeleton animé (pulse) au chargement
- [x] Section "Recommandé" — skeleton animé (2 colonnes) au chargement
- [x] Header transparent sur la home
- [x] Header — contraste adapté dark/light en mode transparent
- [x] Section "Recommandé" — titre dynamique ("Recommandé pour toi" vs "Tendances près de chez toi") selon profil utilisateur

---

## 🔴 Critique — Performance

- [x] **`MapScreen` — playback simultané list + panneau détail** — `MapSuggestionsMasonry` reçoit `isPanelOpen` et gate `shouldPlay={activeItemId === tile.id && !isPanelOpen}` → plus de double lecture vidéo quand un lieu/événement est sélectionné
- ~~**`AuthBootstrapContext.Provider`**~~ — Faux positif : `value={authState}` est une référence `useState` stable, React Context ne notifie les consumers que si la référence change. Rien à faire.
- ~~**Cascade `useEffect` dans `MapScreen`**~~ — Faux positif : `fetchPlaces`, `fetchEvents`, `fetchCategories` ont des deps `[]` stables. `handleTogglePlaceSave` a `t` en dep mais n'est pas dans un `useEffect`.

---

## 🟠 Majeur — Performance

- [x] **`ItemSeparatorComponent` inline** — extrait comme `ListSeparator` constante hors composant (7 occurrences : `DiscoverScreen`, `ExploreScreen`, `EventsScreen`, `PlacesScreen`)
- ~~**`PostItem.memo()` ineffectif**~~ — Faux positif : `handleDeletePost`, `handleEditPost`, `handleCommentPost`, `handleSharePost` sont déjà dans `useCallback` dans `SocialFeed.tsx`. Le memo est effectif.
- ~~**`onPress={() => ...}` inline dans `renderItem`**~~ — Impact nul sans `React.memo` sur les composants item (`EventCard`, `PlaceCard`, `EntityRowCard` non mémoïsés). `EventsScreen` et `PlacesScreen` utilisent déjà des refs stables (`renderListEventItem` / `renderListPlaceItem`). Inutile sans refacto mémo des cartes.

---

## 🟡 Mineur — Performance

- [x] **`ChatMedia.tsx`** — `shouldPlay={index === previewIndex}` dans le carousel, `ZoomableImage` accepte un prop `shouldPlay`
- [x] **Styles objets inline** — `MARKER_STYLE_PLACE/EVENT` constants dans `MapScreen.native.tsx`, `categoryHeaderStyle` useMemo dans `CategoryScreen.tsx`

---

## 🔵 Architecture — À faire

- ~~**`(tabs)/create.tsx`**~~ — Faux positif : le `tabPress` est intercepté avec `e.preventDefault()` → `router.push('/create-modal')` dans `_layout.tsx:171`. Le placeholder ne s'affiche jamais, c'est intentionnel (Expo Router exige le fichier pour enregistrer l'onglet).
- [x] **TypeScript** — 0 erreurs `npx tsc --noEmit` ✅
- [ ] **`types/` et `constants/`** par domaine — `Category` dans `shared/types`, social types dans `features/social/types` ✅ (déjà fait)

---

## 💡 Idées / Backlog

- [x] Skeletons sur toutes les sections home (`HomeFeaturedSection`, `HomeCategoriesSection` pills, `HomeRecommendedSection` masonry)
- ~~`getItemLayout`~~ — Skip : `EntityRowCard.title` a `numberOfLines={2}`, hauteur non garantie. Risque de décalage.
- ~~`removeClippedSubviews`~~ — Skip : défaut Android OK, iOS cause des artifacts au scroll rapide. `SocialFeed` l'a explicitement désactivé pour les vidéos.
- ~~Lazy loading des écrans organizer~~ — Expo Router lazy-load les screens à la navigation par défaut. Rien à implémenter.
