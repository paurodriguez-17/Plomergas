const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL, // usa Railway o tu .env local
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err);
  } else {
    console.log('🟢 Conexión MySQL establecida correctamente');
    connection.release();
  }
});

module.exports = pool.promise(); // 👈 exporta pool en modo async/await
