const express = require("express");
const router = express.Router();

// Importamos el controlador
const rncController = require("../controllers/rncController");

// Definimos la ruta y asignamos la función del controlador
router.get("/rnc/:query", rncController.buscarRNC);

module.exports = router;