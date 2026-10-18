// Endpoint ADMIN (wajib login): daftar, buat, ubah, dan hapus link klien.
//   GET    /api/links            -> semua link
//   POST   /api/links            -> buat link baru
//   PUT    /api/links            -> ubah (id + name/quota/prot/wm/phone)
//   DELETE /api/links?id=xxxx    -> hapus
const crypto = require('crypto');
const { getUser } = require('./_auth');
const { pipeline } = require('./_db');

const ID_RE = /^[A-Za-z0-9_-]{4,32}$/;
const FOLDER_RE = /^[A-Za-z0-9_-]{10,100}$/;

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function cleanQuota(v) {
  const n = parseInt(v, 10);
  return n > 0 ? Math.min(n, 100000) : 0; // 0 = tanpa batas
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!getUser(req)) return res.status(401).json({ error: 'unauthorized' });

  // Perubahan data hanya diterima sebagai JSON (menahan form lintas-situs)
  if (req.method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'gunakan application/json' });
  }

  try {
    if (req.method === 'GET') {
      const [ids] = await pipeline([['SMEMBERS', 'links']]);
      if (!ids || !ids.length) return res.status(200).json({ links: [] });
      const [rows] = await pipeline([['MGET', ...ids.map((i) => 'link:' + i)]]);
      const links = rows.filter(Boolean).map((r) => JSON.parse(r))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return res.status(200).json({ links });
    }

    if (req.method === 'POST') {
      const b = readBody(req);
      const folderId = String(b.folderId || '').trim();
      if (!FOLDER_RE.test(folderId)) return res.status(400).json({ error: 'ID folder Google Drive tidak valid' });
      const id = crypto.randomBytes(6).toString('base64url');
      const rec = {
        id,
        name: String(b.name || '').trim().slice(0, 80),
        phone: String(b.phone || '').replace(/[^0-9]/g, '').slice(0, 20),
        folderId,
        quota: cleanQuota(b.quota),
        prot: !!b.prot,
        wm: !!b.wm,
        createdAt: Date.now()
      };
      await pipeline([['SET', 'link:' + id, JSON.stringify(rec)], ['SADD', 'links', id]]);
      return res.status(201).json(rec);
    }

    if (req.method === 'PUT') {
      const b = readBody(req);
      const id = String(b.id || '');
      if (!ID_RE.test(id)) return res.status(400).json({ error: 'id tidak valid' });
      const [raw] = await pipeline([['GET', 'link:' + id]]);
      if (!raw) return res.status(404).json({ error: 'link tidak ditemukan' });
      const rec = JSON.parse(raw);
      if (b.name !== undefined) rec.name = String(b.name).trim().slice(0, 80);
      if (b.phone !== undefined) rec.phone = String(b.phone).replace(/[^0-9]/g, '').slice(0, 20);
      if (b.quota !== undefined) rec.quota = cleanQuota(b.quota);
      if (b.prot !== undefined) rec.prot = !!b.prot;
      if (b.wm !== undefined) rec.wm = !!b.wm;
      rec.updatedAt = Date.now();
      await pipeline([['SET', 'link:' + id, JSON.stringify(rec)]]);
      return res.status(200).json(rec);
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || readBody(req).id || '');
      if (!ID_RE.test(id)) return res.status(400).json({ error: 'id tidak valid' });
      await pipeline([['DEL', 'link:' + id], ['SREM', 'links', id]]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'method tidak didukung' });
  } catch (e) {
    if (e.message === 'DB_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'DB_NOT_CONFIGURED' });
    }
    return res.status(500).json({ error: 'server error' });
  }
};