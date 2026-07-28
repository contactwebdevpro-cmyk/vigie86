# VIGIE 86 — version sécurisée (Vercel + API serverless)

## Ce qui a changé par rapport à ta version d'origine

Avant : le fichier HTML contenait la config Firebase (dont l'`apiKey`) en clair,
et le navigateur parlait **directement** à Firestore.

Maintenant :
- `public/index.html` ne contient **plus aucun identifiant**. Il appelle
  `/api/reports`, `/api/vote`, `/api/status`.
- Ces 3 fichiers dans `api/` sont des fonctions serverless Vercel (Node.js)
  qui parlent à Firestore avec le **SDK Admin**, via des identifiants qui
  restent uniquement dans les variables d'environnement de Vercel — jamais
  livrés au navigateur, jamais visibles dans "Voir le code source".
- `firestore.rules` bloque désormais **tout accès direct** à la base depuis
  un navigateur : seul le serveur (Admin SDK) peut lire/écrire. Double
  verrou, même si quelqu'un retrouvait un ancien identifiant.
- Le vote et le changement de statut sont maintenant vérifiés côté serveur
  (avant, le "propriétaire" du signalement n'était vérifié que côté
  interface, donc contournable).
- Pas de temps réel `onSnapshot` (ça nécessite une connexion directe au
  client Firebase) : la liste se rafraîchit automatiquement toutes les 12
  secondes via l'API. C'est la contrepartie du fait de tout cacher derrière
  un serveur.

## Étapes de déploiement

### 1. Créer/retrouver ton projet Firebase
Va sur `console.firebase.google.com`, ouvre ton projet (ou crée-en un),
active **Firestore Database** si ce n'est pas déjà fait.

### 2. Générer une clé de compte de service (Admin SDK)
Dans **Paramètres du projet → Comptes de service**, clique sur
**Générer une nouvelle clé privée**. Un fichier JSON se télécharge — il
contient `project_id`, `client_email`, `private_key`.

⚠️ Ce fichier est un secret absolu (accès total à ta base). Ne le mets
jamais dans GitHub, jamais dans le dossier du projet.

### 3. Configurer les variables d'environnement sur Vercel
Dans ton projet Vercel → **Settings → Environment Variables**, ajoute :

| Nom | Valeur |
|---|---|
| `FIREBASE_PROJECT_ID` | le `project_id` du JSON |
| `FIREBASE_CLIENT_EMAIL` | le `client_email` du JSON |
| `FIREBASE_PRIVATE_KEY` | le `private_key` du JSON (garde les `\n`) |

(Regarde `.env.example` pour le format exact.)

### 4. Verrouiller les règles Firestore
Dans la console Firebase → **Firestore Database → Règles**, colle le
contenu de `firestore.rules` fourni ici, puis publie.

### 5. Déployer
Pousse ce dossier sur un repo GitHub, puis dans Vercel :
**Add New → Project → Import** ce repo. Vercel détecte automatiquement
`public/` comme dossier statique et `api/*.js` comme fonctions serverless,
aucune config supplémentaire n'est nécessaire.

### 6. À propos de ton ancienne clé déjà visible sur GitHub
Bonne nouvelle : une `apiKey` Firebase web n'est pas un secret en soi
(Google le documente explicitement) — elle sert juste à identifier ton
projet, pas à l'authentifier. Le vrai risque venait de règles Firestore trop
permissives couplées à cette clé publique. Une fois l'étape 4 faite
(règles à `if false`), cette ancienne clé ne permet plus rien, même si elle
traîne encore dans l'historique Git. Si tu veux être tranquille à 100%, tu
peux quand même la restreindre ou la régénérer dans Google Cloud Console →
Identifiants, mais ce n'est plus indispensable.

## Structure du projet

```
vigie-feux-vercel/
├── api/
│   ├── reports.js       # GET liste / POST créer un signalement
│   ├── vote.js          # POST voter confirm/fake
│   ├── status.js        # POST changer le statut (vérifie le propriétaire)
│   └── _lib/
│       ├── firebaseAdmin.js  # init Admin SDK depuis les env vars
│       └── uid.js            # cookie anonyme httpOnly (anti-spam)
├── public/
│   └── index.html       # front-end, sans aucun identifiant
├── firestore.rules
├── package.json
├── .env.example
└── .gitignore
```
