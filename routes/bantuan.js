// routes/bantuan.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('pusatBantuan');
});

module.exports = router;
