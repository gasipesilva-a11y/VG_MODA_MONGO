require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const { conectar } = require('./config/db');
const { fmt } = require('./config/utils');
const Imagen = require('./models/Imagen');

const app = express();
const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';

/* ========== CONFIGURACIÓN ========== */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
if (PROD) app.set('trust proxy', 1);          // Render / Railway van detrás de un proxy HTTPS
app.disable('x-powered-by');

app.locals.fmt = fmt;                          // number_format() de PHP

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

async function iniciar() {
    const uri = await conectar();

    // Sesiones guardadas en MongoDB Atlas (equivalente a session_start() de PHP)
    app.use(session({
        name: 'vgmoda.sid',
        secret: process.env.SESSION_SECRET || 'cambia-este-secreto-en-produccion',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: uri,
            dbName: process.env.MONGODB_DB || 'vg_moda',
            collectionName: 'sesiones',
            ttl: 60 * 60 * 24 * 7
        }),
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: PROD ? 'auto' : false,
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    }));

    // Disponible en todas las vistas
    app.use((req, res, next) => {
        res.locals.sesion = req.session;
        next();
    });

    /* ========== FRONTEND ESTÁTICO (index.html, categorías, css, imágenes) ========== */

    app.use(express.static(path.join(__dirname, 'public')));

    // Imágenes subidas por el administrador (guardadas en MongoDB)
    app.get('/carpeta-imagenes/:nombre', async (req, res, next) => {
        try {
            const img = await Imagen.findOne({ nombre: req.params.nombre });
            if (!img) return next();
            res.set('Content-Type', img.contentType);
            res.set('Cache-Control', 'public, max-age=86400');
            res.send(img.data);
        } catch (e) { next(e); }
    });

    /* ========== RUTAS ========== */

    app.use(require('./routes/auth'));
    app.use(require('./routes/tienda'));
    app.use(require('./routes/admin'));
    app.use(require('./routes/opiniones'));

    // Compatibilidad con los enlaces antiguos de PHP (login.php, productos.php, ...)
    app.get(/^\/([a-z_]+)\.php$/, (req, res) => {
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        res.redirect(301, '/' + req.params[0] + qs);
    });

    app.use((req, res) => {
        res.status(404).send('Página no encontrada. <a href="/">Volver al inicio</a>');
    });

    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).send('Ocurrió un error en el servidor. <a href="/">Volver al inicio</a>');
    });

    app.listen(PORT, () => console.log(`VG MODA corriendo en http://localhost:${PORT}`));
}

iniciar().catch((err) => {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
});
