# HangOutHub Frontend Temp

Sandbox temporaire pour porter l'architecture cible décrite dans `frontend/ARCHITECTURE.md` sans toucher au frontend existant.

## Cible de travail

- `app/` doit rester routing-only
- `shared/` doit contenir ce qui est transversal
- `features/` doit regrouper le métier par domaine
- `services/` est déjà découpé en phase 1 par domaine

## Phase 1 en cours

- `services/api/`
- `services/auth/`
- `services/events/`
- `services/places/`
- `services/social/`
- `services/messaging/`
- `services/organizer/`
- `services/user/`
- `services/shared/`

## Prochaine étape

1. Migrer le socle des services vers:
   - `shared/services/`
   - `features/*/services/`
2. Brancher les wrappers `app/`
3. Déplacer ensuite les composants et hooks au bon endroit

## Note

Ce dossier est volontairement vide pour l'instant, hors squelette d'arborescence.
