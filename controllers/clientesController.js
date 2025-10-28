const db = require('../db');
const path = require('path');

exports.getClientes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clientes');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCliente = async (req, res) => {
  try {
    const { nombre, direccion, tipo, cuit, mail, telefono } = req.body;
    if (!nombre || !direccion || !tipo || !cuit || !mail)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const [result] = await db.query(
      'INSERT INTO clientes (nombre, direccion, tipo, cuit, mail, telefono) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, direccion, tipo, cuit, mail, telefono || null]
    );
    res.json({ message: 'Cliente creado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.subirFactura = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const archivo = req.file;
    if (!archivo) return res.status(400).json({ error: 'No se envió archivo' });

    await db.query('INSERT INTO facturas (cliente_id, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)', [
      idCliente, archivo.originalname, archivo.filename
    ]);
    res.json({ message: 'Factura subida correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.subirConforme = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const archivo = req.file;
    if (!archivo) return res.status(400).json({ error: 'No se envió archivo' });

    await db.query('INSERT INTO conformes (cliente_id, nombre_archivo, ruta_archivo) VALUES (?, ?, ?)', [
      idCliente, archivo.originalname, archivo.filename
    ]);
    res.json({ message: 'Conforme subido correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarFacturas = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const [rows] = await db.query('SELECT * FROM facturas WHERE cliente_id = ?', [idCliente]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarConformes = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const [rows] = await db.query('SELECT * FROM conformes WHERE cliente_id = ?', [idCliente]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, tipo, cuit, mail, telefono } = req.body;

    await db.query(
      'UPDATE clientes SET nombre=?, direccion=?, tipo=?, cuit=?, mail=?, telefono=? WHERE id=?',
      [nombre, direccion, tipo, cuit, mail, telefono, id]
    );
    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const tablas = ['facturas', 'conformes', 'presupuestos'];
    for (const tabla of tablas) {
      const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${tabla} WHERE cliente_id=?`, [id]);
      if (total > 0) {
        return res.status(400).json({ error: `No se puede eliminar el cliente, tiene registros en ${tabla}` });
      }
    }

    await db.query('DELETE FROM clientes WHERE id=?', [id]);
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
