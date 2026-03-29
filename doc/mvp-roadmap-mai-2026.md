# HangOutHub - Cadrage MVP jusqu'au 31 mai 2026

Date de redaction : 9 mars 2026

## Verdict franc

Le projet HangOutHub est un bon projet.

Pourquoi :
- l'idee produit est claire
- la cible est identifiable
- le positionnement local est interessant
- la stack technique est coherente
- il y a deja une vraie base exploitable

En revanche, l'application est encore dans un etat "prototype avance", pas dans un etat "production".

Le vrai probleme n'est pas l'idee.
Le vrai probleme est le scope.

## Ce qu'il faut accepter maintenant

D'ici le 31 mai 2026, il est realiste de livrer :
- un MVP propre
- une application demo-ready
- une beta credible

D'ici le 31 mai 2026, il n'est pas realiste de livrer toute la vision complete si on garde tout le scope actuel.

Il faut donc viser une version 1 petite, claire et impeccable, au lieu d'une grosse application incomplete.

## Positionnement du MVP

Le coeur du produit a conserver :
- decouverte de lieux
- decouverte d'evenements
- enregistrement simple de lieux
- organisation de sorties simples
- inscription et connexion
- profil utilisateur
- profil organisateur simple
- creation de lieu
- creation d'evenement
- publication sociale simple
- likes et commentaires

En une phrase :

HangOutHub V1 doit etre une application mobile sociale de decouverte locale qui permet a un utilisateur de trouver des lieux et des evenements, et a un organisateur ou gerant de publier son activite.

## Mapping des fonctionnalites par profil

Les roles a garder en tete dans le MVP :
- `USER` : utilisateur classique
- `ORGANIZER` : promoteur d'evenements
- `PLACE_OWNER` : gerant ou proprietaire de lieu

### Ce qui concerne tous les profils
- liste des lieux
- detail d'un lieu
- liste des evenements
- detail d'un evenement

Logique :
- un `USER` consulte et decouvre
- un `ORGANIZER` consulte aussi pour verifier l'experience publique
- un `PLACE_OWNER` consulte aussi pour verifier ses lieux et l'offre autour

### Ce qui concerne surtout le profil utilisateur classique
- profil utilisateur fonctionnel
- modification du profil
- consultation de ses posts
- likes et commentaires

Logique :
- ce bloc concerne surtout le role `USER`
- un compte pro garde aussi un profil, mais son affichage prioritaire doit etre pense comme un profil organisateur

### Ce qui concerne surtout les profils pro
- creation de lieu
- creation d'evenement
- profil organisateur simple mais propre

Logique :
- `ORGANIZER` cree surtout des evenements
- `PLACE_OWNER` cree surtout un lieu, puis peut creer des evenements lies a ce lieu
- ces deux roles doivent avoir un profil pro plus simple qu'un dashboard complet, mais propre, credible et presentable

### Regle produit a retenir

Dans le MVP :
- la partie "decouverte" concerne tout le monde
- la partie "creation" concerne surtout les profils pro
- le profil `USER` et le profil pro ne doivent pas essayer d'afficher la meme chose

## Ce qu'on garde absolument

### Parcours utilisateur
- inscription
- connexion
- accueil avec vraies donnees
- recherche simple
- liste de lieux
- liste d'evenements
- detail lieu
- detail evenement
- enregistrer un lieu pour plus tard
- organiser une sortie depuis un lieu ou un evenement
- profil utilisateur
- modification du profil
- parametres

### Parcours social
- creation de post
- affichage des posts
- like
- commentaire
- suppression ou edition de son propre post

### Parcours organisateur
- inscription pro
- profil pro simple
- creation d'un lieu
- creation d'un evenement
- page "mes evenements" basique

### Qualite minimum obligatoire
- routes corrigees
- navigation coherente
- types corriges
- lint propre
- tests critiques qui passent
- endpoints sensibles securises

## Ce qu'il faut geler ou couper maintenant

Ces elements ne doivent pas bloquer la V1 :
- discussions privees
- stories
- carte interactive complexe
- tickets complets
- scanner reel
- dashboard pro avance
- recommandations intelligentes
- systeme de preferences avance
- favoris si non branches de bout en bout
- logique friends/private si elle n'est pas vraiment appliquee cote backend
- toutes les features seulement mockees

Regle simple :

si une fonctionnalite n'est pas terminee de bout en bout, elle sort du MVP.

## Niveau de maturite actuel

### Points forts
- stack solide : Expo + NestJS + Prisma
- separation frontend/backend claire
- ambition produit reelle
- plusieurs flux deja presents
- design mobile deja engage

### Points faibles
- trop de perimetre par rapport au temps
- plusieurs ecrans encore mockes
- navigation incoherente a certains endroits
- securite backend encore insuffisante sur certaines routes
- lint, tests et typecheck pas encore totalement stabilises
- experience organisateur en transition

## Objectif final a viser pour mai

Au 31 mai 2026, HangOutHub doit pouvoir faire correctement les choses suivantes :

1. Un utilisateur cree un compte ou se connecte.
2. Il arrive sur un accueil propre avec categories, lieux et evenements.
3. Il peut consulter un lieu ou un evenement.
4. Il peut publier un post, liker et commenter.
5. Il peut modifier son profil.
6. Un organisateur peut creer son compte pro.
7. Un organisateur peut creer un lieu ou un evenement.
8. L'application est stable, demoable et presentable.

Si ces 8 points sont reussis, le projet sera deja bon.

## Roadmap realiste jusqu'au 31 mai 2026

### Phase 1 - Stabilisation technique
Periode : du 9 mars 2026 au 23 mars 2026

Objectif :
remettre le projet dans un etat sain.

A faire :
- corriger les routes cassees
- corriger les incoherences de navigation
- supprimer ou masquer les ecrans templates restants
- corriger les erreurs TypeScript
- remettre le lint au vert
- remettre les tests backend critiques au vert
- securiser les routes sensibles sur `users`
- verifier les uploads et l'authentification

Livrable attendu :
une base stable sur laquelle on peut construire sans regressions evidentes.

### Phase 2 - Finalisation du coeur MVP
Periode : du 24 mars 2026 au 14 avril 2026

Objectif :
terminer les parcours essentiels.

A faire :
- home branche sur de vraies donnees
- liste et details des lieux
- liste et details des evenements
- creation de lieu
- creation d'evenement
- profil utilisateur fonctionnel
- profil organisateur simple mais propre
- flux posts / likes / commentaires finalises

Repartition par role :
- `USER` : liste/details des lieux, liste/details des evenements, profil utilisateur, posts/likes/commentaires
- `ORGANIZER` : liste/details des lieux, liste/details des evenements, creation d'evenement, profil organisateur
- `PLACE_OWNER` : liste/details des lieux, liste/details des evenements, creation de lieu, creation d'evenement, profil organisateur

Livrable attendu :
un MVP fonctionnel de bout en bout.

#### Suivi d'avancement Phase 2
Mise a jour : 9 mars 2026

- `fait` : home branche sur de vraies donnees
- `fait` : liste des lieux
- `fait` : detail des lieux
- `fait` : liste des evenements
- `fait` : detail des evenements
- `fait` : clic sur une categorie ouvre une decouverte filtree
- `fait` : creation de lieu
- `fait` : creation d'evenement
- `fait` : profil utilisateur fonctionnel
- `fait` : profil organisateur simple mais propre
- `fait` : flux posts / likes / commentaires
- `fait` : seed demo pour rendre l'application plus vivante
- `fait` : bouton + contextuel selon le profil
- `fait` : creation de sortie simple pour le role USER
- `fait` : detail lieu -> enregistrer dans les envies
- `fait` : detail lieu / detail evenement -> organiser une sortie pre-remplie
- `fait` : profil USER -> onglet envies avec lieux enregistres
- `fait` : systeme de connexions de base via recherche (demande, acceptation, retrait)
- `fait` : creation de sortie avec invitations de connexions acceptees
- `fait` : recherche allegee pour ne garder que la decouverte de profils
- `fait` : demandes recues et invitations de sorties deplacees dans notifications
- `fait` : page connexions dediee pour connexions et demandes envoyees
- `fait` : detail de sortie avec participants et invitations
- `fait` : profil public (vue d un autre utilisateur)

Lecture du statut :
- `fait` = parcours branche et accessible dans l'application
- `partiel` = flux existant mais encore a polir ou a completer
- `a faire` = pas encore priorise ou pas encore implemente

### Phase 3 - Polish design et UX
Periode : du 15 avril 2026 au 5 mai 2026

Objectif :
rendre l'application desirable et coherente.

A faire :
- maquettes finales
- integration visuelle propre
- dark mode coherent
- etats vides
- etats de chargement
- etats d'erreur
- harmonisation des cartes, boutons, headers, tabs et modals

Livrable attendu :
une application propre visuellement et credible en demo.

#### Suivi d'avancement Phase 3
Mise a jour : 9 mars 2026

- `fait` : les boutons voir tout du home ouvrent de vraies pages dediees
- `fait` : page Tous les evenements avec recherche et filtres simples
- `fait` : page Tous les lieux avec recherche et filtres simples
- `fait` : page Decouvrir pour prolonger les recommandations
- `fait` : profil user renforce avec synthese, stats et tabs plus utiles
- `fait` : profil user recentre sur connexions / envies / sorties / posts
- `fait` : notifications restructurees avec cartes resume + pages detaillees
- `fait` : activite recente alimentee par les lieux enregistres
- `partiel` : harmonisation visuelle globale restante

### Phase 4 - QA et durcissement
Periode : du 6 mai 2026 au 20 mai 2026

Objectif :
fiabiliser avant presentation.

A faire :
- tests manuels de tous les parcours
- correction des bugs bloquants
- verification auth / logout / suppression compte
- verification creation post / lieu / evenement
- verification affichage des images
- nettoyage du seed et des donnees de demo
- nettoyage des erreurs console inutiles

Livrable attendu :
une version stable qui ne casse pas pendant une demo.

### Phase 5 - Finition et presentation
Periode : du 21 mai 2026 au 31 mai 2026

Objectif :
preparer la livraison finale.

A faire :
- screenshots propres
- video de demo si necessaire
- README propre
- documentation minimale
- script de presentation
- derniers ajustements visuels

Livrable attendu :
une version finale presentable, claire et defendable.

## Regles de pilotage a suivre

### Regle 1
Une feature non terminee de bout en bout ne compte pas comme une feature.

### Regle 2
Le MVP doit privilegier la coherence plutot que la quantite.

### Regle 3
Tout ce qui est mocke doit soit etre remplace, soit etre retire du parcours principal.

### Regle 4
Chaque semaine doit produire un resultat visible dans l'application.

### Regle 5
Si une feature prend trop de temps, on la deplace hors MVP sans debat.

## Definition de reussite

Le projet sera considere comme reussi pour mai 2026 si :
- l'application se lance proprement
- les parcours principaux fonctionnent
- la demo ne casse pas
- le design est coherent
- les roles user et organisateur sont comprenables
- le projet donne une impression de produit reel, pas de maquette codee

## Conclusion

HangOutHub peut devenir un tres bon projet si on accepte une verite simple :

il ne faut pas finir "tout le reve" d'ici mai 2026.
Il faut finir "une V1 solide" d'ici mai 2026.

La bonne strategie n'est donc pas :
- ajouter encore plus de choses

La bonne strategie est :
- reduire le scope
- finir le coeur
- polir fort
- presenter une application petite mais serieuse
