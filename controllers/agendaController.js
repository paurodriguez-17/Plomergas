const db = require('../db');

const estadosValidos = ['Pendiente', 'En Progreso', 'Completado', 'Cancelado'];

exports.crear = (req, res) => {
  const { titulo, descripcion, ubicacion, cliente_id, empleado_id, fecha, hora, estado } = req.body;
  if (!titulo || !fecha || !hora || !empleado_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (título, fecha, hora, empleado).' });
  }
  const sql = `
    INSERT INTO agenda (titulo, descripcion, ubicacion, cliente_id, empleado_id, fecha, hora, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      titulo.trim(),
      descripcion || null,
      ubicacion || null,
      cliente_id || null,
      empleado_id,
      fecha,
      hora,
      estadosValidos.includes(estado) ? estado : 'Pendiente'
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Servicio programado', id: result.insertId });
    }
  );
};

exports.listarPorFecha = (req, res) => {
  const { fecha } = req.query;
  const params = [];
  let where = '';
  if (fecha) {
    where = 'WHERE a.fecha = ?';
    params.push(fecha);
  }
  const sql = `
    SELECT 
      a.*, 
      e.nombre AS empleado_nombre,
      c.nombre AS cliente_nombre
    FROM agenda a
    LEFT JOIN empleados e ON e.id = a.empleado_id
    LEFT JOIN clientes c ON c.id = a.cliente_id
    ${where}
    ORDER BY a.hora ASC
  `;
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.listarProximos = (req, res) => {
  const dias = parseInt(req.query.dias || '7', 10);
  const sql = `
    SELECT 
      a.*, 
      e.nombre AS empleado_nombre,
      c.nombre AS cliente_nombre
    FROM agenda a
    LEFT JOIN empleados e ON e.id = a.empleado_id
    LEFT JOIN clientes c ON c.id = a.cliente_id
    WHERE a.fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER BY a.fecha ASC, a.hora ASC
  `;
  db.query(sql, [dias], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.obtener = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      a.*, 
      e.nombre AS empleado_nombre,
      c.nombre AS cliente_nombre
    FROM agenda a
    LEFT JOIN empleados e ON e.id = a.empleado_id
    LEFT JOIN clientes c ON c.id = a.cliente_id
    WHERE a.id = ?
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  });
};

exports.editar = (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, ubicacion, cliente_id, empleado_id, fecha, hora, estado } = req.body;
  if (!titulo || !fecha || !hora || !empleado_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  const sql = `
    UPDATE agenda
    SET titulo = ?, descripcion = ?, ubicacion = ?, cliente_id = ?, empleado_id = ?, fecha = ?, hora = ?, estado = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [
      titulo.trim(),
      descripcion || null,
      ubicacion || null,
      cliente_id || null,
      empleado_id,
      fecha,
      hora,
      estadosValidos.includes(estado) ? estado : 'Pendiente',
      id
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Servicio actualizado' });
    }
  );
};

exports.actualizarEstado = (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  db.query('UPDATE agenda SET estado = ? WHERE id = ?', [estado, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Estado actualizado' });
  });
};

exports.eliminar = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM agenda WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Servicio eliminado' });
  });
};
