const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // ganti sesuai
  database: 'karaya_db' 
});
connection.connect(err => {
  if (err) throw err;
  console.log('Database connected!');
});


module.exports = connection;
