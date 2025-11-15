// /middlewares/auth.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || "supersecreto123";

exports.proteger = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No autorizado" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token faltante" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
};

exports.soloAdmin = (req, res, next) => {
  if (req.user.rol !== "administrador")
    return res.status(403).json({ error: "Acceso solo para administradores" });
  next();
};
