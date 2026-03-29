# UX Flow - Compte Perso + Espace Pro

Date: 2026-03-28  
Produit: HangOutHub (mobile)

## 1) Principe produit (decision)

- Un utilisateur cree **un seul compte** (email + mot de passe).
- Ce compte donne toujours acces a:
  - **Espace perso** (profil perso, social, sorties, messages)
  - **Espace pro** uniquement si active et autorise
- Le mode pro n'ecrase jamais le profil perso.

## 2) Vocabulaire visible utilisateur

- Ne pas afficher "PLACE_OWNER" / "ORGANIZER" en front.
- Utiliser:
  - **Espace perso**
  - **Espace Pro**
  - **Profil de la structure**
  - **Profil du lieu**
  - **Equipe du lieu**

## 3) Parcours cibles

## 3.1 Nouveau user classique

1. Ecran inscription -> choix: "Compte perso"
2. Creation du compte
3. Redirection login puis app user
4. Dans profil perso: bouton discret **"Activer un Espace Pro"**

## 3.2 Nouveau pro a l'inscription

1. Ecran inscription -> choix:
   - "Je gere un lieu"
   - "Je suis organisateur"
2. Etape infos perso
3. Etape dossier pro (structure)
4. Soumission -> statut `PENDING`
5. Acces app perso + acces Espace Pro avec etat dossier

## 3.3 User existant qui active le pro plus tard

1. Depuis profil perso -> "Activer un Espace Pro"
2. Meme formulaire dossier pro
3. Statut `PENDING`, puis validation admin

## 4) Etats dossier pro (status)

- `PENDING`: dossier en attente
  - badge: "En verification"
  - CTA visible: "Modifier mon dossier"
- `APPROVED`: dossier valide
  - badge: "Actif"
  - acces complet selon permissions
- `REJECTED`: refuse
  - badge: "Action requise"
  - CTA: "Corriger et renvoyer"
- `SUSPENDED`: suspendu
  - badge: "Suspendu"
  - acces limite + message clair

## 5) Spec ecrans (UI + libelles)

## 5.1 Inscription - Etape 1 (choix)

- Titre: **"Choisis ton espace de depart"**
- Cartes:
  - **"Compte perso"**
    - desc: "Sorties, social, messages et plans entre amis."
  - **"Je gere un lieu"**
    - desc: "Creer et piloter la presence d'un etablissement."
  - **"Je suis organisateur"**
    - desc: "Publier et gerer des evenements."
- CTA carte: "Continuer"

## 5.2 Inscription - Etape 2 (infos perso)

- Champs:
  - Nom d'utilisateur
  - Email
  - Telephone
  - Mot de passe
- CTA:
  - user: **"Creer mon compte"**
  - pro: **"Continuer"**

## 5.3 Inscription - Etape 3 (dossier pro)

- Champs obligatoires:
  - Nom de la structure
  - IFU / identifiant legal
  - Poste / fonction
  - Infos de paiement
- Champs optionnels:
  - Instagram, TikTok, Facebook, X, Site web
- CTA final: **"Envoyer ma demande"**

## 5.4 Profil perso

- Section "Mon compte"
- Section "Mon activite"
- Carte "Espace Pro":
  - si non active: bouton **"Activer un Espace Pro"**
  - si active: bouton **"Ouvrir l'Espace Pro"**

## 5.5 Espace Pro - Dashboard

- Titre: **"Vue Pro"**
- KPI principaux
- Bloc analytics
- Bloc vide contextualise si aucun lieu/evenement
- Ne pas dupliquer les infos de dossier pro deja presentes dans "Profil de la structure"

## 5.6 Espace Pro - Profil de la structure

- Titre: **"Profil de la structure"**
- Infos:
  - nom structure
  - statut dossier
  - type de compte
- Liste des lieux rattaches
- Tap lieu -> **Profil du lieu (pro)**

## 5.7 Espace Pro - Profil du lieu

- Titre: **"Profil du lieu"**
- Actions:
  - "Voir la page publique"
  - "Nouveau post"
- Section posts du lieu

## 6) Navigation recommandee

- User nav: inchangée (social + create + profile perso)
- Pro nav:
  - Dashboard
  - Profil (structure)
  - Action center (bouton central +)
  - Notifications
  - Parametres
- Dans action center:
  - Gerer les evenements
  - Gerer les lieux
  - Scanner (si permission)

## 7) Permissions metier (simple et lisible)

- Owner/Organizer valide:
  - acces dashboard, lieux, evenements, equipe
- Manager:
  - gestion operationnelle sans options owner sensibles
- Staff:
  - execution (events/lists) sans admin structure
- Scanner:
  - scan + lecture minimale

## 8) Microcopy prete a l'emploi

- "Ton profil perso reste separe de ton Espace Pro."
- "Ton dossier est en cours de verification."
- "Ton Espace Pro est actif."
- "Action requise: mets a jour ton dossier pour continuer."
- "Acces limite: contacte le support pour plus d'infos."

## 9) Regles UX a garder

- Toujours afficher quel espace est ouvert (perso vs pro).
- Toujours permettre de revenir a l'autre espace.
- Ne jamais melanger posts perso et posts de lieu.
- Eviter les termes techniques backend dans l'UI.

## 10) Decision finale proposee

- Oui: **compte unique + dual workspace (perso/pro)**.
- Oui: **activation pro possible a l'inscription ou plus tard**.
- Oui: **profil structure** et **profil lieu** separes dans l'espace pro.
- Non: duplication de comptes ou melange des identites.
