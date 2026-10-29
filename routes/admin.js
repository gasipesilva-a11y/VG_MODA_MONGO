const express = require('express');
const path = require('path');
const multer = require('multer');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Apartado = require('../models/Apartado');
const Imagen = require('../models/Imagen');
const CATEGORIAS = require('../config/categorias');
const { requireAdmin } = require('../middleware/auth');
const { isId, fmtFecha, idCorto } = require('../config/utils');

const router = express.Router();
// La protección solo aplica a las rutas del administrador
router.use(['/admin', '/agregar_producto', '/editar_producto', '/eliminar_producto', '/entregar', '/eliminar_admin', '/eliminar_cliente'], requireAdmin);

/* ========== SUBIDA DE IMÁGENES ========== */

const EXT_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp'];
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }            // 5 MB
}).single('imagen');

// Ejecuta multer y deja el error (si lo hay) en req.errorSubida
const subida = (req, res, next) => upload(req, res, (err) => {
    if (err) req.errorSubida = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede pesar más de 5 MB.' : 'Error al subir la imagen.';
    next();
});

// Valida y guarda un producto nuevo. Devuelve '' si todo salió bien o el mensaje de error.
async function crearProducto(req) {
    if (req.errorSubida) return req.errorSubida;

    const nombre = String(req.body.nombre_producto || '').trim();
    const precio = String(req.body.precio || '').trim();
    const stock = String(req.body.stock || '').trim();
    const idCategoria = String(req.body.id_categoria || '').trim();

    if (!nombre || !precio || !stock || !idCategoria || !req.file) {
        return 'Debes completar TODOS los campos.';
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!EXT_PERMITIDAS.includes(ext)) return 'La imagen debe ser JPG, PNG o WEBP.';

    if (!CATEGORIAS[idCategoria] || !(Number(precio) >= 1) || !(Number(stock) >= 1)) {
        return 'Revisa los valores de precio, stock y categoría.';
    }

    const nombreImagen = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}${ext}`;

    try {
        await Imagen.create({ nombre: nombreImagen, contentType: MIME[ext], data: req.file.buffer });
        await Producto.create({
            nombre_producto: nombre,
            precio: Number(precio),
            stock: parseInt(stock, 10),
            id_categoria: parseInt(idCategoria, 10),
            imagen: nombreImagen
        });
        return '';
    } catch (e) {
        console.error(e);
        return 'Error al guardar el producto.';
    }
}

/* ========== PANEL ADMINISTRADOR (admin.php) ========== */

async function mostrarPanel(req, res, mensaje) {
    const [prods, aparts, clis, pendientes, entregados] = await Promise.all([
        Producto.find().sort({ _id: -1 }).lean(),
        Apartado.find().populate('cliente').populate('producto').sort({ _id: -1 }).lean(),
        Usuario.find().sort({ _id: 1 }).lean(),
        Apartado.countDocuments({ estado: 'Pendiente' }),
        Apartado.countDocuments({ estado: 'Entregado' })
    ]);

    const productos = prods.map(p => ({
        id_producto: String(p._id),
        id_corto: idCorto(p._id),
        nombre_producto: p.nombre_producto,
        precio: p.precio,
        stock: p.stock,
        nombre_categoria: CATEGORIAS[p.id_categoria] || '-'
    }));

    const apartados = aparts.map(a => ({
        id_apartado: String(a._id),
        id_corto: idCorto(a._id),
        nombre_completo: a.cliente ? a.cliente.nombre_completo : '(cliente eliminado)',
        nombre_producto: a.producto ? a.producto.nombre_producto : '(producto eliminado)',
        precio: a.producto ? a.producto.precio : 0,
        estado: a.estado,
        fecha_apartado: fmtFecha(a.createdAt)
    }));

    const clientes = clis.map(c => ({
        id_cliente: String(c._id),
        id_corto: idCorto(c._id),
        nombre_completo: c.nombre_completo,
        usuario: c.usuario,
        email: c.email
    }));

    res.render('admin', {
        sesion: req.session,
        mensaje: mensaje || '',
        apartadosTotales: pendientes + entregados,
        apartadosPendientes: pendientes,
        apartadosEntregados: entregados,
        clientesRegistrados: clientes.length,
        productos, apartados, clientes
    });
}

router.get('/admin', async (req, res, next) => {
    try { await mostrarPanel(req, res, ''); } catch (e) { next(e); }
});

// El formulario "Agregar producto" del panel envía POST a /admin
router.post('/admin', subida, async (req, res, next) => {
    try {
        if (!req.body.agregar_producto) return res.redirect('/admin');
        const error = await crearProducto(req);
        if (!error) return res.redirect('/admin');
        await mostrarPanel(req, res, error);
    } catch (e) { next(e); }
});

/* ========== AGREGAR PRODUCTO (agregar_producto.php) ========== */

router.get('/agregar_producto', (req, res) => {
    res.render('agregar_producto', { mensaje: '' });
});

router.post('/agregar_producto', subida, async (req, res, next) => {
    try {
        const error = await crearProducto(req);
        if (!error) return res.redirect('/admin');
        res.render('agregar_producto', { mensaje: error });
    } catch (e) { next(e); }
});

/* ========== EDITAR PRODUCTO (editar_producto.php) ========== */

router.get('/editar_producto', async (req, res, next) => {
    try {
        if (!isId(req.query.id)) return res.redirect('/admin');
        const producto = await Producto.findById(req.query.id).lean();
        if (!producto) return res.redirect('/admin');
        res.render('editar_producto', { producto, mensaje: '' });
    } catch (e) { next(e); }
});

router.post('/editar_producto', async (req, res, next) => {
    try {
        const id = req.query.id;
        if (!isId(id)) return res.redirect('/admin');

        let producto = await Producto.findById(id);
        if (!producto) return res.redirect('/admin');

        const nombre = String(req.body.nombre_producto || '').trim();
        const precio = Number(req.body.precio);
        const stock = Number(req.body.stock);

        let mensaje;
        if (!nombre || !(precio >= 1) || !(stock >= 1)) {
            mensaje = 'Todos los campos son obligatorios y deben ser válidos.';
        } else {
            producto.nombre_producto = nombre;
            producto.precio = precio;
            producto.stock = Math.floor(stock);
            await producto.save();
            mensaje = 'Producto actualizado correctamente';
        }

        res.render('editar_producto', { producto: producto.toObject(), mensaje });
    } catch (e) { next(e); }
});

/* ========== ELIMINAR PRODUCTO (eliminar_producto.php) ========== */

router.get('/eliminar_producto', async (req, res, next) => {
    try {
        if (isId(req.query.id)) {
            const producto = await Producto.findById(req.query.id);
            if (producto) {
                await Apartado.deleteMany({ producto: producto._id });   // apartados relacionados
                await Producto.deleteOne({ _id: producto._id });
                await Imagen.deleteOne({ nombre: producto.imagen });     // solo existe si la subió el admin
            }
        }
        res.redirect('/admin');
    } catch (e) { next(e); }
});

/* ========== ENTREGAR / ELIMINAR APARTADOS ========== */

// entregar.php
router.get('/entregar', async (req, res, next) => {
    try {
        if (isId(req.query.id)) {
            await Apartado.updateOne({ _id: req.query.id }, { estado: 'Entregado' });
        }
        res.redirect('/admin');
    } catch (e) { next(e); }
});

// eliminar_admin.php
router.get('/eliminar_admin', async (req, res, next) => {
    try {
        if (isId(req.query.id)) await Apartado.deleteOne({ _id: req.query.id });
        res.redirect('/admin');
    } catch (e) { next(e); }
});

/* ========== ELIMINAR CLIENTE (eliminar_cliente.php) ========== */

router.get('/eliminar_cliente', async (req, res, next) => {
    try {
        if (isId(req.query.id)) {
            // No permite que el admin se borre a sí mismo por accidente
            if (req.query.id !== req.session.uid) {
                await Apartado.deleteMany({ cliente: req.query.id });
                await Usuario.deleteOne({ _id: req.query.id });
            }
        }
        res.redirect('/admin');
    } catch (e) { next(e); }
});

module.exports = router;
