const mongoose = require('mongoose');

function getUri() {
    return process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
}

async function conectar() {
    const uri = getUri();
    if (!uri) {
        throw new Error('Falta MONGODB_URI en el archivo .env (o en las variables de entorno del hosting).');
    }
    await mongoose.connect(uri, {
        dbName: process.env.MONGODB_DB || 'vg_moda',
        serverSelectionTimeoutMS: 15000
    });
    console.log('MongoDB Atlas conectado:', mongoose.connection.name);
    return uri;
}

module.exports = { conectar, getUri };
