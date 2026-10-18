// Endpoint PUBLIK: dipakai halaman klien untuk membaca pengaturan satu link (?id=xxxx).
// Hanya mengembalikan data yang memang dibutuhkan portal klien (tanpa nomor WA).
const { pipeline } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const id = String(req.query.id || '');
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(id)) return res.status(400).json({ error: 'id tidak valid' });

  try {
    const [raw] = await pipeline([['GET', 'link:' + id]]);
    if (!raw) return res.status(404).json({ error: 'link tidak ditemukan' });
    const d = JSON.parse(raw);
    return res.status(200).json({
      name: d.name || '',
      folderId: d.folderId,
      quota: d.quota || 0,
      prot: !!d.prot,
      wm: !!d.wm
    });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};