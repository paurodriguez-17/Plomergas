const express = require('express');
const router = express.Router();
const presupuestosController = require('../controllers/presupuestosController');

// Ruta para generar PDF
router.post('/', presupuestosController.crearPresupuesto);

// Ruta para listar presupuestos de un cliente
router.get('/:idCliente', presupuestosController.listarPresupuestos); // ← SIN PARÉNTESIS

module.exports = router;
