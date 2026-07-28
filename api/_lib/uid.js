import { randomUUID } from 'crypto';

const COOKIE_NAME = 'vf_uid';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 an

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// Récupère l'identifiant anonyme du visiteur depuis son cookie, ou en crée un
// nouveau. Cet identifiant sert uniquement à l'anti-spam et à savoir qui est
// propriétaire d'un signalement — il n'a aucune valeur d'authentification forte.
export function getOrCreateUid(req, res) {
  const cookies = parseCookies(req);
  let uid = cookies[COOKIE_NAME];
  if (uid && /^[a-f0-9-]{36}$/i.test(uid)) {
    return uid;
  }
  uid = randomUUID();
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${uid}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax; Secure`
  );
  return uid;
}
