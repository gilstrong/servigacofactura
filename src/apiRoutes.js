const express = require("express");
const router = express.Router();

// Importamos el controlador
const rncController = require("../controllers/rncController");
const facturarController = require("../controllers/facturarController");

// Definimos la ruta y asignamos la función del controlador
router.get("/rnc/:query", rncController.buscarRNC);

// Definimos la nueva ruta para la facturación
router.post("/facturar", facturarController.crearFactura);

module.exports = router;