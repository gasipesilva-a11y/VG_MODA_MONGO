const mongoose = require('mongoose');

// Equivale a la tabla `opinion` (formulario "¿Necesitas ayuda?")
const opinionSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    gusto:  { type: String, required: true, trim: true, maxlength: 10 },
    mejora: { type: String, default: '', trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Opinion', opinionSchema);
