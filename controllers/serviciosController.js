const db = require('../db');
const cuentasController = require('./cuentasController');

exports.crearServicio = (req, res) => {
  const {
    fecha,
    cliente_id,
    empleados_ids,
    detalle,
    nro_factura,
    cuenta,
    metodo_pago,
    monto_facturado,
    gastos_detalle
  } = req.body;

  if (
    !fecha || !cliente_id || !empleados_ids || !empleados_ids.length ||
    !detalle || !nro_factura || !cuenta || !metodo_pago || !monto_facturado
  ) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const ingresos_brutos = parseFloat(monto_facturado) * 0.03;
  const gastos_total = parseFloat(req.body.gastos) || 0;
  const gastosHistorial = [{
    descripcion: req.body.gastos_detalle || '',
    monto: gastos_total
  }];

  const total = parseFloat(monto_facturado) - ingresos_brutos - gastos_total;

  const sql = `
    INSERT INTO servicios 
    (fecha, cliente_id, empleados, detalle, nro_factura, cuenta, metodo_pago, monto_facturado, ingresos_brutos, gastos, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    fecha,
    cliente_id,
    JSON.stringify(empleados_ids),
    detalle,
    nro_factura,
    cuenta,
    metodo_pago,
    monto_facturado,
    ingresos_brutos,
    JSON.stringify(gastosHistorial),
    total
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // Actualizar total facturado en la cuenta
    cuentasController.incrementarFacturado(cuenta, monto_facturado);

    res.json({ message: 'Servicio registrado correctamente', id: result.insertId });
  });
};

exports.listarServicios = (req, res) => {
  const sql = `
    SELECT s.*, c.nombre AS cliente_nombre
    FROM servicios s
    LEFT JOIN clientes c ON s.cliente_id = c.id
    ORDER BY s.fecha DESC
  `;

  db.query(sql, (err, servicios) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query('SELECT id, nombre FROM empleados', (err, empleados) => {
      if (err) return res.status(500).json({ error: err.message });

      const empleadosMap = {};
      empleados.forEach(e => empleadosMap[e.id] = e.nombre);

      const serviciosProcesados = servicios.map(servicio => {
        // 👨‍🔧 Empleados (ya viene como string JSON, parseamos una vez)
        let empleadosNombres = 'No asignado';
        try {
          const empleadosArray = typeof servicio.empleados === 'string'
            ? JSON.parse(servicio.empleados)
            : servicio.empleados;

          if (Array.isArray(empleadosArray)) {
            empleadosNombres = empleadosArray.map(id => empleadosMap[id] || `ID:${id}`).join(', ');
          }
        } catch {
          empleadosNombres = 'Error al parsear empleados';
        }

        // 💸 Gastos
        let gastosTotal = 0;
        let gastosDetalle = '';
        try {
          const gastosArray = typeof servicio.gastos === 'string'
            ? JSON.parse(servicio.gastos)
            : servicio.gastos;

          if (Array.isArray(gastosArray)) {
            gastosTotal = gastosArray.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
            gastosDetalle = gastosArray.map(g => `${g.descripcion}`).join('<br>');
          }
        } catch {
          gastosTotal = 0;
          gastosDetalle = 'Sin detalles';
        }

        return {
          ...servicio,
          empleados_nombres: empleadosNombres,
          total_gastos: gastosTotal,
          gastos_detalle: gastosDetalle,
          empleados_raw: servicio.empleados,  // ⬅️ para el modal
          gastos_raw: servicio.gastos         // ⬅️ para el modal
        };
      });

      res.json(serviciosProcesados);
    });
  });
};
exports.eliminarServicio = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM servicios WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Servicio eliminado' });
  });
};

exports.obtenerServicio = (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM servicios WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(results[0]);
  });
};

exports.editarServicio = (req, res) => {
  const {
    fecha,
    cliente_id,
    empleados_ids,
    detalle,
    nro_factura,
    cuenta,
    metodo_pago,
    monto_facturado,
    gastos,
    gastos_detalle
  } = req.body;
  const { id } = req.params;

  const ingresos_brutos = parseFloat(monto_facturado) * 0.03;
  const gastos_total = parseFloat(gastos) || 0;
  const gastosHistorial = [{ descripcion: gastos_detalle || '', monto: gastos_total }];
  const total = parseFloat(monto_facturado) - ingresos_brutos - gastos_total;

  // Primero obtenemos el servicio anterior
  db.query('SELECT * FROM servicios WHERE id = ?', [id], (err, resultados) => {
    if (err || resultados.length === 0) {
      return res.status(500).json({ error: 'Servicio no encontrado' });
    }

    const servicioAnterior = resultados[0];

    // Restar del total facturado anterior
    cuentasController.incrementarFacturado(servicioAnterior.cuenta, -servicioAnterior.monto_facturado);

    // Actualizar servicio
    const sql = `
      UPDATE servicios SET 
        fecha = ?, cliente_id = ?, empleados = ?, detalle = ?, nro_factura = ?, 
        cuenta = ?, metodo_pago = ?, monto_facturado = ?, ingresos_brutos = ?, 
        gastos = ?, total = ?
      WHERE id = ?
    `;

    db.query(sql, [
      fecha, cliente_id, JSON.stringify(empleados_ids), detalle, nro_factura,
      cuenta, metodo_pago, monto_facturado, ingresos_brutos,
      JSON.stringify(gastosHistorial), total, id
    ], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Sumar al total facturado nuevo
      cuentasController.incrementarFacturado(cuenta, monto_facturado);

      res.json({ message: 'Servicio actualizado correctamente' });
    });
  });
};