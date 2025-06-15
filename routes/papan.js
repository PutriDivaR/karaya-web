const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

// Setup penyimpanan gambar menggunakan multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');  // Menyimpan gambar di folder 'public/uploads'
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));  // Nama file gambar dibuat unik
  }
});

const upload = multer({ storage });

// GET form untuk menambah papan
router.get('/tambah_papan', (req, res) => {
  res.render('pages/tambah_papan', { title: 'Tambah Papan' });
});

// POST untuk menyimpan data papan dan gambar
router.post('/tambah_papan', upload.single('gambar'), (req, res) => {
  const { judul_papan } = req.body;
  const gambar = req.file ? req.file.filename : null;  // Mendapatkan nama file gambar
  const id_pengguna = req.session.user ? req.session.user.id : 1;  // ID pengguna dari session
  const deskripsi = '';  // Deskripsi kosong (bisa ditambahkan jika diperlukan)
  const is_archived = 0;  // Status arsip, diset ke 0 (tidak diarsipkan)

  // Validasi untuk memastikan judul dan gambar diisi
  if (!judul_papan || !gambar) {
    return res.status(400).send('Judul dan gambar wajib diisi');
  }

  const sql = `
    INSERT INTO papan 
    (id_pengguna, nama_papan, deskripsi, is_archived, gambar, tanggal_dibuat)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  db.query(sql, [id_pengguna, judul_papan, deskripsi, is_archived, gambar], (err, result) => {
    if (err) {
      console.error('Gagal menyimpan ke tabel papan:', err);
      return res.status(500).send('Gagal menyimpan data: ' + err.sqlMessage || err.message);
    }

    res.redirect('/favorit');
  });
});

// Route untuk halaman favorit, untuk menampilkan papan yang telah disimpan
router.get('/favorit', (req, res) => {
  const sql = 'SELECT * FROM papan WHERE is_archived = 0'; // Mengambil papan yang tidak diarsipkan
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Gagal mengambil data papan:', err);
      return res.status(500).send('Gagal mengambil data');
    }
    res.render('pages/favorit', { papan: result, title: 'Halaman Favorit',}); // Mengirimkan data papan ke halaman favorit.ejs
  });
});

// Route untuk menampilkan halaman edit papan
router.get('/edit_papan/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM papan WHERE id_papan = ?';  // Ambil data papan berdasarkan id
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Gagal mengambil data papan:', err);
      return res.status(500).send('Gagal mengambil data papan');
    }
    if (result.length === 0) {
      return res.status(404).send('Papan tidak ditemukan');
    }
    res.render('pages/edit_papan', { title: 'Edit Papan', papan: result[0] });  // Menampilkan halaman edit dengan data papan
  });
});

// Route untuk menyimpan perubahan edit papan
router.post('/edit_papan/:id', upload.single('gambar'), (req, res) => {
  const id = req.params.id;
  const { judul_papan } = req.body;
  const gambar = req.file ? req.file.filename : null;  // Menyimpan gambar baru jika di-upload
  const sql = `
    UPDATE papan SET nama_papan = ?, gambar = ? WHERE id_papan = ?
  `;
  
  db.query(sql, [judul_papan, gambar, id], (err, result) => {
    if (err) {
      console.error('Gagal mengupdate data papan:', err);
      return res.status(500).send('Gagal mengupdate data papan');
    }

    res.redirect('/favorit');  // Redirect ke halaman favorit setelah update
  });
});

// Route untuk menghapus papan
router.post('/delete_papan/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM papan WHERE id_papan = ?';  // Menghapus papan berdasarkan id
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Gagal menghapus data papan:', err);
      return res.status(500).send('Gagal menghapus data papan');
    }

    res.redirect('/favorit');  // Redirect ke halaman favorit setelah menghapus papan
  });
});

// Route untuk menambahkan portofolio ke papan favorit
router.post('/add_to_papan/:id_portofolio', (req, res) => {
  const idPortofolio = req.params.id_portofolio;
  const { id_papan } = req.body;  // Mengambil id_papan dari form yang dipilih oleh pengguna

  // Query untuk menyimpan relasi portofolio dengan papan
  const sql = `
    INSERT INTO favorit (id_papan, id_portofolio, tanggal_ditambahkan)
    VALUES (?, ?, NOW())
  `;
  
  db.query(sql, [id_papan, idPortofolio], (err, result) => {
    if (err) {
      console.error('Gagal menyimpan portofolio ke papan:', err);
      return res.status(500).send('Gagal menyimpan portofolio ke papan');
    }

    res.redirect(`/favorit`);  // Redirect ke halaman favorit setelah berhasil menambahkan
  });
});

// Route untuk melihat portofolio dalam papan favorit
// Route untuk melihat portofolio dalam papan favorit
router.get('/portofolio_papan/:id_papan', (req, res) => {
  const idPapan = req.params.id_papan;
  
  // Ambil data papan berdasarkan id_papan
  const sqlPapan = 'SELECT * FROM papan WHERE id_papan = ?';
  db.query(sqlPapan, [idPapan], (err, papanResult) => {
    if (err) {
      console.error('Gagal mengambil data papan:', err);
      return res.status(500).send('Gagal mengambil data papan');
    }

    // Ambil data portofolio yang terkait dengan papan
    const sqlPortofolio = `
      SELECT p.*, f.tanggal_ditambahkan
      FROM portofolio p
      JOIN favorit f ON p.id_portofolio = f.id_portofolio
      WHERE f.id_papan = ?
    `;
    db.query(sqlPortofolio, [idPapan], (err, portofolioResult) => {
      if (err) {
        console.error('Gagal mengambil data portofolio:', err);
        return res.status(500).send('Gagal mengambil data portofolio');
      }

      // Kirimkan data papan dan portofolio ke halaman portofolio_papan.ejs
      res.render('pages/portofolio_papan', {
        title: 'Portofolio di Papan',
        papan: papanResult[0],  // Mengirimkan data papan
        portofolios: portofolioResult  // Mengirimkan daftar portofolio
      });
    });
  });
});


module.exports = router;
