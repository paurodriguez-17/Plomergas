const db = require('../db');
const estadosValidos = ['Pendiente', 'En Progreso', 'Completado', 'Cancelado'];

// Crear servicio en agenda
exports.crear = async (req, res) => {
  try {
    const { titulo, descripcion, ubicacion, cliente_id, empleado_id, fecha, hora, estado } = req.body;
    if (!titulo || !fecha || !hora || !empleado_id)
      return res.status(400).json({ error: 'Faltan campos obligatorios (título, fecha, hora, empleado).' });

    const sql = `
      INSERT INTO agenda (titulo, descripcion, ubicacion, cliente_id, empleado_id, fecha, hora, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [
      titulo.trim(),
      descripcion || null,
      ubicacion || null,
      cliente_id || null,
      empleado_id,
      fecha,
      hora,
      estadosValidos.includes(estado) ? estado : 'Pendiente'
    ]);
    res.json({ message: 'Servicio programado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar por fecha
exports.listarPorFecha = async (req, res) => {
  try {
    const { fecha } = req.query;
    const where = fecha ? 'WHERE a.fecha = ?' : '';
    const params = fecha ? [fecha] : [];

    const sql = `
      SELECT a.*, e.nombre AS empleado_nombre, c.nombre AS cliente_nombre
      FROM agenda a
      LEFT JOIN empleados e ON e.id = a.empleado_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      ${where}
      ORDER BY a.hora ASC
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar próximos
exports.listarProximos = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias || '7', 10);
    const sql = `
      SELECT a.*, e.nombre AS empleado_nombre, c.nombre AS cliente_nombre
      FROM agenda a
      LEFT JOIN empleados e ON e.id = a.empleado_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      WHERE a.fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY a.fecha ASC, a.hora ASC
    `;
    const [rows] = await db.query(sql, [dias]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener por ID
exports.obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT a.*, e.nombre AS empleado_nombre, c.nombre AS cliente_nombre
      FROM agenda a
      LEFT JOIN empleados e ON e.id = a.empleado_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      WHERE a.id = ?
    `, [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Editar
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, ubicacion, cliente_id, empleado_id, fecha, hora, estado } = req.body;
    if (!titulo || !fecha || !hora || !empleado_id)
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });

    const sql = `
      UPDATE agenda
      SET titulo=?, descripcion=?, ubicacion=?, cliente_id=?, empleado_id=?, fecha=?, hora=?, estado=?
      WHERE id=?
    `;
    await db.query(sql, [
      titulo.trim(),
      descripcion || null,
      ubicacion || null,
      cliente_id || null,
      empleado_id,
      fecha,
      hora,
      estadosValidos.includes(estado) ? estado : 'Pendiente',
      id
    ]);
    res.json({ message: 'Servicio actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar estado
exports.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });

    await db.query('UPDATE agenda SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM agenda WHERE id = ?', [id]);
    res.json({ message: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
