const crypto = require('crypto');

const CATEGORIES = {
  'raku': 'Raku',
  'naked-raku': 'Naked Raku',
  'ferric-chloride': 'Ferric Chloride',
  'dragon-breath': "Dragon's Breath",
  'pitfire': 'Pitfire',
  'other-methods': 'Other Miscellaneous Methods'
};

const COOKIE = 'oyate_admin';
const SESSION_SECONDS = 12 * 60 * 60;

function sign(value) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET || '').update(value).digest('hex');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function configured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET);
}

function checkPassword(candidate) {
  return configured() && safeEqual(candidate, process.env.ADMIN_PASSWORD);
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function isAuthed(req) {
  if (!configured()) return false;
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, sign(exp));
}

function cookieFlags(req) {
  const host = String(req.headers.host || '');
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return 'Path=/; HttpOnly; SameSite=Strict' + (local ? '' : '; Secure');
}

function sessionCookie(req) {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${SESSION_SECONDS}; ${cookieFlags(req)}`;
}

function clearCookie(req) {
  return `${COOKIE}=; Max-Age=0; ${cookieFlags(req)}`;
}

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(headers || {}).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = { CATEGORIES, isAuthed, checkPassword, configured, sessionCookie, clearCookie, send, readBody };
