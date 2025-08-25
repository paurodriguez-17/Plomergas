const db = require('../db');

exports.getClientes = (req, res) => {
  db.query('SELECT * FROM clientes', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.createCliente = (req, res) => {
  const { nombre, direccion, tipo, cuit, mail, telefono } = req.body;
  if (!nombre || !direccion || !tipo || !cuit || !mail) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const sql = 'INSERT INTO clientes (nombre, direccion, tipo, cuit, mail, telefono) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [nombre, direccion, tipo, cuit, mail, telefono || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Cliente creado', id: result.insertId });
  });
};
const path = require('path');

exports.subirFactura = (req, res) => {
  const { idCliente } = req.params;
  const archivo = req.file;
  if (!archivo) return res.status(400).json({ error: 'No se envió archivo' });

  const sql = 'INSERT INTO facturas (cliente_id, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)';
  db.query(sql, [idCliente, archivo.originalname, archivo.filename], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Factura subida correctamente' });
  });
};

exports.subirConforme = (req, res) => {
  const { idCliente } = req.params;
  const archivo = req.file;
  if (!archivo) return res.status(400).json({ error: 'No se envió archivo' });

  const sql = 'INSERT INTO conformes (cliente_id, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)';
  db.query(sql, [idCliente, archivo.originalname, archivo.filename], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Conforme subido correctamente' });
  });
};

exports.listarFacturas = (req, res) => {
  const { idCliente } = req.params;
  db.query('SELECT * FROM facturas WHERE cliente_id = ?', [idCliente], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.listarConformes = (req, res) => {
  const { idCliente } = req.params;
  db.query('SELECT * FROM conformes WHERE cliente_id = ?', [idCliente], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};
exports.actualizarCliente = (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, tipo, cuit, mail, telefono } = req.body;

  const sql = `UPDATE clientes SET nombre = ?, direccion = ?, tipo = ?, cuit = ?, mail = ?, telefono = ? WHERE id = ?`;
  const valores = [nombre, direccion, tipo, cuit, mail, telefono, id];

  db.query(sql, valores, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Cliente actualizado' });
  });
};
exports.eliminarCliente = async (req, res) => {
  const { id } = req.params;

  const checkRelacionadas = async (tabla) => {
    return new Promise((resolve, reject) => {
      db.query(`SELECT COUNT(*) AS total FROM ${tabla} WHERE cliente_id = ?`, [id], (err, result) => {
        if (err) reject(err);
        else resolve(result[0].total > 0);
      });
    });
  };

  try {
    const tieneFacturas = await checkRelacionadas('facturas');
    const tieneConformes = await checkRelacionadas('conformes');
    const tienePresupuestos = await checkRelacionadas('presupuestos');

    if (tieneFacturas || tieneConformes || tienePresupuestos) {
      return res.status(400).json({
        error: 'No se puede eliminar el cliente porque tiene registros asociados (facturas, conformes o presupuestos).'
      });
    }

    db.query('DELETE FROM clientes WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cliente eliminado correctamente' });
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al verificar relaciones' });
  }
};

