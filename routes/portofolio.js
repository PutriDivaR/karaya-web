const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');



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

// Endpoint untuk generate PDF dengan watermark
router.get('/generate-pdf/:id_portofolio', async (req, res) => {
  const idPortofolio = req.params.id_portofolio;

  // Ambil data portofolio dari database
  const query = 'SELECT * FROM portofolio WHERE id_portofolio = ?';
  db.query(query, [idPortofolio], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(500).send('Gagal mengambil data portofolio');
    }

    const portofolio = result[0];
    const pdfDoc = await PDFDocument.create();

    // Menambahkan halaman baru
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    // Menambahkan gambar portofolio terlebih dahulu
    if (portofolio.gambar) {
      const imagePath = path.join(__dirname, '..', 'public', 'uploads', portofolio.gambar);
      
      try {
        const imageBytes = fs.readFileSync(imagePath);

        let image;
        // Cek jenis file gambar dan memuatnya dengan benar
        if (portofolio.gambar.endsWith('.png')) {
          image = await pdfDoc.embedPng(imageBytes); // Gunakan embedPng untuk PNG
        } else if (portofolio.gambar.endsWith('.jpg') || portofolio.gambar.endsWith('.jpeg')) {
          image = await pdfDoc.embedJpg(imageBytes); // Gunakan embedJpg untuk JPEG
        } else {
          throw new Error('Format gambar tidak didukung.');
        }

        const { width: imgWidth, height: imgHeight } = image.scale(0.5); // Sesuaikan ukuran gambar
        page.drawImage(image, { x: 15, y: height - 150 - imgHeight, width: imgWidth, height: imgHeight });

        // Menambahkan watermark hanya pada gambar
        const watermarkText = 'KARAYA';
        const watermarkRows = 5;  // Menyesuaikan jumlah baris watermark
        const watermarkCols = 6;  // Menyesuaikan jumlah kolom watermark

        const imgX = 15; // Posisi X gambar
        const imgY = height - 150 - imgHeight; // Posisi Y gambar

        // Menambahkan watermark yang miring (rotasi) hanya pada gambar
        for (let row = 0; row < watermarkRows; row++) {
          for (let col = 0; col < watermarkCols; col++) {
            const x = imgX + (imgWidth / watermarkCols) * col + 20; // Posisi X watermark di gambar
            const y = imgY + (imgHeight / watermarkRows) * row + 20; // Posisi Y watermark di gambar

            page.drawText(watermarkText, {
              x: x,
              y: y,
              size: 10,  // Ukuran font lebih besar agar terlihat jelas
              opacity: 0.2,  // Meningkatkan visibilitas watermark
              angle: 45,    // Rotasi watermark agar miring
              color: rgb(0.3, 0.3, 0.3),  // Warna watermark lebih gelap (abu-abu)
            });
          }
        }

      } catch (imageError) {
        return res.status(500).send('Gagal memuat gambar: ' + imageError.message);
      }
    }

    // Menambahkan teks judul dan deskripsi
    page.drawText(portofolio.judul, {
      x: 15,
      y: height - 60,
      size: 18,
      color: rgb(0, 0, 0)
    });

    page.drawText(portofolio.deskripsi, {
      x: 15,
      y: height - 80,
      size: 12,
      color: rgb(0, 0, 0)
    });

    // Simpan file PDF dan kirim sebagai respon
    const pdfBytes = await pdfDoc.save();
    res.contentType('application/pdf');
    res.send(pdfBytes);
  });
});

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
      INSERT INTO portofolio (id_pengguna, judul, deskripsi, id_kategori, jumlah_suka, gambar, tanggal_dibuat, is_draft, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 0)
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
// Route ini dipindahkan ke main.js untuk menghindari konflik

// Route untuk mengarsipkan portofolio
router.post('/archive_portofolio/:id', (req, res) => {
  const id_portofolio = req.params.id;
  const id_pengguna = req.session.user?.id;

  const sql = 'UPDATE portofolio SET is_archived = 1 WHERE id_portofolio = ? AND id_pengguna = ?';
  db.query(sql, [id_portofolio, id_pengguna], (err) => {
    if (err) {
      console.error('Gagal mengarsipkan portofolio:', err);
      return res.status(500).send('Gagal mengarsipkan portofolio');
    }
    res.redirect('/profile'); // Redirect kembali ke halaman profil setelah arsip berhasil
  });
});

// ===================== UN-ARSIP PORTOFOLIO =====================
router.post('/unarchive_portofolio/:id', (req, res) => {
  const id_portofolio = req.params.id;
  const id_pengguna = req.session.user?.id;

  const sql = 'UPDATE portofolio SET is_archived = 0 WHERE id_portofolio = ? AND id_pengguna = ?';
  db.query(sql, [id_portofolio, id_pengguna], (err) => {
    if (err) {
      console.error('Gagal un-arsipkan portofolio:', err);
      return res.status(500).send('Gagal un-arsipkan portofolio');
    }
    res.redirect('/profile'); // Redirect kembali ke halaman profil setelah un-arsip berhasil
  });
});



module.exports = router;
