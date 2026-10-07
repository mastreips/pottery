const { CATEGORIES, isAuthed, send, readBody } = require('./_lib/auth');
const { readManifest, writeManifest, deleteImage } = require('./_lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!isAuthed(req)) return send(res, 401, { error: 'Please log in again.' });
  try {
    const { category, src } = JSON.parse((await readBody(req, 8192)).toString() || '{}');
    if (!CATEGORIES[category] || typeof src !== 'string') return send(res, 400, { error: 'Bad request' });
    const images = await readManifest(category);
    const next = images.filter(([s]) => s !== src);
    if (next.length === images.length) return send(res, 404, { error: 'Photo not found' });
    await writeManifest(category, next);
    await deleteImage(src);
    send(res, 200, { images: next });
  } catch (e) {
    send(res, 500, { error: 'Could not remove the photo. Please try again.' });
  }
};
