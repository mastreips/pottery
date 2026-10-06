const { CATEGORIES, isAuthed, send, readBody } = require('./_lib/auth');
const { readManifest, writeManifest, putImage } = require('./_lib/store');

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4 * 1024 * 1024;

function captionFrom(name) {
  const base = name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Photo';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!isAuthed(req)) return send(res, 401, { error: 'Please log in again.' });
  const params = new URL(req.url, 'http://x').searchParams;
  const cat = params.get('category');
  if (!CATEGORIES[cat]) return send(res, 400, { error: 'Unknown category' });
  const type = String(req.headers['content-type'] || '').split(';')[0];
  if (!TYPES[type]) return send(res, 400, { error: 'Only JPG, PNG or WebP photos are allowed.' });
  try {
    const buf = await readBody(req, MAX_BYTES);
    if (!buf.length) return send(res, 400, { error: 'Empty file' });
    const original = (params.get('filename') || 'photo').slice(0, 80);
    const safe = original.replace(/\.\w+$/, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'photo';
    const src = await putImage(cat, `${safe}.${TYPES[type]}`, buf, type);
    const images = await readManifest(cat);
    images.push([src, captionFrom(original)]);
    await writeManifest(cat, images);
    send(res, 200, { images });
  } catch (e) {
    send(res, e.status || 500, { error: e.status === 413 ? 'That photo is too large.' : 'Upload failed. Please try again.' });
  }
};
