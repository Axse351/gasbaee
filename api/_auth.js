const crypto = require('crypto');

// Rahasia untuk menandatangani cookie. Set AUTH_SECRET di Vercel (Environment Variables).
const SECRET = process.env.AUTH_SECRET || 'GANTI-INI-DI-VERCEL-ENV-gasbaee';

// Akun admin (hardcode sementara, hanya ada di server, tidak terkirim ke browser)
const USERS = {
  gasbaeeadmin1: 'gasbaee_2026',
  gasbaeadmin2: 'gasbaee_2026',
  gasbaeeadmin2: 'gasbaee_2026' // ejaan alternatif, hapus salah satu kalau tidak perlu
};

const COOKIE = 'gb_session';
const MAX_AGE = 60 * 60 * 8; // 8 jam

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function checkLogin(username, password) {
  const u = String(username || '').trim().toLowerCase();
  const known = Object.prototype.hasOwnProperty.call(USERS, u);
  // tetap bandingkan walau user tidak dikenal, supaya waktu respons seragam
  const okPass = safeEqual(password || '', known ? USERS[u] : 'x');
  return known && okPass ? u : null;
}

const sign = (payload) =>
  crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function makeCookie(user) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${user}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

function getUser(req) {
  const raw = (req.headers.cookie || '')
    .split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const token = raw.slice(COOKIE.length + 1);
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), sig = token.slice(i + 1);
  if (!safeEqual(sig, sign(payload))) return null;
  const [user, exp] = payload.split('.');
  if (!user || Number(exp) < Date.now() / 1000) return null;
  return user;
}

module.exports = { checkLogin, makeCookie, clearCookie, getUser };