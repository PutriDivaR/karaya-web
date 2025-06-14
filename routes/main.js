const express = require('express');
const router = express.Router();
const db = require('../db');


// Halaman profil pengguna
// Halaman profil pengguna
router.get('/profile', (req, res) => {
  const userId = req.session.user?.id;
  console.log("User  ID dari session:", userId);

  if (!userId) {
    return res.redirect('/login');
  }

  // Query untuk mengambil data portofolio dan data pengguna
  const query = `
    SELECT p.*, u.nama_pengguna, u.bio 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_pengguna = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Gagal mengambil data portofolio user:', err);
      return res.status(500).send('Gagal mengambil data portofolio user');
    }

    // Ambil data pengguna dari hasil query
    const user = results.length > 0 ? results[0] : null;

    res.render('pages/profile', {
      title: 'User  Portofolio',
      userPortofolios: results,
      user: user // Pass user data to the template
    });
  });
});



// Tampilkan beranda
router.get('/home', (req, res) => {
  const sql = `
    SELECT p.*, k.nama AS nama_kategori, u.nama_pengguna 
    FROM portofolio p
    LEFT JOIN kategori k ON p.id_kategori = k.id_kategori
    LEFT JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    ORDER BY p.tanggal_dibuat DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Gagal mengambil data portofolio:', err);
      return res.status(500).send('Gagal mengambil data portofolio');
    }

    res.render('pages/home', { title: 'Beranda', portofolios: results });
  });
});

// detail portofolio
router.get('/portofolio/:id', (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT p.*, u.nama_pengguna 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_portofolio = ?
  `;
  console.log('Portofolio ID:', id);

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Portofolio tidak ditemukan');

    const portofolio = results[0];
    res.render('pages/detail_portofolio', {
      title: 'Detail Portofolio', 
      portofolio 
    });
  });
});

// Halaman profil pengguna berdasarkan ID
router.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const loggedInUserId = req.session.user?.id || null;
  

  // Query untuk mengambil data pengguna
  const userQuery = 'SELECT * FROM pengguna WHERE id_pengguna = ?';
  db.query(userQuery, [userId], (err, userResults) => {
    if (err) {
      console.error('Gagal mengambil data pengguna:', err);
      return res.status(500).send('Gagal mengambil data pengguna');
    }

    if (userResults.length === 0) {
      return res.status(404).send('Pengguna tidak ditemukan');
    }

    const user = userResults[0];

    // Query untuk mengambil portofolio pengguna
    const portfolioQuery = 'SELECT * FROM portofolio WHERE id_pengguna = ?';
    db.query(portfolioQuery, [userId], (err, portfolioResults) => {
      if (err) {
        console.error('Gagal mengambil data portofolio:', err);
        return res.status(500).send('Gagal mengambil data portofolio');
      }

      res.render('pages/profile', {
        title: 'Profil Pengguna',
        user: user,
        userPortofolios: portfolioResults, // Pass user portfolios to the template
        loggedInUserId
      });
    });
  });
});



// routes/portofolio.js

router.post('/like/:id', (req, res) => {
  const id = req.params.id;
  db.query('UPDATE portofolio SET jumlah_suka = jumlah_suka + 1 WHERE id_portofolio = ?', [id], (err, result) => {
    if (err) {
    res.status(500).send('Gagal menambahkan like');
  }
});
});

module.exports = router;