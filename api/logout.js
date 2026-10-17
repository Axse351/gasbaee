const { clearCookie } = require('./_auth');

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', clearCookie());
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, '/login');
};