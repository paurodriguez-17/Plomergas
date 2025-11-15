// /controllers/authController.js
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || "supersecreto123";

exports.registrar = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)`,
      [nombre, email, hash]
    );

    res.json({ message: "Usuario registrado. Debe ser aprobado por el administrador." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);

    if (!rows.length) return res.status(400).json({ error: "Usuario no encontrado" });

    const user = rows[0];

    if (user.estado !== "activo")
      return res.status(403).json({ error: "Tu cuenta aún no fue aprobada" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      SECRET,
      { expiresIn: "2d" }
    );

    res.json({
      message: "OK",
      token,
      usuario: { id: user.id, nombre: user.nombre, rol: user.rol }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarPendientes = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE estado = 'pendiente'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.aprobar = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE usuarios SET estado='activo' WHERE id=?", [id]);
    res.json({ message: "Usuario aprobado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM usuarios WHERE id=?", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
