# Frontend Reusable Components Audit (A a Z)

Date: 2026-03-28
Repo: HangOutHub frontend
Scope: `frontend/app` (53 pages) + `frontend/components` (32 composants)

## 1) Avis global
Ton initiative est excellente.

Pourquoi c'est un tres bon move:
- vitesse: on developpe plus vite apres extraction
- coherence: UI/UX plus uniforme
- qualite: moins de bugs lies au copier-coller
- maintenabilite: moins de code a modifier pour un meme changement
- onboarding: plus simple pour toi (et d'autres devs) de reprendre le projet

Risque principal:
- sur-factoriser trop tot.

Regle recommandee:
- extraire d'abord les blocs repetes au moins 3 fois, stables, et avec logique metier faible.

---

## 2) Composants deja existants (et a mieux reutiliser)

### UI
- `frontend/components/ui/Header.tsx`
- `frontend/components/ui/SearchBar.tsx`
- `frontend/components/ui/Tabs.tsx`
- `frontend/components/ui/Skeleton.tsx`
- `frontend/components/ui/EventCard.tsx`
- `frontend/components/ui/PlaceCard.tsx`
- `frontend/components/ui/CategoryCard.tsx`
- `frontend/components/ui/SuggestionCard.tsx`

### Social
- `frontend/components/social/SocialFeed.tsx`
- `frontend/components/social/PostItem.tsx`
- `frontend/components/social/CommentItem.tsx`
- `frontend/components/social/PersonRow.tsx`
- `frontend/components/social/PersonActionButton.tsx`
- `frontend/components/social/SocialEmptyState.tsx`
- `frontend/components/social/SocialCountChip.tsx`

### Auth
- `frontend/components/auth/AuthTextField.tsx`
- `frontend/components/auth/AuthStepIndicator.tsx`
- `frontend/components/auth/RoleOptionCard.tsx`

### Chat
- `frontend/components/direct-chat/ChatComposer.tsx`
- `frontend/components/direct-chat/ChatMedia.tsx`

### Profile
- `frontend/components/profile/ProfileHeader.tsx`
- `frontend/components/profile/ProfileStats.tsx`

### Observation
Ces composants sont bons, mais la plupart des ecrans recreent encore leur propre:
- header
- etats loading/error/empty
- cards de liste
- bottom sheets
- chips filtres

---

## 3) Liste complete des composants reutilisables a creer (ou consolider)

## 3.1 Foundation / Screen Shell
- `ScreenHeader`
  - props: title, subtitle, back, rightAction, tone
  - remplace les dizaines de headers recodes
- `HeroHeader`
  - variante avec label uppercase + title + subtitle + back button stylise
- `ScreenContainer`
  - standardise `pt-14/pt-16`, paddings, dark mode, safe area
- `SectionTitleRow`
  - titre + CTA "voir tout" + compteur optionnel

## 3.2 Etats de page
- `ScreenState`
  - modes: loading, error, empty, warning
  - retry callback
- `InlineWarningBanner`
  - ex sync warning orange
- `RetryCard`
  - titre + message + bouton retry
- `EmptyPanel`
  - icone + titre + description + CTA optionnel

## 3.3 Lists, cards, rows
- `EntityCard`
  - image/avatar + title + subtitle + meta + badges + action
- `HorizontalCarouselSection`
  - titre section + FlatList horizontal + skeleton + empty
- `MetricCounterCard`
  - KPI small card (dashboard, scans, stats)
- `StatusBadge`
  - mapping label + couleurs pour statuses
- `LocationBadge`
  - badge ville/pays/lieu
- `FilterChipsBar`
  - chips horizontaux avec active state

## 3.4 Bottom sheets / modals
- `BottomSheetModal`
  - overlay + drag handle + header + close
- `BottomSheetListModal`
  - search + list + loading/error/empty
- `ActionSheet`
  - liste d'actions (edit/delete/report/etc.)
- `ConfirmDialog`
  - titre + message + actions

## 3.5 Form controls
- `FormTextField`
  - label + input + helper + error
- `FormTextArea`
  - multiline standard
- `FormNumberField`
  - parse + validation simple
- `FormImagePicker`
  - preview + add/remove + cover selection
- `DateTimeField`
  - text + open picker + format
- `ToggleRow`
  - deja duplique dans settings
- `ChoiceChips`
  - selection single/multi
- `AudiencePicker`
  - selection des connexions (custom visibility, partage)

## 3.6 Chat stack
- `ChatScreenShell`
  - header + sync banner + list + composer
- `ChatMessageList`
  - FlatList + pagination + empty
- `MessageBubble`
  - mine/other + status + timestamp + reactions
- `MessageActionsSheet`
  - reply/copy/edit/delete/report
- `TypingIndicator`
- `AttachmentPreviewGrid`

## 3.7 Domain components
- `LocationScopeBar`
  - label localisation + bouton changer
- `EventSummaryCard`
- `PlaceSummaryCard`
- `TicketCard`
- `TicketQRCodeCard`
- `OrganizerEventRow`
- `RevisionRow`
- `ScanRow`
- `NotificationRow`
- `ContactOrganizerButton` / `ContactPlaceButton`
- `ReportReasonSheet`

## 3.8 Hooks reutilisables
- `useScreenAsync`
  - loading/error/retry/refresh
- `usePaginatedList`
  - nextCursor + loadMore + dedupe
- `useSearchQuery`
  - debounce + reset
- `useLocationScope`
  - city/country + hydrate from preferences
- `useBottomSheetState`
- `useSelectionState`
- `useSyncWarning`

## 3.9 Utils a centraliser
- `formatEventDate`
- `formatPrice`
- `formatRelativeDate`
- `formatStatusLabel`
- `status tone maps` (tickets/scans/notifications)

---

## 4) Carte complete A a Z par page (53 pages)

Format:
- Reuse actuel = composants deja utilises
- Candidats = composants reutilisables a extraire/brancher

### Tabs
- `frontend/app/(tabs)/_layout.tsx`
  - Reuse actuel: navigation tabs
  - Candidats: `TabConfigFactory`, `TabScreenOptions`
- `frontend/app/(tabs)/create.tsx`
  - Reuse actuel: placeholder
  - Candidats: (aucun urgent)
- `frontend/app/(tabs)/explore.tsx`
  - Reuse actuel: `SearchBar`, `EventCard`, `SkeletonBlock`
  - Candidats: `HeroHeader`, `ScreenState`, `CatalogScreenLayout`
- `frontend/app/(tabs)/home.tsx`
  - Reuse actuel: `Header`, `CategoryCard`, `EventCard`, `PlaceCard`, `SuggestionCard`
  - Candidats: `SectionTitleRow`, `HorizontalCarouselSection`, `LocationScopeBar`
- `frontend/app/(tabs)/map.tsx`
  - Reuse actuel: aucun composant map dedie
  - Candidats: `MapTopBar`, `MapLayerToggle`, `MapEntityPreviewCard`, `MapRadiusControl`
- `frontend/app/(tabs)/profile.tsx`
  - Reuse actuel: `ProfileHeader`, `ProfileStats`, `Tabs`, `PostItem`, `SkeletonBlock`
  - Candidats: `EmptyPanel` (deja inline), `ProfileSectionHeader`
- `frontend/app/(tabs)/social.tsx`
  - Reuse actuel: `SocialFeed`
  - Candidats: (deja bien encapsule)

### Core app
- `frontend/app/_layout.tsx`
  - Reuse actuel: stack routing
  - Candidats: route constants centralises
- `frontend/app/category/[id].tsx`
  - Reuse actuel: `EventCard`, `PlaceCard`, `SkeletonBlock`
  - Candidats: `CategoryHero`, `HorizontalEntityCarousel`, `EmptyPanel`
- `frontend/app/comments.tsx`
  - Reuse actuel: `CommentItem`
  - Candidats: `BottomSheetModal`, `CommentComposer`, `ReplyBanner`
- `frontend/app/connections.tsx`
  - Reuse actuel: `PersonRow`, `PersonActionButton`, `SocialCountChip`, `SocialEmptyState`
  - Candidats: `SocialNetworkScreenLayout`, hook `useFriendshipOverview`
- `frontend/app/create-modal.tsx`
  - Reuse actuel: aucun
  - Candidats: `CreateActionSheet`, `ActionTile`
- `frontend/app/direct-chat/[id].tsx`
  - Reuse actuel: `ChatComposer`, `ChatMedia`
  - Candidats: `ChatScreenShell`, `MessageBubble`, `MessageActionsSheet`, `TypingIndicator`
- `frontend/app/discover.tsx`
  - Reuse actuel: `SearchBar`, `SkeletonBlock`
  - Candidats: `CatalogScreenLayout`, `LocationScopeBar`, `FilterChipsBar`, `EntityCard`
- `frontend/app/edit-profile.tsx`
  - Reuse actuel: aucun
  - Candidats: `ProfileEditorForm`, `FormImagePicker`, `ScreenHeader`
- `frontend/app/event.tsx` (create event)
  - Reuse actuel: aucun (gros wizard)
  - Candidats: `EventFormWizard`, `TicketTypeEditor`, `PromoEditor`, `CheckInWindowEditor`, `FormImagePicker`
- `frontend/app/event/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: `EventHero`, `TicketTypeList`, `PolicyAccordion`, `ReportReasonSheet`, `ContactAction`
- `frontend/app/event-booking/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: `EventBookingSheet`, `TicketSelector`, `PromoCodeField`, reuse de `EventHero`
- `frontend/app/event-edit/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: reutiliser `EventFormWizard` (mode edit)
- `frontend/app/events.tsx`
  - Reuse actuel: `SearchBar`, `SkeletonBlock`
  - Candidats: `CatalogScreenLayout`, `LocationScopeBar`, `FilterChipsBar`, `EntityCard`
- `frontend/app/event-scans/[id].tsx`
  - Reuse actuel: inline `CounterCard`
  - Candidats: `MetricCounterCard`, `ScanRow`, `ScreenState`
- `frontend/app/friend-requests.tsx`
  - Reuse actuel: `PersonRow`, `PersonActionButton`, `SocialCountChip`, `SocialEmptyState`
  - Candidats: `SocialNetworkScreenLayout`, hook `useFriendshipOverview`
- `frontend/app/help-support.tsx`
  - Reuse actuel: aucun
  - Candidats: `SettingsCard`, `ScreenHeader`
- `frontend/app/index.tsx` (login)
  - Reuse actuel: `AuthTextField`
  - Candidats: `AuthHeroLayout`, `AuthPrimaryButton`, `HighlightChip`
- `frontend/app/location.tsx`
  - Reuse actuel: aucun
  - Candidats: `LocationCountryChips`, `LocationCityList`, `ScreenState`
- `frontend/app/messages.tsx`
  - Reuse actuel: `PersonRow`
  - Candidats: `ConversationsScreenShell`, `ConversationRow`, `BottomSheetListModal`
- `frontend/app/my-ticket/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: `TicketHeaderCard`, `TicketStatusBadge`, `TicketQRCodeCard`, `ScreenState`
- `frontend/app/my-tickets.tsx`
  - Reuse actuel: `Tabs`
  - Candidats: `TicketListRow`, `TicketStatusBadge`, `FilterChipsBar`, `ScreenState`
- `frontend/app/notifications.tsx`
  - Reuse actuel: `SocialEmptyState`
  - Candidats: `NotificationSummaryCard`, `ActivityRow`, `SocialNetworkScreenLayout`
- `frontend/app/notification-settings.tsx`
  - Reuse actuel: inline toggle renderer
  - Candidats: `SettingsToggleRow`, `SettingsSection`, `ScreenHeader`
- `frontend/app/outing.tsx`
  - Reuse actuel: aucun
  - Candidats: `OutingWizard`, `ParticipantSelector`, `DateTimeField`, `FormProgressHeader`
- `frontend/app/outing/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: `OutingHeroCard`, `ParticipantStatusRow`, `ConnectionInviteList`
- `frontend/app/outing-chat/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: `ChatScreenShell`, `MessageBubble`, `ChatInputBar`
- `frontend/app/outing-invitations.tsx`
  - Reuse actuel: `PersonActionButton`, `SocialCountChip`, `SocialEmptyState`
  - Candidats: `InvitationCard`, `SocialNetworkScreenLayout`
- `frontend/app/place.tsx` (create place)
  - Reuse actuel: aucun
  - Candidats: `PlaceForm`, `FormImagePicker`, `PriceLevelSelector`, `GeoLocateButton`
- `frontend/app/place/[id].tsx`
  - Reuse actuel: aucun
  - Candidats: `PlaceHero`, `RelatedEventRow`, `ReviewList`, `ReviewEditorModal`, `ReportReasonSheet`, `ContactAction`
- `frontend/app/places.tsx`
  - Reuse actuel: `SearchBar`, `SkeletonBlock`
  - Candidats: `CatalogScreenLayout`, `LocationScopeBar`, `FilterChipsBar`, `EntityCard`
- `frontend/app/post.tsx`
  - Reuse actuel: aucun
  - Candidats: `PostComposerWizard`, `VisibilityPickerSheet`, `AudiencePicker`, `PlanLinkPicker`
- `frontend/app/post-view/[id].tsx`
  - Reuse actuel: `PostItem`, `PersonRow`
  - Candidats: `BottomSheetListModal`, `ContactAction`
- `frontend/app/preferences.tsx`
  - Reuse actuel: aucun
  - Candidats: `PreferenceCategoryCard`, `TagChipSelector`, `TopSaveBar`
- `frontend/app/register.tsx`
  - Reuse actuel: `AuthStepIndicator`, `AuthTextField`, `RoleOptionCard`
  - Candidats: `AuthHeroLayout`, `AuthPrimaryButton`
- `frontend/app/search.tsx`
  - Reuse actuel: `SearchBar`, `PersonRow`, `PersonActionButton`, `SocialEmptyState`
  - Candidats: `SocialNetworkScreenLayout`, hook `useDebouncedSearch`
- `frontend/app/settings.tsx`
  - Reuse actuel: inline renderers
  - Candidats: `SettingsSection`, `SettingsToggleRow`, `SettingsChoiceRow`, `DangerZoneCard`
- `frontend/app/user/[id].tsx`
  - Reuse actuel: `PostItem`
  - Candidats: `PublicProfileHeader`, `PublicProfileStats`, `PlacesMiniList`

### Organizer
- `frontend/app/organizer/_layout.tsx`
  - Reuse actuel: tab layout
  - Candidats: `OrganizerTabConfig`
- `frontend/app/organizer/create-place.tsx`
  - Reuse actuel: re-export de `place.tsx`
  - Candidats: deja bien (single source)
- `frontend/app/organizer/dashboard.tsx`
  - Reuse actuel: inline `DashboardCard`
  - Candidats: `MetricCounterCard`, `AnalyticsSection`, `TopEventsList`
- `frontend/app/organizer/event-revisions.tsx`
  - Reuse actuel: aucun
  - Candidats: `RevisionRow`, `ScreenHeader`, `ScreenState`
- `frontend/app/organizer/events.tsx`
  - Reuse actuel: aucun
  - Candidats: `OrganizerEventRow`, `FilterChipsBar`, `ActionSheet`
- `frontend/app/organizer/event-team.tsx`
  - Reuse actuel: aucun
  - Candidats: `UserSearchPicker`, `PermissionChipGroup`, `CollaboratorRow`
- `frontend/app/organizer/notifications.tsx`
  - Reuse actuel: aucun
  - Candidats: `NotificationRow`, `FilterChipsBar`, `ScreenState`, `LoadMoreFooter`
- `frontend/app/organizer/scanner.tsx`
  - Reuse actuel: aucun
  - Candidats: `ScannerResultCard`, `RecentScanRow`, `OfflineQueueCard`, `EventPickerModal`
- `frontend/app/organizer/settings.tsx`
  - Reuse actuel: inline `ToggleRow`, `SectionTitle`
  - Candidats: mutualiser avec `settings.tsx` et `notification-settings.tsx`

---

## 5) Repetitions structurelles detectees (preuves rapides)

- `router.back()` repete sur une grande partie des pages
- `ActivityIndicator` repete massivement dans les ecrans
- `RefreshControl` repete dans de nombreuses listes
- `formatEventDate` / `formatPrice` redeclares dans beaucoup de pages
- `statusToneClass + statusLabelKey` dupliques (tickets/scans)
- bottom sheets full-screen overlay repetees (messages, post-view, social feed)
- `EMPTY_FRIENDSHIPS` duplique dans connections/friend-requests/notifications

---

## 6) Plan de refacto recommande (demarrage demain)

Phase 1 (safe, impact fort)
- `ScreenHeader`
- `ScreenState`
- `BottomSheetModal` + `BottomSheetListModal`
- `SettingsToggleRow` + `SettingsSection`

Phase 2 (catalogue + social)
- `CatalogScreenLayout`
- `LocationScopeBar`
- `FilterChipsBar`
- `EntityCard`

Phase 3 (metier)
- `EventFormWizard` shared create/edit
- `ChatScreenShell` shared direct/outing
- `TicketStatusBadge` + `ticket-status` utils
- `ReportReasonSheet` + `ContactAction`

Phase 4 (hooks + utils)
- `useScreenAsync`, `usePaginatedList`, `useLocationScope`
- centraliser `formatters` date/prix/status

Status: complete (2026-03-28)
- Hooks ajoutes:
  - `frontend/hooks/useScreenAsync.ts`
  - `frontend/hooks/usePaginatedList.ts`
  - `frontend/hooks/useLocationScope.ts`
- Utils ajoutes:
  - `frontend/services/formatters.ts` (date/prix/status)
- Ecrans migres:
  - `frontend/app/discover.tsx` (location scope + date formatter)
  - `frontend/app/events.tsx` (location scope + date/prix formatters)
  - `frontend/app/places.tsx` (location scope)
  - `frontend/app/organizer/notifications.tsx` (pagination hook + date formatter)
  - `frontend/app/notifications.tsx` (screen async hook + date formatter)
  - `frontend/app/event/[id].tsx`, `frontend/app/event-booking/[id].tsx`,
    `frontend/app/my-tickets.tsx`, `frontend/app/my-ticket/[id].tsx`,
    `frontend/app/outing/[id].tsx` (formatters centralises)

Phase 4 bis: complete (2026-03-28)
- Homogeneisation `useLocationScope` + `formatters`:
  - `frontend/app/(tabs)/home.tsx`
  - `frontend/app/(tabs)/map.tsx`
  - `frontend/app/(tabs)/explore.tsx`
- Ajustements create flows:
  - `frontend/app/outing.tsx`: date preview via formatter central
  - `frontend/app/post.tsx`: date d'evenement affichee dans le picker plan

---

## 7) Conclusion
Tu es exactement au bon moment pour faire ce chantier.

Le frontend est deja riche fonctionnellement, mais la dette de duplication est assez haute.
En transformant ces blocs en composants reutilisables, tu vas gagner:
- vitesse de dev
- qualite UI
- stabilite
- confort de maintenance

Ce refacto est une initiative tres pro, pas un luxe.
