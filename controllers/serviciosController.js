const db = require('../db');
const cuentasController = require('./cuentasControllers');

// ===== CREAR SERVICIO =====
exports.crearServicio = async (req, res) => {
  try {
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

    const [result] = await db.query(`
      INSERT INTO servicios 
      (fecha, cliente_id, empleados, detalle, nro_factura, cuenta, metodo_pago, monto_facturado, ingresos_brutos, gastos, total, estado_pago)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);

    const servicio_id = result.insertId;
    await cuentasController.incrementarFacturado(cuenta, monto_facturado);

    const [empleados] = await db.query('SELECT id, trabaja_porcentaje FROM empleados WHERE id IN (?)', [empleados_ids]);
    const empleadosPorcentaje = empleados.filter(e => e.trabaja_porcentaje === 1);

    const totalDisponible = total * 0.5;
    const montoPorEmpleado = empleadosPorcentaje.length > 0
      ? totalDisponible / empleadosPorcentaje.length
      : 0;

    for (const emp of empleadosPorcentaje) {
      await db.query(`
        INSERT INTO historial_empleado (empleado_id, servicio_id, monto_porcentaje, fecha)
        VALUES (?, ?, ?, ?)
      `, [emp.id, servicio_id, montoPorEmpleado, fecha]);
    }

    res.json({ message: 'Servicio registrado correctamente', id: servicio_id });
  } catch (err) {
    console.error('❌ Error en crearServicio:', err);
    res.status(500).json({ error: err.message });
  }
};

// ===== LISTAR SERVICIOS =====
exports.listarServicios = async (req, res) => {
  try {
    const [servicios] = await db.query(`
      SELECT s.*, c.nombre AS cliente_nombre
      FROM servicios s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      ORDER BY s.fecha DESC
    `);

    const [empleados] = await db.query('SELECT id, nombre FROM empleados');
    const empleadosMap = {};
    empleados.forEach(e => (empleadosMap[e.id] = e.nombre));

    const serviciosProcesados = servicios.map(servicio => {
      let empleadosNombres = 'No asignado';
      try {
        const empleadosArray = JSON.parse(servicio.empleados);
        if (Array.isArray(empleadosArray)) {
          empleadosNombres = empleadosArray.map(id => empleadosMap[id] || `ID:${id}`).join(', ');
        }
      } catch {
        empleadosNombres = 'Error al parsear empleados';
      }

      let gastosTotal = 0;
      let gastosDetalle = '';
      try {
        const gastosArray = JSON.parse(servicio.gastos);
        if (Array.isArray(gastosArray)) {
          gastosTotal = gastosArray.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
          gastosDetalle = gastosArray.map(g => `${g.descripcion}`).join('<br>');
        }
      } catch {
        gastosDetalle = 'Sin detalles';
      }

      return {
        ...servicio,
        empleados_nombres: empleadosNombres,
        total_gastos: gastosTotal,
        gastos_detalle: gastosDetalle,
        empleados_raw: servicio.empleados,
        gastos_raw: servicio.gastos
      };
    });

    res.json(serviciosProcesados);
  } catch (err) {
    console.error('❌ Error en listarServicios:', err);
    res.status(500).json({ error: err.message });
  }
};

// ===== OBTENER SERVICIO =====
exports.obtenerServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM servicios WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== EDITAR SERVICIO =====
exports.editarServicio = async (req, res) => {
  try {
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

    const [[servicioAnterior]] = await db.query('SELECT * FROM servicios WHERE id = ?', [id]);
    if (!servicioAnterior) return res.status(404).json({ error: 'Servicio no encontrado' });

    const ingresos_brutos = parseFloat(monto_facturado) * 0.03;
    const gastos_total = parseFloat(gastos) || 0;
    const gastosHistorial = [{ descripcion: gastos_detalle || '', monto: gastos_total }];
    const total = parseFloat(monto_facturado) - ingresos_brutos - gastos_total;

    await cuentasController.incrementarFacturado(servicioAnterior.cuenta, -servicioAnterior.monto_facturado);

    await db.query(`
      UPDATE servicios SET 
        fecha=?, cliente_id=?, empleados=?, detalle=?, nro_factura=?, 
        cuenta=?, metodo_pago=?, monto_facturado=?, ingresos_brutos=?, 
        gastos=?, total=?, estado_pago=? 
      WHERE id=?
    `, [
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
      estado_pago,
      id
    ]);

    await cuentasController.incrementarFacturado(cuenta, monto_facturado);
    res.json({ message: 'Servicio actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error en editarServicio:', err);
    res.status(500).json({ error: err.message });
  }
};

// ===== ELIMINAR SERVICIO =====
exports.eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM servicios WHERE id = ?', [id]);
    res.json({ message: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== ACTUALIZAR ESTADO DE PAGO =====
exports.actualizarEstadoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_pago } = req.body;

    if (!['Pagado', 'Pendiente'].includes(estado_pago)) {
      return res.status(400).json({ error: 'Estado de pago inválido' });
    }

    await db.query('UPDATE servicios SET estado_pago=? WHERE id=?', [estado_pago, id]);
    res.json({ message: 'Estado de pago actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
