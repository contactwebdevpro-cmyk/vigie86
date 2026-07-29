# VIGIE 86 — version 100% client (Firebase direct, sans backend)

## Comment ça marche maintenant

- `public/index.html` contient la config Firebase (celle que tu utilises,
  projet `fnradar-2918a`) et parle **directement** à Firestore depuis le
  navigateur, via le SDK Firebase JS (chargé en modules ES depuis
  `gstatic.com`, pas d'installation npm nécessaire).
- Chaque visiteur est connecté en **authentification anonyme** Firebase
  (`signInAnonymously`) dès l'ouverture de la page. Ça lui donne un `uid`
  fiable et non falsifiable, utilisé pour :
  - savoir qui est l'auteur d'un signalement (`reporterUid`),
  - empêcher de voter au nom de quelqu'un d'autre,
  - autoriser uniquement l'auteur à changer le statut de son signalement.
- La liste des signalements se met à jour **en temps réel** (`onSnapshot`),
  plus besoin de rafraîchir toutes les X secondes.
- `firestore.rules` fait tout le travail de sécurité côté serveur Firebase
  (validation des champs, qui peut créer/modifier quoi).
- Il n'y a plus aucun dossier `api/`, plus de fonctions serverless, plus de
  variables d'environnement Vercel à configurer : c'est un site 100%
  statique.

## ⚠️ À savoir sur cette approche

- **L'`apiKey` visible dans le code n'est pas un secret** — c'est documenté
  officiellement par Google/Firebase : elle identifie ton projet, elle ne
  l'authentifie pas. La vraie sécurité vient des règles Firestore.
- **L'anti-spam (1 signalement / 10 min) n'est plus garanti côté serveur**,
  seulement côté navigateur via `localStorage`. Un utilisateur qui vide son
  stockage local ou navigue en privé peut le contourner. Si tu veux un
  anti-spam robuste, il faudrait soit :
  - réintroduire une fonction serveur (Vercel/Cloud Functions) juste pour
    cette vérification,
  - soit activer **Firebase App Check** (protège contre les abus
    automatisés, pas contre un humain qui recharge la page manuellement).

## 🔒 Correctifs de sécurité appliqués (audit du 29/07/2026)

- **XSS stockée corrigée** : les champs `lieu` et `desc`, saisis librement par
  les visiteurs, étaient injectés sans échappement dans le HTML de la carte
  et de la liste. Un contenu malveillant écrit directement dans Firestore
  (en contournant l'interface) s'exécutait alors chez tous les visiteurs.
  Une fonction `escapeHtml()` est maintenant appliquée systématiquement.
- **`onclick` inline supprimés** au profit d'une délégation d'événements
  (`data-action`, `data-id`, ...), ce qui permet d'ajouter un
  `Content-Security-Policy` strict (sans `unsafe-inline`) en défense
  supplémentaire contre l'exécution de script injecté.
- **`firestore.rules` durcies** :
  - le champ `lieu` n'était pas validé du tout (aucune limite de taille ou
    de type) → ajout d'une validation (`string`, ≤ 200 caractères) ;
  - la valeur d'un vote n'était pas contrôlée → elle doit désormais valoir
    `'confirm'` ou `'fake'` ;
  - `photoBase64` doit désormais correspondre au format attendu
    (`data:image/...;base64,...`) ;
  - `lat`/`lng` sont bornées à des valeurs géographiques plausibles ;
  - un anti-spam **côté serveur** a été ajouté via une collection
    `cooldowns/{uid}` (10 min entre deux signalements), en complément (pas
    en remplacement) du repère `localStorage`.
- **Dossier `api/` legacy supprimé** : il correspondait à une ancienne
  architecture avec backend (Firebase Admin), incompatible et incohérente
  avec l'architecture 100% client actuelle. Le conserver n'apportait aucune
  fonctionnalité et ajoutait une surface d'attaque/confusion inutile.

### Limite connue qui reste à traiter si besoin
L'anti-spam reste contournable par un attaquant motivé, qui peut toujours
ouvrir une nouvelle session anonyme Firebase pour obtenir un nouvel `uid`.
Aucune règle Firestore ne peut empêcher ça à elle seule. Pour une protection
robuste contre le spam/bots, il faut activer **Firebase App Check**
(Console Firebase → App Check), qui vérifie que les requêtes viennent bien
d'une vraie page web et pas d'un script automatisé.

## 🔔 Notifications navigateur (PC + mobile, gratuit, illimité)

Un bouton **« Activer les alertes »** dans l'en-tête déclenche
`Notification.requestPermission()`. Une fois autorisées, une notification
navigateur s'affiche à chaque nouveau signalement détecté par le listener
Firestore temps réel (`onSnapshot` → `docChanges()` de type `added`), sur PC
comme sur mobile (Android/Chrome). Un `sw.js` minimal est enregistré
uniquement pour permettre l'affichage de la notification en arrière-plan et
pour rouvrir/centrer la carte sur le signalement au clic.

**Ce que ça permet** : gratuit, illimité, aucun serveur, aucune clé API
supplémentaire — cohérent avec l'architecture 100% client du projet.

**Limite à connaître** : ça ne fonctionne que si le navigateur tourne
(onglet ouvert ou en arrière-plan). Si le navigateur est complètement fermé,
ou sur iPhone/Safari en usage normal (hors PWA installée + Web Push), aucune
notification n'arrive — Apple/les OS exigent alors un vrai **Web Push**
(clés VAPID + un serveur qui envoie la notification), ce qui demanderait de
réintroduire un backend. Si tu veux ce niveau-là plus tard, dis-le-moi.

## Étapes de déploiement

### 1. Active l'authentification anonyme
Console Firebase (`console.firebase.google.com`) → ton projet
`fnradar-2918a` → **Authentication → Sign-in method** → active
**Anonyme**. Sans ça, `signInAnonymously()` échoue et rien ne fonctionne.

### 2. Active Firestore si ce n'est pas déjà fait
**Firestore Database** → crée la base en mode natif si nécessaire.

### 3. Publie les règles de sécurité
**Firestore Database → Règles** → colle le contenu de `firestore.rules`
fourni ici → **Publier**.

### 4. Déploie
Pousse ce dossier sur GitHub, puis sur Vercel : **Add New → Project →
Import**. Comme il n'y a plus que `public/` (site statique), aucune
configuration supplémentaire n'est nécessaire — pas de variables
d'environnement à ajouter.

## Structure du projet

```
vigie-feux/
├── public/
│   └── index.html       # front-end complet : UI + appels Firestore directs
├── firestore.rules
├── package.json
└── README.md
```
