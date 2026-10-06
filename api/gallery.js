const { CATEGORIES, send } = require('./_lib/auth');
const { readManifest } = require('./_lib/store');

module.exports = async (req, res) => {
  const cat = new URL(req.url, 'http://x').searchParams.get('category');
  if (!CATEGORIES[cat]) return send(res, 400, { error: 'Unknown category' });
  try {
    const images = await readManifest(cat);
    send(res, 200, { images }, { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' });
  } catch (e) {
    send(res, 500, { error: 'Could not load gallery' });
  }
};
