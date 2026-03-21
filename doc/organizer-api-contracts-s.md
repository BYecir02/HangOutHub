# Contrats API Organizer (S)

## Portee
Cette specification couvre les endpoints suivants:
- GET /api/v1/users/me
- GET /api/v1/events/mine
- POST /api/v1/events/:id/book
- GET /api/v1/events/my-bookings
- GET /api/v1/events/:id/scans
- POST /api/v1/places
- POST /api/v1/organizer/scanner/verify

## Conventions
- Auth: `Authorization: Bearer <JWT>` obligatoire sur les 4 endpoints.
- Prefixe API: `/api/v1`.
- Formats:
  - `application/json` pour `users/me`, `events/mine`, `organizer/scanner/verify`.
  - `multipart/form-data` pour `places` (payload + images).
- Validation:
  - Requete invalide => 400 (ValidationPipe + class-validator).
  - Token absent/invalide => 401.

## 1) GET /api/v1/users/me
### But
Retourner le profil complet de l utilisateur connecte pour hydrater le front (profil, role, places possedes, statut organizer).

### Reponse 200 (shape effectif)
```json
{
  "id": "uuid",
  "username": "amina",
  "email": "amina@hangouthub.dev",
  "displayName": "Amina",
  "phoneNumber": "+229...",
  "bio": "...",
  "avatarUrl": "https://...",
  "coverUrl": "https://...",
  "followersCount": 0,
  "followingCount": 0,
  "OrganizerProfile": {
    "companyName": "Nova Events",
    "jobTitle": "Manager",
    "accountType": "ORGANIZER",
    "status": "APPROVED"
  },
  "UserRole": [
    {
      "roleId": 2,
      "Role": {
        "id": 2,
        "name": "ORGANIZER"
      }
    }
  ],
  "OwnedPlaces": [
    {
      "id": "uuid",
      "name": "Le Code Bar",
      "coverUrl": "https://...",
      "address": "Haie Vive",
      "avgRating": 4.4,
      "City": {
        "id": 1,
        "name": "Cotonou"
      }
    }
  ],
  "role": "ORGANIZER"
}
```

### Garanties contrat
- `passwordHash` n est jamais renvoye.
- `role` est derive du premier `UserRole` (fallback `USER`).
- `OrganizerProfile` est nullable.
- `OwnedPlaces` est renvoye meme vide.

## 2) GET /api/v1/events/mine
### But
Lister les evenements crees par l utilisateur connecte (organizer/place owner).

### Reponse 200
Tableau trie par `startTime` ascendant.

```json
[
  {
    "id": "uuid",
    "title": "Soiree Techno",
    "description": "...",
    "startTime": "2026-04-12T18:00:00.000Z",
    "endTime": "2026-04-12T23:00:00.000Z",
    "coverUrl": "https://...",
    "entryFee": "5000",
    "placeId": "uuid",
    "organizerId": "uuid",
    "Place": {
      "id": "uuid",
      "name": "Le Code Bar",
      "address": "Haie Vive"
    }
  }
]
```

### Garanties contrat
- `Place` contient uniquement `id`, `name`, `address` (ou `null`).
- `entryFee` est un decimal Prisma: serialisation JSON souvent en string.

## 3) POST /api/v1/places
### But
Creer un lieu possede par le user connecte.

### Content-Type
`multipart/form-data`

### Champs body
- Obligatoires:
  - `name`: string non vide
  - `address`: string non vide
  - `latitude`: number
  - `longitude`: number
- Optionnels:
  - `description`: string
  - `priceLevel`: number (1..4)
  - `cityId`: number

### Fichiers
- Optionnels:
  - `cover`: 1 image max
  - `gallery`: jusqu a 10 images
- Contraintes:
  - mimetype `image/*` uniquement

### Valeurs par defaut service
- `priceLevel`: 1 si absent
- `cityId`: 1 si absent

### Reponse 201 (shape principal)
```json
{
  "id": "uuid",
  "name": "Le Code Bar",
  "description": "...",
  "address": "Haie Vive",
  "latitude": 6.37,
  "longitude": 2.43,
  "priceLevel": 2,
  "cityId": 1,
  "ownerId": "uuid",
  "coverUrl": "https://...",
  "images": ["https://..."],
  "avgRating": 0,
  "viewCount": 0
}
```

### Erreurs usuelles
- 400: champ invalide ou fichier non image.
- 401: JWT invalide/absent.

## 4) POST /api/v1/organizer/scanner/verify
### But
Verifier un QR code de billet et effectuer le check-in idempotent.

### Body JSON
- Obligatoire:
  - `code`: string (uuid booking ou qrCode)
- Optionnels:
  - `eventId`: uuid (force le scope event)
  - `source`: `ios` | `android` | `web`

### Reponse 200 (shape)
```json
{
  "status": "VALID_CHECKED_IN_NOW",
  "bookingId": "uuid",
  "eventId": "uuid",
  "attendee": {
    "id": "uuid",
    "displayName": "Amina",
    "username": "amina"
  },
  "ticket": {
    "ticketTypeId": "uuid",
    "ticketTypeName": "VIP"
  },
  "checkedInAt": "2026-03-22T00:00:00.000Z",
  "message": "Check-in valide."
}
```

### Statuts metier possibles
- `VALID_CHECKED_IN_NOW`
- `VALID_ALREADY_CHECKED_IN`
- `INVALID_CODE`
- `BOOKING_NOT_FOUND`
- `NOT_FOR_THIS_EVENT`
- `BOOKING_NOT_CONFIRMED`
- `EVENT_EXPIRED`
- `UNAUTHORIZED_SCANNER`

### Regles d autorisation
- Roles autorises: `ORGANIZER`, `PLACE_OWNER`.
- Statuts organizer bloques: `PENDING`, `REJECTED`, `SUSPENDED`.
- Si role/statut interdit: 403 (`UNAUTHORIZED_SCANNER`).

## Notes front (stabilite)
- Le front ne doit pas parser `message` scanner comme contrat metier: utiliser `status` comme source de verite.
- Pour `POST /places`, envoyer explicitement `latitude`/`longitude` numeriques (ou convertibles), et gerer les erreurs 400 de validation.
- Pour `GET /users/me`, preferer `role` (normalise) plutot que lire directement `UserRole[0]`.

## 5) POST /api/v1/events/:id/book
### But
Creer la reservation d un utilisateur pour un evenement et generer un QR exploitable au scan quand la reservation est confirmee.

### Body JSON
- Optionnel:
  - `ticketTypeId`: uuid (doit appartenir a l evenement)

### Regles metier
- evenement inexistant => 404
- evenement termine => 400
- reservation existante (non `CANCELLED`) => retour de la reservation existante
- statut cree:
  - `CONFIRMED` si pas de paiement requis
  - `PENDING` si paiement requis
- QR:
  - genere si reservation confirmee
  - `null` tant que reservation en `PENDING`

### Reponse 201/200 (shape)
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "status": "CONFIRMED",
  "qrCode": "uuid-or-token",
  "event": {
    "id": "uuid",
    "title": "Soiree",
    "startTime": "2026-04-12T18:00:00.000Z",
    "endTime": "2026-04-12T21:00:00.000Z",
    "coverUrl": "https://...",
    "organizerId": "uuid",
    "place": {
      "id": "uuid",
      "name": "Le Code Bar"
    }
  },
  "ticketType": {
    "id": "uuid",
    "name": "VIP"
  }
}
```

## 6) GET /api/v1/events/my-bookings
### But
Retourner la liste des billets de l utilisateur connecte, avec infos evenement et QR.

### Reponse 200
- Tableau de reservations (shape identique a `POST /events/:id/book`).
- Trie actuel: plus recentes d abord (`id desc`).

## 7) GET /api/v1/events/:id/scans
### But
Permettre a l organizer (ou place owner autorise) de consulter les billets deja scannes et les compteurs de suivi d entree.

### Autorisation
- Roles autorises: `ORGANIZER`, `PLACE_OWNER`.
- Controle ownership:
  - `ORGANIZER`: doit etre organisateur de l event.
  - `PLACE_OWNER`: doit etre proprietaire du lieu rattache.
- Sinon: 403.

### Reponse 200 (shape)
```json
{
  "event": {
    "id": "uuid",
    "title": "Soiree"
  },
  "counters": {
    "expectedCount": 120,
    "scannedCount": 88,
    "pendingCount": 7,
    "remainingCount": 32
  },
  "scans": [
    {
      "bookingId": "uuid",
      "status": "USED",
      "attendee": {
        "id": "uuid",
        "displayName": "Amina",
        "username": "amina",
        "avatarUrl": "https://..."
      },
      "ticket": {
        "ticketTypeId": "uuid",
        "ticketTypeName": "VIP"
      }
    }
  ]
}
```
