const express = require("express");
const router = express.Router();

// Importamos el controlador
const rncController = require("../controllers/rncController");
const facturarController = require("../controllers/facturarController");
const pdfController = require("../controllers/pdfController");

// Definimos la ruta y asignamos la función del controlador
router.get("/rnc/:query", rncController.buscarRNC);

// Definimos la nueva ruta para la facturación
router.post("/facturar", facturarController.crearFactura);

// Rutas para gestión de facturas (Edición e Impresión)
router.get("/facturas/:id", facturarController.obtenerFactura);
router.post("/facturas/:id", facturarController.editarFactura);
router.post("/facturas/:id/imprimir", facturarController.marcarComoImpresa);

// Ruta para generar PDF
router.post("/generar-factura-pdf", pdfController.generarPDF); // Verifica que esta línea exista

module.exports = router;