const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');


router.post('/', empleadosController.crearEmpleado);
router.get('/', empleadosController.listarEmpleados);
router.put('/:id/asistencia', empleadosController.marcarAsistencia);
router.put('/:id/adelanto', empleadosController.registrarAdelanto);
router.post('/:id/cierre', empleadosController.cerrarSemana);
router.put('/:id', empleadosController.editarEmpleado);
router.delete('/:id', empleadosController.eliminarEmpleado);

module.exports = router;