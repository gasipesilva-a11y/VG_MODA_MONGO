// MIGRACIÓN MySQL (XAMPP) -> MongoDB Atlas
//
// Copia clientes, productos, apartados y opiniones de la base `vg_moda` de tu XAMPP
// a MongoDB Atlas, conservando contraseñas, roles, relaciones y fechas.
//
//   1. Enciende MySQL en el panel de XAMPP.
//   2. npm install            (instala también mysql2, que solo se usa aquí)
//   3. npm run migrar         (la primera vez; si ya hay datos en Mongo agrega -- --limpiar)
//
// Variables opcionales en .env: MYSQL_HOST, MYSQL_PORT (3307 como en conexion.php),
// MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
require('dotenv').config();
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { conectar } = require('../config/db');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Apartado = require('../models/Apartado');
const Opinion = require('../models/Opinion');

(async () => {
    const limpiar = process.argv.includes('--limpiar');

    const my = await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3307),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DB || 'vg_moda'
    });
    console.log('MySQL conectado.');

    await conectar();

    const hayDatos = (await Promise.all([Usuario, Producto, Apartado, Opinion].map(m => m.countDocuments())))
        .some(n => n > 0);
    if (hayDatos && !limpiar) {
        throw new Error('MongoDB ya tiene datos. Si quieres reemplazarlos ejecuta: npm run migrar -- --limpiar');
    }
    if (limpiar) {
        await Promise.all([Usuario, Producto, Apartado, Opinion].map(m => m.deleteMany({})));
        console.log('Colecciones de Mongo vaciadas.');
    }

    /* ---- clientes -> usuarios ---- */
    const [clientes] = await my.query('SELECT * FROM cliente ORDER BY id_cliente');
    const mapaUsuarios = new Map();
    for (const c of clientes) {
        const doc = await Usuario.create({
            nombre_completo: c.nombre_completo,
            email: c.email,
            telefono: c.telefono || '-',
            usuario: c.usuario,
            // PHP genera hashes $2y$; es el mismo algoritmo que $2b$ de bcryptjs
            password: String(c.password).replace(/^\$2y\$/, '$2b$'),
            rol: c.rol === 'admin' ? 'admin' : 'cliente'
        });
        mapaUsuarios.set(c.id_cliente, doc._id);
    }
    console.log(`Usuarios migrados:   ${clientes.length}`);

    /* ---- productos ---- */
    const [productos] = await my.query('SELECT * FROM producto ORDER BY id_producto');
    const mapaProductos = new Map();
    for (const p of productos) {
        const doc = await Producto.create({
            nombre_producto: p.nombre_producto,
            stock: p.stock,
            precio: Number(p.precio),
            id_categoria: p.id_categoria,
            imagen: p.imagen
        });
        mapaProductos.set(p.id_producto, doc._id);
    }
    console.log(`Productos migrados:  ${productos.length}`);

    /* ---- apartados ---- */
    const [apartados] = await my.query('SELECT * FROM apartado ORDER BY id_apartado');
    let apartadosOk = 0;
    for (const a of apartados) {
        const cliente = mapaUsuarios.get(a.id_cliente);
        const producto = mapaProductos.get(a.id_producto);
        if (!cliente || !producto) continue;      // referencia rota en MySQL
        await Apartado.create({
            cliente, producto,
            estado: a.estado === 'Entregado' ? 'Entregado' : 'Pendiente',
            createdAt: a.fecha_apartado || new Date()
        });
        apartadosOk++;
    }
    console.log(`Apartados migrados:  ${apartadosOk} de ${apartados.length}`);

    /* ---- opiniones ---- */
    const [opiniones] = await my.query('SELECT * FROM opinion ORDER BY id_opinion');
    for (const o of opiniones) {
        await Opinion.create({
            nombre: o.nombre, gusto: o.gusto || '-', mejora: o.mejora || '',
            createdAt: o.fecha || new Date()
        });
    }
    console.log(`Opiniones migradas:  ${opiniones.length}`);

    await my.end();
    await mongoose.disconnect();
    console.log('\nMigración terminada.');
})().catch(async (e) => {
    console.error('\nERROR:', e.message);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
});
