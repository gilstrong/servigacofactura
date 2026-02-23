const express = require('express');
const router = express.Router();
const pdfController = require('./pdfController');

// Definición de rutas para el controlador de PDF

// POST /generar - Genera el PDF
router.post('/generar', pdfController.generarPDF);

// GET /health - Verificación de estado de Puppeteer
router.get('/health', pdfController.verificarSalud);

module.exports = router;