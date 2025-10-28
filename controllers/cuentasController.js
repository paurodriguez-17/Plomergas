const db = require('../db');

// Listar todas las cuentas
exports.listarCuentas = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cuentas ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear nueva cuenta
exports.crearCuenta = async (req, res) => {
  try {
    const { nombre, limite, cuit, clave_fiscal } = req.body;
    if (!nombre || !limite) return res.status(400).json({ error: 'Faltan datos obligatorios' });

    const [result] = await db.query(
      'INSERT INTO cuentas (nombre, limite, cuit, clave_fiscal) VALUES (?, ?, ?, ?)',
      [nombre, limite, cuit?.trim() || null, clave_fiscal?.trim() || null]
    );
    res.json({ message: 'Cuenta registrada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Editar cuenta
exports.editarCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, limite, cuit, clave_fiscal } = req.body;
    if (!nombre || !limite) return res.status(400).json({ error: 'Faltan datos obligatorios' });

    await db.query(
      'UPDATE cuentas SET nombre=?, limite=?, cuit=?, clave_fiscal=? WHERE id=?',
      [nombre, limite, cuit?.trim() || null, clave_fiscal?.trim() || null, id]
    );
    res.json({ message: 'Cuenta actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar cuenta
exports.eliminarCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM cuentas WHERE id=?', [id]);
    res.json({ message: 'Cuenta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Incrementar total facturado (para uso interno)
exports.incrementarFacturado = async (cuentaNombre, monto) => {
  try {
    await db.query(
      'UPDATE cuentas SET total_facturado = total_facturado + ? WHERE nombre = ?',
      [monto, cuentaNombre]
    );
  } catch (err) {
    console.error('Error al actualizar facturación de cuenta:', err.message);
  }
};

// Reiniciar facturación del mes
exports.reiniciarFacturacion = async (req, res) => {
  try {
    await db.query('UPDATE cuentas SET total_facturado = 0');
    res.json({ message: 'Facturación reiniciada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al reiniciar la facturación' });
  }
};
