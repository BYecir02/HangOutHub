# Validation Regression Organizer (V) - 22/03/2026

## Objectif
Verrouiller les regressions critiques sur les flux organizer/booking/scans livres entre R et U.

## Script de regression
- Fichier: `backend/scripts/regression-v.ps1`
- Execution recommandee:

```powershell
Set-Location backend
powershell -ExecutionPolicy Bypass -File .\scripts\regression-v.ps1
```

## Checks couverts
- Disponibilite API (`GET /categories`)
- Login seed organizer/participant
- Role gate create event (`USER` doit etre bloque en 403 sur `POST /events`)
- Reservation event idempotente (`POST /events/:id/book`)
- Presence reservation dans `GET /events/my-bookings`
- Acces organizer a `GET /events/:id/scans`
- Interdiction `USER` sur `GET /events/:id/scans` (403 attendu)

## Resultat attendu script
- `V_REGRESSION_RESULT=PASS`

## Notes
- Le script utilise les seeds de demo deja valides dans les validations precedentes:
  - `nova@hangouthub.dev`
  - `amina@hangouthub.dev`
- Le script echoue immediatement (throw) sur la premiere regression detectee.
- Le script detecte automatiquement le port backend actif sur la plage `3000..3010`.