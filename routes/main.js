const express = require('express');
const router = express.Router();
const db = require('../db');
const connection = require('../db');


// Halaman profil pengguna
router.get('/profile', (req, res) => {
  const userId = req.session.user?.id;
  console.log("User ID dari session:", userId);

  if (!userId) {
    return res.redirect('/login');
  }

  const getUserPortofolios = 'SELECT * FROM portofolio WHERE id_pengguna = ?';
  const getLikedPortofolios = `
    SELECT p.* FROM portofolio p
    JOIN suka s ON p.id_portofolio = s.id_portofolio
    WHERE s.id_pengguna = ?
  `;

  db.query(getUserPortofolios, [userId], (err1, userPortofolios) => {
    if (err1) {
      console.error('Gagal mengambil data portofolio user:', err1);
      return res.status(500).send('Gagal mengambil portofolio user');
    }

    db.query(getLikedPortofolios, [userId], (err2, likedPortofolios) => {
      if (err2) {
        console.error('Gagal mengambil data suka:', err2);
        return res.status(500).send('Gagal mengambil data suka');
      }

      res.render('pages/profile', {
        title: 'User Portofolio',
        userPortofolios: userPortofolios,
        likedPortofolios: likedPortofolios // ✅ penting agar tab “Suka” bisa baca
      });
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
  const query = 'SELECT * FROM portofolio WHERE id_portofolio = ?';
  console.log('Portofolio ID:', id);

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Portofolio tidak ditemukan');

    const portofolio = results[0];
    res.render('pages/detail_portofolio', {
      title: 'Detail Portofolio', 
      portofolio });
  });
});

// routes/portofolio.js

router.post('/like/:id', (req, res) => {
  const portofolioId = req.params.id;
  const userId = req.session.userId; // Ambil ID pengguna dari session

  if (!userId) {
    return res.status(401).json({ message: 'User belum login' });
  }

  // 1. Cek apakah user sudah pernah like
  const cekLike = 'SELECT * FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
  db.query(cekLike, [userId, portofolioId], (err, result) => {
    if (err) return res.status(500).send('Gagal memeriksa data suka');

    if (result.length > 0) {
      // 2. Sudah like → Hapus like & kurangi jumlah_suka
      const hapusLike = 'DELETE FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
      db.query(hapusLike, [userId, portofolioId], (err2) => {
        if (err2) return res.status(500).send('Gagal unlike');

        const kurangiLike = 'UPDATE portofolio SET jumlah_suka = jumlah_suka - 1 WHERE id_portofolio = ?';
        db.query(kurangiLike, [portofolioId], (err3) => {
          if (err3) return res.status(500).send('Gagal mengurangi jumlah like');
          return res.json({ liked: false });
        });
      });
    } else {
      // 3. Belum like → Tambah like & tambah jumlah_suka
      const tambahLike = 'INSERT INTO suka (id_pengguna, id_portofolio, tanggal_suka) VALUES (?, ?, NOW())';
      db.query(tambahLike, [userId, portofolioId], (err4) => {
        if (err4) return res.status(500).send('Gagal menyimpan data like');

        const tambahJumlah = 'UPDATE portofolio SET jumlah_suka = jumlah_suka + 1 WHERE id_portofolio = ?';
        db.query(tambahJumlah, [portofolioId], (err5) => {
          if (err5) return res.status(500).send('Gagal menambahkan jumlah like');
          return res.json({ liked: true });
        });
      });
    }
  });
});



// Route untuk menampilkan kategori dan portofolio terkait
router.get('/kategori', (req, res) => {
  const queryKategori = 'SELECT * FROM kategori';  // Query untuk mengambil kategori
  const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ?';  // Query untuk mengambil portofolio berdasarkan kategori

  db.query(queryKategori, (errKategori, kategoriResults) => {
    if (errKategori) {
      console.error('Error mengambil kategori:', errKategori);
      return res.status(500).send('Gagal mengambil kategori');
    }

    const kategoriWithPortfolios = [];

    // Ambil portofolio untuk setiap kategori
    kategoriResults.forEach(category => {
      db.query(queryPortofolio, [category.id_kategori], (errPortofolio, portofolioResults) => {
        if (errPortofolio) {
          console.error('Error mengambil portofolio:', errPortofolio);
        } else {
          kategoriWithPortfolios.push({
            category: category,
            portfolios: portofolioResults
          });

          // Jika semua kategori sudah diproses, kirimkan data ke template
          if (kategoriWithPortfolios.length === kategoriResults.length) {
            console.log('Kategori dengan Portofolio:', kategoriWithPortfolios); 
            res.render('pages/kategori', {
              title: 'Daftar Kategori dan Portofolio',
              kategoriWithPortfolios: kategoriWithPortfolios // Pastikan data ini sudah dikirim ke view
            });
          }
        }
      });
    });
  });
});


router.get('/kategori/:id', (req, res) => {
  const categoryId = req.params.id;
  const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ?'; // Mengambil portofolio berdasarkan kategori

  db.query(queryPortofolio, [categoryId], (err, portofolioResults) => {
    if (err) {
      console.error('Error mengambil portofolio:', err);
      return res.status(500).send('Gagal mengambil portofolio');
    }

    res.render('pages/portofolio_kategori', {
      title: 'Portofolio Kategori',
      portfolios: portofolioResults, // Kirimkan daftar portofolio ke halaman kategori
      categoryId: categoryId // Kirimkan id kategori untuk mempermudah query atau header
    });
  });
});






module.exports = router;