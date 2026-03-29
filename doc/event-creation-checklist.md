# Event Creation Checklist

Objectif: suivre l'implementation du formulaire de creation d'evenement, point par point.

Regle de suivi:
- Cocher [x] quand c'est livre (front + back + validation minimale)
- Ajouter une date et un lien PR/commit dans la ligne
- Garder les items non pertinents en [ ] puis commenter "non retenu"

## 1) Identite de l'evenement
- [x] Titre
- [ ] Sous-titre accroche
- [ ] Description courte
- [x] Description longue
- [x] Categorie principale
- [ ] Sous-categories
- [x] Tags libres
- [ ] Langue de l'evenement

## 2) Date et horaire
- [x] Date de debut
- [x] Heure de debut
- [x] Date de fin
- [x] Heure de fin
- [ ] Fuseau horaire
- [ ] Evenement sur plusieurs jours
- [ ] Planning par session (multi-jours)
- [ ] Duree estimee affichee
- [ ] Heure limite d'entree
- [ ] Option report automatique en cas d'annulation

## 3) Lieu
- [x] Lieu lie existant (placeId)
- [ ] Nom du lieu manuel (hors catalogue)
- [ ] Adresse complete
- [ ] Ville
- [ ] Quartier
- [ ] Coordonnees GPS
- [ ] Type de lieu (indoor, outdoor, rooftop, ...)
- [ ] Instructions d'acces
- [ ] Parking dispo/non dispo
- [ ] Transport conseille
- [ ] Point d'entree exact

## 4) Medias et branding
- [x] Image de couverture obligatoire
- [x] Galerie images
- [ ] Video teaser
- [ ] Logo organisateur affiche
- [ ] Couleur theme de l'event
- [ ] Banniere mobile
- [ ] Texte alternatif accessibilite des images

## 5) Billetterie et prix
- [x] Mode gratuit/payant
- [x] Tarifs multiples
- [x] Nom du tarif
- [x] Prix du tarif
- [ ] Devise
- [x] Stock par tarif
- [ ] Vente debut du tarif
- [ ] Vente fin du tarif
- [ ] Ordre d'affichage des tarifs
- [ ] Tarif masque (backoffice)
- [ ] Quantite max par commande
- [x] Quantite max par utilisateur
- [ ] Frais de service inclus/separes
- [ ] Taxe incluse/non incluse
- [x] Code promo activable
- [x] Regles promo (pourcentage, montant, quota, dates)

## 6) Capacite et acces
- [ ] Capacite totale de l'event
- [ ] Capacite par zone (VIP, standard, backstage)
- [ ] Liste d'attente activable
- [ ] Validation manuelle des demandes
- [ ] Event prive sur invitation
- [ ] Lien prive non indexe
- [ ] Whitelist invites

## 7) Paiement
- [ ] Moyens de paiement autorises
- [ ] Delai de paiement avant expiration reservation
- [x] Statut de paiement requis pour QR
- [ ] Facture/recu automatique
- [ ] Remboursement partiel autorise
- [ ] Remboursement automatique en cas d'annulation

## 8) Regles check-in et scan QR
- [x] Generation QR automatique
- [x] Activation QR selon statut booking
- [x] Fenetre check-in debut (ex: -60 min)
- [x] Fenetre check-in fin (ex: +120 min)
- [ ] Tolerance retard
- [ ] Nombre d'entrees par billet
- [x] Politique anti double-scan
- [x] Mode scan offline + synchronisation
- [x] Message de succes scan
- [x] Messages d'erreur scan personnalises
- [x] Historique des scans avec horodatage
- [x] Compteurs live attendus/scannes/restants

## 9) Profil participant et conformite
- [ ] Nom obligatoire/non obligatoire
- [ ] Telephone obligatoire/non obligatoire
- [ ] Email obligatoire/non obligatoire
- [ ] Date de naissance obligatoire/non obligatoire
- [ ] Age minimum requis
- [ ] Piece d'identite requise
- [ ] Champs custom par event (allergies, table, dress code, ...)

## 10) Regles et politique
- [ ] Conditions d'entree
- [ ] Dress code
- [ ] Objets interdits
- [x] Politique annulation participant
- [ ] Politique no-show
- [x] Politique remboursement
- [ ] Reglement interne
- [ ] Consentement photo/video

## 11) Communication
- [ ] Contact organisateur principal
- [ ] Contact support jour J
- [ ] Lien WhatsApp/Telegram
- [ ] Lien Instagram/TikTok/site
- [ ] Message confirmation reservation
- [ ] Message pre-event automatique
- [ ] Message post-event automatique

## 12) Visibilite et publication
- [x] Statut brouillon (local, cote app)
- [x] Previsualisation avant publication
- [x] Publication immediate
- [ ] Programmation de publication
- [ ] Depublication
- [ ] Duplication d'un event existant
- [ ] Archivage

## 13) Decouverte et SEO interne
- [ ] Mots-cles de recherche
- [ ] Ville ciblee pour ranking
- [ ] Niveau de mise en avant
- [ ] Flag "tendance"
- [ ] Image sociale de partage
- [ ] Titre de partage
- [ ] Description de partage

## 14) Securite et moderation
- [ ] Limite anti-spam creation
- [ ] Blocage contenu interdit
- [ ] Validation admin avant mise en ligne
- [ ] Journal d'audit des modifications
- [ ] Historique des versions

## 15) Analytics et pilotage
- [ ] Source de trafic
- [ ] Vues page event
- [ ] Taux de conversion vue -> booking
- [ ] Ventes par tarif
- [ ] Ventes par periode
- [ ] No-show rate
- [ ] Temps moyen de check-in
- [ ] Exports CSV

## 16) Collaboration equipe
- [x] Co-organisateurs
- [x] Permissions par role
- [x] Operateurs scan dedies
- [ ] Notes internes non visibles public

## 17) UX createur
- [ ] Formulaire en etapes
- [x] Auto-save brouillon
- [ ] Validation instantanee champ par champ
- [ ] Messages d'erreur clairs
- [x] Alerte avant quitter sans sauvegarder
- [ ] Preremplissage depuis template
- [ ] Duplication rapide d'un event precedent

## Priorisation suggeree

### V1 (a livrer en premier)
- [x] Titre + description + date/heure + lieu
- [x] Cover + galerie
- [x] Tarifs multiples + stock + validation
- [x] QR/scan operationnel (deja en place a consolider)
- [x] Brouillon + publication

### V2 (impact fort)
- [x] Categorie/tags + discoverability
- [x] Fenetre check-in configurable
- [x] Limites achat par user
- [x] Politique annulation/remboursement
- [x] Previsualisation et auto-save robuste

### V3 (scale)
- [x] Promo codes avances
- [x] Collaboration equipe fine
- [x] Analytics complets
- [x] Audit/versioning
- [x] Scan offline et sync
