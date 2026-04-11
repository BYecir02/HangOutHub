# HangOutHub - 

## Objectif du deck

Présenter HangOutHub de manière simple, claire et convaincante, en expliquant :

- le problème que le produit résout
- pour qui il a été pensé
- comment il fonctionne concrètement
- pourquoi il a de la valeur
- comment il peut générer du revenu

Le deck ci-dessous est rédigé pour être copié dans Gamma tel quel.

---

## Slide 1 - Titre

# HangOutHub

## La plateforme locale pour découvrir, socialiser et organiser des sorties

HangOutHub rassemble dans une seule app :

- la découverte de lieux
- la découverte d’événements
- les sorties entre amis
- le social simple
- les outils pour les organisateurs et les lieux

### Message oral

HangOutHub est pensé comme un hub local. L’idée n’est pas seulement de montrer des événements, mais de relier les gens, les lieux et les organisateurs dans une expérience fluide.

---

## Slide 2 - Le problème

# Un marché fragmenté

Aujourd’hui, découvrir quoi faire en ville est compliqué parce que l’information est dispersée entre plusieurs outils.

### Constats

- les lieux sont sur une plateforme
- les événements sur une autre
- les réseaux sociaux ne sont pas organisés pour la sortie locale
- les organisateurs n’ont pas toujours un outil simple de gestion
- les lieux manquent d’un espace clair pour exister et être visibles

### Conséquence

L’utilisateur perd du temps, les pros perdent en visibilité, et l’expérience locale reste morcelée.

### Message oral

Le problème principal est la fragmentation. HangOutHub essaie de remettre toute la chaîne au même endroit : découverte, interaction, réservation, organisation et suivi.

---

## Slide 3 - La solution

# Une seule plateforme pour tout le parcours local

HangOutHub propose une expérience complète autour de la sortie :

- découvrir un lieu
- voir les événements associés
- suivre l’activité sociale
- organiser une sortie entre amis
- réserver ou rejoindre un événement
- gérer un lieu ou un événement côté pro

### Idée centrale

La plateforme ne sépare pas la découverte du social et de l’opérationnel. Elle relie les trois.

### Message oral

L’approche est simple : on ne fait pas qu’un annuaire, on ne fait pas qu’un réseau social, et on ne fait pas qu’un outil pro. On combine les trois pour créer une vraie valeur d’usage.

---

## Slide 4 - Pour qui

# Trois profils principaux

## 1. L’utilisateur

- découvre des lieux et des événements
- publie des contenus simples
- aime, commente, partage
- organise des sorties

## 2. L’organisateur

- crée et gère des événements
- suit les réservations
- contrôle les entrées
- consulte ses statistiques

## 3. Le propriétaire de lieu

- présente son lieu
- publie de l’activité
- met en avant ses événements
- gère sa présence dans l’app

### Message oral

Le produit a été conçu autour de trois rôles métier. C’est important parce que les besoins ne sont pas les mêmes selon qu’on soit simple utilisateur, organisateur ou propriétaire de lieu.

---

## Slide 5 - L’expérience utilisateur

# Le parcours côté utilisateur

L’utilisateur voit d’abord un contenu vivant et utile.

### Les écrans clés

- un fil social
- une page d’exploration
- des catégories de découverte
- une fiche lieu
- une fiche événement
- une page de sorties / conversations

### Ce que l’utilisateur peut faire

- consulter des inspirations
- filtrer par ville ou catégorie
- voir les lieux et les événements les plus pertinents
- créer une sortie
- interagir avec ses amis

### Microcopy fiche lieu

- bouton recommandé: **Publications 12**
- objectif: rendre le bouton plus concret et plus incitatif qu’un simple "Publications"

### Message oral

Le but est de donner une expérience “vivante” dès l’ouverture de l’app, avec du contenu utile et pas seulement des listes statiques.

---

## Slide 6 - La logique social

# Un social simple, utile et centré sur la sortie

Le social de HangOutHub n’est pas conçu comme un réseau généraliste.

### Il sert à :

- publier une activité ou un plan
- commenter une publication
- aimer un contenu
- partager une sortie
- garder le lien entre personnes et lieux

### Ce qu’on évite

- une complexité sociale inutile
- une logique de réseau trop abstraite
- des fonctionnalités qui éloignent de l’objectif principal

### Message oral

Le social est là pour renforcer la découverte et la conversion vers l’action. Il ne remplace pas la découverte, il l’amplifie.

---

## Slide 7 - L’expérience pro

# Un espace pro séparé du profil perso

HangOutHub suit une logique claire : un seul compte, mais deux espaces.

### Espace perso

- profil personnel
- social
- sorties
- messages

### Espace pro

- dashboard
- profil de la structure
- profil du lieu
- gestion des événements
- notifications
- scan / validation

### Pourquoi c’est important

- le profil perso reste distinct
- le pro n’écrase jamais le compte personnel
- chaque espace garde son vocabulaire et ses usages

### Message oral

Cette séparation est essentielle pour garder une UX claire. L’utilisateur comprend toujours dans quel espace il se trouve et pourquoi.

---

## Slide 8 - Les fonctionnalités clés

# Ce que le produit sait faire

## Côté découverte

- navigation par catégories
- recherche de lieux et d’événements
- filtres par ville
- cartes de recommandations

## Côté social

- publications
- commentaires
- likes
- partage
- connexions

## Côté opérationnel

- création d’événements
- gestion des réservations
- scan des tickets
- notifications
- analytics

### Message oral

La force du produit est la cohérence entre ces fonctions. Elles ne sont pas ajoutées au hasard, elles servent toutes le même objectif : faire passer une intention locale à une action réelle.

---

## Slide 9 - L’architecture produit

# Un socle technique orienté modularité

### Frontend mobile

- Expo Router
- React Native
- TypeScript
- composants réutilisables

### Backend

- NestJS
- Prisma
- PostgreSQL
- modules métiers séparés

### Intention d’architecture

- réutiliser les composants partout
- éviter les duplications visuelles
- garder une base claire et maintenable
- préparer la montée en charge fonctionnelle

### Message oral

Le produit n’a pas été pensé comme une simple maquette. L’architecture vise une app durable, avec un socle technique qui peut évoluer sans tout casser.

---

## Slide 10 - Design et cohérence

# Une expérience visuelle unifiée

HangOutHub s’appuie sur une logique de design system interne léger.

### Principes retenus

- cartes partagées entre les écrans
- grilles cohérentes
- modales et bottom sheets unifiées
- filtres réutilisables
- états vides et chargements homogènes

### Résultat

- plus de cohérence visuelle
- moins de code dupliqué
- meilleure vitesse d’itération
- expérience plus premium

### Message oral

Le design n’est pas décoratif. Il sert la lisibilité, la maintenabilité et la sensation de produit sérieux.

---

## Slide 11 - Monétisation

# Un modèle économique progressif

Le modèle de revenu est pensé en plusieurs étapes.

### 1. Commission billetterie

- revenu principal
- lié aux événements vendus via la plateforme

### 2. Offre Pro

- fonctionnalités avancées pour organisateurs et lieux
- visibilité accrue
- outils de gestion et statistiques

### 3. Sponsoring local

- mise en avant de lieux ou d’événements
- revenus complémentaires

### Message oral

La monétisation est alignée avec l’usage réel. On monétise d’abord la valeur créée autour des événements et de la gestion pro.

---

## Slide 12 - MVP et vision

# Ce qu’on garde, ce qu’on évite, où on va

### MVP à garder

- découverte de lieux
- découverte d’événements
- publications simples
- likes et commentaires
- création de sorties
- espace pro de base

### À éviter dans un premier temps

- complexité excessive
- trop de fonctionnalités sociales avancées
- fonctionnalités non terminées ou non démontrables

### Vision long terme

HangOutHub veut devenir la plateforme locale qui relie :

- les utilisateurs
- les lieux
- les organisateurs
- les sorties
- les interactions sociales

### Message oral

Le bon angle de présentation est celui d’un produit utile aujourd’hui et extensible demain. Le MVP doit être simple, clair et démontrable.

---

## Slide 13 - Conclusion

# Pourquoi HangOutHub a du sens

HangOutHub répond à un besoin concret : rendre la sortie locale plus simple, plus sociale et plus actionnable.

### En une phrase

Une seule app pour découvrir, partager et organiser la vie locale.

### Message final

Le produit est intéressant parce qu’il relie des usages qui sont souvent séparés : la découverte, le social et l’opérationnel.

---

## Bonus - Texte court pour l’introduction orale

HangOutHub est une plateforme mobile de découverte locale et d’organisation de sorties. Elle permet aux utilisateurs de trouver des lieux et des événements, de socialiser autour de contenus simples, et aux professionnels de gérer leur présence, leurs événements et leurs interactions dans une même interface.

## Bonus - Texte court pour la conclusion orale

Le projet a de la valeur parce qu’il résout un vrai problème de fragmentation. Il simplifie l’expérience utilisateur et crée un cadre clair pour la monétisation côté pro.