const mongoose = require('mongoose');

// Equivale a la tabla `apartado`. La fecha_apartado es `createdAt`.
const apartadoSchema = new mongoose.Schema({
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true,
        index: true
    },
    estado: {
        type: String,
        enum: ['Pendiente', 'Entregado'],
        default: 'Pendiente'
    }
}, { timestamps: true });

module.exports = mongoose.model('Apartado', apartadoSchema);
