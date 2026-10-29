// Equivale a los `if (!isset($_SESSION["cliente"]))` de los PHP

function requireLogin(req, res, next) {
    if (!req.session.cliente) return res.redirect('/login');
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.cliente) return res.redirect('/login');
    if (req.session.rol !== 'admin') return res.redirect('/productos');
    next();
}

module.exports = { requireLogin, requireAdmin };
