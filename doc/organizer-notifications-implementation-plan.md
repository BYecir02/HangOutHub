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
4. Rappel evenement imminent (presets D-1, H-3, H-1 puis version personnalisee).
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

## Extension produit: rappels personnalises (V2)

Objectif:
Permettre a un organizer de definir ses propres rappels (ex: 36h, 6h, 30min) sans supprimer la simplicite des presets actuels.

### Principes UX
1. Conserver les presets rapides: `24h`, `3h`, `1h`.
2. Ajouter une action `+ Ajouter un rappel`.
3. Limiter le nombre total de rappels actifs (reco: max `3`).
4. Interdire les doublons (meme offset).
5. Afficher la priorite estimee (`important` / `urgent`) au moment de la creation.

### Modele de donnees propose
Option recommandee (simple et robuste): stocker une liste d'offsets en minutes dans `UserSettings`.

Ajouts schema:
1. `organizerReminderOffsetsMin Int[]` (ex: `[1440, 180, 60]`).
2. `organizerReminderMode String` avec valeurs `preset` ou `custom` (defaut: `preset`).

Regles:
1. Valeurs autorisees: `15` a `10080` minutes (15 min -> 7 jours).
2. Liste unique, triee decroissante (du plus loin au plus proche).
3. Si mode `preset`, utiliser `[1440, 180, 60]` en interne.

### Compatibilite avec l'existant
Pendant la transition, les toggles actuels restent supportes.

Mapping de compatibilite:
1. `organizerNotifyReminderD1=true` -> offset `1440`.
2. `organizerNotifyReminderH3=true` -> offset `180`.
3. `organizerNotifyReminderH1=true` -> offset `60`.

Strategie:
1. Lire prioritairement `organizerReminderOffsetsMin` si present et non vide.
2. Sinon, reconstruire la liste via les toggles legacy.
3. Quand l'utilisateur sauvegarde en mode custom, ecrire `organizerReminderOffsetsMin` et basculer `organizerReminderMode=custom`.

### API (proposition)
Ajouter un endpoint dedie aux rappels organizer:
1. `GET /users/me/settings/reminders` -> mode + offsets.
2. `PUT /users/me/settings/reminders` -> remplace la configuration.

Payload `PUT` propose:
1. `mode: 'preset' | 'custom'`
2. `offsetsMin: number[]`

Validations backend:
1. tableau non vide si `mode=custom`.
2. max 3 elements.
3. sans doublons.
4. toutes les valeurs dans la plage autorisee.

### Regles de generation des notifications
1. Le sweep reminders reste periodique (toutes les 15 min).
2. Pour chaque event a venir, calculer `deltaMs = startTime - now`.
3. Pour chaque offset configure, declencher si `deltaMs` est dans la fenetre du sweep.
4. Severite derivee de l'offset:
   - `<= 90 min` -> `URGENT`
   - `> 90 min` -> `IMPORTANT`
5. Filtrer via `organizerNotificationPriorityMin`.
6. Dedoublonner avec une cle metier stable: `(userId, eventId, reminderOffsetMin)`.

Implementation dedoublonnage:
1. Ajouter dans le `payload` les champs `eventId` et `reminderOffsetMin`.
2. Verifier l'existence avant create sur cette cle logique.

### Migration proposee
1. Migration DB: nouveaux champs `organizerReminderOffsetsMin`, `organizerReminderMode`.
2. Backfill: remplir `organizerReminderOffsetsMin` a partir des 3 toggles existants.
3. Front: afficher presets + custom, garder fallback sur toggles le temps du rollout.
4. Nettoyage final (V3): deprecier les 3 toggles si adoption confirmee.

### Risques et garde-fous
1. Fuseaux horaires / DST: utiliser exclusivement des timestamps UTC cote calcul.
2. Spam: max 3 rappels + dedoublonnage strict + cooldown eventuel.
3. Complexite UX: default simple sur presets, custom optionnel.

### Checklist V2 (rappels personnalises)
- [ ] Schema: offsets + mode ajoutes
- [ ] Validation backend offsets (bornes, max, unicite)
- [ ] Endpoint settings/reminders (GET/PUT)
- [ ] Sweep reminders base sur offsets (plus sur D-1/H-3/H-1 fixes)
- [ ] Dedoublonnage `(eventId, reminderOffsetMin)`
- [ ] UI organizer settings: presets + ajout/suppression rappel custom
- [ ] Instrumentation: volume de rappels emis, taux de lecture par offset