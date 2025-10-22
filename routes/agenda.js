const express = require('express');
const router = express.Router();
const agenda = require('../controllers/agendaController');

router.post('/', agenda.crear);
router.get('/', agenda.listarPorFecha);              // ?fecha=YYYY-MM-DD (opcional)
router.get('/proximos', agenda.listarProximos);      // ?dias=7
router.get('/:id', agenda.obtener);
router.put('/:id', agenda.editar);
router.put('/:id/estado', agenda.actualizarEstado);
router.delete('/:id', agenda.eliminar);

module.exports = router;
