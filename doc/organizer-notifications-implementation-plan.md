# Organizer Notifications - Plan d'implementation

## Objectif
Mettre en place une inbox de notifications dediee aux organisateurs, utile pour les actions operationnelles (event, ventes, scans, equipe), sans bruit inutile.

## Decision navigation
- Recommandation MVP: **oui**, ajouter la page Notifications dans la navigation du panel organizer.
- Option de rollout:
  - Phase 1: tab `Notifications` visible pour favoriser l'adoption.
  - Phase 2 (optionnelle): cloche en header global avec badge si la tab bar devient trop chargee.

## Types de notifications (MVP)
1. Reservation confirmee.
2. Annulation / remboursement demande.
3. Billets bientot sold out (seuils 80%, 95%, 100%).
4. Rappel evenement imminent (D-1, H-3, H-1).
5. Incident scan (pics de INVALID_CODE / UNAUTHORIZED_SCANNER).
6. Changement equipe (collaborateur ajoute, retire, permissions modifiees).
7. Pic d'echecs paiement.
8. Changement critique evenement (date, lieu, capacite, tarifs).
9. Question/commentaire participant (si module actif).
10. Recap post-event (no-show, scans, ventes finales).

## Priorites
- `urgent`: incidents scan, annulations massives, permissions sensibles.
- `important`: reservations, sold out, rappels event.
- `info`: recaps quotidiens/post-event.

## Plan d'implementation

### 1) Cadrage produit
1. Valider la liste MVP des types.
2. Definir severite + regles d'affichage.
3. Definir CTA par type (deep link cible).

### 2) Modele de donnees
1. Ajouter un type de notif organizer (`ORGANIZER_*`).
2. Champs proposes:
   - `id`
   - `userId`
   - `type`
   - `title`
   - `message`
   - `severity` (`urgent|important|info`)
   - `payload` (JSON)
   - `readAt`
   - `createdAt`
3. Indexes:
   - `(userId, createdAt DESC)`
   - `(userId, readAt)`

### 3) Backend (generation et lecture)
1. Brancher les triggers metier -> creation notif organizer.
2. Ajouter anti-bruit:
   - aggregation temporelle,
   - cooldown par type.
3. Endpoints:
   - `GET /notifications/organizer`
   - `GET /notifications/organizer/unread-count`
   - `POST /notifications/organizer/mark-read`
   - `POST /notifications/organizer/mark-all-read`

### 4) Frontend organizer
1. Creer ecran Inbox organizer.
2. Sections/filtres:
   - `all`
   - `unread`
   - `urgent`
3. Actions:
   - marquer lu,
   - marquer tout lu,
   - ouvrir CTA (event/scans/team/bookings).
4. Badge unread dans la nav organizer.

### 5) Qualite et observabilite
1. Logs de creation de notif (type, userId, source).
2. Metriques:
   - notifs emises,
   - notifs lues,
   - taux de clic CTA.
3. QA e2e:
   - emission,
   - anti-spam,
   - badge unread,
   - redirection CTA,
   - pagination/perf.

### 6) Rollout
1. Feature flag `organizer_notifications`.
2. Activation interne puis groupe test.
3. Ajustement seuils anti-bruit avec feedback reel.

## Checklist implementation
- [ ] Types de notifications MVP valides
- [ ] Schema/migration notifications organizer
- [ ] Service backend de creation des notifications
- [ ] Endpoints organizer notifications
- [ ] Inbox organizer UI
- [ ] Badge unread dans la navigation organizer
- [ ] Marquer lu / marquer tout lu
- [ ] Filtres all/unread/urgent
- [ ] Anti-spam (aggregation + cooldown)
- [ ] QA e2e complete
- [ ] Feature flag + rollout progressif

## Mapping rapide: type -> cible d'ouverture
- Reservation confirmee -> detail event (bloc ventes)
- Annulation/remboursement -> event bookings
- Incident scan -> ecran scanner / scans event
- Changement equipe -> event team
- Changement evenement critique -> event revisions / edit

## Roadmap sprint (S1 / S2 / S3)

### Sprint 1 - Fondations (MVP technique)
Objectif: avoir une inbox organizer fonctionnelle de bout en bout avec lecture et badge.

Scope:
1. Schema + migration notifications organizer.
2. Service backend de creation/lecture.
3. Endpoints: liste, unread count, mark-read, mark-all-read.
4. UI inbox organizer simple (liste chronologique + unread).
5. Badge unread dans la navigation organizer.

Definition of Done:
1. Un organizer voit ses notifications dans l'app.
2. Le badge unread s'actualise apres lecture.
3. Les endpoints sont proteges par auth organizer.
4. QA manuelle validee sur les principaux cas.

### Sprint 2 - Valeur operationnelle
Objectif: brancher les triggers metier utiles et les CTA.

Scope:
1. Triggers MVP: reservation confirmee, annulation/remboursement, incidents scan, changement equipe, rappel event imminent.
2. Payload de deep link pour ouvrir l'ecran cible.
3. Filtres UI: all, unread, urgent.
4. Priorites visuelles `urgent|important|info`.

Definition of Done:
1. Chaque notif MVP ouvre le bon ecran via CTA.
2. Les notifications urgentes sont distinguees visuellement.
3. Filtres fonctionnent avec pagination.
4. QA e2e validee sur 5 flux metier.

### Sprint 3 - Anti-bruit et rollout
Objectif: stabiliser, eviter le spam, monitorer et deploiement progressif.

Scope:
1. Aggregation + cooldown par type de notification.
2. Metriques (emises, lues, CTR CTA) + logs traces.
3. Feature flag et activation progressive.
4. Ajustement des seuils (sold out, incident scan, etc.) selon feedback reel.

Definition of Done:
1. Diminution du volume de notifs redondantes.
2. Dashboard de suivi de perf notifications disponible.
3. Rollout groupe pilote puis extension sans incident majeur.
4. Decision finale navigation (tab ou cloche header) basee sur usage.