import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 60 * 60;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

export function signToken(payload, secret) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
  const sig = b64(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token, secret) {
  const [body, sig] = (token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  return payload.exp > Date.now() / 1000 ? payload : null;
}

export function requireAuth(secret) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const payload = header.startsWith('Bearer ') ? verifyToken(header.slice(7), secret) : null;
    if (!payload) return res.status(401).json({ error: 'unauthorized' });
    req.user = payload;
    next();
  };
}
