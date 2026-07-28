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
