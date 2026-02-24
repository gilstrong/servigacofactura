const express = require("express");
const router = express.Router();

// Importamos los controladores
const rncController = require("../controllers/rncController");
const facturaController = require("../controllers/facturaController");

// Definimos las rutas y asignamos la función del controlador
router.get("/rnc/:query", rncController.buscarRNC);
router.post("/facturar", facturaController.crearFactura);
router.get("/health", (req, res) => res.status(200).send("OK"));

module.exports = router;