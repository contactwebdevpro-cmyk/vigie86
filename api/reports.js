import { getDb } from './_lib/firebaseAdmin.js';
import { getOrCreateUid } from './_lib/uid.js';

const RATE_LIMIT_MS = 10 * 60 * 1000; // 1 signalement / 10 min / visiteur
const MAX_PHOTO_LEN = 900000; // même seuil que la compression côté navigateur
const TYPES = new Set(['foret', 'champ', 'batiment', 'vehicule']);
const SEVS = new Set(['mineur', 'modere', 'critique']);
const STATUSES = new Set(['actif', 'maitrise', 'eteint']);

export default async function handler(req, res) {
  try {
    const db = getDb();
    const uid = getOrCreateUid(req, res);

    if (req.method === 'GET') {
      const snap = await db
        .collection('signalements')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get();

      const reports = snap.docs.map((d) => {
        const data = d.data();
        const votes = data.votes || {};
        let confirmCount = 0;
        let fakeCount = 0;
        Object.values(votes).forEach((v) => {
          if (v === 'confirm') confirmCount++;
          else if (v === 'fake') fakeCount++;
        });
        return {
          id: d.id,
          lat: data.lat,
          lng: data.lng,
          lieu: data.lieu || '',
          type: data.type,
          gravite: data.gravite,
          statut: data.statut,
          desc: data.desc || '',
          photoBase64: data.photoBase64 || null,
          createdAtMillis: data.createdAt ? data.createdAt.toMillis() : Date.now(),
          confirmCount,
          fakeCount,
          myVote: votes[uid] || null,
          isOwner: data.reporterUid === uid,
        };
      });

      res.status(200).json({ reports, uid });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { lat, lng, accuracy, lieu, type, gravite, desc, photoBase64 } = body;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400).json({ error: 'Position GPS manquante ou invalide.' });
        return;
      }
      if (!TYPES.has(type)) {
        res.status(400).json({ error: 'Type de feu invalide.' });
        return;
      }
      if (!SEVS.has(gravite)) {
        res.status(400).json({ error: 'Gravité invalide.' });
        return;
      }
      if (!photoBase64 || typeof photoBase64 !== 'string' || !photoBase64.startsWith('data:image/')) {
        res.status(400).json({ error: 'Une photo est requise.' });
        return;
      }
      if (photoBase64.length > MAX_PHOTO_LEN) {
        res.status(400).json({ error: 'Photo trop volumineuse même après compression.' });
        return;
      }

      // Anti-spam : un signalement toutes les 10 min par visiteur, vérifié
      // côté serveur (le contrôle côté navigateur peut être contourné).
      const recentSnap = await db
        .collection('signalements')
        .where('reporterUid', '==', uid)
        .get();
      const now = Date.now();
      const tooRecent = recentSnap.docs.some((d) => {
        const c = d.data().createdAt;
        const millis = c && typeof c.toMillis === 'function' ? c.toMillis() : 0;
        return now - millis < RATE_LIMIT_MS;
      });
      if (tooRecent) {
        res.status(429).json({
          error: 'Vous avez déjà signalé un feu récemment. Merci de patienter quelques minutes (anti-spam).',
        });
        return;
      }

      const { FieldValue } = await import('firebase-admin/firestore');
      const docRef = await db.collection('signalements').add({
        lat,
        lng,
        accuracy: typeof accuracy === 'number' ? accuracy : null,
        lieu: typeof lieu === 'string' ? lieu.trim().slice(0, 200) : '',
        type,
        gravite,
        statut: 'actif',
        desc: typeof desc === 'string' ? desc.trim().slice(0, 1000) : '',
        photoBase64,
        reporterUid: uid,
        votes: {},
        createdAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json({ id: docRef.id });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
