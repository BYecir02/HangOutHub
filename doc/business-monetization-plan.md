# Plan de monetisation HangOutHub

## Objectif
Transformer HangOutHub en business rentable en monetisant d abord les organisateurs et les lieux, puis en ajoutant des revenus complementaires.

## Principe de base
- Priorite 1: revenus transactionnels (billetterie)
- Priorite 2: revenus recurrents (abonnement Pro)
- Priorite 3: revenus media (mise en avant / sponsor)

## Pourquoi ce choix
- L app a deja un coeur operationnel solide: creation d evenements, tickets, scanner, check-in.
- Les organisateurs ont un besoin direct et monnayable (vendre, controler, analyser).
- Les utilisateurs grand public sont plus sensibles au prix: mieux vaut eviter de les faire payer trop tot.

## Offres de revenu recommandees

### 1) Commission billetterie (a lancer en premier)
- Modele: pourcentage par ticket + frais fixe.
- Exemples de grille:
  - Plan standard: 5% + 100 FCFA / ticket
  - Plan Pro: 3.5% + 100 FCFA / ticket
- Strategie:
  - Soit frais supportes par l acheteur
  - Soit frais supportes par l organisateur
  - Ideal: laisser le choix par evenement

### 2) Abonnement Pro organisateur
- Free:
  - Creation d evenements
  - Scanner basic
  - Features essentielles
- Pro (mensuel):
  - Analytics avances
  - Exports scans/bookings
  - Plus de collaborateurs
  - Rappels plus fins et automatisations
  - Priorite support
- Prix de depart conseille:
  - Solo: 15 000 a 25 000 FCFA / mois
  - Team: 35 000 a 60 000 FCFA / mois

### 3) Mise en avant payante (sponsor local)
- Produits:
  - Event sponsorise sur Home/Discover
  - Mise en avant locale par ville/quartier
  - Packs 3 jours / 7 jours
- Prix de depart:
  - Test petit budget: 5 000 a 15 000 FCFA
  - Pack hebdo premium: 20 000 a 60 000 FCFA

### 4) Services operationnels
- Frais optionnels pour:
  - Remboursements/annulations
  - SMS/WhatsApp reminders
  - Support event day (SLA)

### 5) Partenariats
- Commissions d apport avec:
  - Bars/clubs
  - VTC
  - Marques boisson/sponsors

## Ce qu il faut eviter au debut
- Abonnement payant pour les users grand public.
- Publicites generiques trop tot (faible revenu au debut).
- Trop de packs complexes avant d avoir du volume.

## Roadmap 90 jours

### Phase 1 (J1-J30): fondations revenu
- Ajouter un module pricing simple billetterie.
- Definir qui paie les frais (acheteur vs organisateur).
- Ajouter ecran recap revenu net par evenement.
- Instrumenter tracking des conversions ticket.

Livrables:
- Regles de commission actives
- Historique des ventes nettes
- Dashboard de base revenu

### Phase 2 (J31-J60): abonnement Pro
- Ajouter flags de features Pro cote backend/frontend.
- Lancer plan Pro avec essais gratuits limites.
- Ajouter paywall doux sur analytics/export.

Livrables:
- Plan Free/Pro en prod
- KPI essai -> conversion

### Phase 3 (J61-J90): sponsor et acceleration
- Ajouter placements sponsorises Home/Discover.
- Ajouter backoffice minimum pour creer des campagnes.
- Lancer 5 a 10 campagnes pilotes locales.

Livrables:
- Produits sponsor en prod
- Template de reporting annonceur

## KPI a suivre chaque semaine
- GMV (valeur totale billets vendus)
- Revenus commission
- Revenus abonnement
- Revenus sponsor
- Organisateurs actifs (WAO)
- Taux conversion create event -> ventes
- Taux conversion Free -> Pro
- Taux no-show vs check-in
- Taux de remboursement

## Seuils cibles (12 mois)
- 50 a 100 organisateurs actifs payants
- 1 000 a 3 000 billets / mois
- Mix revenu:
  - 50-70% commissions
  - 20-40% abonnements
  - 10-20% sponsor

## Exemple de projection simple
Hypothese moyenne:
- 1 500 billets / mois
- Panier moyen: 6 000 FCFA
- GMV: 9 000 000 FCFA
- Commission moyenne effective: 4%

Revenus commissions:
- 360 000 FCFA / mois

Abonnements:
- 40 organisateurs Pro x 20 000 FCFA
- 800 000 FCFA / mois

Sponsor local:
- 12 campagnes x 20 000 FCFA
- 240 000 FCFA / mois

Total mensuel estime:
- 1 400 000 FCFA / mois

## Priorite produit immediate (ordre recommande)
1. Billetterie monetisee stable
2. Dashboard revenu organisateur
3. Plan Pro
4. Sponsor local

## Decision business claire
La meilleure strategie pour HangOutHub: monetiser la valeur operationnelle des organisateurs avant de moniser les utilisateurs grand public.
