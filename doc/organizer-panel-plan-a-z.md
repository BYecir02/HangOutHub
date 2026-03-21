# Plan A a Z - Panel Organizer (HangOutHub)

## Contexte
Le panel Organizer existe deja en partie, mais il manque encore de la coherence produit:
- pages partiellement integrees dans les parcours
- garde d acces non centralisee
- scanner encore placeholder
- etats vides et UX de finition a renforcer
- backend actuellement en erreur TS sur auth/users, ce qui peut impacter le flux organizer

Ce document definit le plan complet pour livrer un panel Organizer robuste, lisible et exploitable en production.

## Definition de done (DoD)
Le panel Organizer est considere "OK" quand:
- les routes organizer sont accessibles uniquement selon role/statut
- le dashboard est le point d entree principal organizer
- events/places/scanner sont relies entre eux avec une navigation claire
- scanner fonctionne vraiment (permissions, scan, feedback utilisateur)
- les etats vides, erreurs, loading et succes sont propres et localises FR/EN
- aucun warning/error TS/ESLint bloquant sur frontend organizer
- les flux critiques sont testes (manuel + API smoke)

## Plan A a Z

## A. Aligner le scope
- Lister les ecrans inclus dans "panel organizer" (dashboard, events, create-place, scanner, sections profile organizer).
- Valider les roles cibles: ORGANIZER, PLACE_OWNER.
- Clarifier les cas PENDING/APPROVED/REJECTED.
- Livrable: scope valide et fige.

## B. Baseline technique
- Capturer l etat actuel: routes, hooks, appels API, erreurs TS backend/frontend.
- Marquer les dependances bloquantes backend (auth/users/prisma types).
- Livrable: snapshot de reference (avant travaux).

## C. Cartographier les parcours
- Parcours 1: login organizer -> home organizer.
- Parcours 2: place owner sans lieu -> create place.
- Parcours 3: organizer -> publier event -> voir event detail.
- Livrable: user flows clairs + points de friction.

## D. Definir l architecture d acces
- Decider ou poser la garde d acces (layout, hook, wrapper de route).
- Definir fallback par role (redirect vers profile/home).
- Livrable: strategie unique d autorisation front.

## E. Etablir la route d entree unique
- Positionner le dashboard organizer comme entree principale.
- Harmoniser redirections depuis login et profile.
- Livrable: un seul point d entree officiel.

## F. Fixer les routes orphelines
- Relier dashboard/events/scanner/create-place depuis UI (menus/CTA).
- Supprimer les acces implicites non maitrises.
- Livrable: navigation organizer complete et testable.

## G. Guard rails role/statut
- Bloquer l acces aux pages organizer pour les non autorises.
- Gerer organizerStatus (PENDING, etc.) avec ecrans/alerts adaptes.
- Livrable: routes protegees + redirections coherentes.

## H. Harmoniser creation de lieu
- Choisir une convention unique entre /place et /organizer/create-place.
- Aligner create modal, login redirect et CTA internes.
- Livrable: routing coherent et maintenable.

## I. Industrialiser l etat global organizer
- Standardiser la source de verite user role/hasPlace/status.
- Limiter la dependance au local storage brut quand possible.
- Livrable: lecture de role fiable sur tout le panel.

## J. Jouer la robustesse data
- Renforcer gestion loading/error/retry sur dashboard/events.
- Ajouter fallbacks propres pour champs manquants (status/type/role).
- Livrable: ecrans resilients API partielle.

## K. Killer feature scanner (spec)
- Spec scanner: type de code, payload attendu, API de verification.
- Definir succes/echec/deja utilise/expire.
- Livrable: spec fonctionnelle scanner signee.

## L. Livrer scanner v1
- Integrer camera + permission flow + scan handler.
- Ajouter anti double scan (throttle/debounce).
- Afficher feedback clair (toast/modal/state).
- Livrable: scanner fonctionnel de bout en bout.

## M. Mettre en qualite UX dashboard
- Rendre le dashboard actionnable: KPI, CTA utiles, statuts explicites.
- Ajouter empty/error states localises.
- Livrable: dashboard lisible et utile pour operations.

## N. Normaliser l UX events organizer
- Etats vides explicites (creer premier event).
- CTA directs (creer, ouvrir detail, modifier plus tard).
- Livrable: gestion des events sans impasse UX.

## O. Optimiser les sections profile organizer
- Completer empty states pour tabs places/events.
- Clarifier labels/profil public selon role.
- Livrable: onglet profile organizer coherent.

## P. Parite i18n FR/EN
- Verifier toutes les strings organizer/scanner/create modal.
- Supprimer les literals hardcodes restants.
- Livrable: couverture bilingue complete organizer.

## Q. Qualite du code
- Nettoyer logs inutiles, types any evitables, duplication.
- Factoriser helpers date/format/status.
- Livrable: base propre pour evolutions futures.

## R. Resoudre blockers backend critiques
- Corriger modele Prisma/DTO utilises par auth/users (sessions, settings, roles).
- Regenerer client Prisma et revalider le typage.
- Livrable: backend start:dev stable sans erreurs bloquantes.

## S. Stabiliser les contrats API organizer
- Verifier payloads /users/me, /events/mine, /places creation, scanner endpoint.
- Documenter schemas attendus (champs obligatoires/optionnels).
- Livrable: contrats API explicites.

## T. Tester les parcours critiques
- Tests manuels bout en bout par role.
- Smoke tests API pour endpoints organizer.
- Livrable: checklist de validation complete.

## U. User acceptance interne
- Session de recette rapide avec scenarios reels.
- Collecter retours UX (frictions, comprehension, vitesse).
- Livrable: ajustements prioritaires identifies.

## V. Verrouiller la regression
- Lancer tsc/eslint frontend sur zone organizer.
- Rejouer les routes sensibles (login redirect, guards, scanner).
- Livrable: zero regression connue avant merge.

## W. Write docs
- Documenter architecture organizer (routes, guards, flux).
- Documenter scanner (permissions, erreurs communes, troubleshooting).
- Livrable: docs techniques + usage produit.

## X. eXperience monitoring
- Ajouter logs metier minimum (scan success/fail, redirect guard).
- Prevoir points de mesure (optionnel) sur adoption organizer.
- Livrable: observabilite de base.

## Y. Yield release plan
- Plan de release par lot (feature flags si necessaire).
- Definir rollback simple en cas de souci scanner/guard.
- Livrable: procedure de mise en prod sure.

## Z. Zero dette immediate post-release
- Traiter quick wins restants dans la semaine suivant sortie.
- Ouvrir backlog v2 (analytics avancees, moderation, batch actions).
- Livrable: panel stable + roadmap claire.

## Ordre d execution recommande (3 sprints)

### Sprint 1 - Fondations (acces + navigation)
- D, E, F, G, H, I
- Critere de sortie: navigation organizer claire + routes protegees.

### Sprint 2 - Valeur metier (scanner + UX organizer)
- J, K, L, M, N, O, P
- Critere de sortie: scanner v1 operationnel + UX organizer complete.

### Sprint 3 - Fiabilisation (backend + tests + release)
- Q, R, S, T, U, V, W, X, Y, Z
- Critere de sortie: build stable, tests passes, plan release pret.

## Risques et mitigation
- Risque: backend TS/Prisma instable bloque integration organizer.
  - Mitigation: traiter R en priorite avant fin sprint 2.
- Risque: scanner depend d une API non finalisee.
  - Mitigation: mock contract + feature flag temporaire.
- Risque: incoherence role via cache local.
  - Mitigation: revalidation role via /users/me a l ouverture des pages organizer.

## Checklist de fermeture
- [ ] Garde d acces validee sur toutes routes organizer
- [ ] Dashboard definit comme point d entree organizer
- [ ] Events/places/scanner relies sans impasse
- [ ] Scanner v1 valide sur Android + iOS
- [ ] FR/EN 100% sur surface organizer
- [ ] Frontend organizer sans erreurs TS/ESLint
- [ ] Backend auth/users sans erreurs TS bloquantes
- [ ] Documentation a jour dans doc/
