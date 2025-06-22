const express = require('express');
const router = express.Router();
const connection = require('../db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

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
  const infoId = req.params.id;

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
  const query = 'SELECT * FROM informasi WHERE id_informasi = ?';

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

// Halaman edit informasi
router.get('/admin/editInfo', checkAdmin, (req, res) => {
  const infoId = req.params.id;

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
  const query = 'SELECT * FROM informasi WHERE id_informasi = ?'; // Perbaiki kolom id menjadi id_informasi

  connection.query(query, [infoId], (err, result) => {
    if (err) {
      console.error('Gagal mengambil informasi:', err);
      return res.status(500).send('Pengambilan Informasi Gagal');
    }

    if (result.length === 0) {
      return res.status(404).send('Informasi tidak ditemukan');
    }

    res.render('pages/editInfoForm', {
      title: 'Form Edit Informasi',
      info: result[0]
    });
  });
});

// Menyimpan perubahan informasi
router.post('/admin/editInfo/:id', checkAdmin, (req, res) => {
  const infoId = req.params.id;
  const { infoTitle, infoContent } = req.body;

  // Query untuk memperbarui data informasi
  const query = 'UPDATE informasi SET judul = ?, isi = ? WHERE id_informasi = ?';

  connection.query(query, [infoTitle, infoContent, infoId], (err) => {
    if (err) {
      console.error('Gagal mengupdate informasi:', err);
      return res.status(500).send('Update Informasi Gagal');
    }

    // Setelah berhasil update, redirect ke halaman editInfo
    res.redirect('/admin/editInfo');
  });
});


// Halaman Tambah Informasi
router.get('/admin/tambahInfo', checkAdmin, (req, res) => {
  res.render('pages/tambahInfo', {
    title: 'Tambah Informasi Baru'
  });
});

// Menyimpan informasi baru
router.post('/admin/tambahInfo', checkAdmin, (req, res) => {
  const { infoTitle, infoContent } = req.body;
  const query = 'INSERT INTO informasi (judul, isi) VALUES (?, ?)';

  connection.query(query, [infoTitle, infoContent], (err) => {
    if (err) {
      console.error('Gagal menambahkan informasi:', err);
      return res.status(500).send('Gagal menambahkan informasi');
    }
    res.redirect('/admin/editInfo');
  });
});

router.get('/admin/info/:id', checkAdmin, (req, res) => {
  const infoId = req.params.id;
  const query = 'SELECT * FROM informasi WHERE id_informasi = ?';

  db.query(query, [infoId], (err, results) => {
    if (err) {
      console.error('Gagal mengambil data:', err);
      return res.status(500).send('Terjadi kesalahan');
    }

    if (results.length === 0) {
      return res.status(404).send('Informasi tidak ditemukan');
    }

    res.render('pages/detailInfo', {
      title: results[0].judul,
      info: results[0]
    });
  });
});

router.get('/admin/deleteInfo/:id', checkAdmin, (req, res) => {
  const infoId = req.params.id;
  const query = 'DELETE FROM informasi WHERE id_informasi = ?';

  connection.query(query, [infoId], (err) => {
    if (err) {
      console.error('Gagal menghapus informasi:', err);
      return res.status(500).send('Gagal menghapus informasi');
    }
    res.redirect('/admin/editInfo');
  });
});

router.get('/admin/downloadKategoriPdf', checkAdmin, async (req, res) => {
  const queryKategori = 'SELECT * FROM kategori';

  connection.query(queryKategori, async (err, kategoriResults) => {
    if (err) {
      console.error('Gagal mengambil data kategori:', err);
      return res.status(500).send('Gagal mengambil kategori');
    }
     if (!kategoriResults || kategoriResults.length === 0) {
    return res.status(404).send('Tidak ada kategori tersedia');
  }

    // Membuat dokumen PDF baru
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([800, 1000]);  // Ukuran halaman
    const { width, height } = page.getSize(); // Ukuran halaman
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);


    const marginTop = 80;
    const marginLeft = 50;
    const marginRight = 50;
    const tableWidth = width - marginLeft - marginRight;

    // Definisi kolom
    const colNoWidth = 60;
    const colNamaWidth = 300;
    const colDeskripsiWidth = 340;
    const rowHeight = 40;

    let currentY = height - marginTop;  // Posisi awal untuk tabel
    let currentPage = page;

    // Menambahkan judul
    const title = 'DAFTAR KATEGORI';
    const titleSize = 18;
    const titleWidth = font.widthOfTextAtSize(title, titleSize);
    currentPage.drawText(title, { 
      x: (width - titleWidth) / 2, 
      y: currentY + 30, 
      size: titleSize, 
      font: font,
      color: rgb(0, 0, 0) 
    });
    currentY -= 50;  // Pindahkan posisi setelah judul

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
      font: font,
      color: rgb(0, 0, 0),
    });
    currentPage.drawText('Nama Kategori', { 
      x: marginLeft + colNoWidth + 20, 
      y: headerY, 
      size: 12, 
      font: font,
      color: rgb(0, 0, 0),
    });
    currentPage.drawText('Deskripsi', { 
      x: marginLeft + colNoWidth + colNamaWidth + 20, 
      y: headerY, 
      size: 12, 
      font: font,
      color: rgb(0, 0, 0),
    });

    // Garis header
    drawHorizontalLine(headerY - 20);
    drawHorizontalLine(headerY + 20);

    // Garis vertikal header
    drawVerticalLine(marginLeft + colNoWidth, headerY - 20, headerY + 20);
    drawVerticalLine(marginLeft + colNoWidth + colNamaWidth, headerY - 20, headerY + 20);
    drawVerticalLine(marginLeft + colNoWidth + colNamaWidth + colDeskripsiWidth, headerY - 20, headerY + 20);

    currentY -= 60;  // Spasi setelah header

    // Menggambar baris untuk setiap kategori
    for (let i = 0; i < kategoriResults.length; i++) {
      const kategori = kategoriResults[i];

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

      // Nama kategori
      currentPage.drawText(kategori.nama, { 
        x: marginLeft + colNoWidth + 20, 
        y: currentY - 20, 
        size: 11, 
        font: font,
        color: rgb(0, 0, 0) 
      });

      // Deskripsi kategori
      const deskripsi = kategori.deskripsi.length > 50 ? kategori.deskripsi.substring(0, 50) + '...' : kategori.deskripsi;
      currentPage.drawText(deskripsi, { 
        x: marginLeft + colNoWidth + colNamaWidth + 20, 
        y: currentY - 20, 
        size: 11, 
        font: font,
        color: rgb(0, 0, 0) 
      });

      // Garis horizontal untuk setiap baris
      drawHorizontalLine(rowEndY);

      // Garis vertikal untuk setiap kolom
      drawVerticalLine(marginLeft + colNoWidth, rowStartY, rowEndY);
      drawVerticalLine(marginLeft + colNoWidth + colNamaWidth, rowStartY, rowEndY);
      drawVerticalLine(marginLeft + colNoWidth + colNamaWidth + colDeskripsiWidth, rowStartY, rowEndY);

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


// Route untuk mengunduh daftar portofolio dalam kategori ke dalam PDF
router.get('/admin/downloadPortofolioPdf/:id', checkAdmin, async (req, res) => {
  const categoryId = req.params.id;

  // Query untuk mengambil data kategori berdasarkan ID
  const queryKategori = 'SELECT * FROM kategori WHERE id_kategori = ?';
  connection.query(queryKategori, [categoryId], async (err, categoryResult) => {
    if (err || categoryResult.length === 0) {
      console.error('Gagal mengambil kategori:', err);
      return res.status(500).send('Gagal mengambil kategori');
    }

    // Query untuk mengambil semua portofolio dalam kategori
    const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ?';
    connection.query(queryPortofolio, [categoryId], async (err, portfolioResults) => {
      if (err) {
        console.error('Gagal mengambil portofolio:', err);
        return res.status(500).send('Gagal mengambil portofolio');
      }

      if (!portfolioResults || portfolioResults.length === 0) {
        return res.status(404).send('Tidak ada portofolio di kategori ini');
      }

      // Membuat dokumen PDF baru
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([800, 1000]);  // Ukuran halaman PDF
      const { width, height } = page.getSize(); // Ukuran halaman
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const marginTop = 80;
      const marginLeft = 50;
      const marginRight = 50;
      const tableWidth = width - marginLeft - marginRight;

      // Definisi kolom
      const colNoWidth = 60;
      const colJudulWidth = 300;
      const colDeskripsiWidth = 340;
      const rowHeight = 40;

      let currentY = height - marginTop;  // Posisi awal untuk tabel
      let currentPage = page;

      // Menambahkan judul
      const title = `Daftar Portofolio di Kategori: ${categoryResult[0].nama}`;
      const titleSize = 18;
      const titleWidth = font.widthOfTextAtSize(title, titleSize);
      currentPage.drawText(title, { 
        x: (width - titleWidth) / 2, 
        y: currentY + 30, 
        size: titleSize, 
        font: font,
        color: rgb(0, 0, 0) 
      });
      currentY -= 50;  // Pindahkan posisi setelah judul

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
        font: font,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText('Judul Portofolio', { 
        x: marginLeft + colNoWidth + 20, 
        y: headerY, 
        size: 12, 
        font: font,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText('Deskripsi', { 
        x: marginLeft + colNoWidth + colJudulWidth + 20, 
        y: headerY, 
        size: 12, 
        font: font,
        color: rgb(0, 0, 0),
      });

      // Garis header
      drawHorizontalLine(headerY - 20);
      drawHorizontalLine(headerY + 20);

      // Garis vertikal header
      drawVerticalLine(marginLeft + colNoWidth, headerY - 20, headerY + 20);
      drawVerticalLine(marginLeft + colNoWidth + colJudulWidth, headerY - 20, headerY + 20);
      drawVerticalLine(marginLeft + colNoWidth + colJudulWidth + colDeskripsiWidth, headerY - 20, headerY + 20);

      currentY -= 60;  // Spasi setelah header

      // Menggambar baris untuk setiap portofolio
      for (let i = 0; i < portfolioResults.length; i++) {
        const portfolio = portfolioResults[i];

        // Cek apakah perlu halaman baru
        if (currentY < 100) {
          currentPage = pdfDoc.addPage([800, 1000]);
          currentY = height - marginTop;
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

        // Judul portofolio
        currentPage.drawText(portfolio.judul, { 
          x: marginLeft + colNoWidth + 20, 
          y: currentY - 20, 
          size: 11, 
          font: font,
          color: rgb(0, 0, 0) 
        });

        // Deskripsi portofolio
        const deskripsi = portfolio.deskripsi.length > 50 ? portfolio.deskripsi.substring(0, 50) + '...' : portfolio.deskripsi;
        currentPage.drawText(deskripsi, { 
          x: marginLeft + colNoWidth + colJudulWidth + 20, 
          y: currentY - 20, 
          size: 11, 
          font: font,
          color: rgb(0, 0, 0) 
        });

        // Garis horizontal untuk setiap baris
        drawHorizontalLine(rowEndY);

        // Garis vertikal untuk setiap kolom
        drawVerticalLine(marginLeft + colNoWidth, rowStartY, rowEndY);
        drawVerticalLine(marginLeft + colNoWidth + colJudulWidth, rowStartY, rowEndY);
        drawVerticalLine(marginLeft + colNoWidth + colJudulWidth + colDeskripsiWidth, rowStartY, rowEndY);

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
});


// Halaman untuk melihat kategori beserta daftar portofolionya
router.get('/admin/lihatKategori/:id', checkAdmin, (req, res) => {
  const categoryId = req.params.id;
  
  // Query untuk mengambil kategori berdasarkan ID
  const queryKategori = 'SELECT * FROM kategori WHERE id_kategori = ?';
  connection.query(queryKategori, [categoryId], (err, categoryResult) => {
    if (err || categoryResult.length === 0) {
      console.error('Gagal mengambil kategori:', err);
      return res.status(500).send('Gagal mengambil kategori');
    }

    // Query untuk mengambil portofolio yang terkait dengan kategori tersebut
    const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ?';
    connection.query(queryPortofolio, [categoryId], (err, portfolioResults) => {
      if (err) {
        console.error('Gagal mengambil portofolio:', err);
        return res.status(500).send('Gagal mengambil portofolio');
      }

      res.render('pages/lihatKategori', {
        title: `Portofolio Kategori: ${categoryResult[0].nama}`,
        category: categoryResult[0],  // Mengirimkan data kategori
        portfolios: portfolioResults  // Mengirimkan daftar portofolio untuk kategori ini
      });
    });
  });
});

module.exports = router;
