// TEMPORARY: removes test uploads and old-format manifests created during testing. Deleted right after use.
const { isAuthed, send } = require('./_lib/auth');
const { list, del } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'Please log in again.' });
  const removed = [];
  for (const prefix of ['gallery/', 'galleries/']) {
    const { blobs } = await list({ prefix, limit: 1000 });
    const urls = blobs.map((b) => b.url);
    if (urls.length) await del(urls);
    removed.push(...blobs.map((b) => b.pathname));
  }
  send(res, 200, { removed });
};
