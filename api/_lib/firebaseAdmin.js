// Initialise Firebase Admin UNE seule fois par instance serverless.
// Les identifiants viennent des variables d'environnement Vercel :
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// -> Elles ne sont JAMAIS envoyées au navigateur, seul le serveur y a accès.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Sur Vercel, les retours à la ligne des clés privées sont souvent
  // stockés comme "\n" littéral : il faut les reconvertir.
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Configuration Firebase Admin manquante. Vérifie les variables d'environnement " +
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY dans Vercel.'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getDb() {
  return getFirestore(getAdminApp());
}
