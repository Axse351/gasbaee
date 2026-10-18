// Penyimpanan data link (Upstash Redis lewat REST, tanpa library tambahan).
// Variabel lingkungan diisi otomatis oleh Vercel saat Anda menambah Upstash Redis
// dari tab Storage / Marketplace. Dua pasang nama dikenali:
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   KV_REST_API_URL        + KV_REST_API_TOKEN
const DB_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const DB_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Jalankan beberapa perintah Redis sekaligus. Contoh: pipeline([['GET','a'],['SET','b','1']])
async function pipeline(commands) {
  if (!DB_URL || !DB_TOKEN) throw new Error('DB_NOT_CONFIGURED');
  const r = await fetch(DB_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + DB_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!r.ok) throw new Error('DB_ERROR');
  const out = await r.json();
  return out.map((x) => {
    if (x && x.error) throw new Error('DB_ERROR');
    return x ? x.result : null;
  });
}

module.exports = { pipeline };