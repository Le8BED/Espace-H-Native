# Espace H : application 100 % native (React Native / Expo), version 1.1

Tous les écrans de l'application sont natifs. Aucune page du site n'est affichée dans une fenêtre.

L'application garde l'identifiant `com.agencehimmobilier.espaceh` : elle remplace donc l'ancienne sur les téléphones.

## Avant de tester : le serveur (obligatoire)

Les paquets **site-vitrine-v63** et **extranet-gestion-v63** doivent être installés. Ils ajoutent :

- `/api/app/biens` (catalogue des biens) et `/api/app/contact` (formulaire de contact) sur le site ;
- `/api/app/login` (connexion de l'application) sur l'extranet.

## Tester sur ton téléphone (Android ou iPhone), sans rien fabriquer

1. Sur le téléphone, installe **Expo Go**, gratuit.
2. Sur le PC, dans PowerShell :
   ```
   cd "D:\agence h immo\IA\Applications natives\Espace H Native"
   npm.cmd install
   npx.cmd expo start
   ```
3. Scanne le QR code :
   - sur Android, avec Expo Go ;
   - sur iPhone, avec l'appareil photo.

   Le PC et le téléphone doivent être sur le même Wi-Fi. Sinon, lance `npx.cmd expo start --tunnel`.

## Parcours de test de A à Z

### Partie publique (sans compte)

| # | Écran | À vérifier |
|---|---|---|
| 1 | Recherche | Les biens s'affichent. Ouvre les filtres (Acheter / Louer, ville, type, budget, surface, pièces) et vérifie que la liste change. |
| 2 | Fiche d'un bien | Photos à faire glisser, Partager, Appeler, « Être recontacté », puis envoi du formulaire de contact. |
| 3 | VEFA | Les lots s'affichent, avec leur plan. « Réserver ce lot » : remplir le formulaire, puis choisir le rendez-vous de signature. |
| 4 | MAKOMSPACE | Les tarifs s'affichent. « Réserver maintenant » : formule, dates, coordonnées, puis passage au paiement en ligne. |
| 5 | Menu | Tuiles et rubriques. Dans Domiciliation, « Souscrire » : société, puis rendez-vous. Dans Nous contacter, le formulaire. |

### Connexion

| # | À vérifier |
|---|---|
| 6 | Menu › « Se connecter » : l'écran arrive en fondu. Après la connexion, l'écran **se retourne**. |
| 7 | Ferme l'application et rouvre-la : tu dois rester connecté, et tes initiales apparaissent en haut de Recherche. |
| 8 | La pastille de retour au site, puis « Se déconnecter » dans le Menu : l'écran se retourne de nouveau. |

### Espace locataire

| # | À vérifier |
|---|---|
| 9 | Logement : statut du loyer du mois. |
| 10 | Quittances : ouverture du PDF. |
| 11 | Paiement : RIB et son PDF. |
| 12 | Documents. |
| 13 | Menu › Messages (envoyer un message), Syndic, Mes infos. |

### Espace propriétaire

| # | À vérifier |
|---|---|
| 14 | Tableau : loyers sur 12 mois, montant à recevoir. |
| 15 | Mes biens, puis un lot : son locataire et ses quittances. |
| 16 | Relevés : changement d'année, PDF. |
| 17 | Documents, et dans le Menu : Travaux, Syndic, Mes infos. |

### Espace domiciliation

| # | À vérifier |
|---|---|
| 18 | Courrier : ouverture d'un courrier, archivage, onglet Archives, Documents. |

### Espace administrateur

La barre du bas contient Accueil · Loyers · Gestion · Chat · Menu.

| # | Écran | À vérifier |
|---|---|---|
| 19 | Accueil | Encaissements du mois et alertes : impayés (Relancer), assurances (email), IRL (Appliquer), travaux, anciens locataires. |
| 20 | Loyers | Changement de mois, filtres. Sur un locataire : Encaisser ou Impayé. « Envoyer les quittances ». |
| 21 | Gestion | Propriétaire, puis lot, puis locataire : fiche, quittances, messages, dépôt d'un document (photo ou fichier). |
| 22 | Chat | Ouvrir une conversation, répondre, clôturer. |
| 23 | Menu › Emails | Choix de la boîte, lecture, réponse, « Traité », nouveau message. |
| 24 | Menu › CRM | Transaction / Location, statut, note, nouveau contact. |
| 25 | Menu › Publication | Nouvelle annonce avec des photos prises au téléphone, changement de statut, suppression. |
| 26 | Menu › Travaux | Étapes, relance d'un artisan, devis retenu, facture jointe (photo), travaux directs. |
| 27 | Menu › Comptabilité | Mois, lignes à justifier, catégorie (couleurs), facture photographiée, « sans facture ». |
| 28 | Menu › Reversements | Montant par propriétaire, détail, enregistrer un reversement. |
| 29 | Menu › MAKOMSPACE | Réservations, confirmer, annuler, bloquer un créneau. |
| 30 | Menu › Domiciliation | **Scanner un courrier avec la photo** et le déposer dans l'espace du client, marquer « Retiré » ; onglet Demandes avec contrat et attestation. |
| 31 | Menu › VEFA | Réservations, document, annulation. |
| 32 | Menu › Agenda | Agenda de l'agence ou le mien, jour par jour, ajout, suppression. |
| 33 | Menu › Comptes | Créer un compte (identifiant affiché), envoyer un lien de mot de passe, supprimer. |
| 34 | Menu › Documents | Documents d'un client, dépôt, suppression. |
| 35 | Menu › Demandes | Approuver ou refuser les demandes des commerciaux. |
| 36 | Menu › Contrats | PDF de chaque contrat. |
| 37 | Menu › À poster | PDF, puis « Posté ». |

### Espaces commercial, agent commercial et salle

| # | Profil | À vérifier |
|---|---|---|
| 38 | Commercial | Publication, Gestion (consultation), Chat, Mandats ; dans le Menu : Acquéreurs, Planning, Transactions, Mes demandes, Contrats, Documents. |
| 39 | Agent commercial | Publication, Mandats, Acquéreurs, Planning ; dans le Menu : Transactions, Mes demandes, Contrats, Documents. |
| 40 | Salle | Réserver un créneau, annuler une de ses réservations. |

**Ce qui reste sur ordinateur** (trop lourd sur un téléphone) :

- importer un relevé bancaire PDF ;
- rédiger un contrat ;
- faire un appel d'offres de travaux à plusieurs artisans ;
- éditer les fiches complètes (bail, garant, états des lieux).

## Fabriquer le fichier à installer

La fabrication se fait dans le cloud d'Expo, sans Android Studio ni Mac.

1. Crée un compte gratuit sur **expo.dev** : c'est toi qui le crées.
2. Pour Android (fichier APK à installer directement) :
   ```
   npx.cmd eas-cli@latest login
   npx.cmd eas-cli@latest build -p android --profile preview
   ```
3. Pour l'**iPhone**, il faut un compte Apple Developer (99 $ par an) :
   ```
   npx.cmd eas-cli@latest build -p ios --profile production
   npx.cmd eas-cli@latest submit -p ios
   ```
   L'application arrive sur TestFlight, puis sur l'App Store.
4. Pour le **Google Play Store** (compte Play Console, 25 $ une seule fois) :
   ```
   npx.cmd eas-cli@latest build -p android --profile production
   ```

Ne m'envoie jamais tes mots de passe : tape-les toi-même quand ils sont demandés.

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/app/` | Écrans publics : onglets, fiche d'un bien, réservations, contact, connexion, espace |
| `src/espace/` | Espaces locataire, propriétaire, domiciliation, et le routeur de l'équipe |
| `src/equipe/` | Écrans de l'administration et des commerciaux |
| `src/lib/` | Thème, accès au site et à l'extranet, connexion, fichiers et photos, animation |
