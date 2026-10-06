const { isAuthed, checkPassword, configured, sessionCookie, send, readBody } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') return send(res, 200, { authed: isAuthed(req) });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!configured()) return send(res, 503, { error: 'Admin is not configured yet.' });
  let password = '';
  try {
    password = JSON.parse((await readBody(req, 4096)).toString() || '{}').password || '';
  } catch (e) {
    return send(res, 400, { error: 'Bad request' });
  }
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800));
    return send(res, 401, { error: 'Incorrect password' });
  }
  send(res, 200, { authed: true }, { 'Set-Cookie': sessionCookie(req) });
};
