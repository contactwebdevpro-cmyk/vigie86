import { getDb } from './_lib/firebaseAdmin.js';
import { getOrCreateUid } from './_lib/uid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  try {
    const db = getDb();
    const uid = getOrCreateUid(req, res);
    const { id, type } = req.body || {};

    if (!id || (type !== 'confirm' && type !== 'fake')) {
      res.status(400).json({ error: 'Requête invalide.' });
      return;
    }

    const ref = db.collection('signalements').doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('not-found');
      const votes = snap.data().votes || {};
      votes[uid] = type;
      tx.update(ref, { votes });
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    if (err.message === 'not-found') {
      res.status(404).json({ error: 'Signalement introuvable.' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
