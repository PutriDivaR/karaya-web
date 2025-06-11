const express = require('express');
const session = require('express-session');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts'); // ← Tambahkan ini

const app = express();


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'karayaSecret',
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.user;
  res.locals.user = req.session.user || null;
  next();
});


// EJS dan Layout
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts); // ← Aktifkan layout
app.set('layout', 'layout'); // ← Nama file layout default, tanpa .ejs

app.use(express.static(path.join(__dirname, 'views/pages')));

// Middleware untuk cek login
const checkLogin = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // Lanjut ke rute berikutnya
  } else {
    res.redirect('/login'); // Balik ke login kalau belum login
  }
};



// Routing dasar
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');
const portofolioRoutes = require('./routes/portofolio'); 


app.use('/', authRoutes);
app.use('/', portofolioRoutes);
app.use('/', mainRoutes);

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home',  (req, res) => {
  res.render('pages/home', { title: 'Home', msg: req.query.msg, user: req.session.user });
});






app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});





