import { getDb } from './_lib/firebaseAdmin.js';
import { getOrCreateUid } from './_lib/uid.js';

const STATUSES = new Set(['actif', 'maitrise', 'eteint']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  try {
    const db = getDb();
    const uid = getOrCreateUid(req, res);
    const { id, statut } = req.body || {};

    if (!id || !STATUSES.has(statut)) {
      res.status(400).json({ error: 'Requête invalide.' });
      return;
    }

    const ref = db.collection('signalements').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Signalement introuvable.' });
      return;
    }
    // Seul l'auteur du signalement peut changer son statut — vérifié
    // côté serveur, pas seulement caché côté interface.
    if (snap.data().reporterUid !== uid) {
      res.status(403).json({ error: "Vous n'êtes pas l'auteur de ce signalement." });
      return;
    }

    await ref.update({ statut });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
