const mongoose = require('mongoose');

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || '')) && String(v).length === 24;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Igual que number_format() de PHP (sin decimales)
const fmt = (n, sep) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);

// "2026-10-29 13:55:00" en hora de Colombia
const fmtFecha = (d) => d ? new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Bogota' }) : '';

const idCorto = (id) => String(id).slice(-6).toUpperCase();

module.exports = { isId, escapeRegex, fmt, fmtFecha, idCorto };
