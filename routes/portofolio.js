const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

// Konfigurasi penyimpanan file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });


// ===================== HALAMAN GET UPLOAD / EDIT =====================
router.get('/upload_portofolio', (req, res) => {
  const id_portofolio = req.query.id_portofolio;
  const id_pengguna = req.session.user?.id;

  const queryKategori = 'SELECT * FROM kategori';

  db.query(queryKategori, (errKategori, kategoriResults) => {
    if (errKategori) {
      console.error('Gagal ambil kategori:', errKategori);
      return res.status(500).send('Gagal mengambil kategori');
    }

    if (id_portofolio) {
      const sql = 'SELECT * FROM portofolio WHERE id_portofolio = ? AND id_pengguna = ?';
      db.query(sql, [id_portofolio, id_pengguna], (err, result) => {
        if (err) {
          console.error('Gagal mengambil data portofolio:', err);
          return res.status(500).send('Gagal mengambil data portofolio');
        }

        if (result.length > 0) {
          res.render('pages/upload_portofolio', {
            title: 'Edit Portofolio',
            portofolio: result[0],
            categories: kategoriResults
          });
        } else {
          res.redirect('/profile');
        }
      });
    } else {
      res.render('pages/upload_portofolio', {
        title: 'Upload Portofolio',
        portofolio: null,
        categories: kategoriResults
      });
    }
  });
});

// ===================== POST UPLOAD / EDIT PORTOFOLIO =====================
router.post('/upload_portofolio', upload.single('gambar'), (req, res) => {
  const { judul, deskripsi, id_kategori, is_draft, id_portofolio } = req.body;
  const id_pengguna = req.session.user?.id;
  const gambar = req.file ? req.file.filename : null;
  const jumlah_suka = 0;
  const idKategoriValue = id_kategori && !isNaN(parseInt(id_kategori)) ? parseInt(id_kategori) : null;

  if (id_portofolio) {
    // UPDATE
    const selectSql = 'SELECT gambar FROM portofolio WHERE id_portofolio = ? AND id_pengguna = ?';
    db.query(selectSql, [id_portofolio, id_pengguna], (err, selectResult) => {
      if (err) return res.status(500).send('Gagal ambil gambar lama');
      if (selectResult.length === 0) return res.status(404).send('Portofolio tidak ditemukan');

      const gambarToSave = gambar ? gambar : selectResult[0].gambar;
      const updateSql = `
        UPDATE portofolio
        SET judul = ?, deskripsi = ?, id_kategori = ?, gambar = ?, is_draft = ?
        WHERE id_portofolio = ? AND id_pengguna = ?
      `;
      db.query(updateSql, [judul, deskripsi, idKategoriValue, gambarToSave, is_draft, id_portofolio, id_pengguna], (err) => {
        if (err) return res.status(500).send('Gagal update: ' + err.message);
        res.redirect('/profile');
      });
    });
  } else {
    // INSERT
    const sql = `
      INSERT INTO portofolio (id_pengguna, judul, deskripsi, id_kategori, jumlah_suka, gambar, tanggal_dibuat, is_draft)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
    `;
    db.query(sql, [id_pengguna, judul, deskripsi, idKategoriValue, jumlah_suka, gambar, is_draft], (err) => {
      if (err) return res.status(500).send('Gagal simpan: ' + err.message);
      res.redirect('/profile');
    });
  }
});

// ===================== DELETE PORTOFOLIO =====================
router.post('/delete_portofolio/:id_portofolio', (req, res) => {
  const id_portofolio = req.params.id_portofolio;
  const id_pengguna = req.session.user?.id;

  // 1. Hapus dulu dari tabel suka
  const deleteSuka = 'DELETE FROM suka WHERE id_portofolio = ?';
  db.query(deleteSuka, [id_portofolio], (err) => {
    if (err) {
      console.error('Gagal menghapus suka:', err);
      return res.status(500).send('Gagal menghapus suka terkait portofolio');
    }

    // 2. Lanjutkan hapus dari tabel portofolio
    const deletePorto = 'DELETE FROM portofolio WHERE id_portofolio = ? AND id_pengguna = ?';
    db.query(deletePorto, [id_portofolio, id_pengguna], (err) => {
      if (err) {
        console.error('Gagal menghapus portofolio:', err);
        return res.status(500).send('Gagal menghapus portofolio');
      }

      res.redirect('/profile');
    });
  });
});


// ===================== TOGGLE PIN =====================
router.post('/toggle_pin_portfolio/:id', (req, res) => {
  const portfolioId = req.params.id;
  const isPinned = req.body.isPinned;
  const userId = req.session.user?.id;

  const sql = 'UPDATE portofolio SET is_pinned = ? WHERE id_portofolio = ? AND id_pengguna = ?';
  db.query(sql, [isPinned ? 1 : 0, portfolioId, userId], (err) => {
    if (err) return res.status(500).send('Gagal update pin');
    res.status(200).send('Sukses');
  });
});

// ===================== EDIT PORTOFOLIO (KHUSUS edit_portofolio.ejs) =====================
router.get('/edit_portofolio', (req, res) => {
  const id_portofolio = req.query.id_portofolio;
  const id_pengguna = req.session.user?.id;

  const sqlPorto = 'SELECT * FROM portofolio WHERE id_portofolio = ? AND id_pengguna = ?';
  const sqlKategori = 'SELECT * FROM kategori';

  db.query(sqlPorto, [id_portofolio, id_pengguna], (err, resultPorto) => {
    if (err) return res.status(500).send('Gagal ambil data edit');
    if (resultPorto.length === 0) return res.redirect('/profile');

    db.query(sqlKategori, (errKategori, kategoriResults) => {
      if (errKategori) return res.status(500).send('Gagal ambil kategori');

      res.render('pages/edit_portofolio', {
        title: 'Edit Portofolio',
        portofolio: resultPorto[0],
        categories: kategoriResults
      });
    });
  });
});


router.post('/edit_portofolio', upload.single('gambar'), (req, res) => {
  const { judul, deskripsi, id_kategori, id_portofolio } = req.body;
  const id_pengguna = req.session.user?.id;
  const gambar = req.file ? req.file.filename : null;
  const idKategoriValue = id_kategori && !isNaN(parseInt(id_kategori)) ? parseInt(id_kategori) : null;

  const sql = `
    UPDATE portofolio 
    SET judul = ?, deskripsi = ?, id_kategori = ?, gambar = COALESCE(?, gambar)
    WHERE id_portofolio = ? AND id_pengguna = ?
  `;

  db.query(sql, [judul, deskripsi, idKategoriValue, gambar, id_portofolio, id_pengguna], (err) => {
    if (err) return res.status(500).send('Gagal simpan edit: ' + err.message);
    res.redirect('/profile');
  });
});

// ===================== LIHAT PENYUKA PORTOFOLIO =====================
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
    if (err1 || portofolioResult.length === 0) return res.status(404).send('Portofolio tidak ditemukan.');

    const portofolio = portofolioResult[0];

    db.query(getLikers, [portofolioId], (err2, likers) => {
      if (err2) return res.status(500).send('Gagal ambil penyuka');
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
