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
  const { blobs } = await blob().list({ prefix: manifestKey(cat), limit: 1 });
  if (!blobs.length) return seed[cat] || [];
  const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
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
  await blob().put(manifestKey(cat), body, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });
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
