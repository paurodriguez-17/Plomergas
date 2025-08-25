const db = require('../db');
const PDFDocument = require('pdfkit');

exports.crearPresupuesto = (req, res) => {
  const { cliente_id, detalle, precio, duracion, nota } = req.body;

  if (!cliente_id || !detalle || !precio || !duracion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Guardar en DB
  const sql = 'INSERT INTO presupuestos (cliente_id, detalle, precio) VALUES (?, ?, ?)';
  db.query(sql, [cliente_id, detalle, precio], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Obtener datos del cliente
    db.query('SELECT * FROM clientes WHERE id = ?', [cliente_id], (err, results) => {
      if (err || results.length === 0) return res.status(500).json({ error: 'Cliente no encontrado' });

      const cliente = results[0];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const fecha = new Date().toLocaleDateString('es-AR');
      const precioTexto = `${precio} pesos`;

      res.setHeader('Content-Disposition', `attachment; filename=presupuesto_${cliente.nombre}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');

      // ========== ESTILO MEJORADO ==========

      // Encabezado profesional
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('PLOMERGAS', { align: 'center' });

      doc
        .font('Helvetica')
        .fontSize(10)
        .text('CONSTITUCIÓN 1255 6º “B” · CAPITAL FEDERAL · TEL. 4304-5935', { align: 'center' })
        .text('www.plomergascentro.com.ar · plomergas@hotmail.com', { align: 'center' })
        .text('www.plomer-gas.com.ar', { align: 'center' });

      doc.moveDown(1);
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .strokeColor('#aaaaaa')
        .stroke();
      doc.moveDown(1);

      // Fecha y destinatario
      doc.font('Helvetica').fontSize(11);
      doc.text(`Bs. As., ${fecha}`, { align: 'right' });
      doc.moveDown();
      doc.text(`Sr/a ${cliente.nombre}`);
      doc.text(`${cliente.direccion}`);
      doc.text('CABA');
      doc.moveDown();

      // Título
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('PRESUPUESTO', { align: 'center', underline: true });
      doc.moveDown(1.5);

      // Detalle
      doc.font('Helvetica').fontSize(11);
      doc.text('De acuerdo a lo solicitado, se cotiza el siguiente trabajo:');
      doc.moveDown(0.8);

      // Detalle del trabajo
      detalle.split('\n').forEach((linea, i) => {
        doc.text(`${i + 1}) ${linea}`);
      });

      doc.moveDown(1);

      // Mostrar nota si se ingresó
      if (nota && nota.trim() !== '') {
        doc.font('Helvetica-Bold').text('Nota:', { underline: true });
        doc.font('Helvetica').text(nota);
        doc.moveDown(1);
      }

      doc.moveDown(1);
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .strokeColor('#dddddd')
        .stroke();
      doc.moveDown(1);

      // Precio
      doc
        .font('Helvetica-Bold')
        .text(`Costo total del trabajo: $${precio} (${precioTexto})`);
      doc.moveDown();

      // Nota
      doc.font('Helvetica').text(
        'Nota: Una vez realizado el trabajo, se podrá ajustar el monto si se requiere trabajo adicional.'
      );
      doc.moveDown(1);

      // Forma de pago y duración
      doc.text('FORMA DE PAGO: Contra entrega de obra');
      doc.text(`DURACIÓN DE LA OBRA: ${duracion}`);
      doc.moveDown(2);

      // Firma
      doc.text('Atentamente,');
      doc.moveDown(1);
      doc.text('S.S.S.');
      doc.font('Helvetica-Bold').text('HUGO DAVID MARTÍNEZ');

      doc.end();
      doc.pipe(res);
    });
  });
};

exports.listarPresupuestos = (req, res) => {
  const { idCliente } = req.params;

  db.query('SELECT * FROM presupuestos WHERE cliente_id = ?', [idCliente], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};
