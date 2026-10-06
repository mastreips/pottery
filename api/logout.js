const { clearCookie, send } = require('./_lib/auth');

module.exports = (req, res) => {
  send(res, 200, { authed: false }, { 'Set-Cookie': clearCookie(req) });
};
