const express = require('express');
const router = express.Router();
const connection = require('../db');

// Middleware: cek apakah user sudah login dan punya role admin
const checkAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Akses hanya untuk admin!');
  }
};

// Middleware tambahan untuk inject user info ke semua view
const injectAdminLayoutVars = (req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.loggedIn = true;
  res.locals.isAdmin = true;
  next();
};

router.use(injectAdminLayoutVars);

// Dashboard admin
router.get('/admin', checkAdmin, (req, res) => {
  res.render('pages/admin', {
    title: 'Dashboard Admin'
  });
});

// Halaman daftar kategori
router.get('/admin/editKategori', checkAdmin, (req, res) => {
  const queryKategori = 'SELECT * FROM kategori';
  connection.query(queryKategori, (err, kategoriResults) => {
    if (err) {
      console.error('Error mengambil data kategori:', err);
      return res.status(500).send('Gagal mengambil kategori');
    }

    res.render('pages/editKategori', {
      title: 'Edit Kategori',
      categories: kategoriResults
    });
  });
});

// Form edit kategori
router.get('/admin/editKategori/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  const query = 'SELECT * FROM kategori WHERE id_kategori = ?';

  connection.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error('Gagal mengambil kategori:', err);
      return res.status(500).send('Gagal mengambil kategori');
    }

    res.render('pages/editKategoriForm', {
      title: 'Form Edit Kategori',
      category: result[0]
    });
  });
});

// Simpan perubahan kategori
router.post('/admin/editKategori/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  const { categoryName, categoryDescription } = req.body;
  const query = 'UPDATE kategori SET nama = ?, deskripsi = ? WHERE id_kategori = ?';

  connection.query(query, [categoryName, categoryDescription, categoryId], (err) => {
    if (err) {
      console.error('Gagal mengupdate kategori:', err);
      return res.status(500).send('Gagal mengupdate kategori');
    }
    res.redirect('/admin/editKategori');
  });
});

// Tambah kategori baru
router.post('/admin/editKategori', checkAdmin, (req, res) => {
  const { categoryName, categoryDescription } = req.body;
  const query = 'INSERT INTO kategori (nama, deskripsi) VALUES (?, ?)';

  connection.query(query, [categoryName, categoryDescription], (err) => {
    if (err) {
      console.error('Penambahan kategori error:', err);
      return res.status(500).send('Penambahan Kategori Gagal');
    }
    res.redirect('/admin/editKategori');
  });
});

// Form tambah kategori
router.get('/admin/tambahKategori', checkAdmin, (req, res) => {
  res.render('pages/tambahKategori', {
    title: 'Tambah Kategori Baru'
  });
});

// Simpan kategori baru
router.post('/admin/tambahKategori', checkAdmin, (req, res) => {
  const { categoryName, categoryDescription } = req.body;
  const query = 'INSERT INTO kategori (nama, deskripsi) VALUES (?, ?)';

  connection.query(query, [categoryName, categoryDescription], (err) => {
    if (err) {
      console.error('Gagal menambahkan kategori:', err);
      return res.status(500).send('Gagal menambahkan kategori');
    }
    res.redirect('/admin/editKategori');
  });
});

// Hapus kategori
router.get('/admin/deleteCategory/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  const query = 'DELETE FROM kategori WHERE id_kategori = ?';

  connection.query(query, [categoryId], (err) => {
    if (err) {
      console.error('Gagal menghapus kategori:', err);
      return res.status(500).send('Gagal menghapus kategori');
    }
    res.redirect('/admin/editKategori');
  });
});

// Halaman edit informasi
router.get('/admin/editInfo', checkAdmin, (req, res) => {
  const queryInformasi = 'SELECT * FROM informasi';
  connection.query(queryInformasi, (err, informasiResults) => {
    if (err) {
      console.error('Error mengambil informasi:', err);
      return res.status(500).send('Gagal mengambil informasi');
    }

    res.render('pages/editInfo', {
      title: 'Edit Informasi',
      information: informasiResults
    });
  });
});

// Form edit informasi
router.get('/admin/editInfo/:id', checkAdmin, (req, res) => {
  const infoId = req.params.id;
  const query = 'SELECT * FROM informasi WHERE id = ?';

  connection.query(query, [infoId], (err, result) => {
    if (err) {
      console.error('Gagal mengambil informasi:', err);
      return res.status(500).send('Pengambilan Informasi Gagal');
    }

    res.render('pages/editInfoForm', {
      title: 'Form Edit Informasi',
      info: result[0]
    });
  });
});

// Simpan perubahan informasi
router.post('/admin/editInfo/:id', checkAdmin, (req, res) => {
  const infoId = req.params.id;
  const { infoTitle, infoContent } = req.body;
  const query = 'UPDATE informasi SET title = ?, content = ? WHERE id = ?';

  connection.query(query, [infoTitle, infoContent, infoId], (err) => {
    if (err) {
      console.error('Gagal mengupdate informasi:', err);
      return res.status(500).send('Update Informasi Gagal');
    }
    res.redirect('/admin/editInfo');
  });
});

// Tambah informasi baru
router.post('/admin/tambahInfo', checkAdmin, (req, res) => {
  const { infoTitle, infoContent } = req.body;
  const query = 'INSERT INTO informasi (title, content) VALUES (?, ?)';

  connection.query(query, [infoTitle, infoContent], (err) => {
    if (err) {
      console.error('Gagal menambahkan informasi:', err);
      return res.status(500).send('Gagal menambahkan informasi');
    }
    res.redirect('/admin/editInfo');
  });
});

module.exports = router;
