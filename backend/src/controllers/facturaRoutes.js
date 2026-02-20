const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');

// Middleware de autenticación (ejemplo)
const checkAuth = (req, res, next) => {
    // Aquí iría tu lógica real para verificar si el usuario está autenticado.
    // Por ejemplo, verificar un token JWT, una sesión, etc.
    // const user = req.session.user;
    const isAuthenticated = true; // Placeholder

    if (isAuthenticated) {
        next(); // El usuario está autenticado, continuar.
    } else {
        res.status(401).json({ error: "Acceso no autorizado. Se requiere autenticación." });
    }
};

// Endpoint para el historial de facturas por cliente
router.get('/facturas/cliente/:clienteId', checkAuth, historialController.obtenerHistorial);

module.exports = router;