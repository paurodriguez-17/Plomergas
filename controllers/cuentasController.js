const db = require('../db');

// Listar todas las cuentas
exports.listarCuentas = (req, res) => {
  db.query('SELECT * FROM cuentas ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Crear nueva cuenta
exports.crearCuenta = (req, res) => {
  const { nombre, limite } = req.body;
  if (!nombre || !limite) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'INSERT INTO cuentas (nombre, limite) VALUES (?, ?)',
    [nombre, limite],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cuenta registrada', id: result.insertId });
    }
  );
};

// Editar cuenta
exports.editarCuenta = (req, res) => {
  const { id } = req.params;
  const { nombre, limite } = req.body;
  if (!nombre || !limite) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'UPDATE cuentas SET nombre = ?, limite = ? WHERE id = ?',
    [nombre, limite, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cuenta actualizada' });
    }
  );
};

// Eliminar cuenta
exports.eliminarCuenta = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM cuentas WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Cuenta eliminada' });
  });
};

// Incrementar total facturado (se usa desde módulo servicios)
exports.incrementarFacturado = (cuentaNombre, monto) => {
  db.query(
    'UPDATE cuentas SET total_facturado = total_facturado + ? WHERE nombre = ?',
    [monto, cuentaNombre],
    (err) => {
      if (err) console.error('Error al actualizar facturación de cuenta:', err.message);
    }
  );
};
