const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'Coco1406.',
  database: process.env.MYSQLDATABASE || 'plomergas',
  port: process.env.MYSQLPORT || 3306
});

db.connect(err => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err);
  } else {
    console.log('🟢 Conectado a la base de datos MySQL');
  }
});

module.exports = db;
