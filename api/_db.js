// Penyimpanan data link memakai Redis dari Vercel (integrasi "Redis", variabel REDIS_URL)
// lewat library "redis" (node-redis). Antarmuka pipeline() dibuat sama seperti versi lama,
// jadi api/links.js dan api/link.js tidak perlu diubah.
//
// Variabel lingkungan yang dikenali (dipakai yang pertama ada):
//   REDIS_URL  atau  STORAGE_URL  (kalau saat menghubungkan database Anda memberi prefix "STORAGE")
const { createClient } = require('redis');

const DB_URL = process.env.REDIS_URL || process.env.STORAGE_URL;

let client = null;

async function getClient() {
  if (!DB_URL) throw new Error('DB_NOT_CONFIGURED');

  // Koneksi dipakai ulang selama function masih "hangat"; kalau sudah putus, buat baru
  if (client && !client.isOpen) client = null;

  if (!client) {
    const c = createClient({
      url: DB_URL,
      socket: { connectTimeout: 8000, reconnectStrategy: false }
    });
    c.on('error', () => {}); // error ditangani lewat try/catch di pemanggil
    await c.connect();
    client = c;
  }
  return client;
}

// Jalankan beberapa perintah Redis berurutan. Contoh: pipeline([['GET','a'],['SET','b','1']])
async function pipeline(commands) {
  const c = await getClient();
  const out = [];
  for (const cmd of commands) {
    try {
      out.push(await c.sendCommand(cmd.map(String)));
    } catch (e) {
      throw new Error('DB_ERROR');
    }
  }
  return out;
}

module.exports = { pipeline };