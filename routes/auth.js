const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

const router = express.Router();

/* ========== LOGIN (login.php) ========== */

router.get('/login', (req, res) => {
    if (req.session.cliente) return res.redirect('/productos');
    res.render('login', { error: null });
});

router.post('/login', async (req, res, next) => {
    try {
        const usuario = String(req.body.usuario || '').trim();
        const password = String(req.body.password || '');

        const datos = await Usuario.findOne({ usuario });
        if (!datos) return res.render('login', { error: 'Usuario no encontrado' });

        // Los hash $2y$ que generó PHP (password_hash) son compatibles con bcryptjs
        const ok = await bcrypt.compare(password, datos.password);
        if (!ok) return res.render('login', { error: 'Contraseña incorrecta' });

        // Nueva sesión al iniciar (evita fijación de sesión)
        req.session.regenerate((err) => {
            if (err) return next(err);
            req.session.cliente = datos.usuario;
            req.session.rol = datos.rol;
            req.session.uid = String(datos._id);
            req.session.save((err2) => {
                if (err2) return next(err2);
                res.redirect('/productos');
            });
        });
    } catch (e) { next(e); }
});

/* ========== REGISTRO (registro.php) ========== */

router.get('/registro', (req, res) => {
    res.render('registro', { error: null });
});

router.post('/registro', async (req, res, next) => {
    try {
        const nombre   = String(req.body.nombre || '').trim();
        const email    = String(req.body.email || '').trim();
        const telefono = String(req.body.telefono || '').trim();
        const usuario  = String(req.body.usuario || '').trim();
        const password = String(req.body.password || '');

        if (!nombre || !email || !telefono || !usuario || !password) {
            return res.render('registro', { error: 'Debes completar todos los campos.' });
        }

        const existe = await Usuario.findOne({ usuario });
        if (existe) return res.render('registro', { error: 'Ese nombre de usuario ya está registrado.' });

        await Usuario.create({
            nombre_completo: nombre,
            email,
            telefono,
            usuario,
            password: await bcrypt.hash(password, 10),
            rol: 'cliente'
        });

        res.redirect('/login');
    } catch (e) {
        if (e.name === 'ValidationError') return res.render('registro', { error: 'Revisa los datos ingresados.' });
        if (e.code === 11000) return res.render('registro', { error: 'Ese nombre de usuario ya está registrado.' });
        next(e);
    }
});

/* ========== CERRAR SESIÓN (cerrar_sesion.php) ========== */

router.get('/cerrar_sesion', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('vgmoda.sid');
        res.redirect('/login');
    });
});

module.exports = router;
