const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

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
  // Hapus dulu dari favorit
  db.query('DELETE FROM favorit WHERE id_papan = ?', [id], (err, result) => {
    if (err) {
      console.error('Gagal menghapus data favorit:', err);
      return res.status(500).send('Gagal menghapus data favorit');
    }
    // Setelah itu baru hapus dari papan
    db.query('DELETE FROM papan WHERE id_papan = ?', [id], (err, result) => {
      if (err) {
        console.error('Gagal menghapus data papan:', err);
        return res.status(500).send('Gagal menghapus data papan');
      }
      res.redirect('/favorit');
    });
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

// Route untuk generate PDF papan favorit dengan tabel
router.get('/generate-pdf-favorit', async (req, res) => {
  const userId = req.session.user?.id;  // Mengambil ID pengguna dari session

  // Cek apakah ID pengguna ada
  if (!userId) {
    return res.status(400).send('User tidak ditemukan atau belum login');
  }

  // Query untuk mengambil gambar dan nama papan dari tabel papan
  const query = 'SELECT nama_papan, gambar FROM papan WHERE id_pengguna = ? AND is_archived = 0'; // Mengambil data papan yang belum diarsipkan
  db.query(query, [userId], async (err, papanResults) => {
    if (err) {
      console.error("Error executing query:", err);  // Log error query
      return res.status(500).send('Gagal mengambil data papan favorit');
    }

    if (papanResults.length === 0) {
      return res.status(404).send('Tidak ada papan favorit ditemukan');
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([800, 1000]);  // Set ukuran halaman PDF yang lebih besar
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Menentukan posisi dan ukuran tabel
    const marginTop = 80;
    const marginLeft = 50;
    const marginRight = 50;
    const tableWidth = width - marginLeft - marginRight;
    
    // Definisi kolom
    const colNoWidth = 60;
    const colNamaWidth = 300;
    const colGambarWidth = 340;
    const rowHeight = 220;  // Tinggi baris yang lebih besar untuk gambar
    
    let currentY = height - marginTop;
    let currentPage = page;

    // Menambahkan judul
    const title = 'DAFTAR PAPAN FAVORIT';
    const titleSize = 18;
    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
    currentPage.drawText(title, { 
      x: (width - titleWidth) / 2, 
      y: currentY + 30, 
      size: titleSize, 
      font: boldFont,
      color: rgb(0, 0, 0) 
    });
    currentY -= 50;

    // Fungsi untuk menggambar garis horizontal
    const drawHorizontalLine = (y) => {
      currentPage.drawLine({
        start: { x: marginLeft, y: y },
        end: { x: width - marginRight, y: y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    };

    // Fungsi untuk menggambar garis vertikal
    const drawVerticalLine = (x, startY, endY) => {
      currentPage.drawLine({
        start: { x: x, y: startY },
        end: { x: x, y: endY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    };

    // Fungsi untuk membuat halaman baru
    const createNewPage = () => {
      currentPage = pdfDoc.addPage([800, 1000]);
      currentY = height - marginTop;
      return currentPage;
    };

    // Menambahkan header tabel
    const headerY = currentY;
    
    // Background header (opsional)
    currentPage.drawRectangle({
      x: marginLeft,
      y: headerY - 20,
      width: tableWidth,
      height: 40,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Header text
    currentPage.drawText('No', { 
      x: marginLeft + 20, 
      y: headerY, 
      size: 12, 
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    currentPage.drawText('Nama Papan', { 
      x: marginLeft + colNoWidth + 20, 
      y: headerY, 
      size: 12, 
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    currentPage.drawText('Gambar', { 
      x: marginLeft + colNoWidth + colNamaWidth + 20, 
      y: headerY, 
      size: 12, 
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Garis header
    drawHorizontalLine(headerY - 20);
    drawHorizontalLine(headerY + 20);
    
    // Garis vertikal header
    drawVerticalLine(marginLeft + colNoWidth, headerY - 20, headerY + 20);
    drawVerticalLine(marginLeft + colNoWidth + colNamaWidth, headerY - 20, headerY + 20);
    drawVerticalLine(marginLeft + colNoWidth + colNamaWidth + colGambarWidth, headerY - 20, headerY + 20);

    currentY -= 60; // Spasi setelah header

    // Menggambar baris untuk setiap papan
    for (let i = 0; i < papanResults.length; i++) {
      const papan = papanResults[i];

      // Cek apakah perlu halaman baru
      if (currentY < 100) {
        createNewPage();
      }

      const rowStartY = currentY;
      const rowEndY = currentY - rowHeight;

      // Background baris (opsional - bergantian)
      if (i % 2 === 0) {
        currentPage.drawRectangle({
          x: marginLeft,
          y: rowEndY,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.95, 0.95, 0.95),
        });
      }

      // Nomor urut
      currentPage.drawText((i + 1).toString(), { 
        x: marginLeft + 20, 
        y: currentY - 20, 
        size: 11, 
        font: font,
        color: rgb(0, 0, 0) 
      });

      // Nama papan (dengan word wrapping sederhana)
      const namaPapan = papan.nama_papan;
      const maxCharsPerLine = 35;
      let displayText = namaPapan;
      if (namaPapan.length > maxCharsPerLine) {
        displayText = namaPapan.substring(0, maxCharsPerLine) + '...';
      }
      currentPage.drawText(displayText, { 
        x: marginLeft + colNoWidth + 20, 
        y: currentY - 20, 
        size: 11, 
        font: font,
        color: rgb(0, 0, 0) 
      });

      // Menambahkan gambar papan jika ada
      if (papan.gambar) {
        const imagePath = path.join(__dirname, '..', 'public', 'uploads', papan.gambar);
        try {
          const imageBytes = fs.readFileSync(imagePath);
          let image;
          if (papan.gambar.endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (papan.gambar.endsWith('.jpg') || papan.gambar.endsWith('.jpeg')) {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            throw new Error('Format gambar tidak didukung');
          }

          // Menggambar gambar pada PDF dengan ukuran yang konsisten
          const imgSize = 200; // Ukuran gambar yang konsisten
          const imgX = marginLeft + colNoWidth + colNamaWidth + (colGambarWidth - imgSize) / 2;
          const imgY = currentY - rowHeight + (rowHeight - imgSize) / 2;
          
          currentPage.drawImage(image, { 
            x: imgX, 
            y: imgY, 
            width: imgSize, 
            height: imgSize 
          });
        } catch (imageError) {
          console.error("Error loading image:", imageError);
          // Jika gambar gagal dimuat, tampilkan teks placeholder
          currentPage.drawText('Gambar tidak tersedia', { 
            x: marginLeft + colNoWidth + colNamaWidth + 20, 
            y: currentY - 20, 
            size: 9, 
            font: font,
            color: rgb(0.5, 0.5, 0.5) 
          });
        }
      }

      // Garis horizontal untuk setiap baris
      drawHorizontalLine(rowEndY);
      
      // Garis vertikal untuk setiap kolom
      drawVerticalLine(marginLeft + colNoWidth, rowStartY, rowEndY);
      drawVerticalLine(marginLeft + colNoWidth + colNamaWidth, rowStartY, rowEndY);
      drawVerticalLine(marginLeft + colNoWidth + colNamaWidth + colGambarWidth, rowStartY, rowEndY);

      currentY -= rowHeight + 5; // Spasi antar baris
    }

    // Garis penutup tabel
    drawHorizontalLine(currentY + 5);

    // Simpan file PDF dan kirim sebagai respon
    const pdfBytes = await pdfDoc.save();
    res.contentType('application/pdf');
    res.send(pdfBytes);
  });
});

// Route untuk menampilkan halaman pindah papan
router.get('/pindah-papan/:id_portofolio', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.redirect('/login');
    }
    const id_portofolio = req.params.id_portofolio;
    const from_papan = req.query.from_papan;
    const user_id = req.session.user.id;

    const portfolioSql = 'SELECT * FROM portofolio WHERE id_portofolio = ?';
    db.query(portfolioSql, [id_portofolio], (err, portfolioResult) => {
        if (err) {
            console.error('Error fetching portfolio:', err);
            return res.status(500).send('Database error saat mengambil portofolio.');
        }
        if (portfolioResult.length === 0) {
            return res.status(404).send('Portofolio tidak ditemukan.');
        }
        const portofolio = portfolioResult[0];

        const papanSql = 'SELECT id_papan, nama_papan FROM papan WHERE id_pengguna = ?';
        db.query(papanSql, [user_id], (err, papanResult) => {
            if (err) {
                console.error('Error fetching boards:', err);
                return res.status(500).send('Database error saat mengambil papan.');
            }
            res.render('pages/pindah_papan', {
                title: 'Pindah Papan',
                portofolio: portofolio,
                papanList: papanResult,
                from_papan: from_papan
            });
        });
    });
});

// Route untuk memproses pemindahan portofolio ke papan lain
router.post('/pindah-papan-action', (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.redirect('/login');
    }
    const { id_portofolio, from_papan, to_papan } = req.body;

    if (!id_portofolio || !from_papan || !to_papan) {
        return res.status(400).send('Data tidak lengkap.');
    }

    if (from_papan === to_papan) {
        return res.redirect('/favorit');
    }

    const sql = 'UPDATE favorit SET id_papan = ? WHERE id_portofolio = ? AND id_papan = ?';
    db.query(sql, [to_papan, id_portofolio, from_papan], (err, result) => {
        if (err) {
            console.error('Error moving portfolio:', err);
            return res.status(500).send('Database error saat memindahkan portofolio.');
        }
        res.redirect('/favorit');
    });
});

module.exports = router;
