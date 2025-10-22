const db = require('../db');

exports.crearEmpleado = (req, res) => {
  const { nombre, telefono, sueldo_diario, trabaja_porcentaje } = req.body;
  if (!nombre || !sueldo_diario) {
    return res.status(400).json({ error: 'Nombre y sueldo diario son obligatorios' });
  }
  const semanaActual = getInicioSemana();
  const sql = `INSERT INTO empleados
(nombre, telefono, sueldo_diario, dias_trabajados, adelanto_semanal, semana_actual, historial, trabaja_porcentaje)
VALUES (?, ?, ?, 0, 0, ?, ?, ?)`;
  db.query(sql, [nombre, telefono, sueldo_diario, semanaActual, '[]', trabaja_porcentaje ? 1 : 0], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Empleado registrado', id: result.insertId });
  });
};
exports.listarEmpleados = (req, res) => {
  const empleadosSql = 'SELECT * FROM empleados ORDER BY id DESC';
  db.query(empleadosSql, async (err, empleados) => {
    if (err) return res.status(500).json({ error: err.message });

    const empleadosFinal = await Promise.all(empleados.map(async emp => {
      if (emp.trabaja_porcentaje === 1) {
        const lunes = new Date(emp.semana_actual);
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);

        const desde = emp.semana_actual;
        const hasta = domingo.toISOString().split('T')[0];

        const sql = `
          SELECT SUM(monto_porcentaje) AS total
          FROM historial_empleado
          WHERE empleado_id = ? AND fecha BETWEEN ? AND ?
        `;

        const total = await new Promise(resolve => {
          db.query(sql, [emp.id, desde, hasta], (err2, rows) => {
            if (err2) resolve(0);
            const bruto = parseFloat(rows?.[0]?.total) || 0;
            const neto = bruto - emp.adelanto_semanal;
            resolve(neto > 0 ? neto : 0);
          });
        });

        return {
          ...emp,
          total_porcentaje: total
        };
      } else {
        return emp; // para empleados por día no se modifica nada
      }
    }));

    res.json(empleadosFinal);
  });
};
function getInicioSemana() {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  const diferencia = dia === 0 ? 6 : dia - 1; // si es domingo, ir 6 días atrás
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diferencia);
  lunes.setHours(0, 0, 0, 0); // limpiar hora
  return lunes.toISOString().split('T')[0];
}
// Marcar asistencia (sumar día trabajado)
exports.marcarAsistencia = (req, res) => {
  const { id } = req.params;

  const sql = `UPDATE empleados SET dias_trabajados = dias_trabajados + 1 WHERE id = ?`;
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Asistencia registrada' });
  });
};
// Registrar adelanto
exports.registrarAdelanto = (req, res) => {
  const { id } = req.params;
  const { monto } = req.body;

  if (!monto || isNaN(monto)) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  const sql = `UPDATE empleados SET adelanto_semanal = adelanto_semanal + ? WHERE id = ?`;
  db.query(sql, [monto, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Adelanto registrado' });
  });
};
exports.cerrarSemana = (req, res) => {
  const { id } = req.params;

  const sqlGet = 'SELECT * FROM empleados WHERE id = ?';
  db.query(sqlGet, [id], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: 'Empleado no encontrado' });

    const emp = results[0];
    const lunes = new Date(emp.semana_actual);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const semana = `${lunes.getDate()}/${lunes.getMonth() + 1}/${lunes.getFullYear()} al ${domingo.getDate()}/${domingo.getMonth() + 1}/${domingo.getFullYear()}`;
    const semanaNueva = getInicioSemana();

    // 🟡 Empleado que cobra por porcentaje
    if (emp.trabaja_porcentaje === 1) {
      const desde = emp.semana_actual;
      const hasta = domingo.toISOString().split('T')[0];

      const sqlHistorial = `
        SELECT SUM(monto_porcentaje) AS total_ganado
        FROM historial_empleado
        WHERE empleado_id = ? AND fecha BETWEEN ? AND ?
      `;

      db.query(sqlHistorial, [id, desde, hasta], (errHist, resultHist) => {
        if (errHist) return res.status(500).json({ error: errHist.message });

        const total_ganado = parseFloat(resultHist?.[0]?.total_ganado) || 0;
        const total_pagado = total_ganado - emp.adelanto_semanal;

        const nuevoHistorial = {
          semana,
          dias: 0,
          adelantos: emp.adelanto_semanal,
          total_pagado: Number(total_pagado.toFixed(2))
        };

        let historial = [];
        try {
          historial = JSON.parse(emp.historial || '[]');
        } catch { }

        historial.push(nuevoHistorial);

        const sqlUpdate = `
          UPDATE empleados
          SET historial = ?, semana_actual = ?, adelanto_semanal = 0
          WHERE id = ?
        `;

        db.query(sqlUpdate, [JSON.stringify(historial), semanaNueva, id], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          db.query(
            'DELETE FROM historial_empleado WHERE empleado_id = ? AND fecha BETWEEN ? AND ?',
            [id, desde, hasta],
            () => {
              res.json({ message: 'Semana cerrada correctamente', total_pagado });
            }
          );
        });
      });
    }

    // 🟢 Empleado que cobra por día (sin cambios)
    else {
      const total_pagado = emp.dias_trabajados * emp.sueldo_diario - emp.adelanto_semanal;

      const nuevoHistorial = {
        semana,
        dias: emp.dias_trabajados,
        sueldo: emp.sueldo_diario,
        adelantos: emp.adelanto_semanal,
        total_pagado
      };

      let historial = [];
      try {
        historial = JSON.parse(emp.historial || '[]');
      } catch { }

      historial.push(nuevoHistorial);

      const sqlUpdate = `
        UPDATE empleados
        SET dias_trabajados = 0,
            adelanto_semanal = 0,
            semana_actual = ?,
            historial = ?
        WHERE id = ?
      `;

      db.query(sqlUpdate, [semanaNueva, JSON.stringify(historial), id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Semana cerrada correctamente', total_pagado });
      });
    }
  });
};

exports.editarEmpleado = (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, sueldo_diario } = req.body;

  if (!nombre || !sueldo_diario) {
    return res.status(400).json({ error: 'Nombre y sueldo son obligatorios' });
  }

  const sql = `UPDATE empleados SET nombre = ?, telefono = ?, sueldo_diario = ? WHERE id = ?`;
  db.query(sql, [nombre, telefono, sueldo_diario, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Empleado actualizado' });
  });
};

exports.eliminarEmpleado = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM empleados WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Empleado eliminado correctamente' });
  });
};
