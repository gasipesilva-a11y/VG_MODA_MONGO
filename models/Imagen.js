const mongoose = require('mongoose');

// Imágenes subidas por el administrador. En Render el disco es efímero
// (se borra en cada deploy), por eso se guardan dentro de MongoDB Atlas.
const imagenSchema = new mongoose.Schema({
    nombre:      { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    data:        { type: Buffer, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Imagen', imagenSchema);
