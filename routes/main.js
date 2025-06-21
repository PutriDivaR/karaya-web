const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== KOMENTAR ====================
router.post('/komentar/tambah', (req, res) => {
  console.log('=== COMMENT ADDITION REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Session:', req.session);
  console.log('Session user:', req.session.user);
  console.log('Session userId:', req.session.userId);
  
  const { isi_komentar, id_portofolio } = req.body;
  
  console.log('Parsed data:', { isi_komentar, id_portofolio });

  // Pastikan pengguna sudah login - gunakan struktur session yang sama dengan auth.js
  let id_pengguna = null;
  
  if (req.session.user && req.session.user.id) {
    id_pengguna = req.session.user.id;
    console.log('Using session.user.id:', id_pengguna);
  } else if (req.session.userId) {
    id_pengguna = req.session.userId;
    console.log('Using session.userId:', id_pengguna);
  }
  
  if (!id_pengguna) {
    console.log('User not authenticated');
    return res.status(401).json({ 
      success: false,
      error: 'Pengguna belum terautentikasi. Silakan login terlebih dahulu.' 
    });
  }

  console.log('User ID:', id_pengguna);

  // Validasi input
  if (!isi_komentar || !id_portofolio) {
    console.log('Missing required fields:', { isi_komentar, id_portofolio });
    return res.status(400).json({ 
      success: false,
      error: 'Komentar dan ID portofolio harus diisi.' 
    });
  }

  // Validasi tipe data
  if (typeof isi_komentar !== 'string' || isi_komentar.trim() === '') {
    console.log('Invalid comment content');
    return res.status(400).json({ 
      success: false,
      error: 'Komentar tidak boleh kosong.' 
    });
  }

  if (isNaN(parseInt(id_portofolio))) {
    console.log('Invalid portfolio ID:', id_portofolio);
    return res.status(400).json({ 
      success: false,
      error: 'ID portofolio tidak valid.' 
    });
  }

  // Query untuk menambah komentar ke database
  const query = `
    INSERT INTO komentar (id_pengguna, id_portofolio, isi_komentar, tanggal_dibuat)
    VALUES (?, ?, ?, NOW())
  `;

  const params = [parseInt(id_pengguna), parseInt(id_portofolio), isi_komentar.trim()];
  console.log('Executing query with params:', params);

  // Eksekusi query untuk menambahkan komentar ke database
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('=== DATABASE ERROR ===');
      console.error('Database error saat menambahkan komentar:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Error sqlMessage:', err.sqlMessage);
      console.error('Query params:', params);
      return res.status(500).json({ 
        success: false,
        error: 'Terjadi kesalahan saat menambahkan komentar.',
        details: err.message
      });
    }

    console.log('Comment added successfully:', result);

    // Kembalikan response sukses dengan data komentar baru
    return res.status(201).json({
      success: true,
      message: 'Komentar berhasil ditambahkan!',
      commentId: result.insertId
    });
  });
});

// Test route untuk mengecek struktur tabel
router.get('/test/komentar-structure', (req, res) => {
  const query = 'DESCRIBE komentar';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return res.status(500).json({ error: 'Error checking table structure', details: err.message });
    }
    console.log('Komentar table structure:', results);
    res.json({ structure: results });
  });
});

// Test route untuk mengecek koneksi database
router.get('/test/db-connection', (req, res) => {
  db.query('SELECT 1 as test', (err, results) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
    res.json({ success: true, message: 'Database connected', results });
  });
});

// Test route untuk mengecek dan membuat tabel komentar jika tidak ada
router.get('/test/komentar-table', (req, res) => {
  // Check if table exists
  const checkTableQuery = `
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = 'karaya_db' 
    AND table_name = 'komentar'
  `;
  
  db.query(checkTableQuery, (err, results) => {
    if (err) {
      console.error('Error checking table existence:', err);
      return res.status(500).json({ error: 'Error checking table', details: err.message });
    }
    
    if (results[0].count === 0) {
      // Table doesn't exist, create it
      const createTableQuery = `
        CREATE TABLE komentar (
          id_komentar INT AUTO_INCREMENT PRIMARY KEY,
          id_pengguna INT NOT NULL,
          id_portofolio INT NOT NULL,
          isi_komentar TEXT NOT NULL,
          tanggal_dibuat DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE,
          FOREIGN KEY (id_portofolio) REFERENCES portofolio(id_portofolio) ON DELETE CASCADE
        )
      `;
      
      db.query(createTableQuery, (createErr) => {
        if (createErr) {
          console.error('Error creating table:', createErr);
          return res.status(500).json({ error: 'Error creating table', details: createErr.message });
        }
        res.json({ message: 'Table komentar created successfully' });
      });
    } else {
      // Table exists, show structure
      const describeQuery = 'DESCRIBE komentar';
      db.query(describeQuery, (describeErr, structure) => {
        if (describeErr) {
          console.error('Error describing table:', describeErr);
          return res.status(500).json({ error: 'Error describing table', details: describeErr.message });
        }
        res.json({ message: 'Table komentar exists', structure });
      });
    }
  });
});

router.get('/komentar/lihat/:id_portofolio', (req, res) => {
  const id_portofolio = req.params.id_portofolio;
  
  // Get user ID from session - use same structure as auth.js
  let currentUserId = null;
  if (req.session.user && req.session.user.id) {
    currentUserId = req.session.user.id;
  } else if (req.session.userId) {
    currentUserId = req.session.userId;
  }

  // Validasi ID portofolio
  if (!id_portofolio) {
    return res.status(400).json({ error: 'ID portofolio tidak ditemukan.' });
  }

  // Query untuk mengambil komentar berdasarkan ID portofolio
  const query = `
    SELECT c.id_komentar, c.isi_komentar, c.tanggal_dibuat, c.id_pengguna, u.nama_pengguna
    FROM komentar c
    JOIN pengguna u ON c.id_pengguna = u.id_pengguna
    WHERE c.id_portofolio = ?
    ORDER BY c.tanggal_dibuat DESC
  `;
  
  db.query(query, [id_portofolio], (err, results) => {
    if (err) {
      console.error('Error saat mengambil komentar:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan saat mengambil komentar.' });
    }
    
    // Add ownership flag to each comment
    const commentsWithOwnership = results.map(comment => ({
      ...comment,
      isOwner: currentUserId && comment.id_pengguna === currentUserId
    }));
    
    // Jika tidak ada komentar
    if (results.length === 0) {
      return res.render('pages/komentar_lihat', {
        komentar: [],  // Kirim array kosong jika tidak ada komentar
        id_portofolio,
        msg: 'Belum ada komentar untuk portofolio ini.',
        title: "komentar" 
      });
    }

    // Jika ada komentar
    return res.render('pages/komentar_lihat', {
      komentar: commentsWithOwnership,  // Kirim hasil query komentar dengan ownership flag
      id_portofolio,      // Kirim ID portofolio untuk navigasi jika diperlukan
      msg: null,
      title: "komentar"           // Tidak ada pesan jika komentar ditemukan
    });
  });
});

// ==================== HALAMAN PROFIL LOGIN SENDIRI ====================
router.get('/profile', (req, res) => {
  // Get user ID from session - use same structure as auth.js
  let userId = null;
  if (req.session.user && req.session.user.id) {
    userId = req.session.user.id;
  } else if (req.session.userId) {
    userId = req.session.userId;
  }
  
  if (!userId) return res.redirect('/login');

  const getUserPortofolios = 'SELECT * FROM portofolio WHERE id_pengguna = ?';
  const getLikedPortofolios = `
    SELECT p.* FROM portofolio p
    JOIN suka s ON p.id_portofolio = s.id_portofolio
    WHERE s.id_pengguna = ? 
  `;
  const query = `
    SELECT p.*, u.nama_pengguna, u.bio 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_pengguna = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Gagal mengambil data portofolio user:', err);
      return res.status(500).send('Gagal mengambil data portofolio user');
    }

    db.query(getUserPortofolios, [userId], (err1, userPortofolios) => {
      if (err1) {
        console.error('Gagal mengambil data portofolio user:', err1);
        return res.status(500).send('Gagal mengambil portofolio user');
      }

      db.query(getLikedPortofolios, [userId], (err2, likedPortofolios) => {
        if (err2) {
          console.error('Gagal mengambil data suka:', err2);
          return res.status(500).send('Gagal mengambil data suka');
        }

        // Ambil data pengguna dari hasil query
        const user = results.length > 0 ? results[0] : null;

        res.render('pages/profile', {
          title: 'User  Portofolio',
          userPortofolios: results,
          user: user,
          userPortofolios: userPortofolios,
          likedPortofolios: likedPortofolios // Pass user data to the template
        });
      });
    });
  });
});

// ==================== HALAMAN PROFIL PENGGUNA LAIN ====================
router.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const getUserPortofolios = 'SELECT * FROM portofolio WHERE id_pengguna = ?';
  const getLikedPortofolios = `
    SELECT p.* FROM portofolio p
    JOIN suka s ON p.id_portofolio = s.id_portofolio
    WHERE s.id_pengguna = ?
  `;
  const query = `
    SELECT p.*, u.nama_pengguna, u.bio 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_pengguna = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).send('Gagal ambil data profil pengguna');

    db.query(getUserPortofolios, [userId], (err1, userPortofolios) => {
      if (err1) return res.status(500).send('Gagal ambil portofolio user');

      db.query(getLikedPortofolios, [userId], (err2, likedPortofolios) => {
        if (err2) return res.status(500).send('Gagal ambil like');

        const user = results.length > 0 ? results[0] : null;

        res.render('pages/profile', {
          title: 'User Portofolio',
          userPortofolios,
          likedPortofolios,
          user
        });
      });
    });
  });
});

// ==================== HALAMAN BERANDA ====================
router.get('/home', (req, res) => {
  const sql = `
    SELECT p.*, k.nama AS nama_kategori, u.nama_pengguna 
    FROM portofolio p
    LEFT JOIN kategori k ON p.id_kategori = k.id_kategori
    LEFT JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    ORDER BY p.tanggal_dibuat DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Gagal ambil data beranda');
    res.render('pages/home', { title: 'Beranda', portofolios: results });
  });
});

// ==================== DETAIL PORTOFOLIO ====================
router.get('/portofolio/:id', (req, res) => {
  const id = req.params.id;
  
  // Get user ID from session - use same structure as auth.js
  let userId = null;
  if (req.session.user && req.session.user.id) {
    userId = req.session.user.id;
  } else if (req.session.userId) {
    userId = req.session.userId;
  }
  
  const query = `
    SELECT p.*, u.nama_pengguna 
    FROM portofolio p
    JOIN pengguna u ON p.id_pengguna = u.id_pengguna
    WHERE p.id_portofolio = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Portofolio tidak ditemukan');

    const portofolio = results[0];
    
    // Convert date string to Date object for proper formatting
    if (portofolio.tanggal_dibuat) {
      portofolio.tanggal_dibuat = new Date(portofolio.tanggal_dibuat);
    }
    
    // Check if current user has liked this portofolio
    if (userId) {
      const likeQuery = 'SELECT * FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
      db.query(likeQuery, [userId, id], (likeErr, likeResults) => {
        portofolio.userLiked = likeResults.length > 0;
        res.render('pages/detail_portofolio', { title: 'Detail Portofolio', portofolio });
      });
    } else {
      portofolio.userLiked = false;
      res.render('pages/detail_portofolio', { title: 'Detail Portofolio', portofolio });
    }
  });
});

// ==================== LIKE / UNLIKE ====================
router.post('/like/:id', (req, res) => {
  const portofolioId = req.params.id;
  
  // Get user ID from session - use same structure as auth.js
  let userId = null;
  if (req.session.user && req.session.user.id) {
    userId = req.session.user.id;
  } else if (req.session.userId) {
    userId = req.session.userId;
  }

  if (!userId) return res.status(401).json({ message: 'User belum login' });

  const cekLike = 'SELECT * FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
  db.query(cekLike, [userId, portofolioId], (err, result) => {
    if (err) return res.status(500).send('Gagal cek like');

    if (result.length > 0) {
      const hapusLike = 'DELETE FROM suka WHERE id_pengguna = ? AND id_portofolio = ?';
      db.query(hapusLike, [userId, portofolioId], (err2) => {
        if (err2) return res.status(500).send('Gagal unlike');
        const kurangiLike = 'UPDATE portofolio SET jumlah_suka = jumlah_suka - 1 WHERE id_portofolio = ?';
        db.query(kurangiLike, [portofolioId], (err3) => {
          if (err3) return res.status(500).send('Gagal kurangi jumlah like');
          return res.json({ liked: false });
        });
      });
    } else {
      const tambahLike = 'INSERT INTO suka (id_pengguna, id_portofolio, tanggal_suka) VALUES (?, ?, NOW())';
      db.query(tambahLike, [userId, portofolioId], (err4) => {
        if (err4) return res.status(500).send('Gagal tambah like');
        const tambahJumlah = 'UPDATE portofolio SET jumlah_suka = jumlah_suka + 1 WHERE id_portofolio = ?';
        db.query(tambahJumlah, [portofolioId], (err5) => {
          if (err5) return res.status(500).send('Gagal tambah jumlah like');
          return res.json({ liked: true });
        });
      });
    }
  });
});

// ==================== KATEGORI & PORTOFOLIO KATEGORI ====================
router.get('/kategori', (req, res) => {
  const queryKategori = 'SELECT * FROM kategori';
  const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ?';

  db.query(queryKategori, (errKategori, kategoriResults) => {
    if (errKategori) return res.status(500).send('Gagal ambil kategori');

    const kategoriWithPortfolios = [];

    kategoriResults.forEach(category => {
      db.query(queryPortofolio, [category.id_kategori], (errPortofolio, portofolioResults) => {
        if (!errPortofolio) {
          kategoriWithPortfolios.push({
            category,
            portfolios: portofolioResults
          });
        }

        if (kategoriWithPortfolios.length === kategoriResults.length) {
          res.render('pages/kategori', {
            title: 'Daftar Kategori dan Portofolio',
            kategoriWithPortfolios
          });
        }
      });
    });
  });
});

router.get('/kategori/:id', (req, res) => {
  const categoryId = req.params.id;
  const queryPortofolio = 'SELECT * FROM portofolio WHERE id_kategori = ? AND is_draft = 0';

  db.query(queryPortofolio, [categoryId], (err, portofolioResults) => {
    if (err) return res.status(500).send('Gagal ambil portofolio');
    res.render('pages/portofolio_kategori', {
      title: 'Portofolio Kategori',
      portfolios: portofolioResults,
      categoryId
    });
  });
});

// ==================== SHARE PORTOFOLIO ====================
router.get('/share-portofolio/:id', (req, res) => {
  const portfolioId = req.params.id;

  const query = 
    'SELECT p.*, u.nama_pengguna FROM portofolio p ' +
    'JOIN pengguna u ON p.id_pengguna = u.id_pengguna ' +
    'WHERE p.id_portofolio = ?';

  db.query(query, [portfolioId], (err, results) => {
    if (err) {
      return res.status(500).send('Terjadi kesalahan mengambil data portofolio.');
    }

    if (results.length > 0) {
      const portofolio = results[0];
      res.render('pages/share_portofolio', { 
        title: 'Share Portofolio',
        portofolio 
      });
    } else {
      return res.status(404).send('Portofolio tidak ditemukan.');
    }
  });
});

// ==================== EDIT DAN HAPUS KOMENTAR ==================== //

// Route untuk edit komentar
router.put('/komentar/edit/:id_komentar', (req, res) => {
  const id_komentar = req.params.id_komentar;
  const { isi_komentar } = req.body;
  
  // Get user ID from session - handle both session structures
  let currentUserId = null;
  if (req.session.user && req.session.user.id) {
    currentUserId = req.session.user.id;
  } else if (req.session.userId) {
    currentUserId = req.session.userId;
  }

  if (!currentUserId) {
    return res.status(401).json({ error: 'Pengguna belum terautentikasi.' });
  }

  if (!isi_komentar || isi_komentar.trim() === '') {
    return res.status(400).json({ error: 'Komentar tidak boleh kosong.' });
  }

  // Check if comment exists and belongs to current user
  const checkQuery = 'SELECT * FROM komentar WHERE id_komentar = ? AND id_pengguna = ?';
  db.query(checkQuery, [id_komentar, currentUserId], (err, results) => {
    if (err) {
      console.error('Error saat mengecek komentar:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan saat mengecek komentar.' });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengedit komentar ini.' });
    }

    // Update the comment
    const updateQuery = 'UPDATE komentar SET isi_komentar = ? WHERE id_komentar = ? AND id_pengguna = ?';
    db.query(updateQuery, [isi_komentar.trim(), id_komentar, currentUserId], (updateErr) => {
      if (updateErr) {
        console.error('Error saat mengupdate komentar:', updateErr);
        return res.status(500).json({ error: 'Terjadi kesalahan saat mengupdate komentar.' });
      }

      return res.json({ 
        success: true, 
        message: 'Komentar berhasil diupdate!',
        isi_komentar: isi_komentar.trim()
      });
    });
  });
});

// Route untuk hapus komentar
router.delete('/komentar/hapus/:id_komentar', (req, res) => {
  const id_komentar = req.params.id_komentar;
  
  // Get user ID from session - handle both session structures
  let currentUserId = null;
  if (req.session.user && req.session.user.id) {
    currentUserId = req.session.user.id;
  } else if (req.session.userId) {
    currentUserId = req.session.userId;
  }

  if (!currentUserId) {
    return res.status(401).json({ error: 'Pengguna belum terautentikasi.' });
  }

  // Check if comment exists and belongs to current user
  const checkQuery = 'SELECT * FROM komentar WHERE id_komentar = ? AND id_pengguna = ?';
  db.query(checkQuery, [id_komentar, currentUserId], (err, results) => {
    if (err) {
      console.error('Error saat mengecek komentar:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan saat mengecek komentar.' });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk menghapus komentar ini.' });
    }

    // Delete the comment
    const deleteQuery = 'DELETE FROM komentar WHERE id_komentar = ? AND id_pengguna = ?';
    db.query(deleteQuery, [id_komentar, currentUserId], (deleteErr) => {
      if (deleteErr) {
        console.error('Error saat menghapus komentar:', deleteErr);
        return res.status(500).json({ error: 'Terjadi kesalahan saat menghapus komentar.' });
      }

      return res.json({ 
        success: true, 
        message: 'Komentar berhasil dihapus!' 
      });
    });
  });
});

// Test route untuk mengecek session dan authentication
router.get('/test/session', (req, res) => {
  console.log('=== SESSION TEST ===');
  console.log('Session:', req.session);
  console.log('Session user:', req.session.user);
  console.log('Session userId:', req.session.userId);
  
  let userId = null;
  if (req.session.user && req.session.user.id) {
    userId = req.session.user.id;
  } else if (req.session.userId) {
    userId = req.session.userId;
  }
  
  res.json({
    session: req.session,
    user: req.session.user,
    userId: req.session.userId,
    extractedUserId: userId,
    isAuthenticated: !!userId
  });
});

module.exports = router;
