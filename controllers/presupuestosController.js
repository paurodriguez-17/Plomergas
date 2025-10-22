const db = require('../db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.crearPresupuesto = (req, res) => {
  const { cliente_id, detalle, precios, duracion, nota, forma_pago, firmantes } = req.body;

  if (!cliente_id || !detalle || !precios || !duracion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // 🧮 Parsear lista de precios
  const listaPrecios = precios
    .toString()
    .split(/[\n,]/)
    .map(p => parseFloat(p.trim()))
    .filter(n => !isNaN(n));

  const total = listaPrecios.reduce((acc, n) => acc + n, 0);

  // Obtener número correlativo
  db.query('SELECT MAX(id) AS ultimo FROM presupuestos', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const numeroPresupuesto = (result[0].ultimo || 0) + 1;
    const numeroFormateado = numeroPresupuesto.toString().padStart(4, '0');

    // Guardar en DB (precio → total calculado)
    const sql = 'INSERT INTO presupuestos (cliente_id, detalle, precio, duracion, nota, numero) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [cliente_id, detalle, total, duracion, nota || '', numeroFormateado], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Buscar cliente
      db.query('SELECT * FROM clientes WHERE id = ?', [cliente_id], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'Cliente no encontrado' });
        const cliente = results[0];

        const nombreArchivo = `presupuesto_${numeroFormateado}_${cliente.nombre.replace(/\s+/g, '_')}.pdf`;
        const rutaArchivo = path.join(__dirname, '../uploads/presupuestos', nombreArchivo);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const writeStream = fs.createWriteStream(rutaArchivo);
        doc.pipe(writeStream);

        const azulMarino = '#0d47a1';
        const fecha = new Date().toLocaleDateString('es-AR');

        // ===== ENCABEZADO =====
        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(azulMarino)
          .text('PLOMERGAS', { align: 'center' });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('black')
          .text('CONSTITUCIÓN 1255 6º “B” · CAPITAL FEDERAL · CEL. 1137865335', { align: 'center' })
          .text('www.plomergasargentina.com.ar', { align: 'center' })
          .text('plomergas@hotmail.com', { align: 'center' });
        doc.moveDown(0.8);
        doc
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .strokeColor(azulMarino)
          .stroke();

        // ===== INFORMACIÓN CLIENTE =====
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(11).text(`Presupuesto Nº ${numeroFormateado}`, { align: 'right' });
        doc.font('Helvetica').text(`Bs. As., ${fecha}`, { align: 'right' });
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text(`Sres. ${cliente.nombre}`);
        if (cliente.direccion) doc.font('Helvetica').text(cliente.direccion);
        doc.text('C.A.B.A');
        doc.moveDown(1.2);

        // ===== TÍTULO =====
        doc.font('Helvetica-Bold').fontSize(13).fillColor(azulMarino).text('PRESUPUESTO', { align: 'center', underline: true });
        doc.moveDown(1);
        doc.fillColor('black').font('Helvetica').fontSize(11);
        doc.text('De acuerdo a lo solicitado, cotizamos el siguiente trabajo:');
        doc.moveDown(0.5);

        // ===== DETALLE =====
        const lineas = detalle.split('\n').filter(l => l.trim() !== '');
        lineas.forEach((linea, i) => {
          doc.text(`${i + 1}) ${linea.trim()}`);
        });

        doc.moveDown(1);

        // ===== NOTA =====
        if (nota && nota.trim() !== '') {
          doc.font('Helvetica-Bold').text('Nota:');
          doc.font('Helvetica').text(nota);
          doc.moveDown(1);
        }

        // ===== COSTOS =====
        if (listaPrecios.length > 1) {
          doc.font('Helvetica-Bold').text('Detalle de costos:');
          listaPrecios.forEach((p, i) => {
            doc.font('Helvetica').text(`• Costo ${i + 1}: $${p.toLocaleString('es-AR')}`);
          });
          doc.moveDown(0.5);
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#aaaaaa').stroke();
        doc.moveDown(0.7);

        // ===== TOTAL =====
        doc
          .font('Helvetica-Bold')
          .fillColor('black')
          .text(`Costo total del trabajo: $${total.toLocaleString('es-AR')}`, { align: 'left' });
        doc.moveDown(0.5);

        // ===== FORMA DE PAGO =====
        doc.font('Helvetica-Bold').fillColor(azulMarino).text('Forma de pago:');
        doc.font('Helvetica').fillColor('black').text(forma_pago && forma_pago.trim() !== '' ? forma_pago : 'Contra entrega de obra');
        doc.moveDown(0.5);

        // ===== DURACIÓN =====
        doc.font('Helvetica-Bold').fillColor(azulMarino).text('Duración estimada:');
        doc.font('Helvetica').fillColor('black').text(duracion);
        doc.moveDown(1);

        // ===== SECCIÓN DE FIRMANTES =====
        doc.moveDown(2);

        // 🔹 "Atentamente" alineado a la derecha con azul marino
        doc.font('Helvetica-Bold')
          .fillColor(azulMarino)
          .fontSize(12)
          .text('Atentamente:', { align: 'right' });

        doc.moveDown(1.5);

        // 🔹 Firmantes alineados a la derecha en negrita negra
        const firmantesLista = firmantes
          ? firmantes.split('\n').filter(f => f.trim() !== '')
          : ['HUGO DAVID MARTÍNEZ'];

        firmantesLista.forEach((f, i) => {
          doc.font('Helvetica-Bold')
            .fillColor('black')
            .fontSize(11)
            .text(f.trim(), { align: 'right' });
        });

        doc.moveDown(2);

        // 🔹 Línea divisoria gris claro
        doc.strokeColor('#cccccc')
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();

        doc.moveDown(1.5);

        // 🔹 Texto de validez centrado con gris oscuro y espaciado elegante
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor('#444444')
          .text(
            'Presupuesto válido por 7 días.',
            { align: 'center', lineGap: 2 }
          );

        doc.moveDown(0.5);

        // 🔹 Línea final sutil
        doc.strokeColor('#dddddd')
          .moveTo(150, doc.y)
          .lineTo(450, doc.y)
          .stroke();

        doc.end();

        writeStream.on('finish', () => {
          db.query(
            'UPDATE presupuestos SET nombre_archivo = ? WHERE cliente_id = ? AND numero = ?',
            [nombreArchivo, cliente_id, numeroFormateado],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.download(rutaArchivo);
            }
          );
        });
      });
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
