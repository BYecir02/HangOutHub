# Execution A-B-C-D-E-F-G-H-I-J-K-L - Panel Organizer

## A. Aligner le scope (fait)
Surface incluse dans le panel organizer:
- organizer dashboard
- organizer events
- organizer scanner
- organizer create-place
- sections organizer dans profile (overview, places, events)
- create modal (actions role-based)

Roles cibles:
- ORGANIZER
- PLACE_OWNER

Cas statut:
- PENDING: pas d acces panel (retour login / blocage)
- APPROVED (et equivalent non pending): acces panel autorise

## B. Baseline technique (fait)
Frontend:
- routes organizer presentes
- i18n FR/EN deja en place sur la majorité des ecrans organizer
- scanner encore en mode placeholder fonctionnel

Backend:
- erreurs TypeScript importantes en auth/users (sessions/settings/dto) actuellement
- tant que ces erreurs ne sont pas corrigees, stabilite produit incomplete

## C. Cartographie des parcours (fait)
Parcours 1 (Organizer standard):
- login -> organizer dashboard -> organizer events -> event detail

Parcours 2 (Place owner sans lieu):
- login -> organizer create-place -> place detail -> retour dashboard

Parcours 3 (Acces non autorise):
- ouverture route organizer sans role valide -> redirection vers home

Parcours 4 (Statut pending):
- login organizer pending -> message d attente + session retiree

## D. Architecture d acces organizer (demarre et appliquee)
Decision:
- centraliser les regles dans un service unique organizer-access

Regles centralisees:
- detection role organizer
- verification statut pending
- droit d acces panel
- calcul route d entree organizer

Implementation realisee:
- fichier service ajoute: frontend/services/organizer-access.ts
- guards appliques sur:
  - organizer dashboard
  - organizer events
  - organizer scanner

## E. Entree unique organizer (demarre et appliquee)
Decision:
- route d entree officielle organizer: /organizer/dashboard
- exception: PLACE_OWNER sans lieu -> /organizer/create-place

Implementation realisee:
- login utilise desormais getOrganizerEntryPath
- bouton organizer du profil pointe vers dashboard
- routes organizer explicites ajoutees dans le layout root

## F. Relier les routes organizer via UI (fait)
Objectif:
- supprimer les routes orphelines en connectant dashboard/events/scanner/create-place depuis des CTA visibles

Implementation realisee:
- ajout d un composant de navigation transverse organizer:
  - frontend/components/organizer/OrganizerPanelNav.tsx
- navigation ajoutee sur:
  - organizer dashboard
  - organizer events
  - organizer scanner
- create modal PLACE_OWNER aligne vers /organizer/create-place
- labels i18n FR/EN ajoutes pour la navigation organizer

## G. Guard rails role/statut (fait)
Objectif:
- durcir l acces organizer selon role et statut (pending/rejected/suspended)

Implementation realisee:
- extension du service organizer-access avec:
  - raisons de refus explicites
  - blocage des statuts REJECTED et SUSPENDED en plus de PENDING
- ajout d un hook de garde centralise:
  - frontend/hooks/useOrganizerGuard.ts
- branchement du hook sur:
  - organizer dashboard
  - organizer events
  - organizer scanner
- login renforce:
  - controle de statut organizer a la connexion
  - nettoyage de session si statut refuse
  - messages dedies pending/rejected/suspended
- ajout des cles i18n FR/EN pour messages de guard rails

## H. Harmoniser creation de lieu (fait)
Objectif:
- unifier la convention de routing create-place pour les parcours organizer

Convention retenue:
- tous les parcours organizer vers la creation de lieu passent par /organizer/create-place
- /place reste l ecran technique sous-jacent (via re-export), mais n est plus cible des CTA organizer

Implementation realisee:
- create modal (PLACE_OWNER) deja aligne vers /organizer/create-place
- login/entry organizer deja aligne sur /organizer/create-place pour PLACE_OWNER sans lieu
- CTA create-place depuis creation d evenement aligne vers /organizer/create-place

## I. Industrialiser l etat global organizer (fait)
Objectif:
- fiabiliser la lecture role/hasPlace/organizerStatus avec une source de verite unique
- limiter la manipulation brute du local storage dans les ecrans

Implementation realisee:
- ajout d un service central user-session:
  - frontend/services/user-session.ts
  - normalisation de session (role, hasPlace, organizerStatus)
  - lecture/ecriture/patch/clear de session
  - sync depuis /users/me avec fallback stockage
- ecran login bascule vers user-session (plus de JSON.parse brut)
- create modal bascule vers resolveStoredUserSession
- create place met a jour hasPlace via patchStoredUserSession
- settings logout/delete utilisent clearStoredUserSession
- useUserProfile synchronise automatiquement la session stockee avec /users/me

## J. Robustesse data organizer (fait)
Objectif:
- eviter les redirections parasites en cas d erreur reseau temporaire
- standardiser loading/error/retry sur les ecrans organizer

Implementation realisee:
- useUserProfile expose desormais un etat error + refetch exploitable
- useOrganizerGuard peut suspendre temporairement ses redirections (option suspend)
- dashboard/events/scanner gerent 3 etats explicites:
  - loading
  - erreur bloquante avec bouton Reessayer
  - erreur non bloquante avec bandeau + retry
- ajout des messages i18n FR/EN dedies a la robustesse data organizer

## K. Specification scanner (fait)
Objectif:
- definir le contrat complet scanner avant implementation (L)

Implementation realisee:
- specification scanner creee avec:
  - format QR cible + mode transition
  - endpoint backend propose (request/response)
  - statuts metier scanner
  - regles validation et idempotence
  - exigences securite
  - evolution DB recommandee pour check-in
  - cas de test acceptance

Livrable:
- [doc/organizer-scanner-spec-k.md](doc/organizer-scanner-spec-k.md)

## L. Livrer scanner v1 (fait)
Objectif:
- livrer un scanner fonctionnel de bout en bout (camera mobile + verification backend)

Implementation realisee:
- frontend scanner passe en mode reel:
  - permission camera via expo-camera
  - flux scan QR actif avec CameraView
  - anti double-scan (throttle + freeze court)
  - retours utilisateur explicites (succes, deja utilise, invalide, etc.)
  - vibration differenciee succes/erreur (mobile)
- ajout du service API scanner front:
  - frontend/services/organizer-scanner.ts
  - appel POST /organizer/scanner/verify
- ajout endpoint backend scanner:
  - POST /api/v1/organizer/scanner/verify
  - controle role ORGANIZER/PLACE_OWNER
  - controle statut organizer (pending/rejected/suspended bloques)
  - verification booking via id ou qrCode
  - validation event + autorisation scanner
  - check-in idempotent (transition status CONFIRMED/PAID -> USED)

Notes techniques:
- migration DB checkedInAt non incluse dans ce lot pour eviter un couplage fort avec les blockers backend existants
- checked-in est materialise via status USED (MVP)

## Delta code realise dans cette phase
- frontend/services/organizer-access.ts (nouveau)
- frontend/components/organizer/OrganizerPanelNav.tsx (nouveau)
- frontend/hooks/useOrganizerGuard.ts (nouveau)
- frontend/services/user-session.ts (nouveau)
- frontend/services/organizer-scanner.ts (nouveau)
- frontend/app/index.tsx
- frontend/app/organizer/dashboard.tsx
- frontend/app/organizer/events.tsx
- frontend/app/organizer/scanner.tsx
- frontend/components/profile/ProfileHeader.tsx
- frontend/app/_layout.tsx
- frontend/app/create-modal.tsx
- frontend/app/event.tsx
- frontend/app/place.tsx
- frontend/app/settings.tsx
- frontend/hooks/useUserProfile.ts
- frontend/services/i18n.ts
- doc/organizer-scanner-spec-k.md
- backend/src/organizer-scanner/dto/verify-scan.dto.ts (nouveau)
- backend/src/organizer-scanner/organizer-scanner.service.ts (nouveau)
- backend/src/organizer-scanner/organizer-scanner.controller.ts (nouveau)
- backend/src/organizer-scanner/organizer-scanner.module.ts (nouveau)
- backend/src/app.module.ts

## Points restant apres A-B-C-D-E-F-G-H-I-J-K-L
- empty states organizer complets dans profile tabs organizer
- correction erreurs backend TS (auth/users) pour stabilite globale
