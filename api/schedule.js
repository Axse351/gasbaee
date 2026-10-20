// GET /api/schedule  (publik)  -> { days: { "2026-11-02": "full" | "limited" } }  (tanggal kosong = tersedia)
// PUT /api/schedule  (admin)   -> body { dates: ["2026-11-02"], status: "free" | "limited" | "full" }
const { getUser } = require('./_auth');
const { pipeline } = require('./_db');

const KEY = 'schedule';
const STATUS = ['free', 'limited', 'full'];
const todayWIB = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const [raw] = await pipeline([['HGETALL', KEY]]);
      const list = Array.isArray(raw) ? raw : Object.entries(raw || {}).flat();
      const today = todayWIB();
      const days = {};
      for (let i = 0; i < list.length; i += 2) {
        if (list[i] < today) continue;
        try { days[list[i]] = JSON.parse(list[i + 1]).s; } catch (e) { /* abaikan data rusak */ }
      }
      return res.status(200).json({ days });
    }

    if (req.method === 'PUT') {
      if (!getUser(req)) return res.status(401).json({ error: 'unauthorized' });
      if (!String(req.headers['content-type'] || '').includes('application/json')) {
        return res.status(415).json({ error: 'gunakan application/json' });
      }
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      const dates = Array.isArray(b && b.dates) ? b.dates.map(String) : [];
      if (!dates.length || dates.length > 31 || !dates.every(validDate) || !STATUS.includes(b.status)) {
        return res.status(400).json({ error: 'data tidak valid' });
      }
      const cmds = dates.map((d) => b.status === 'free'
        ? ['HDEL', KEY, d]
        : ['HSET', KEY, d, JSON.stringify({ s: b.status, t: Date.now() })]);
      await pipeline(cmds);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method tidak didukung' });
  } catch (e) {
    return res.status(e.message === 'DB_NOT_CONFIGURED' ? 503 : 500).json({ error: e.message });
  }
};