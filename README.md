# VG MODA — versión Node.js + MongoDB Atlas

Misma tienda (mismo frontend: HTML, CSS y Bootstrap) pero con el backend reescrito:

| Antes (informe)            | Ahora                                   |
|----------------------------|-----------------------------------------|
| PHP + Apache (XAMPP)       | **Node.js + Express**                   |
| MySQL + phpMyAdmin         | **MongoDB Atlas** (nube) + Mongoose     |
| `$_SESSION` de PHP         | `express-session` guardada en Atlas     |
| `password_hash` de PHP     | `bcryptjs` (los hash viejos siguen sirviendo) |
| páginas `.php`             | plantillas **EJS** con el mismo HTML/CSS |
| `move_uploaded_file`       | `multer` (imágenes guardadas en Atlas)  |

Tablas → colecciones: `cliente` → **usuarios**, `producto` → **productos**, `apartado` → **apartados**, `opinion` → **opiniones**.
La categoría (1 Jeans, 2 Vestidos, 3 Sandalias, 4 Bodys, 5 Tenis, 6 Bolsos) se guarda como número en el producto.

---

## 1. Crear la base de datos en MongoDB Atlas (gratis)

1. Entra a https://cloud.mongodb.com y crea una cuenta.
2. **Create → Cluster M0 (Free)**, elige cualquier región.
3. **Database Access → Add New Database User**: usuario y contraseña (guárdalas).
4. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Es necesario para que Render pueda conectarse.
5. **Database → Connect → Drivers**: copia la cadena `mongodb+srv://...` y reemplaza `<password>` por tu contraseña.

## 2. Probarlo en tu computador

Copia el contenido de esta carpeta sobre tu `VG_MODA_MONGO` (reemplaza `models/`, `routes/auth.js`, `server.js` y `package.json`) y en la terminal de VS Code:

```powershell
cd C:\xampp\htdocs\VG_MODA_MONGO
copy .env.example .env      # luego edita .env con tu MONGODB_URI, SESSION_SECRET y ADMIN_PASSWORD
npm install
npm run seed:demo           # crea el admin y productos de ejemplo
npm start
```

Abre http://localhost:3000 — entra con `ADMIN_USER` / `ADMIN_PASSWORD` para ver el panel de administrador.

### Traer tus datos reales de MySQL (la "migración")

Con XAMPP encendido (MySQL en el puerto 3307, como en `conexion.php`):

```powershell
npm run migrar              # si Mongo ya tiene datos: npm run migrar:limpiar
```

Copia clientes (con contraseñas y roles), productos, apartados y opiniones. Después ya **no** necesitas `seed:demo`.
Las fotos originales ya están en `public/carpeta-imagenes`.

## 3. Subirlo a GitHub

```powershell
git init
git add .
git commit -m "VG MODA con Node.js y MongoDB Atlas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/VG_MODA_MONGO.git
git push -u origin main
```

(El `.gitignore` evita subir `node_modules` y tu `.env` con las claves.)

## 4. Deploy en Render (gratis)

1. https://render.com → **New → Web Service** → conecta el repositorio `VG_MODA_MONGO`.
2. Build Command: `npm install` — Start Command: `npm start` (o usa **New → Blueprint**, ya viene `render.yaml`).
3. En **Environment** agrega:
   - `MONGODB_URI` = tu cadena de Atlas
   - `SESSION_SECRET` = un texto largo aleatorio
   - `NODE_ENV` = `production`
4. **Deploy**. Render te da una URL `https://vg-moda.onrender.com`.
5. Si no migraste datos, crea el admin en Atlas corriendo `npm run seed` en tu PC (con el `.env` apuntando a Atlas): la base es la misma.

> El plan gratis de Render "duerme" tras 15 min sin visitas; la primera carga luego tarda ~50 s.

## Qué se conservó y qué mejoró

- Todas las pantallas, textos, estilos y rutas visibles son los mismos (`/login`, `/registro`, `/productos`, `/mis_apartados`, `/perfil`, `/admin`...). Los enlaces viejos `*.php` redirigen a las rutas nuevas.
- Mejoras de seguridad/consistencia: las acciones del administrador (entregar, eliminar) ahora exigen sesión de admin; un cliente solo puede borrar **sus** apartados; el apartado descuenta stock de forma atómica (no se puede apartar más de lo que hay); registro rechaza usuarios repetidos; los textos se escapan (sin XSS).
- Si un apartado **Pendiente** se elimina, el producto vuelve al inventario; si ya estaba **Entregado**, no (el producto ya salió de la tienda).
- `panel.php` no se migró: no tenía enlaces desde ninguna página y mostraba cifras fijas.
