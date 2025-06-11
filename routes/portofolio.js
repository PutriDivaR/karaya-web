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


// GET halaman upload portofolio
router.get('/upload_portofolio', (req, res) => {
  res.render('pages/upload_portofolio', { title: 'Upload' });
});

// POST form upload portofolio
router.post('/upload_portofolio', upload.single('gambar'), (req, res) => {
  const { judul, deskripsi, id_kategori } = req.body;
  const id_pengguna = req.session.user ? req.session.user.id : null;



  console.log('File uploaded:', req.file);

  const gambar = req.file ? req.file.filename : null;
  const jumlah_suka = 0;


    let idKategoriValue = null;

if (id_kategori && !isNaN(parseInt(id_kategori))) {
  idKategoriValue = parseInt(id_kategori);
}


  const sql = `
    INSERT INTO portofolio (
      id_pengguna, judul, deskripsi, id_kategori, jumlah_suka, gambar, tanggal_dibuat
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

db.query(sql, [
  id_pengguna,
  judul,
  deskripsi,
  idKategoriValue,
  jumlah_suka,
  gambar
], (err, result) => {
  if (err) {
    console.error('Gagal menyimpan portofolio:', err); // tampilkan error lengkap
    return res.status(500).send('Gagal menyimpan portofolio: ' + err.sqlMessage || err.message);
  }
  res.redirect('/home');
});

});

router.get('/portofolio/:id/suka', (req, res) => {
  const portofolioId = req.params.id;

  const getPortofolio = 'SELECT * FROM portofolio WHERE id_portofolio = ?';
  const getLikers = `
    SELECT u.nama_pengguna, u.email, u.foto_profil, s.tanggal_suka
    FROM suka s
    JOIN pengguna u ON s.id_pengguna = u.id_pengguna
    WHERE s.id_portofolio = ?
    ORDER BY s.tanggal_suka DESC
  `;

  db.query(getPortofolio, [portofolioId], (err1, portofolioResult) => {
    if (err1 || portofolioResult.length === 0) {
      return res.status(404).send('Portofolio tidak ditemukan.');
    }

    const portofolio = portofolioResult[0];

    db.query(getLikers, [portofolioId], (err2, likers) => {
      if (err2) {
        return res.status(500).send('Gagal mengambil data penyuka.');
      }

      res.render('pages/portofolio_suka', {
        title: 'Disukai oleh',
        portofolioId,
        portofolio,
        likers
      });
    });
  });
});



module.exports = router;
