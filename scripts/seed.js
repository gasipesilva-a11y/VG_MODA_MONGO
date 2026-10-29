// Crea el administrador inicial (y, opcionalmente, productos de demostración).
//
//   npm run seed                 -> solo crea/actualiza el administrador
//   node scripts/seed.js --demo  -> además crea productos de ejemplo si no hay ninguno
//
// Variables (.env):  ADMIN_USER (por defecto "admin")  y  ADMIN_PASSWORD (obligatoria)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { conectar } = require('../config/db');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');

const DEMO = [
    // [nombre, precio, stock, categoría, imagen]
    ['Jean Viena',      89000, 5, 1, 'jeans1.png'],
    ['Jogger Zig-Zag',  95000, 5, 1, 'jeans2.png'],
    ['Jean Gala',       92000, 5, 1, 'jeans3.png'],
    ['Cargo Street',    98000, 5, 1, 'jeans4.png'],
    ['Vestido Aura',    85000, 4, 2, 'vestido1.png'],
    ['Vestido Luna',    89000, 4, 2, 'vestido2.png'],
    ['Vestido Alba',    92000, 4, 2, 'vestido3.png'],
    ['Vestido Noir',    95000, 4, 2, 'vestido4.png'],
    ['Sandalia Siena',  75000, 6, 3, 'sandalias1.png'],
    ['Sandalia Roma',   72000, 6, 3, 'sandalias2.png'],
    ['Sandalia Capri',  70000, 6, 3, 'sandalias3.png'],
    ['Sandalia Nápoles',78000, 6, 3, 'sandalias4.png'],
    ['Body Clásico',    45000, 8, 4, 'body1.png'],
    ['Body Encaje',     49000, 8, 4, 'body2.png'],
    ['Body Satín',      52000, 8, 4, 'body3.png'],
    ['Body Manga Larga',55000, 8, 4, 'body4.png'],
    ['Tenis Urban',    130000, 3, 5, 'tenis1.png'],
    ['Tenis Cloud',    135000, 3, 5, 'tenis2.png'],
    ['Tenis Street',   140000, 3, 5, 'tenis3.png'],
    ['Tenis Classic',  125000, 3, 5, 'tenis4.png'],
    ['Bolso Mini',      68000, 5, 6, 'bolsos1.png'],
    ['Bolso Tote',      85000, 5, 6, 'bolsos2.png'],
    ['Bolso Cruzado',   79000, 5, 6, 'bolsos3.png'],
    ['Bolso Noche',     72000, 5, 6, 'bolsos4.png']
];

(async () => {
    await conectar();

    const user = process.env.ADMIN_USER || 'admin';
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass) throw new Error('Define ADMIN_PASSWORD en el .env para crear el administrador.');

    const hash = await bcrypt.hash(pass, 10);
    const r = await Usuario.findOneAndUpdate(
        { usuario: user },
        { $set: { password: hash, rol: 'admin' },
          $setOnInsert: { nombre_completo: 'Administrador VG MODA', email: 'vg_moda@gmail.com', telefono: '0000000000' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Administrador listo -> usuario: ${r.usuario}`);

    if (process.argv.includes('--demo')) {
        if (await Producto.countDocuments() === 0) {
            await Producto.insertMany(DEMO.map(([nombre_producto, precio, stock, id_categoria, imagen]) =>
                ({ nombre_producto, precio, stock, id_categoria, imagen })));
            console.log(`${DEMO.length} productos de demostración creados.`);
        } else {
            console.log('Ya hay productos; no se crearon los de demostración.');
        }
    }
    await mongoose.disconnect();
})().catch(async (e) => { console.error('ERROR:', e.message); await mongoose.disconnect(); process.exit(1); });
