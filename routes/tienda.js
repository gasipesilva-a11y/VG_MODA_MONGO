const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Apartado = require('../models/Apartado');
const { requireLogin } = require('../middleware/auth');
const { isId, escapeRegex } = require('../config/utils');

const router = express.Router();
// La protección solo aplica a las rutas de la tienda
router.use(['/productos', '/guardar_apartado', '/mis_apartados', '/eliminar_apartado', '/perfil'], requireLogin);

/* ========== PRODUCTOS (productos.php) ========== */

router.get('/productos', async (req, res, next) => {
    try {
        let filtro = {};

        if (typeof req.query.buscar === 'string') {
            // Buscador: nombre_producto LIKE %texto%
            filtro = { nombre_producto: new RegExp(escapeRegex(req.query.buscar), 'i') };
        } else if (typeof req.query.categoria === 'string') {
            // Filtro por categoría
            filtro = { id_categoria: parseInt(req.query.categoria, 10) || 0 };
        }

        const lista = await Producto.find(filtro).sort({ _id: 1 }).lean();

        const productos = lista.map(p => ({
            id_producto: String(p._id),
            nombre_producto: p.nombre_producto,
            precio: p.precio,
            stock: p.stock,
            imagen: p.imagen
        }));

        res.render('productos', { productos, sesion: req.session });
    } catch (e) { next(e); }
});

/* ========== APARTAR (guardar_apartado.php) ========== */

router.post('/guardar_apartado', async (req, res, next) => {
    try {
        const id = req.body.id_producto;
        if (!isId(id)) return res.redirect('/productos');

        // Resta 1 al stock solo si todavía hay existencias (operación atómica)
        const producto = await Producto.findOneAndUpdate(
            { _id: id, stock: { $gt: 0 } },
            { $inc: { stock: -1 } }
        );
        if (!producto) return res.redirect('/productos');   // sin stock

        await Apartado.create({
            cliente: req.session.uid,
            producto: producto._id,
            estado: 'Pendiente'
        });

        res.redirect('/mis_apartados');
    } catch (e) { next(e); }
});

/* ========== MIS APARTADOS (mis_apartados.php) ========== */

router.get('/mis_apartados', async (req, res, next) => {
    try {
        const lista = await Apartado.find({ cliente: req.session.uid })
            .populate('producto')
            .sort({ _id: 1 })
            .lean();

        const apartados = lista
            .filter(a => a.producto)
            .map(a => ({
                id_apartado: String(a._id),
                nombre_producto: a.producto.nombre_producto,
                precio: a.producto.precio,
                imagen: a.producto.imagen,
                estado: a.estado
            }));

        res.render('mis_apartados', { apartados });
    } catch (e) { next(e); }
});

/* ========== ELIMINAR APARTADO (eliminar_apartado.php) ========== */

router.get('/eliminar_apartado', async (req, res, next) => {
    try {
        const id = req.query.id;
        if (isId(id)) {
            // Solo puede eliminar sus propios apartados
            const apartado = await Apartado.findOneAndDelete({ _id: id, cliente: req.session.uid });
            // Si seguía pendiente, el producto vuelve al inventario
            if (apartado && apartado.estado === 'Pendiente') {
                await Producto.updateOne({ _id: apartado.producto }, { $inc: { stock: 1 } });
            }
        }
        res.redirect('/mis_apartados');
    } catch (e) { next(e); }
});

/* ========== PERFIL (perfil.php) ========== */

router.get('/perfil', async (req, res, next) => {
    try {
        const datos = await Usuario.findById(req.session.uid).lean();
        if (!datos) return res.redirect('/cerrar_sesion');
        res.render('perfil', { datos, mensaje: '' });
    } catch (e) { next(e); }
});

router.post('/perfil', async (req, res, next) => {
    try {
        const actual = await Usuario.findById(req.session.uid);
        if (!actual) return res.redirect('/cerrar_sesion');

        const nombre   = String(req.body.nombre || '').trim();
        const correo   = String(req.body.correo || '').trim();
        const telefono = String(req.body.telefono || '').trim();
        const usuario  = String(req.body.usuario || '').trim();
        const clave    = String(req.body.password || '');

        let mensaje;
        try {
            if (!nombre || !correo || !telefono || !usuario || !clave) throw new Error('vacio');

            actual.nombre_completo = nombre;
            actual.email = correo;
            actual.telefono = telefono;
            actual.usuario = usuario;
            actual.password = await bcrypt.hash(clave, 10);
            await actual.save();

            req.session.cliente = actual.usuario;
            mensaje = 'Datos actualizados correctamente';
        } catch (err) {
            mensaje = 'Error al actualizar';
        }

        const datos = await Usuario.findById(req.session.uid).lean();
        res.render('perfil', { datos, mensaje });
    } catch (e) { next(e); }
});

module.exports = router;
