const express = require('express');
const router = express.Router();
const db = require('../db');



// ==================== HALAMAN PROFIL LOGIN SENDIRI ====================
router.get('/profile', (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.redirect('/login');

  const getUserPortofolios = 'SELECT * FROM portofolio WHERE id_pengguna = ?';
  const getLikedPortofolios = `
    SELECT p.* FROM portofolio p
    JOIN suka s ON p.id_portofolio = s.id_portofolio
    WHERE s.id_pengguna = ? 
  `;
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

        // Ambil data pengguna dari hasil query
        const user = results.length > 0 ? results[0] : null;

        res.render('pages/profile', {
          title: 'User  Portofolio',
          userPortofolios: results,
          user: user,
          userPortofolios: userPortofolios,
          likedPortofolios: likedPortofolios // Pass user data to the template
        });
      });
    });
  });
});

// ==================== HALAMAN PROFIL PENGGUNA LAIN ====================
router.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const getUserPortofolios = 'SELECT * FROM portofolio WHERE id_pengguna = ?';
  const getLikedPortofolios = `
    SELECT p.* FROM portofolio p
    JOIN suka s ON p.id_portofolio = s.id_portofolio
    WHERE s.id_pengguna = ?
  `;
  const query = `
    SELECT p.*, u.nama_pengguna, u.bio 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_pengguna = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).send('Gagal ambil data profil pengguna');

    db.query(getUserPortofolios, [userId], (err1, userPortofolios) => {
      if (err1) return res.status(500).send('Gagal ambil portofolio user');

      db.query(getLikedPortofolios, [userId], (err2, likedPortofolios) => {
        if (err2) return res.status(500).send('Gagal ambil like');

        const user = results.length > 0 ? results[0] : null;

        res.render('pages/profile', {
          title: 'User Portofolio',
          userPortofolios,
          likedPortofolios,
          user
        });
      });
    });
  });
});

// ==================== HALAMAN BERANDA ====================
router.get('/home', (req, res) => {
  const sql = `
    SELECT p.*, k.nama AS nama_kategori, u.nama_pengguna 
    FROM portofolio p
    LEFT JOIN kategori k ON p.id_kategori = k.id_kategori
    LEFT JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    ORDER BY p.tanggal_dibuat DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Gagal ambil data beranda');
    res.render('pages/home', { title: 'Beranda', portofolios: results });
  });
});

// ==================== DETAIL PORTOFOLIO ====================
router.get('/portofolio/:id', (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT p.*, u.nama_pengguna 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_portofolio = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Portofolio tidak ditemukan');

    const portofolio = results[0];
    res.render('pages/detail_portofolio', { title: 'Detail Portofolio', portofolio });
  });
});

// ==================== LIKE / UNLIKE ====================
router.post('/like/:id', (req, res) => {
  const portofolioId = req.params.id;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ message: 'User belum login' });

  const cekLike = 'SELECT * FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
  db.query(cekLike, [userId, portofolioId], (err, result) => {
    if (err) return res.status(500).send('Gagal cek like');

    if (result.length > 0) {
      const hapusLike = 'DELETE FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
      db.query(hapusLike, [userId, portofolioId], (err2) => {
        if (err2) return res.status(500).send('Gagal unlike');
        const kurangiLike = 'UPDATE portofolio SET jumlah_suka = jumlah_suka - 1 WHERE id_portofolio = ?';
        db.query(kurangiLike, [portofolioId], (err3) => {
          if (err3) return res.status(500).send('Gagal kurangi jumlah like');
          return res.json({ liked: false });
        });
      });
    } else {
      const tambahLike = 'INSERT INTO suka (id_pengguna, id_portofolio, tanggal_suka) VALUES (?, ?, NOW())';
      db.query(tambahLike, [userId, portofolioId], (err4) => {
        if (err4) return res.status(500).send('Gagal tambah like');
        const tambahJumlah = 'UPDATE portofolio SET jumlah_suka = jumlah_suka + 1 WHERE id_portofolio = ?';
        db.query(tambahJumlah, [portofolioId], (err5) => {
          if (err5) return res.status(500).send('Gagal tambah jumlah like');
          return res.json({ liked: true });
        });
      });
    }
  });
});

// ==================== KATEGORI & PORTOFOLIO KATEGORI ====================
router.get('/kategori', (req, res) => {
  const queryKategori = 'SELECT * FROM kategori';
  const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ?';

  db.query(queryKategori, (errKategori, kategoriResults) => {
    if (errKategori) return res.status(500).send('Gagal ambil kategori');

    const kategoriWithPortfolios = [];

    kategoriResults.forEach(category => {
      db.query(queryPortofolio, [category.id_kategori], (errPortofolio, portofolioResults) => {
        if (!errPortofolio) {
          kategoriWithPortfolios.push({
            category,
            portfolios: portofolioResults
          });
        }

        if (kategoriWithPortfolios.length === kategoriResults.length) {
          res.render('pages/kategori', {
            title: 'Daftar Kategori dan Portofolio',
            kategoriWithPortfolios
          });
        }
      });
    });
  });
});

router.get('/kategori/:id', (req, res) => {
  const categoryId = req.params.id;
  const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ? AND is_draft = 0';

  db.query(queryPortofolio, [categoryId], (err, portofolioResults) => {
    if (err) return res.status(500).send('Gagal ambil portofolio');
    res.render('pages/portofolio_kategori', {
      title: 'Portofolio Kategori',
      portfolios: portofolioResults,
      categoryId
    });
  });
});

// ==================== SHARE PORTOFOLIO ====================
router.get('/share-portofolio/:id', (req, res) => {
  const portfolioId = req.params.id;

  const query = 
    'SELECT p.*, u.nama_pengguna FROM portofolio p ' +
    'JOIN pengguna u ON p.id_pengguna = u.id_pengguna ' +
    'WHERE p.id_portofolio = ?';

  db.query(query, [portfolioId], (err, results) => {
    if (err) {
      return res.status(500).send('Terjadi kesalahan mengambil data portofolio.');
    }

    if (results.length > 0) {
      const portofolio = results[0];
      res.render('pages/share_portofolio', { 
        title: 'Share Portofolio',
        portofolio 
      });
    } else {
      return res.status(404).send('Portofolio tidak ditemukan.');
    }
  });
});


// ==================== kOMENTAR ====================
// Rute untuk menambah komentar
router.post('/komentar/tambah', (req, res) => {
  const { isi_komentar, id_portofolio } = req.body;

  // Pastikan pengguna sudah login
  if (!req.session.user) { // Memastikan session user tersedia
    return res.status(401).json({ error: 'Pengguna belum terautentikasi. Silakan login terlebih dahulu.' });
  }

  // Ambil ID pengguna yang login
  const id_pengguna = req.session.user.id;

  // Validasi input
  if (!isi_komentar || !id_portofolio) {
    return res.status(400).json({ error: 'Komentar dan ID portofolio harus diisi.' });
  }

  // Query untuk menambah komentar ke database
  const query = `
    INSERT INTO komentar (id_pengguna, id_portofolio, isi_komentar, tanggal_dibuat)
    VALUES (?, ?, ?, NOW())
  `;

  // Eksekusi query untuk menambahkan komentar ke database
  db.query(query, [id_pengguna, id_portofolio, isi_komentar], (err, result) => {
    if (err) {
      console.error('Error saat menambahkan komentar:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan komentar.' });
    }

    // Kembalikan response sukses dengan data komentar baru
    return res.status(201).json({
      success: true,
      message: 'Komentar berhasil ditambahkan!',
      komentar: {
        id_komentar: result.insertId, // Dapatkan ID komentar yang baru ditambahkan
        id_pengguna,
        id_portofolio,
        isi_komentar,
        tanggal_dibuat: new Date()
      }
    });
  });
});

// Rute untuk melihat komentar berdasarkan ID portofolio
router.get('/komentar/lihat/:id_portofolio', (req, res) => {
  const id_portofolio = req.params.id_portofolio;

  // Validasi ID portofolio
  if (!id_portofolio) {
    return res.status(400).json({ error: 'ID portofolio tidak ditemukan.' });
  }

  // Query untuk mengambil komentar berdasarkan ID portofolio
  const query = `
    SELECT c.id_komentar, c.isi_komentar, c.tanggal_dibuat, u.nama 
    FROM komentar c
    JOIN pengguna u ON c.id_pengguna = u.id_pengguna
    WHERE c.id_portofolio = ?
    ORDER BY c.tanggal_dibuat DESC
  `;
  
  db.query(query, [id_portofolio], (err, results) => {
    if (err) {
      console.error('Error saat mengambil komentar:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan saat mengambil komentar.' });
    }

    // Jika tidak ada komentar
    if (results.length === 0) {
      return res.render('komentar_lihat', {
        komentar: [],
        id_portofolio,
        msg: 'Belum ada komentar untuk portofolio ini.'
      });
    }

    // Jika ada komentar
    return res.render('komentar_lihat', {
      komentar: results,
      id_portofolio,
      msg: null
    });
  });
});









module.exports = router;
