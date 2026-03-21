# K - Specification Scanner Organizer (MVP)

## 1. Objectif
Definir la specification fonctionnelle et technique du scanner organizer avant implementation (etape L).

Le scanner doit permettre a un ORGANIZER ou PLACE_OWNER autorise de:
- scanner un QR code de billet
- verifier la validite du billet en temps reel
- enregistrer le check-in de maniere idempotente
- afficher un retour clair (valide, deja utilise, invalide, etc.)

## 2. Contexte technique actuel
Etat du schema Prisma utile au scanner:
- Booking existe avec:
  - id
  - userId
  - eventId
  - ticketTypeId
  - status
  - qrCode
- TicketType existe avec:
  - id
  - eventId
  - name
  - price
  - quantity

References:
- backend Booking: [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L13)
- backend Booking.qrCode: [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L19)
- backend TicketType: [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L372)

## 3. Perimetre K (spec uniquement)
Inclus:
- format de code scanne
- contrat API de verification
- regles de validation
- reponses attendues
- cas limites et erreurs
- exigences securite minimales

Exclus (etape L):
- implementation camera mobile
- implementation endpoint backend
- migration DB effective

## 4. Roles et autorisation
Peuvent scanner:
- ORGANIZER
- PLACE_OWNER

Conditions:
- statut organizer valide (non PENDING, non REJECTED, non SUSPENDED)
- organisateur lie a l evenement cible ou proprietaire du lieu associe selon regle metier backend

Refus d acces:
- 403 FORBIDDEN avec code metier explicite

## 5. Format du QR code
## 5.1 Format cible (recommande)
QR payload opaque signe:
- type: string token
- exemple: hhb_v1_<base64url(payload)>.<signature>

Payload minimal signe:
- bookingId
- eventId
- issuedAt
- nonce

Signature:
- HMAC SHA256 cote backend
- cle secrete serveur (jamais exposee au client)

## 5.2 Format de transition (compat)
Tant que tous les QR ne sont pas migrables:
- accepter aussi bookingId brut (UUID) dans le scanner backend

## 6. Endpoint de verification scanner
## 6.1 Endpoint
POST /api/v1/organizer/scanner/verify

## 6.2 Request
Content-Type: application/json

Body:
- code: string (contenu brut du scan)
- eventId: string (UUID) optionnel si deja dans le token
- source: string optionnel (ios | android | web)

Exemple:
```json
{
  "code": "hhb_v1_xxx.yyy",
  "eventId": "2f9c4d8a-...",
  "source": "android"
}
```

## 6.3 Response (200)
Body:
- status: ScanStatus
- bookingId: string | null
- eventId: string | null
- attendee:
  - id: string
  - displayName: string | null
  - username: string | null
- ticket:
  - ticketTypeId: string | null
  - ticketTypeName: string | null
- checkedInAt: string | null
- message: string

ScanStatus (MVP):
- VALID_CHECKED_IN_NOW
- VALID_ALREADY_CHECKED_IN
- INVALID_CODE
- BOOKING_NOT_FOUND
- NOT_FOR_THIS_EVENT
- BOOKING_NOT_CONFIRMED
- EVENT_EXPIRED
- UNAUTHORIZED_SCANNER

Exemple succes:
```json
{
  "status": "VALID_CHECKED_IN_NOW",
  "bookingId": "f1...",
  "eventId": "e1...",
  "attendee": {
    "id": "u1...",
    "displayName": "Amina",
    "username": "amina"
  },
  "ticket": {
    "ticketTypeId": "t1...",
    "ticketTypeName": "VIP"
  },
  "checkedInAt": "2026-03-21T19:31:24.000Z",
  "message": "Check-in valide"
}
```

## 6.4 Response erreurs HTTP
- 400 BAD_REQUEST: payload invalide
- 401 UNAUTHORIZED: token manquant/expire
- 403 FORBIDDEN: role/statut scanner non autorise
- 404 NOT_FOUND: event introuvable (si eventId requis)
- 409 CONFLICT: optionnel pour cas deja check-in (si non gere en 200 status metier)

## 7. Regles metier de verification
Ordre recommande:
1. Verifier authentification
2. Verifier role/statut organizer
3. Parser/valider le code
4. Resoudre la booking (via token signe ou fallback UUID)
5. Verifier appartenance event
6. Verifier statut booking autorise au check-in
7. Verifier fenetre temporelle event
8. Verifier check-in deja effectue
9. Effectuer check-in atomique
10. Retourner resultat metier

## 8. Idempotence et concurrence
Exigence:
- scanner 2 fois rapidement le meme code ne doit pas doubler le check-in

Strategie:
- transaction DB
- lock sur booking cible
- etat final unique: checked-in une seule fois
- seconde lecture retourne VALID_ALREADY_CHECKED_IN

## 9. Evolution DB recommandee pour L
Le schema actuel ne contient pas explicitement les metadonnees de check-in Booking.

Ajouts recommandes sur Booking:
- checkedInAt DateTime?
- checkedInByUserId UUID?
- checkInSource String? (ios/android/web)

Optionnel audit:
- table BookingScanLog
  - id
  - bookingId
  - scannerUserId
  - resultStatus
  - scannedAt
  - source

## 10. Statuts Booking (convention scanner)
Pour le scanner MVP, check-in autorise si booking.status dans:
- CONFIRMED
- PAID

Check-in refuse si:
- PENDING
- CANCELLED
- REFUNDED
- REJECTED

Check-in deja fait si:
- checkedInAt non null ou status == USED

Note:
- la convention exacte sera alignee en implementation backend selon votre logique paiement.

## 11. UX mobile scanner (attendu pour L)
Ecran scanner doit gerer:
- permission camera refusee
- camera active
- scan en cours
- resultat succes (vert)
- resultat deja utilise (ambre)
- resultat erreur (rouge)
- bouton re-scanner

Protections UX:
- debounce scan (ex: 1000 ms)
- freeze temporaire apres resultat (ex: 1500 ms)
- son/vibration differenciee par resultat

## 12. Securite
- ne jamais faire la verification cote client
- token scanner backend obligatoire
- validation signature QR cote serveur
- rate limit endpoint scanner (anti brute-force)
- logs d audit minimum (qui a scanne quoi, quand, resultat)

## 13. Tests d acceptance K -> L
Cas minimum a valider lors de L:
1. Code valide jamais scanne -> VALID_CHECKED_IN_NOW
2. Meme code rescannne -> VALID_ALREADY_CHECKED_IN
3. Code invalide -> INVALID_CODE
4. Booking inexistante -> BOOKING_NOT_FOUND
5. Booking autre event -> NOT_FOR_THIS_EVENT
6. Event termine -> EVENT_EXPIRED
7. Organizer non autorise -> UNAUTHORIZED_SCANNER
8. Deux scans concurrents meme code -> un seul check-in effectif

## 14. Livrables attendus en L (derive de K)
- endpoint scanner backend implemente
- migration DB check-in appliquee
- service frontend scanner (appel API + mapping statuts)
- ecran organizer scanner reel (camera + feedback)
- tests API + tests manuels scanner
