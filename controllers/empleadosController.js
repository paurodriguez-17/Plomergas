const db = require('../db');

// ===== Listar empleados =====
exports.listarEmpleados = async (req, res) => {
  try {
    const [empleados] = await db.query('SELECT * FROM empleados ORDER BY id DESC');

    const empleadosFinal = await Promise.all(
      empleados.map(async (emp) => {
        if (emp.trabaja_porcentaje === 1) {
          const lunes = new Date(emp.semana_actual);
          const domingo = new Date(lunes);
          domingo.setDate(lunes.getDate() + 6);

          const desde = emp.semana_actual;
          const hasta = domingo.toISOString().split('T')[0];

          const [[{ total }]] = await db.query(
            `SELECT SUM(monto_porcentaje) AS total
             FROM historial_empleado
             WHERE empleado_id = ? AND fecha BETWEEN ? AND ?`,
            [emp.id, desde, hasta]
          );

          const bruto = parseFloat(total) || 0;
          const neto = bruto - emp.adelanto_semanal;

          return { ...emp, total_porcentaje: neto > 0 ? neto : 0 };
        } else {
          return emp;
        }
      })
    );

    res.json(empleadosFinal);
  } catch (err) {
    console.error('Error en listarEmpleados:', err);
    res.status(500).json({ error: 'Error en la base de datos' });
  }
};

// ===== Crear empleado =====
exports.crearEmpleado = async (req, res) => {
  try {
    const { nombre, telefono, sueldo_diario, trabaja_porcentaje } = req.body;
    if (!nombre || !sueldo_diario)
      return res.status(400).json({ error: 'Nombre y sueldo diario son obligatorios' });

    const semanaActual = getInicioSemana();
    const sql = `INSERT INTO empleados
    (nombre, telefono, sueldo_diario, dias_trabajados, adelanto_semanal, semana_actual, historial, trabaja_porcentaje)
    VALUES (?, ?, ?, 0, 0, ?, ?, ?)`;

    const [result] = await db.query(sql, [
      nombre,
      telefono,
      sueldo_diario,
      semanaActual,
      '[]',
      trabaja_porcentaje ? 1 : 0,
    ]);

    res.json({ message: 'Empleado registrado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function getInicioSemana() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diferencia = dia === 0 ? 6 : dia - 1;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diferencia);
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().split('T')[0];
}

// ===== Marcar asistencia =====
exports.marcarAsistencia = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE empleados SET dias_trabajados = dias_trabajados + 1 WHERE id = ?', [id]);
    res.json({ message: 'Asistencia registrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== Registrar adelanto =====
exports.registrarAdelanto = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto } = req.body;

    if (!monto || isNaN(monto)) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    await db.query('UPDATE empleados SET adelanto_semanal = adelanto_semanal + ? WHERE id = ?', [
      monto,
      id,
    ]);

    res.json({ message: 'Adelanto registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== Cerrar semana =====
exports.cerrarSemana = async (req, res) => {
  try {
    const { id } = req.params;
    const [[emp]] = await db.query('SELECT * FROM empleados WHERE id = ?', [id]);

    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });

    const lunes = new Date(emp.semana_actual);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const semana = `${lunes.getDate()}/${lunes.getMonth() + 1}/${lunes.getFullYear()} al ${domingo.getDate()}/${domingo.getMonth() + 1}/${domingo.getFullYear()}`;
    const semanaNueva = getInicioSemana();

    let historial = [];
    try {
      historial = JSON.parse(emp.historial || '[]');
    } catch { }

    // 🔹 Empleado por porcentaje
    if (emp.trabaja_porcentaje === 1) {
      const desde = emp.semana_actual;
      const hasta = domingo.toISOString().split('T')[0];

      const [[{ total_ganado }]] = await db.query(
        `SELECT SUM(monto_porcentaje) AS total_ganado FROM historial_empleado WHERE empleado_id = ? AND fecha BETWEEN ? AND ?`,
        [id, desde, hasta]
      );

      const total_pagado = (parseFloat(total_ganado) || 0) - emp.adelanto_semanal;
      const nuevoHistorial = {
        semana,
        dias: 0,
        adelantos: emp.adelanto_semanal,
        total_pagado: Number(total_pagado.toFixed(2)),
      };

      historial.push(nuevoHistorial);

      await db.query(
        'UPDATE empleados SET historial = ?, semana_actual = ?, adelanto_semanal = 0 WHERE id = ?',
        [JSON.stringify(historial), semanaNueva, id]
      );

      await db.query(
        'DELETE FROM historial_empleado WHERE empleado_id = ? AND fecha BETWEEN ? AND ?',
        [id, desde, hasta]
      );

      res.json({ message: 'Semana cerrada correctamente', total_pagado });
    }

    // 🔹 Empleado por día
    else {
      const total_pagado = emp.dias_trabajados * emp.sueldo_diario - emp.adelanto_semanal;
      const nuevoHistorial = {
        semana,
        dias: emp.dias_trabajados,
        sueldo: emp.sueldo_diario,
        adelantos: emp.adelanto_semanal,
        total_pagado,
      };

      historial.push(nuevoHistorial);

      await db.query(
        `UPDATE empleados
         SET dias_trabajados=0, adelanto_semanal=0, semana_actual=?, historial=?
         WHERE id=?`,
        [semanaNueva, JSON.stringify(historial), id]
      );

      res.json({ message: 'Semana cerrada correctamente', total_pagado });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== Editar empleado =====
exports.editarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, sueldo_diario } = req.body;

    if (!nombre || !sueldo_diario) {
      return res.status(400).json({ error: 'Nombre y sueldo son obligatorios' });
    }

    await db.query('UPDATE empleados SET nombre=?, telefono=?, sueldo_diario=? WHERE id=?', [
      nombre,
      telefono,
      sueldo_diario,
      id,
    ]);

    res.json({ message: 'Empleado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== Eliminar empleado =====
exports.eliminarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM empleados WHERE id = ?', [id]);
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
