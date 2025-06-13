const express = require('express');
const router = express.Router();
const connection = require('../db');  // Menyesuaikan dengan file koneksi yang kamu buat sebelumnya



// Middleware: cek apakah user sudah login dan punya role admin
const checkAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    next(); // Lanjut ke rute admin
  } else {
    res.status(403).send('Akses hanya untuk admin!');
  }
};

router.get('/admin', checkAdmin, (req, res) => {
  const user = req.session.user; // Ambil data user dari session
  const isAdmin = user && user.role === 'admin'; // Tentukan apakah user adalah admin

  const queryKategori = 'SELECT * FROM kategori';
  const queryInformasi = 'SELECT * FROM informasi';

  connection.query(queryKategori, (errKategori, kategoriResults) => {
    if (errKategori) {
      console.error('Error mengambil data kategori:', errKategori);
      return res.status(500).send('Gagal mengambil kategori');
    }
     console.log('Kategori Results:', kategoriResults);

    connection.query(queryInformasi, (errInformasi, informasiResults) => {
      if (errInformasi) {
        console.error('Error mengambil data informasi:', errInformasi);
        return res.status(500).send('Gagal mengambil informasi');
      }
       console.log('Informasi Results:', informasiResults);

      res.render('pages/admin', {
        title: 'Dashboard Admin',
        user: req.session.user,
        isAdmin: isAdmin,  // Mengirimkan isAdmin ke template
        loggedIn: true,
        categories: kategoriResults,
        information: informasiResults
      });
    });
  });
});

// Route untuk menambah kategori
router.post('/editKategori', (req, res) => {
  const { categoryName, categoryDescription } = req.body;
  const query = 'INSERT INTO kategori (name, description) VALUES (?, ?)';

  connection.query(query, [categoryName, categoryDescription], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Penambahan Kategori Error');
    } else {
      res.send('Penambahan Kategory Berhasil');
    }
  });
});

// Route untuk menampilkan form edit kategori
router.get('/editKategori/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  const query = 'SELECT * FROM kategori WHERE id_kategori = ?';

  connection.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error('Gagal mengambil kategori:', err);
      return res.status(500).send('Gagal mengambil kategori');
    }
    res.render('pages/editKategori', { category: result[0] });
  });
});

// Route untuk menyimpan perubahan kategori
router.post('/editKategori/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  const { categoryName, categoryDescription } = req.body;
  const query = 'UPDATE kategori SET nama = ?, deskripsi = ? WHERE id_kategori = ?';

  connection.query(query, [categoryName, categoryDescription, categoryId], (err, result) => {
    if (err) {
      console.error('Gagal mengupdate kategori:', err);
      return res.status(500).send('Gagal mengupdate kategori');
    }
    res.redirect('/admin');  // Redirect kembali ke halaman admin setelah sukses
  });
});


// Route untuk menghapus kategori
router.get('/deleteCategory/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  const query = 'DELETE FROM kategori WHERE id_kategori = ?';

  connection.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error('Gagal menghapus kategori:', err);
      return res.status(500).send('Gagal menghapus kategori');
    }
    res.redirect('/admin');  // Redirect kembali ke halaman admin setelah sukses
  });
});



// Route untuk menambah informasi
router.post('/editInfo', (req, res) => {
  const { infoTitle, infoContent } = req.body;
  const query = 'INSERT INTO informasi (title, content) VALUES (?, ?)';

  connection.query(query, [infoTitle, infoContent], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Penambahan Informasi Error');
    } else {
      res.send('Penambahan Informasi Berhasil');
    }
  });
});



// Route untuk mengambil data informasi dan menampilkannya di form edit
router.get('/editInfo/:id', (req, res) => {
  const infoId = req.params.id;
  const query = 'SELECT * FROM informasi WHERE id = ?';

  connection.query(query, [infoId], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Pengambilan Informasi Error');
    } else {
      res.render('editInfo', { info: result[0] });
    }
  });
});

// Route untuk mengupdate informasi
router.post('/editInfo/:id', (req, res) => {
  const infoId = req.params.id;
  const { infoTitle, infoContent } = req.body;
  const query = 'UPDATE informasi SET title = ?, content = ? WHERE id = ?';

  connection.query(query, [infoTitle, infoContent, infoId], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Update Informasi Error');
    } else {
      res.send('Update Informasi Berhasil');
    }
  });
});





module.exports = router;
