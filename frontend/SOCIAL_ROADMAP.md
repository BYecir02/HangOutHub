# HangOutHub — Roadmap Sociale

## Vision

HangOutHub n'est pas un réseau social généraliste. C'est une app de sorties.
Le feed, la map et les fiches événement/lieu doivent refléter ce que font les amis
**dans le monde réel**, pas juste ce qu'ils publient.

La plomberie existe déjà (Outings, RSVP, Plan posts, invitations).
Le problème : elle est invisible. L'utilisateur ne sait pas que ses amis vont
au même endroit que lui.

**Objectif :** rendre visible l'activité sociale existante, sans reconstruire quoi que ce soit.

---

## État des lieux

### Ce qui existe et fonctionne
- Système Outing complet — création, invitations, RSVP (GOING / MAYBE / DECLINED)
- Plan posts — type de post lié à un lieu ou événement, visible dans le feed
- Filtres feed — par type (post/plan), par catégorie, par ville
- Fiches événement — bouton "Plan an Outing" qui crée un Outing pré-rempli
- Fiches lieu — bouton "Créer un post" lié au lieu
- Messagerie directe + chat de groupe par Outing

### Ce qui manque
| Gap | Endroit | Impact |
|-----|---------|--------|
| Activité amis dans le feed | SocialFeed | 🔴 Élevé |
| Layer amis sur la Map | MapScreen | 🔴 Élevé |
| "J'y vais" rapide sur les fiches | EventDetail / PlaceDetail | 🟠 Moyen |
| Participants visibles sur les fiches | EventDetail / PlaceDetail | 🟠 Moyen |
| Post souvenir suggéré après sortie | PostCreate | 🟡 Faible |

---

## Priorités

```
Phase 1 — Visibilité sociale (rendre l'existant visible)
Phase 2 — Frictionless participation (réduire les étapes)
Phase 3 — Boucle post-sortie (engagement après l'événement)
```

---

## Phase 1 — Visibilité sociale

### 1.1 — Activité amis dans le feed 🔴

**Problème :** le feed montre des posts texte. On ne sait pas ce que font ses amis.

**Solution :** ajouter des "activity cards" entre les posts — des petites cartes non-intrusives
qui signalent l'activité des connexions.

**Exemples de cartes :**
- "Yecir et 2 autres participent à **Festival Jazz** ce weekend"
- "Ariel a sauvegardé **Le Bouillon** — 3 km de toi"
- "4 de tes amis ont créé un plan pour **samedi soir**"

**Données nécessaires (backend) :**
- Endpoint : `GET /feed/social-activity` → liste d'activités des connexions
  (outings créés, événements sauvegardés, lieux sauvegardés)
- Champs : `actorIds[]`, `actionType` (outing/save/plan), `entityId`, `entityType`, `entityTitle`, `scheduledAt`

**Implémentation frontend :**
- Nouveau composant `FeedActivityCard.tsx` dans `features/social/components/`
- Intégration dans `SocialFeed.tsx` : intercaler les activity cards dans la FlatList data
  (ex: toutes les 5 posts normaux, insérer une activité)
- Type discriminant : `{ type: 'post', data: FeedPost } | { type: 'activity', data: ActivityItem }`

---

### 1.2 — Layer amis sur la Map 🔴

**Problème :** la Map montre des lieux et événements mais zéro activité sociale.
C'est le différenciateur le plus fort de l'app et il est sous-exploité.

**Solution :** ajouter une couche d'indicateurs "amis" sur les markers existants.

**Comportement :**
- Un événement où 1+ ami a un Outing → badge bleu `+2` sur le marker
- Un lieu sauvegardé par des amis → badge outline sur le marker
- Tap sur le badge → sheet qui liste "Yecir, Ariel vont à cet événement"

**Données nécessaires (backend) :**
- Endpoint : `GET /map/friends-activity?lat=&lng=&radius=` → liste d'entités
  (eventId ou placeId) avec les connexions concernées
- Ou enrichir les endpoints existants `/map/events` et `/map/places`
  avec un champ `friendsCount` et `friendIds[]`

**Implémentation frontend :**
- Dans `MapScreen.native.tsx` : fetch parallèle de l'activité amis
- Overlay badge sur les `<Marker>` existants quand `friendsCount > 0`
- Nouveau composant `MapFriendsBadge.tsx`
- Bottom sheet existant enrichi avec une section "Amis qui y vont"

---

### 1.3 — Participants visibles sur les fiches 🟠

**Problème :** sur une fiche événement ou lieu, on ne sait pas si des amis y vont.

**Solution :** section "Tes amis" sur les fiches événement et lieu.

**Comportement :**
- Rangée d'avatars en bas de la hero image ou dans un tab
- "Yecir, Ariel et 3 autres vont à cet événement"
- Tap sur un avatar → profil de la personne

**Données nécessaires (backend) :**
- Enrichir `GET /events/:id` et `GET /places/:id` avec `friendsAttending[]`
  (userId, username, avatarUrl des connexions avec un Outing lié)

**Implémentation frontend :**
- Composant `FriendsAttendingRow.tsx` dans `shared/ui/`
- Utilisé dans `EventDetailHero.tsx` et `PlaceDetailHero.tsx`

---

## Phase 2 — Frictionless participation

### 2.1 — Bouton "J'y vais" rapide 🟠

**Problème :** créer un Outing depuis une fiche événement demande trop d'étapes
(titre, date, inviter des amis, confirmer). Pour une participation solo c'est excessif.

**Solution :** deux niveaux d'action sur les fiches événement et lieu :

```
[J'y vais]          → participation solo rapide (1 tap)
[Organiser une sortie]  → Outing complet avec amis (flow existant)
```

**"J'y vais" solo :**
- Crée un Outing privé (visible par l'user uniquement) avec statut GOING
- Ou ajoute l'événement à un "planning personnel" (plus simple côté backend)
- Apparaît dans le feed de l'utilisateur comme activité → visible par ses amis (cf 1.1)

**Données nécessaires (backend) :**
- Endpoint : `POST /events/:id/attend` → crée une participation rapide
- Endpoint : `DELETE /events/:id/attend` → annule
- Champ `isAttending: boolean` dans `GET /events/:id`

**Implémentation frontend :**
- Bouton toggle dans `EventDetailHero.tsx` (à côté du bouton tickets)
- État local optimiste + sync backend

---

### 2.2 — Rejoindre le plan d'un ami depuis le feed 🟠

**Problème :** quand un ami publie un Plan post, on peut seulement créer son propre Outing.
On ne peut pas rejoindre le sien directement.

**Solution :** si un Plan post est lié à un Outing existant, afficher
"Rejoindre la sortie de Yecir" au lieu de "Organiser une sortie".

**Implémentation :**
- `FeedPost` expose `outingId` si le post est lié à un Outing
- `PostItem.tsx` : si `outingId` présent → bouton "Rejoindre" → `PATCH /outings/:id/respond`
  avec status GOING

---

## Phase 3 — Boucle post-sortie

### 3.1 — Suggestion de post souvenir 🟡

**Problème :** après un événement passé, l'app ne rappelle pas à l'utilisateur
de partager son expérience.

**Solution :** notification push ou banner in-app 24h après un Outing terminé :
"Tu es allé à **Festival Jazz** hier — partage ton avis !"

**Comportement :**
- Tap sur la notification → PostCreate pré-rempli (lieu/événement + type plan)
- One-shot par Outing (pas de spam)

**Données nécessaires (backend) :**
- Job schedulé qui détecte les Outings passés sans post lié
- Push notification via le système existant

---

## Ordre d'implémentation recommandé

```
1. [Backend] Enrichir /events/:id et /places/:id avec friendsAttending[]
2. [Frontend] FriendsAttendingRow sur les fiches (Phase 1.3) — quickwin visible
3. [Backend] Endpoint /feed/social-activity
4. [Frontend] FeedActivityCard dans le feed (Phase 1.1)
5. [Backend] Enrichir /map/events et /map/places avec friendsCount
6. [Frontend] MapFriendsBadge sur la carte (Phase 1.2)
7. [Backend] POST /events/:id/attend
8. [Frontend] Bouton "J'y vais" sur les fiches (Phase 2.1)
9. [Frontend] Bouton "Rejoindre" sur Plan posts (Phase 2.2)
10. [Backend + Push] Suggestion post souvenir (Phase 3.1)
```

---

## Composants à créer

| Composant | Fichier | Phase |
|-----------|---------|-------|
| `FeedActivityCard` | `features/social/components/FeedActivityCard.tsx` | 1.1 |
| `MapFriendsBadge` | `features/discover/components/MapFriendsBadge.tsx` | 1.2 |
| `FriendsAttendingRow` | `shared/ui/FriendsAttendingRow.tsx` | 1.3 |
| Bouton "J'y vais" | dans `EventDetailHero.tsx` | 2.1 |
| Bouton "Rejoindre" | dans `PostItem.tsx` | 2.2 |

---

## Notes techniques

- Toutes les Phase 1 features sont **read-only** côté frontend — elles affichent
  des données existantes enrichies. Risque faible.
- Le bouton "J'y vais" (Phase 2.1) nécessite un nouvel endpoint backend.
  En attendant, il peut créer un Outing solo via le flow existant avec le titre
  pré-rempli et zéro invitations.
- `FeedActivityCard` doit être clairement distingué visuellement des posts normaux
  pour ne pas polluer le feed (fond légèrement différent, pas de like/comment).
