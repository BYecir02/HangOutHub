# HangOutHub Component Roadmap

Objectif: stabiliser une bibliothèque de composants internes HangOutHub, réutilisable dans tout le frontend React Native, sans sur-généraliser.

## Règles de base

- Ne pas créer un composant ultra-générique qui prend trop de props.
- Garder trois niveaux:
  - primitives UI
  - composants métier réutilisables
  - wrappers de page
- Réutiliser ce qui existe déjà avant de créer un nouveau composant.
- Si un composant existe mais mélange plusieurs responsabilités, le découper avant d'en créer un autre.

## Fondations déjà en place

Ces briques existent déjà et doivent servir de base:

- [BottomSheetModal](../frontend/components/ui/BottomSheetModal.tsx)
- [BottomSheetListModal](../frontend/components/ui/BottomSheetListModal.tsx)
- [CatalogScreenLayout](../frontend/components/ui/CatalogScreenLayout.tsx)
- [MasonryGrid](../frontend/components/ui/MasonryGrid.tsx)
- [MediaFrame](../frontend/components/ui/MediaFrame.tsx)
- [ScreenState](../frontend/components/ui/ScreenState.tsx)
- [Skeleton](../frontend/components/ui/Skeleton.tsx)
- [FilterChipsBar](../frontend/components/ui/FilterChipsBar.tsx)
- [SearchBar](../frontend/components/ui/SearchBar.tsx)
- [LocationScopeBar](../frontend/components/ui/LocationScopeBar.tsx)
- [InspirationCardShell](../frontend/components/ui/InspirationCardShell.tsx)
- [PlaceInspirationCard](../frontend/components/ui/PlaceInspirationCard.tsx)
- [EventInspirationCard](../frontend/components/ui/EventInspirationCard.tsx)
- [PlaceCard](../frontend/components/ui/PlaceCard.tsx)
- [EventCard](../frontend/components/ui/EventCard.tsx)
- [EntityCard](../frontend/components/ui/EntityCard.tsx)
- [CategoryCard](../frontend/components/ui/CategoryCard.tsx)
- [PersonRow](../frontend/components/social/PersonRow.tsx)
- [DirectConversationCard](../frontend/components/messages/DirectConversationCard.tsx)
- [OutingConversationCard](../frontend/components/messages/OutingConversationCard.tsx)
- [CommentItem](../frontend/components/social/CommentItem.tsx)
- [TicketStatusBadge](../frontend/components/ui/TicketStatusBadge.tsx)
- [ContactAction](../frontend/components/ui/ContactAction.tsx)
- [Tabs](../frontend/components/ui/Tabs.tsx)
- [ReportReasonSheet](../frontend/components/ui/ReportReasonSheet.tsx)
- [ChatScreenShell](../frontend/components/ui/ChatScreenShell.tsx)

## Ce qui doit être standardisé en premier

### 1. Primitives UI

Priorité haute. Ces composants servent partout et réduisent la duplication de base.

- `Button`
  - variantes: primary, secondary, ghost, destructive
  - taille: sm, md, lg
- `Avatar`
  - image utilisateur standard
  - fallback initiales
- `Badge`
  - status, catégories, compteurs
- `Divider`
  - séparateur simple
- `Chip`
  - labels, filtres, tags
- `PriceDisplay`
  - format monétaire centralisé
- `RatingDisplay`
  - note + étoiles + fallback
- `Toast` / `SnackBar`
  - retour d'action léger
- `ListItem`
  - ligne standard pour settings, notifications, sélecteurs

Critère de fin:
- ces primitives sont utilisées dans au moins 2 écrans chacune
- on n’a plus de duplication directe de la même structure visuelle dans les pages principales

### 2. Cartes métier

Priorité haute. C’est là que HangOutHub a le plus de duplication visuelle.

- `InspirationCard`
  - base commune
  - devrait rester mince
  - peut être réduit à un shell + slots clairs
- `PlaceInspirationCard`
  - doit rester la référence pour les cartes de lieux
- `EventInspirationCard`
  - doit rester la référence pour les cartes d’événements
- `PlaceCard`
  - carte compacte de base pour listes et browse simple
- `EventCard`
  - carte compacte d’événement
- `EntityCard`
  - à clarifier: scinder en `EntityRowCard` et `EntityCoverCard` si nécessaire
- `SuggestionCard`
  - à conserver si la logique reste simple

Critère de fin:
- une seule source de vérité pour les cartes inspiration de lieux et d’événements
- pas de cartes locales dupliquées dans les pages `places`, `events`, `discover`, `category`, `map`

### 3. Layouts et wrappers

Priorité haute. Ici on mutualise le cadre d’écran plutôt que le contenu.

- `CatalogScreenLayout`
  - continuer comme wrapper standard pour places / events / discover
- `BottomSheetModal`
  - garder comme base unique des sheets
- `BottomSheetListModal`
  - garder pour les sélecteurs simples
- `ChatScreenShell`
  - garder pour les vues chat
- `ScreenHeader`
  - harmoniser son API avec `Header` si besoin
- `Header`
  - garder comme app bar générique

Critère de fin:
- les pages utilisent les wrappers existants au lieu de recréer leur layout
- les modales et sheets ont un comportement homogène

### 4. Social et messages

Priorité moyenne à haute.

- `PostItem`
  - à décomposer en sous-composants si on continue à l’étendre
- `SocialEmptyState`
  - à supprimer progressivement au profit de `ScreenState`
- `DirectConversationCard`
  - à garder
- `OutingConversationCard`
  - à garder
- `PersonRow`
  - à garder, mais vérifier les variantes d’action
- `CommentItem`
  - à garder

Critère de fin:
- plus d’états vides parallèles à `ScreenState`
- `PostItem` ne reste pas un bloc monolithique si de nouvelles fonctions y sont ajoutées

## Roadmap d'implémentation

### Phase 1: assainir les bases visuelles

1. Créer `Button`
2. Créer `Avatar`
3. Créer `Badge`
4. Créer `Divider`
5. Créer `PriceDisplay`
6. Créer `RatingDisplay`

Livrable attendu:
- ces primitives sont importables depuis un seul dossier clair
- les composants doivent rester simples et typés

### Phase 2: unifier les cartes

1. Réduire `InspirationCard` à un vrai rôle de base ou le supprimer si `InspirationCardShell` suffit
2. Garder `PlaceInspirationCard` comme référence de carte lieu
3. Garder `EventInspirationCard` comme référence de carte événement
4. Clarifier `EntityCard`
5. Vérifier si `PlaceCard` et `EventCard` doivent devenir les versions compactes officielles

Livrable attendu:
- pas de duplication locale de cartes dans les pages métier
- une carte = une responsabilité claire

### Phase 3: standardiser les listes et rows

1. Créer `ListItem`
2. Étendre ou normaliser `PersonRow`
3. Vérifier `DirectConversationCard` et `OutingConversationCard`
4. Harmoniser les empty states sur `ScreenState`

Livrable attendu:
- settings, notifications, search, connections et messages utilisent les mêmes patterns de row

### Phase 4: découper les composants trop denses

1. Décomposer `PostItem` si besoin
2. Normaliser les panneaux sociaux comme `SocialFeedHeader`
3. Réduire les variantes ad hoc dans `discover`, `category`, `home`

Livrable attendu:
- les composants longs sont composés de petites briques internes

### Phase 5: consolider les écrans catalogue

1. Garder `CatalogScreenLayout`
2. Garder `MasonryGrid`
3. S’assurer que `places`, `events`, `discover`, `category`, `map` réutilisent les mêmes bases
4. Éviter les grilles locales non réutilisables

Livrable attendu:
- chaque écran catalogue assemble des composants déjà validés

## Ordre recommandé pour implémenter

1. `Button`
2. `Avatar`
3. `Badge`
4. `Divider`
5. `PriceDisplay`
6. `RatingDisplay`
7. `ListItem`
8. `ScreenState` comme état vide unique
9. `EntityCard` clarification
10. éventuel découpage de `PostItem`

## Ce qu'il ne faut pas faire

- ne pas créer un composant `UniversalCard` qui sert à tout
- ne pas multiplier les variantes locales par page
- ne pas dupliquer les empty states
- ne pas réintroduire des grilles locales si `MasonryGrid` suffit
- ne pas recréer des wrappers de sheet si `BottomSheetModal` couvre déjà le besoin

## Décision produit

HangOutHub doit se rapprocher d'un design system interne léger, orienté produit, pas d'une bibliothèque UI générique.

Le bon modèle est:

- primitives simples
- composants métier réutilisables
- wrappers de page

C'est le meilleur compromis entre maintenabilité, vitesse d'itération et cohérence visuelle.
