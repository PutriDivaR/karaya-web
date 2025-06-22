const express = require('express');
const router = express.Router();
const db = require('../db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan!'));
    }
  }
});

// Tampilkan form login
router.get('/login', (req, res) => {
  const msg = req.query.msg === 'register_success' ? 'Registrasi berhasil. Silakan login!' : null;
  res.render('pages/login', { title: 'Login', errors: {}, email: '', msg});
});

// Tangani form login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM pengguna WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Error saat query login:', err);
      return res.render('pages/login', {
        title: 'Login',
        errors: { general: 'Kesalahan server' },
        email,
        msg: null // ← Tambahkan ini
      });
    }

    if (results.length === 0) {
      return res.render('pages/login', {
        title: 'Login',
        errors: { email: 'User tidak ditemukan' },
        email,
        msg: null // ← Tambahkan ini
      });
    }

    const user = results[0];
    if (user.kata_sandi !== password) {
      return res.render('pages/login', {
        title: 'Login',
        errors: { password: 'Password salah' },
        email,
        msg: null // ← Tambahkan ini
      });
    }

req.session.user = {
  id: user.id_pengguna,
  name: user.nama_pengguna,
  email: user.email,
  role: user.peran
};

req.session.userId = user.id_pengguna;

    // Login sukses → redirect
   if (user.peran === 'admin') {
      return res.redirect('/admin');
    } else {
      return res.redirect('/home');
    }
  });
});



// Tampilkan form registrasi
router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Register', errors: {}, old: {} });
});

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  const errors = {};
  const old = { username, email };

  // Validasi domain email
  if (!email.endsWith('@student.unand.ac.id')) {
    errors.email = 'Gunakan email student.unand.ac.id';
    return res.render('pages/register', { title: 'Register', errors, old });
  }

  // Cek apakah email sudah digunakan
  const cekEmailSql = 'SELECT * FROM pengguna WHERE email = ?';
  db.query(cekEmailSql, [email], (err, results) => {
    if (err) {
      console.error(err);
      errors.email = 'Kesalahan server saat cek email.';
      return res.render('pages/register', { title: 'Register', errors, old });
    }

    if (results.length > 0) {
      errors.email = 'Email sudah terdaftar.';
      return res.render('pages/register', { title: 'Register', errors, old });
    }

    // Insert user
    const sql = 'INSERT INTO pengguna (nama_pengguna, email, kata_sandi, bio, foto_profil, peran, tanggal_dibuat) VALUES (?, ?, ?, ?, ?, ?, NOW())';
    const values = [username, email, password, '', '', 'pengguna'];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Gagal insert ke database:', err);
        errors.global = 'Gagal menyimpan data.';
        return res.render('pages/register', { title: 'Register', errors, old });
      }

      // Jika berhasil, redirect ke login dengan pesan
      return res.redirect('/login?msg=register_success');
    });
  });
});

//router logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/home'); // kembali ke beranda sebagai tamu
  });
});

router.get('/get-papan', (req, res) => {
    console.log("SESSION ISI:", req.session);
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).send("Belum login");

  const query = 'SELECT id_papan, nama_papan, gambar FROM papan WHERE id_pengguna = ? AND is_archived = 0';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Query error (get-papan):", err);
      return res.status(500).send("Gagal ambil papan");
    }
    res.json(results);
  });
});

router.post('/simpan-ke-papan', (req, res) => {
  const { id_papan, id_portofolio } = req.body;
  const userId = req.session.user?.id;

  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const checkQuery = `SELECT * FROM favorit WHERE id_papan = ? AND id_portofolio = ?`;
  db.query(checkQuery, [id_papan, id_portofolio], (err, results) => {
    if (err) {
      console.error('Gagal cek duplikat:', err);
      return res.status(500).json({ success: false });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Portofolio sudah ada di papan ini' });
    }

    const insertQuery = `INSERT INTO favorit (id_papan, id_portofolio) VALUES (?, ?)`;
    db.query(insertQuery, [id_papan, id_portofolio], (err2, result) => {
      if (err2) {
        console.error('Gagal menyimpan:', err2);
        return res.status(500).json({ success: false });
      }

      res.json({ success: true });
    });
  });
});



router.get('/portofolio_papan/:id_papan', (req, res) => {
  const idPapan = req.params.id_papan;

  const sqlPapan = 'SELECT * FROM papan WHERE id_papan = ?';
  db.query(sqlPapan, [idPapan], (err, papanResult) => {
    if (err) {
      console.error('Gagal mengambil data papan:', err);
      return res.status(500).send('Gagal mengambil data papan');
    }

    const sqlPortofolio = `
      SELECT p.*
      FROM portofolio p
      JOIN favorit d ON p.id_portofolio = d.id_portofolio
      WHERE d.id_papan = ?
    `;

    db.query(sqlPortofolio, [idPapan], (err, portofolioResult) => {
      if (err) {
        console.error('Gagal mengambil data portofolio:', err);
        return res.status(500).send('Gagal mengambil data portofolio');
      }

      res.render('pages/portofolio_papan', {
        title: 'Portofolio di Papan',
        papan: papanResult[0],
        portofolios: portofolioResult,
        msg: req.query.msg
      });
    });
  });
});

router.post('/hapus-dari-papan', (req, res) => {
  const { id_papan, id_portofolio } = req.body;

  const userId = req.session.user?.id;
  if (!userId) return res.status(401).send('Unauthorized');

  const query = `
    DELETE FROM favorit
    WHERE id_papan = ? AND id_portofolio = ?
  `;

  db.query(query, [id_papan, id_portofolio], (err, result) => {
    if (err) {
      console.error('Gagal menghapus dari papan:', err);
      return res.status(500).send('Gagal menghapus dari papan');
    }

    // Redirect ke halaman papan lagi setelah hapus
    res.redirect(`/portofolio_papan/${id_papan}?msg=hapus`);
  });
});




router.get('/kalender', (req, res) => {
  const userId = req.session.user.id; // langsung ambil karena pasti sudah login

  const query = `
    SELECT id_portofolio, judul, tanggal_dibuat 
    FROM portofolio 
    WHERE id_pengguna = ? 
    ORDER BY tanggal_dibuat DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Gagal mengambil data");
    }

    const formatted = results.map(item => ({
      id_portofolio: item.id_portofolio,
      judul: item.judul,
      tanggal_dibuat: item.tanggal_dibuat,
      tanggalFormatted: item.tanggal_dibuat.toISOString().split('T')[0]
    }));

    res.render('pages/kalender', {
      title: 'Kalender',
      uploads: formatted
    });
  });
});

router.get('/bantuan', (req, res) => {
  const query = 'SELECT id_informasi, judul FROM informasi';

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Terjadi kesalahan saat mengambil data.');
    }

    res.render('pages/pusatBantuan', {
  title: 'Pusat Bantuan',
  informasiList: results
 });
  });
});

router.get('/bantuan/:id', (req, res) => {
  const infoId = req.params.id;
  const query = 'SELECT * FROM informasi WHERE id_informasi = ?';

  db.query(query, [infoId], (err, results) => {
    if (err) {
      console.error('Gagal mengambil data informasi:', err);
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

router.get('/bantuan/:id/download', async (req, res) => {
  const infoId = req.params.id;
  const query = 'SELECT * FROM informasi WHERE id_informasi = ?';

  db.query(query, [infoId], async (err, results) => {
    if (err) {
      console.error('Gagal mengambil data informasi:', err);
      return res.status(500).send('Terjadi kesalahan');
    }

    if (results.length === 0) {
      return res.status(404).send('Informasi tidak ditemukan');
    }
    
    try {
        const info = results[0];
        const safeTitle = info.judul.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeTitle}.pdf`;

        // Buat dokumen PDF baru
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Tambahkan judul
        page.drawText(info.judul, {
            x: 50,
            y: height - 50,
            font: titleFont,
            size: 24,
            color: rgb(0, 0, 0),
        });

        // Tambahkan isi
        page.drawText(info.isi || '', {
            x: 50,
            y: height - 100,
            font: font,
            size: 12,
            color: rgb(0, 0, 0),
            maxWidth: width - 100,
            lineHeight: 15
        });

        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        res.send(Buffer.from(pdfBytes));

    } catch (pdfErr) {
        console.error('Gagal membuat PDF:', pdfErr);
        return res.status(500).send('Gagal membuat PDF');
    }
  });
});

// Tampilkan form edit profil
router.get('/edit-profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const userId = req.session.user.id;
  const sql = 'SELECT * FROM pengguna WHERE id_pengguna = ?';
  
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error saat mengambil data user:', err);
      return res.status(500).send('Terjadi kesalahan server');
    }

    if (results.length === 0) {
      return res.status(404).send('User tidak ditemukan');
    }

    const user = results[0];
    
    // Parse contact information from platform_kontak and info_kontak
    let linkedin = '', whatsapp = '', twitter = '';
    
    if (user.platform_kontak && user.info_kontak) {
      const platforms = user.platform_kontak.split(',');
      const infos = user.info_kontak.split(',');
      
      platforms.forEach((platform, index) => {
        const cleanPlatform = platform.trim().toLowerCase();
        const info = infos[index] ? infos[index].trim() : '';
        
        if (cleanPlatform === 'linkedin') {
          linkedin = info;
        } else if (cleanPlatform === 'whatsapp') {
          whatsapp = info;
        } else if (cleanPlatform === 'twitter') {
          twitter = info;
        }
      });
    }

    res.render('pages/editProfile', {
      title: 'Edit Profil',
      user: {
        ...user,
        linkedin,
        whatsapp,
        twitter
      },
      errors: {},
      msg: null
    });
  });
});

// Tangani form edit profil
router.post('/edit-profile', upload.single('foto_profil'), (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const userId = req.session.user.id;
  const { 
    nama_pengguna, 
    bio, 
    current_password, 
    new_password, 
    confirm_password,
    linkedin,
    whatsapp,
    twitter
  } = req.body;

  const errors = {};
  let updateFields = [];
  let updateValues = [];

  // Validasi nama pengguna
  if (!nama_pengguna || nama_pengguna.trim().length < 3) {
    errors.nama_pengguna = 'Nama pengguna minimal 3 karakter';
  } else {
    updateFields.push('nama_pengguna = ?');
    updateValues.push(nama_pengguna.trim());
  }

  // Validasi bio
  if (bio && bio.length > 500) {
    errors.bio = 'Bio maksimal 500 karakter';
  } else {
    updateFields.push('bio = ?');
    updateValues.push(bio || '');
  }

  // Validasi password jika diisi
  if (current_password || new_password || confirm_password) {
    if (!current_password) {
      errors.current_password = 'Masukkan kata sandi saat ini';
    } else if (!new_password) {
      errors.new_password = 'Masukkan kata sandi baru';
    } else if (new_password.length < 6) {
      errors.new_password = 'Kata sandi minimal 6 karakter';
    } else if (new_password !== confirm_password) {
      errors.confirm_password = 'Konfirmasi kata sandi tidak cocok';
    }
  }

  // Validasi contact information
  if (linkedin && !linkedin.startsWith('https://')) {
    errors.linkedin = 'URL LinkedIn harus dimulai dengan https://';
  }
  
  if (whatsapp && !whatsapp.match(/^\+?[0-9]{10,15}$/)) {
    errors.whatsapp = 'Format nomor WhatsApp tidak valid';
  }
  
  if (twitter && !twitter.startsWith('https://')) {
    errors.twitter = 'URL Twitter harus dimulai dengan https://';
  }

  // Jika ada error, tampilkan form lagi
  if (Object.keys(errors).length > 0) {
    return res.render('pages/editProfile', {
      title: 'Edit Profil',
      user: {
        ...req.session.user,
        nama_pengguna,
        bio,
        linkedin,
        whatsapp,
        twitter
      },
      errors,
      msg: null
    });
  }

  // Proses update password jika diisi
  if (current_password && new_password) {
    // Cek password saat ini
    const checkPasswordSql = 'SELECT kata_sandi FROM pengguna WHERE id_pengguna = ?';
    db.query(checkPasswordSql, [userId], (err, results) => {
      if (err) {
        console.error('Error cek password:', err);
        return res.render('pages/editProfile', {
          title: 'Edit Profil',
          user: req.session.user,
          errors: { current_password: 'Terjadi kesalahan server' },
          msg: null
        });
      }

      if (results[0].kata_sandi !== current_password) {
        return res.render('pages/editProfile', {
          title: 'Edit Profil',
          user: req.session.user,
          errors: { current_password: 'Kata sandi saat ini salah' },
          msg: null
        });
      }

      // Password benar, lanjutkan update
      updateFields.push('kata_sandi = ?');
      updateValues.push(new_password);
      
      processUpdate();
    });
  } else {
    processUpdate();
  }

  function processUpdate() {
    // Proses foto profil jika diupload
    if (req.file) {
      updateFields.push('foto_profil = ?');
      updateValues.push(req.file.filename);
    }

    // Proses contact information
    const platforms = [];
    const infos = [];
    
    if (linkedin) {
      platforms.push('linkedin');
      infos.push(linkedin);
    }
    if (whatsapp) {
      platforms.push('whatsapp');
      infos.push(whatsapp);
    }
    if (twitter) {
      platforms.push('twitter');
      infos.push(twitter);
    }

    updateFields.push('platform_kontak = ?');
    updateFields.push('info_kontak = ?');
    updateValues.push(platforms.join(','));
    updateValues.push(infos.join(','));

    // Update database
    updateValues.push(userId);
    const updateSql = `UPDATE pengguna SET ${updateFields.join(', ')} WHERE id_pengguna = ?`;
    
    db.query(updateSql, updateValues, (err, result) => {
      if (err) {
        console.error('Error update profil:', err);
        return res.render('pages/editProfile', {
          title: 'Edit Profil',
          user: req.session.user,
          errors: { global: 'Gagal menyimpan perubahan' },
          msg: null
        });
      }

      // Update session
      req.session.user.name = nama_pengguna;
      
      res.redirect('/profile?msg=profile_updated');
    });
  }
});

// ==================== Generate Profile PDF ====================
router.get('/download-profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const userId = req.session.user.id;
  const sql = 'SELECT * FROM pengguna WHERE id_pengguna = ?';
  
  db.query(sql, [userId], async (err, results) => {
    if (err) {
      console.error('Error saat mengambil data user:', err);
      return res.status(500).send('Terjadi kesalahan server');
    }

    if (results.length === 0) {
      return res.status(404).send('User tidak ditemukan');
    }

    const user = results[0];
    
    // Parse contact information
    let linkedin = '', whatsapp = '', twitter = '';
    
    if (user.platform_kontak && user.info_kontak) {
      const platforms = user.platform_kontak.split(',');
      const infos = user.info_kontak.split(',');
      
      platforms.forEach((platform, index) => {
        const cleanPlatform = platform.trim().toLowerCase();
        const info = infos[index] ? infos[index].trim() : '';
        
        if (cleanPlatform === 'linkedin') {
          linkedin = info;
        } else if (cleanPlatform === 'whatsapp') {
          whatsapp = info;
        } else if (cleanPlatform === 'twitter') {
          twitter = info;
        }
      });
    }

    try {
      // Buat dokumen PDF baru
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Header dengan background
      page.drawRectangle({
        x: 0,
        y: height - 120,
        width: width,
        height: 120,
        color: rgb(0.537, 0.431, 0.290), // #896E4A
      });

      // Judul
      page.drawText('PROFIL PENGGUNA KARAYA', {
        x: 50,
        y: height - 60,
        font: titleFont,
        size: 24,
        color: rgb(1, 1, 1),
      });

      // Informasi dasar
      let yPosition = height - 180;
      
      // Nama Pengguna
      page.drawText('Nama Pengguna:', {
        x: 50,
        y: yPosition,
        font: boldFont,
        size: 14,
        color: rgb(0, 0, 0),
      });
      page.drawText(user.nama_pengguna, {
        x: 200,
        y: yPosition,
        font: font,
        size: 14,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      // Email
      page.drawText('Email:', {
        x: 50,
        y: yPosition,
        font: boldFont,
        size: 14,
        color: rgb(0, 0, 0),
      });
      page.drawText(user.email, {
        x: 200,
        y: yPosition,
        font: font,
        size: 14,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      // Bio
      if (user.bio) {
        page.drawText('Bio:', {
          x: 50,
          y: yPosition,
          font: boldFont,
          size: 14,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        // Split bio into multiple lines if too long
        const bioLines = [];
        const words = user.bio.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          if ((currentLine + ' ' + word).length < 60) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            bioLines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) bioLines.push(currentLine);
        
        bioLines.forEach(line => {
          page.drawText(line, {
            x: 50,
            y: yPosition,
            font: font,
            size: 12,
            color: rgb(0, 0, 0),
          });
          yPosition -= 20;
        });
        yPosition -= 10;
      }

      // Informasi Kontak
      page.drawText('Informasi Kontak:', {
        x: 50,
        y: yPosition,
        font: boldFont,
        size: 16,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      if (linkedin) {
        page.drawText('LinkedIn:', {
          x: 50,
          y: yPosition,
          font: boldFont,
          size: 12,
          color: rgb(0, 0, 0),
        });
        page.drawText(linkedin, {
          x: 200,
          y: yPosition,
          font: font,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      }

      if (whatsapp) {
        page.drawText('WhatsApp:', {
          x: 50,
          y: yPosition,
          font: boldFont,
          size: 12,
          color: rgb(0, 0, 0),
        });
        page.drawText(whatsapp, {
          x: 200,
          y: yPosition,
          font: font,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      }

      if (twitter) {
        page.drawText('Twitter:', {
          x: 50,
          y: yPosition,
          font: boldFont,
          size: 12,
          color: rgb(0, 0, 0),
        });
        page.drawText(twitter, {
          x: 200,
          y: yPosition,
          font: font,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      }

      // Footer
      page.drawText(`Dibuat pada: ${new Date().toLocaleDateString('id-ID')}`, {
        x: 50,
        y: 50,
        font: font,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="profil_${user.nama_pengguna.replace(/[^a-z0-9]/gi, '_')}.pdf"`);

      res.send(Buffer.from(pdfBytes));

    } catch (pdfErr) {
      console.error('Gagal membuat PDF:', pdfErr);
      return res.status(500).send('Gagal membuat PDF');
    }
  });
});

module.exports = router;
