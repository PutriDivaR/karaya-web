const express = require('express');
const router = express.Router();

// Middleware: cek apakah user sudah login dan punya role admin
const checkAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    next(); // Lanjut ke rute admin
  } else {
    res.status(403).send('Akses hanya untuk admin!');
  }
};

router.get('/admin', checkAdmin, (req, res) => {
  res.render('pages/admin', {
    title: 'Dashboard Admin',
    user: req.session.user
  });
});


module.exports = router;
