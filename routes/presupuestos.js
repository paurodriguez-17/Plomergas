const express = require('express');
const router = express.Router();
const path = require('path'); // ✅ IMPORTANTE
const presupuestosController = require('../controllers/presupuestosController');

router.post('/', presupuestosController.crearPresupuesto);
router.get('/:idCliente', presupuestosController.listarPresupuestos);

// ✅ Nueva ruta para descargar archivos
router.get('/descargar/:archivo', (req, res) => {
    const file = req.params.archivo;
    const filePath = path.join(__dirname, '../uploads/presupuestos', file);
    res.download(filePath);
});

module.exports = router;
