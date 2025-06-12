const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('kelProfil');
});

module.exports = router;
