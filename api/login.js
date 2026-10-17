const { checkLogin, makeCookie } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { username, password } = req.body || {};
  const user = checkLogin(username, password);
  if (!user) {
    await new Promise((r) => setTimeout(r, 600)); // memperlambat tebak-tebakan password
    return res.status(401).json({ ok: false });
  }
  res.setHeader('Set-Cookie', makeCookie(user));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
};