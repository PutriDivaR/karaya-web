const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

// Konfigurasi multer untuk upload file ke folder public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


// Rute untuk GET halaman upload/edit portofolio
// Rute untuk GET halaman upload/edit portofolio
router.get('/upload_portofolio', (req, res) => {
  const id_portofolio = req.query.id_portofolio; // Ambil ID portofolio dari query string

  if (id_portofolio) {
    // Jika ada ID portofolio, ambil data portofolio tersebut dari database
    const sql = `SELECT * FROM portofolio WHERE id_portofolio = ? AND id_pengguna = ?`;
    
    db.query(sql, [id_portofolio, req.session.user.id], (err, result) => {
      if (err) {
        console.error('Gagal mengambil data portofolio:', err);
        return res.status(500).send('Gagal mengambil data portofolio');
      }

      // Jika portofolio ditemukan, kirimkan data ke form untuk diedit
      if (result.length > 0) {
        res.render('pages/upload_portofolio', {
          title: 'Edit Portofolio',
          portofolio: result[0] // Kirim data portofolio untuk diedit
        });
      } else {
        res.redirect('/profile'); // Jika portofolio tidak ditemukan, kembali ke profil
      }
    });
  } else {
    res.render('pages/upload_portofolio', { title: 'Upload Portofolio', portofolio: null });
  }
});



// POST untuk menyimpan atau mengedit portofolio
router.post('/upload_portofolio', upload.single('gambar'), (req, res) => {
  const { judul, deskripsi, id_kategori, is_draft, id_portofolio } = req.body;
  const id_pengguna = req.session.user ? req.session.user.id : null;

  console.log('File uploaded:', req.file);

  const gambar = req.file ? req.file.filename : null;
  const jumlah_suka = 0;
  let idKategoriValue = null;

  if (id_kategori && !isNaN(parseInt(id_kategori))) {
    idKategoriValue = parseInt(id_kategori);
  }

  // Jika id_portofolio ada, berarti kita sedang mengedit
  if (id_portofolio) {
    const sql = `
      UPDATE portofolio 
      SET judul = ?, deskripsi = ?, id_kategori = ?, gambar = ?, is_draft = ? 
      WHERE id_portofolio = ? AND id_pengguna = ?
    `;
    db.query(sql, [
      judul, deskripsi, idKategoriValue, gambar, is_draft, id_portofolio, id_pengguna
    ], (err, result) => {
      if (err) {
        console.error('Gagal menyimpan portofolio:', err);
        return res.status(500).send('Gagal menyimpan portofolio: ' + err.sqlMessage || err.message);
      }
      res.redirect('/profile'); // Kembali ke halaman profil setelah update
    });
  } else {
    // Simpan sebagai portofolio baru jika tidak ada id_portofolio
    const sql = `
      INSERT INTO portofolio (
        id_pengguna, judul, deskripsi, id_kategori, jumlah_suka, gambar, tanggal_dibuat, is_draft
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
    `;
    db.query(sql, [
      id_pengguna, judul, deskripsi, idKategoriValue, jumlah_suka, gambar, 0 // is_draft = 1 untuk draft
    ], (err, result) => {
      if (err) {
        console.error('Gagal menyimpan portofolio:', err);
        return res.status(500).send('Gagal menyimpan portofolio: ' + err.sqlMessage || err.message);
      }
      res.redirect('/profile'); // Kembali ke halaman profil setelah simpan
    });
  }
});


module.exports = router;
