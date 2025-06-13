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


module.exports = router;
