const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/serviciosController');

router.post('/', serviciosController.crearServicio);
router.get('/', serviciosController.listarServicios);
router.delete('/:id', serviciosController.eliminarServicio);
router.get('/:id', serviciosController.obtenerServicio);
router.put('/:id', serviciosController.editarServicio);
router.put('/:id/estado', serviciosController.actualizarEstadoPago);

module.exports = router;
