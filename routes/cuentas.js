const express = require('express');
const router = express.Router();
const cuentasController = require('../controllers/cuentasController');

router.get('/', cuentasController.listarCuentas);
router.post('/', cuentasController.crearCuenta);
router.put('/:id', cuentasController.editarCuenta);
router.delete('/:id', cuentasController.eliminarCuenta);
router.post('/reiniciar', cuentasController.reiniciarFacturacion);

module.exports = router;
