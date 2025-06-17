const express = require('express');
const router = express.Router();
const db = require('../db');

// Tampilkan form login
router.get('/login', (req, res) => {
  const msg = req.query.msg === 'register_success' ? 'Registrasi berhasil. Silakan login!' : null;
  res.render('pages/login', { title: 'Login', errors: {}, email: '', msg});
});

// Tangani form login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM pengguna WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Error saat query login:', err);
      return res.render('pages/login', {
        title: 'Login',
        errors: { general: 'Kesalahan server' },
        email,
        msg: null // ← Tambahkan ini
      });
    }

    if (results.length === 0) {
      return res.render('pages/login', {
        title: 'Login',
        errors: { email: 'User tidak ditemukan' },
        email,
        msg: null // ← Tambahkan ini
      });
    }

    const user = results[0];
    if (user.kata_sandi !== password) {
      return res.render('pages/login', {
        title: 'Login',
        errors: { password: 'Password salah' },
        email,
        msg: null // ← Tambahkan ini
      });
    }

req.session.user = {
  id: user.id_pengguna,
  name: user.nama_pengguna,
  email: user.email,
  role: user.peran
};
req.session.userId = user.id_pengguna;

    // Login sukses → redirect
    res.redirect('/home');
  });
});



// Tampilkan form registrasi
router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Register', errors: {}, old: {} });
});

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  const errors = {};
  const old = { username, email };

  // Validasi domain email
  if (!email.endsWith('@student.unand.ac.id')) {
    errors.email = 'Gunakan email student.unand.ac.id';
    return res.render('pages/register', { title: 'Register', errors, old });
  }

  // Cek apakah email sudah digunakan
  const cekEmailSql = 'SELECT * FROM pengguna WHERE email = ?';
  db.query(cekEmailSql, [email], (err, results) => {
    if (err) {
      console.error(err);
      errors.email = 'Kesalahan server saat cek email.';
      return res.render('pages/register', { title: 'Register', errors, old });
    }

    if (results.length > 0) {
      errors.email = 'Email sudah terdaftar.';
      return res.render('pages/register', { title: 'Register', errors, old });
    }

    // Insert user
    const sql = 'INSERT INTO pengguna (nama_pengguna, email, kata_sandi, bio, foto_profil, peran, tanggal_dibuat) VALUES (?, ?, ?, ?, ?, ?, NOW())';
    const values = [username, email, password, '', '', 'pengguna'];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Gagal insert ke database:', err);
        errors.global = 'Gagal menyimpan data.';
        return res.render('pages/register', { title: 'Register', errors, old });
      }

      // Jika berhasil, redirect ke login dengan pesan
      return res.redirect('/login?msg=register_success');
    });
  });
});

//router logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/home'); // kembali ke beranda sebagai tamu
  });
});

router.get('/bantuan', (req, res) => {
  res.render('pages/pusatBantuan', {
    title: 'Pusat Bantuan'
  });
});

router.get('/kelPorto', (req, res) => {
  res.render('pages/kelPorto',{
    title: 'Kelola Portofolio'
  });
});

router.get('/kelPapan', (req, res) => {
  res.render('pages/kelPapan',{
    title: 'Kelola Papan'
  });
});

router.get('/kelProfil', (req, res) => {
  res.render('pages/kelProfil',{
    title: 'Kelola Profil'
  });
});

router.get('/get-papan', (req, res) => {
    console.log("SESSION ISI:", req.session);
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).send("Belum login");

  const query = 'SELECT id_papan, nama_papan, gambar FROM papan WHERE id_pengguna = ? AND is_archived = 0';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Query error (get-papan):", err);
      return res.status(500).send("Gagal ambil papan");
    }
    res.json(results);
  });
});

router.post('/simpan-ke-papan', (req, res) => {
  const { id_papan, id_portofolio } = req.body;
  const userId = req.session.user?.id;

  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const checkQuery = `SELECT * FROM detailPapan WHERE id_papan = ? AND id_portofolio = ?`;
  db.query(checkQuery, [id_papan, id_portofolio], (err, results) => {
    if (err) {
      console.error('Gagal cek duplikat:', err);
      return res.status(500).json({ success: false });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Portofolio sudah ada di papan ini' });
    }

    const insertQuery = `INSERT INTO detailPapan (id_papan, id_portofolio) VALUES (?, ?)`;
    db.query(insertQuery, [id_papan, id_portofolio], (err2, result) => {
      if (err2) {
        console.error('Gagal menyimpan:', err2);
        return res.status(500).json({ success: false });
      }

      res.json({ success: true });
    });
  });
});



router.get('/portofolio_papan/:id_papan', (req, res) => {
  const idPapan = req.params.id_papan;

  const sqlPapan = 'SELECT * FROM papan WHERE id_papan = ?';
  db.query(sqlPapan, [idPapan], (err, papanResult) => {
    if (err) {
      console.error('Gagal mengambil data papan:', err);
      return res.status(500).send('Gagal mengambil data papan');
    }

    const sqlPortofolio = `
      SELECT p.*
      FROM portofolio p
      JOIN detailPapan d ON p.id_portofolio = d.id_portofolio
      WHERE d.id_papan = ?
    `;

    db.query(sqlPortofolio, [idPapan], (err, portofolioResult) => {
      if (err) {
        console.error('Gagal mengambil data portofolio:', err);
        return res.status(500).send('Gagal mengambil data portofolio');
      }

      res.render('pages/portofolio_papan', {
        title: 'Portofolio di Papan',
        papan: papanResult[0],
        portofolios: portofolioResult,
        msg: req.query.msg
      });
    });
  });
});

router.post('/hapus-dari-papan', (req, res) => {
  const { id_papan, id_portofolio } = req.body;

  const userId = req.session.user?.id;
  if (!userId) return res.status(401).send('Unauthorized');

  const query = `
    DELETE FROM detailPapan
    WHERE id_papan = ? AND id_portofolio = ?
  `;

  db.query(query, [id_papan, id_portofolio], (err, result) => {
    if (err) {
      console.error('Gagal menghapus dari papan:', err);
      return res.status(500).send('Gagal menghapus dari papan');
    }

    // Redirect ke halaman papan lagi setelah hapus
    res.redirect(`/portofolio_papan/${id_papan}?msg=hapus`);
  });
});


// Route untuk halaman home + search
router.get('/home', (req, res) => {
  const search = req.query.search || '';

  let sql = 'SELECT * FROM portofolio';
  const params = [];

  if (search) {
    sql += ' WHERE judul LIKE ?';
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY tanggal_dibuat DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Kesalahan saat mengambil data portofolio:', err);
      return res.status(500).send("Kesalahan server.");
    }

    res.render('pages/home', {
      title: 'Beranda',
      portofolios: results,
      search // biar inputnya tetap tampil
    });
  });
});


router.get('/kalender', (req, res) => {
  const userId = req.session.user.id; // langsung ambil karena pasti sudah login

  const query = `
    SELECT id_portofolio, judul, tanggal_dibuat 
    FROM portofolio 
    WHERE id_pengguna = ? 
    ORDER BY tanggal_dibuat DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Gagal mengambil data");
    }

    const formatted = results.map(item => ({
      id_portofolio: item.id_portofolio,
      judul: item.judul,
      tanggal_dibuat: item.tanggal_dibuat,
      tanggalFormatted: item.tanggal_dibuat.toISOString().split('T')[0]
    }));

    res.render('pages/kalender', {
      title: 'Kalender',
      uploads: formatted
    });
  });
});



module.exports = router;
