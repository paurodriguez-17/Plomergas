const express = require('express');
const router = express.Router();

const clientesController = require('../controllers/clientesController');
const { uploadFactura, uploadConforme } = require('../middlewares/upload');

// Rutas normales
router.get('/', clientesController.getClientes);
router.post('/', clientesController.createCliente);

// Rutas de carga de archivos
router.post('/:idCliente/factura', uploadFactura, clientesController.subirFactura);
router.post('/:idCliente/conforme', uploadConforme, clientesController.subirConforme);

router.get('/:idCliente/facturas', clientesController.listarFacturas);
router.get('/:idCliente/conformes', clientesController.listarConformes);
router.put('/:id', clientesController.actualizarCliente);
router.delete('/:id', clientesController.eliminarCliente);

module.exports = router;
