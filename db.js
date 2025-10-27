const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection(
  process.env.DATABASE_URL
);

connection.connect(err => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err);
    return;
  }
  console.log('🟢 Conectado correctamente a MySQL en Railway');
});

module.exports = connection;
