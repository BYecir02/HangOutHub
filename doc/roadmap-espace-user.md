# HangOutHub - Roadmap espace user

Date de redaction : 5 avril 2026

## Objectif

Ce document sert de feuille de route pour tout l'espace user de HangOutHub.

But:
- garder une priorite claire
- traiter d'abord les risques reels
- ensuite seulement optimiser l'experience
- eviter de disperser le travail sur du polish trop tot

## Lecture rapide

Ordre de travail recommande:
1. Bloquer les points critiques
2. Securiser les parcours metier sensibles
3. Renforcer le media et les uploads
4. Optimiser les ecrans les plus frequentes
5. Stabiliser le feed social
6. Nettoyer les irritants UX
7. Completer les tests
8. Faire une passe qualite globale

## Phase 1 - Bloquer les points critiques

Objectif:
remettre tout ce qui est critique au niveau production.

A faire:

### 1.1 Auth et session
- verifier le login, le logout et le refresh token
- verifier la redirection en cas de 401
- verifier que la session ne boucle pas en echec silencieux
- verifier que les tokens sont bien nettoyes quand ils sont invalides

### 1.2 Posts et profils
- verrouiller la suppression et la modification des posts
- verifier la creation de post avec media
- verifier la mise a jour du profil utilisateur
- verifier l'affichage correct apres suppression ou edition

### 1.3 Routes sensibles
- verifier les routes qui exposent des donnees utilisateur
- verifier les droits d'acces sur les contenus prives ou restreints
- verifier que les erreurs remontees sont propres et lisibles

### 1.4 Sanity checks techniques
- verifier qu'aucune erreur critique ne bloque le build mobile
- verifier que les actions critiques ont un feedback visuel clair
- verifier que les ecrans principaux restent utilisables apres reload

Definition de fini:
- pas de parcours bloque
- pas de perte de donnees evidente
- pas de regression majeure sur les actions de base
- pas de boucle de session ou de refresh
- pas de suppression ou edition visuellement incoherente
- pas de route sensible accessible sans le bon niveau d'acces

Critere de validation:
- un user peut se connecter, publier, modifier et supprimer sans blocage
- un user deconnecte est redirige proprement
- un user ne perd pas son contenu apres une action critique

Statut:
- en cours

Statut detaille:
- 7.1 Tests unitaires de logique : fait
- 7.2 Tests metier : a faire
- 7.3 Tests cibles UI : a faire

Statut detaille:
- 1.1 Auth et session : fait
- 1.2 Posts et profils : fait
- 1.3 Routes sensibles : fait
- 1.4 Sanity checks techniques : a faire

## Phase 2 - Securiser les bookings

Objectif:
fiabiliser tout ce qui touche aux reservations et aux inscriptions.

### 2.1 Donnees et contraintes
- ajouter une vraie protection contre les doublons cote serveur et cote client
- verifier l'idempotence des reservations, inscriptions et annulations
- renforcer les contraintes base si un cas reel le justifie
- confirmer que les relations et statuts existants couvrent tous les cas metier

### 2.2 Parcours utilisateur
- clarifier les erreurs de validation avant et apres soumission
- verifier les confirmations visuelles apres reservation ou inscription
- verifier les etats intermediaires pendant le traitement reseau
- verifier les annulations, reprises et rechargements de page si le flux existe

### 2.3 Robustesse metier
- verifier le comportement sur double clic et taps repetes
- verifier le comportement si le reseau coupe pendant l'action
- verifier le comportement si le user revient sur le meme ecran et relance
- verifier qu'aucun etat local ne reste bloque apres echec

### 2.4 Sanity checks bookings
- verifier les messages de retour sur tous les cas de reservation
- verifier qu'une reservation deja prise ne peut pas etre rejouee sans sens
- verifier que les ecrans listes et detail restent coherents apres update

Points de controle:
- pas de double reservation sur double clic
- pas de comportement incoherent en cas de retry
- messages d'erreur lisibles pour le user
- pas de reservation fantome ou partiellement creee
- pas de stock ou d'etat local incoherent apres echec
- pas d'ecart entre le statut affiche et le statut reel

Definition de fini:
- un user peut reserver sans risque de doublon
- les erreurs sont lisibles et actionnables
- les cas de concurrence ne cassent pas le parcours
- les etats visuels restent coherents apres echec ou retry
- la source de verite cote serveur reste alignee avec l'UI

Critere de validation:
- un user peut reserver, annuler ou relancer sans provoquer de doublon
- une action en echec ne laisse pas un faux etat de succes
- le rechargement de l'ecran retrouve un etat coherent

Statut:
- fait

Statut detaille:
- 2.1 Donnees et contraintes : fait
- 2.2 Parcours utilisateur : fait
- 2.3 Robustesse metier : fait
- 2.4 Sanity checks bookings : fait

## Phase 3 - Renforcer les uploads media

Objectif:
eviter les erreurs tardives et rendre le pipeline media plus fiable.

### 3.1 Validation front
- pre-valider la taille des fichiers cote front
- verifier le type reel du media avant envoi
- eviter les uploads inutiles

### 3.2 Construction du payload
- fiabiliser la creation des payloads FormData
- verifier que le fichier transmis est bien le bon format
- verifier que l'edition conserve les media existants correctement

### 3.3 Lecture et rendu
- garder le cache media cote player
- verifier le comportement sur iOS et Android
- verifier que les videos demarrent sans etat visuel bizarre

Points de controle:
- aucune perte de media a l'envoi
- erreurs plus claires avant upload
- chargement plus fluide sur les videos
- pas de media manquant apres publication
- pas de chargement sans feedback visuel

Definition de fini:
- l'utilisateur voit tout de suite si son media pose probleme
- les media publies restent presents apres refresh
- la video est fluide au demarrage et au scroll

Statut:
- fait

Statut detaille:
- 3.1 Validation front : fait
- 3.2 Construction du payload : fait
- 3.3 Lecture et rendu : fait

## Phase 4 - Optimiser les ecrans frequents

Objectif:
ameliorer la sensation de vitesse sur les ecrans les plus consultes.

### 4.1 Listes longues
- virtualiser les listes longues quand c'est pertinent
- limiter le travail lourd dans le scroll
- garder les cartes visibles stables

### 4.2 Rerenders
- reduire les rerenders inutiles
- verifier que les props passees aux cartes sont stables
- eviter les calculs lourds au render

### 4.3 Ecrans cibles
- feed social
- profil, onglet posts
- preview media
- listes longues

Definition de fini:
- scroll plus fluide
- moins de latence percue
- pas de saut visuel ou de flicker
- pas de freeze sur les listes importantes
- pas de perte de perception de fluidite au scroll

Statut:
- fait

Statut detaille:
- 4.1 Listes longues : fait
- 4.2 Rerenders : fait
- 4.3 Ecrans cibles : fait

## Phase 5 - Stabiliser le feed social

Objectif:
faire du feed une experience simple, previsible et rapide.

### 5.1 Logique de feed
- conserver la logique de feed serveur comme source de verite
- garder un ordre stable et compréhensible
- ne pas laisser le client reordonner de facon agressive

### 5.2 Autoplay et media
- garder les timings d'autoplay stables
- precharger le media voisin si possible
- reduire le travail au moment de la visibilite

### 5.3 Cache et refresh
- garder un cache simple mais fiable
- verifier que le refresh ne casse pas la timeline
- verifier le comportement quand des posts arrivent pendant la lecture

Points de controle:
- les videos demarrent vite
- le feed ne reordonne pas de facon bizarre
- les nouveaux posts se comportent proprement
- pas de retour en arriere visuel brutal
- pas de latence percue trop forte sur le post actif

Definition de fini:
- le feed ressemble a un vrai produit social
- l'utilisateur comprend ce qu'il voit et pourquoi
- les videos demarrent sans sensation de retard

Statut:
- fait

Statut detaille:
- 5.1 Logique de feed : fait
- 5.2 Autoplay et media : fait
- 5.3 Cache et refresh : fait

## Phase 6 - Nettoyer les irritants UX

Objectif:
retirer tout ce qui donne une impression de produit pas fini.

### 6.1 Feedbacks
- clarifier les etats de chargement
- verifier que chaque action critique a un retour visible
- verifier que les erreurs se comprennent sans lire le code

### 6.2 Cohérence mobile
- ameliorer les erreurs et leurs messages
- harmoniser iOS et Android
- verifier les differences de menus, modales et actions

### 6.3 Ecrans a revoir
- corriger les ecrans qui semblent vides ou mous
- verifier les boutons qui ne donnent pas de feedback
- surveiller les ecrans ou l'utilisateur peut croire que rien ne se passe

Exemples de points a surveiller:
- suppression de post
- lecture video
- retours de formulaire
- chargement du profil
- navigation vers les details
- ouverture de modales
- etats de vide
- actions de partage ou d'edition

Definition de fini:
- chaque action importante donne un retour clair
- les ecrans semblent finis et pas juste fonctionnels
- iOS et Android racontent la meme histoire

Statut:
- en cours

Statut detaille:
- 6.1 Feedbacks : en cours
- 6.2 Cohérence mobile : a faire
- 6.3 Ecrans a revoir : a faire

## Phase 7 - Completer les tests

Objectif:
proteger les flux les plus sensibles avant de toucher a plus de features.

### 7.1 Tests unitaires
- logique pure de post et ownership
- helpers de visibilite et autoplay
- logique de cache et de tri simple
### 7.2 Tests metier
- booking et reservations
- upload media
- suppression et edition de post
- parcours auth critiques

### 7.3 Tests ciblés UI
- cache feed
- comportements de scrolling importants
- etats visuels critiques si la valeur est forte

Regle:
- les tests de logique d'abord
- les tests UI seulement si la valeur est forte
- eviter les tests fragiles qui coutent plus qu'ils ne protègent

Definition de fini:
- les flux les plus risques sont couverts
- les tests restent rapides et maintenables
- on sait quoi casser avant que le user le voie

Statut:
- fait

## Phase 8 - Passe qualite globale

Objectif:
polir la base sans toucher au coeur fonctionnel.

### 8.1 Architecture
- nettoyer les duplications de logique
- simplifier les composants trop gros
- standardiser les patterns repetes

### 8.2 Lisibilite
- revoir les noms, les props, les interfaces
- supprimer les vieux residus devenus inutiles
- remettre a plat les zones qui deviennent difficiles a lire

### 8.3 Maintenance
- verifier ce qui peut etre mutualise sans alourdir
- garder les composants simples et previsibles
- preparer le code pour les prochaines phases produit

But final:
avoir un code plus lisible, plus previsible et plus facile a faire evoluer.

Definition de fini:
- la base est coherente et plus simple a maintenir
- les gros composants sont redevenus raisonnables
- les patterns se ressemblent la ou il faut qu'ils se ressemblent

Statut:
- a faire

## Priorites absolues

P0:
- auth et refresh token
- bookings et doublons
- upload media
- suppression de post
- lecture video dans le feed

P1:
- feed social stable
- profil posts optimisé
- messages d'erreur clairs
- performance sur mobile

P2:
- tests complets sur les flux critiques
- nettoyage UX
- harmonisation iOS et Android

## Ce qu'on ne traite pas avant la base

A repousser tant que les points ci-dessus ne sont pas propres:
- nouvelles features de confort
- gros refactors non indispensables
- decorations UI sans impact metier
- fonctionnalites secondaires non terminees de bout en bout

## Definition de done globale

L'espace user sera considere sain quand:
- les parcours de base ne cassent pas
- les bookings sont fiables
- les media se chargent et se lisent bien
- le feed est fluide
- le profil posts est stable
- les tests critiques sont au vert
- les irritants UX principaux ont ete traites

## Suivi

A chaque avancee, on peut mettre a jour ce document avec:
- ce qui est termine
- ce qui bloque
- ce qui est a faire ensuite
- les points a reevaluer

Ce document doit rester vivant, simple et priorise.