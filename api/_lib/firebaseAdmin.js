// Initialise Firebase Admin UNE seule fois par instance serverless.
// Les identifiants viennent des variables d'environnement Vercel :
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY_B64
// -> Elles ne sont JAMAIS envoyées au navigateur, seul le serveur y a accès.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // La clé privée est stockée encodée en base64 dans Vercel (FIREBASE_PRIVATE_KEY_B64)
  // pour éviter tout souci de retours à la ligne "\n" mal interprétés.
  // Il faut la décoder avant de l'utiliser.
  const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_B64 || '';
  const privateKey = privateKeyB64
    ? Buffer.from(privateKeyB64, 'base64').toString('utf8')
    : '';

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Configuration Firebase Admin manquante. Vérifie les variables d'environnement " +
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY_B64 dans Vercel.'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getDb() {
  return getFirestore(getAdminApp());
}
