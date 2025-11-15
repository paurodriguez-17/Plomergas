// /routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { proteger, soloAdmin } = require('../middlewares/auth');

router.post('/registrar', auth.registrar);
router.post('/login', auth.login);

router.get('/pendientes', proteger, soloAdmin, auth.listarPendientes);
router.put('/aprobar/:id', proteger, soloAdmin, auth.aprobar);
router.delete('/:id', proteger, soloAdmin, auth.eliminar);

module.exports = router;
