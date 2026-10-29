const express = require('express');
const Opinion = require('../models/Opinion');

const router = express.Router();

// guardar_opinion.php (formulario "¿Necesitas ayuda?" del index; no requiere sesión)
router.post('/guardar_opinion', async (req, res, next) => {
    try {
        const nombre = String(req.body.nombre || '').trim();
        const gusto = String(req.body.gusto || '').trim();
        const mejora = String(req.body.mejora || '').trim();

        if (nombre && gusto) await Opinion.create({ nombre, gusto, mejora });

        res.redirect('/gracias.html');
    } catch (e) { next(e); }
});

module.exports = router;
