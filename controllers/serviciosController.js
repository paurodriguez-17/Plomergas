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
    gastos_detalle,
    estado_pago
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
    descripcion: gastos_detalle || '',
    monto: gastos_total
  }];

  const total = parseFloat(monto_facturado) - ingresos_brutos - gastos_total;

  const sql = `
    INSERT INTO servicios 
    (fecha, cliente_id, empleados, detalle, nro_factura, cuenta, metodo_pago, monto_facturado, ingresos_brutos, gastos, total, estado_pago)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    total,
    estado_pago || 'Pendiente'
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const servicio_id = result.insertId;

    // Actualizar total facturado en la cuenta
    cuentasController.incrementarFacturado(cuenta, monto_facturado);

    // Buscar los empleados para saber quiénes cobran por porcentaje
    db.query('SELECT id, trabaja_porcentaje FROM empleados WHERE id IN (?)', [empleados_ids], (errEmp, empleados) => {
      if (errEmp) return console.error('Error consultando empleados:', errEmp.message);

      const empleadosPorcentaje = empleados.filter(e => e.trabaja_porcentaje === 1);
      const empleadosDia = empleados.filter(e => e.trabaja_porcentaje === 0);

      // Calcular cuánto le corresponde a cada uno que trabaja por porcentaje
      const totalDisponible = total * 0.5;
      const montoPorEmpleado = empleadosPorcentaje.length > 0
        ? totalDisponible / empleadosPorcentaje.length
        : 0;

      // Guardar en historial para los de porcentaje
      empleadosPorcentaje.forEach(emp => {
        const sqlHistorial = `
          INSERT INTO historial_empleado (empleado_id, servicio_id, monto_porcentaje, fecha)
          VALUES (?, ?, ?, ?)
        `;
        db.query(sqlHistorial, [emp.id, servicio_id, montoPorEmpleado, fecha], (err) => {
          if (err) console.error('Error guardando historial:', err.message);
        });
      });

      res.json({ message: 'Servicio registrado correctamente', id: servicio_id });
    });
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
    gastos_detalle,
    estado_pago
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
    const sql = `
  UPDATE servicios SET 
    fecha = ?, cliente_id = ?, empleados = ?, detalle = ?, nro_factura = ?, 
    cuenta = ?, metodo_pago = ?, monto_facturado = ?, ingresos_brutos = ?, 
    gastos = ?, total = ?, estado_pago = ?
  WHERE id = ?
`;

    db.query(sql,
      [
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
        total,
        estado_pago,  // ← ¡Este es importante!
        id
      ]
      , (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        // Sumar al total facturado nuevo
        cuentasController.incrementarFacturado(cuenta, monto_facturado);

        res.json({ message: 'Servicio actualizado correctamente' });
      });
  });
};
exports.actualizarEstadoPago = (req, res) => {
  const { id } = req.params;
  const { estado_pago } = req.body;

  if (!['Pagado', 'Pendiente'].includes(estado_pago)) {
    return res.status(400).json({ error: 'Estado de pago inválido' });
  }

  db.query('UPDATE servicios SET estado_pago = ? WHERE id = ?', [estado_pago, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Estado de pago actualizado' });
  });
};
