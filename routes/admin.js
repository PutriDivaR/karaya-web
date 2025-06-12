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
  res.render('pages/admin', {
    title: 'Dashboard Admin',
    user: req.session.user
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

// Route untuk mengambil data kategori dan menampilkannya di form edit
router.get('/editKategori/:id', (req, res) => {
  const categoryId = req.params.id;
  const query = 'SELECT * FROM kategori WHERE id = ?';

  connection.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Pengambilan Kategori Error');
    } else {
      res.render('editKategori', { category: result[0] });
    }
  });
});

// Route untuk mengupdate kategori
router.post('/editKategori/:id', (req, res) => {
  const categoryId = req.params.id;
  const { categoryName, categoryDescription } = req.body;
  const query = 'UPDATE kategori SET name = ?, description = ? WHERE id = ?';

  connection.query(query, [categoryName, categoryDescription, categoryId], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Update Kategori Error');
    } else {
      // Redirect ke halaman kategori setelah berhasil update
      res.redirect('/admin/kategori'); 
    }
  });
});

// Route untuk menghapus kategori
router.get('/deleteCategory/:id', (req, res) => {
  const categoryId = req.params.id;
  const query = 'DELETE FROM kategori WHERE id = ?';

  connection.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error(err);
      res.send('Hapus Kategori Error');
    } else {
      res.send('Hapus Kategori Berhasil');
    }
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
