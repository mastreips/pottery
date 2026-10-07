// Gallery storage. Production uses Vercel Blob; set LOCAL_STORE_DIR to use the
// filesystem instead (local development/testing only).
const fs = require('fs');
const path = require('path');
const seed = require('../../data/galleries.json');

const local = process.env.LOCAL_STORE_DIR;
const blob = () => require('@vercel/blob');
const manifestKey = (cat) => `galleries/${cat}.json`;

async function readManifest(cat) {
  if (local) {
    try {
      return JSON.parse(fs.readFileSync(path.join(local, manifestKey(cat)), 'utf8'));
    } catch (e) {
      return seed[cat] || [];
    }
  }
  // Each save is a new, uniquely named file (never overwritten), so a stale CDN copy
  // can't be served. The newest version wins.
  const { blobs } = await blob().list({ prefix: `galleries/${cat}/`, limit: 1000 });
  if (!blobs.length) return seed[cat] || [];
  const latest = blobs.reduce((a, b) => (new Date(b.uploadedAt) > new Date(a.uploadedAt) ? b : a));
  const r = await fetch(latest.url);
  if (!r.ok) throw new Error('Could not read gallery');
  return r.json();
}

async function writeManifest(cat, images) {
  const body = JSON.stringify(images);
  if (local) {
    const file = path.join(local, manifestKey(cat));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
    return;
  }
  const saved = await blob().put(`galleries/${cat}/v-${Date.now()}.json`, body, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true
  });
  // Tidy up superseded versions (best effort).
  const { blobs } = await blob().list({ prefix: `galleries/${cat}/`, limit: 1000 });
  const old = blobs.filter((b) => b.url !== saved.url).map((b) => b.url);
  if (old.length) await blob().del(old).catch(() => {});
}

async function putImage(cat, filename, buffer, contentType) {
  const key = `gallery/${cat}/${Date.now()}-${filename}`;
  if (local) {
    const file = path.join(local, key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buffer);
    return `/__local/${key}`;
  }
  const res = await blob().put(key, buffer, { access: 'public', contentType, addRandomSuffix: true });
  return res.url;
}

async function deleteImage(src) {
  if (local) {
    if (src.startsWith('/__local/')) fs.rmSync(path.join(local, src.slice('/__local/'.length)), { force: true });
    return;
  }
  if (/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(src)) await blob().del(src);
}

module.exports = { readManifest, writeManifest, putImage, deleteImage };
