const mongoose = require('mongoose');

// Equivale a la tabla `cliente` de MySQL (incluye clientes y administradores)
const usuarioSchema = new mongoose.Schema({
    nombre_completo: { type: String, required: true, trim: true, maxlength: 100 },
    email:           { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    telefono:        { type: String, required: true, trim: true, maxlength: 20 },
    usuario:         { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    password:        { type: String, required: true },          // hash bcrypt
    rol:             { type: String, enum: ['cliente', 'admin'], default: 'cliente' }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
