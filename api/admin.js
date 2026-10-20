const fs = require('fs');
const path = require('path');
const { getUser } = require('./_auth');

// URL -> file di folder /private (di luar folder publik)
const PAGES = {
  '': 'sorter.html',               // /admin
  generator: 'generatorLink.html', // /admin/generator
  links: 'linkmanager.html',       // /admin/links
  jadwal: 'jadwal.html'            // /admin/jadwal
};

module.exports = (req, res) => {
  if (!getUser(req)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, '/login');
  }
  const page = String(req.query.page || '').replace(/\.html$/i, '');
  const file = PAGES[page];
  if (!file) return res.status(404).send('Halaman tidak ditemukan');

  try {
    const html = fs.readFileSync(path.join(process.cwd(), 'private', file), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('File admin tidak ditemukan di folder private.');
  }
};