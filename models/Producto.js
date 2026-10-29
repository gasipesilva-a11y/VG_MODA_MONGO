const mongoose = require('mongoose');

// Equivale a la tabla `producto` (la categoría se guarda como número 1-6)
const productoSchema = new mongoose.Schema({
    nombre_producto: { type: String, required: true, trim: true, maxlength: 100 },
    stock:           { type: Number, required: true, min: 0, default: 0 },
    precio:          { type: Number, required: true, min: 0 },
    id_categoria:    { type: Number, required: true, min: 1, max: 6, index: true },
    imagen:          { type: String, required: true }            // nombre del archivo en /carpeta-imagenes
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);
