const path = require("path");
const express = require("express");
const cors = require("cors");

// Importamos las rutas con la nueva convención de nombres
const apiRoutes = require("./routes/apiRoutes");
const ncfController = require("./controllers/ncfController"); // Importar nuevo controlador

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de rutas estáticas
// __dirname = backend/src
// ..        = backend
// ..        = raiz del proyecto
// public    = carpeta publica
const publicDir = path.join(__dirname, "..", "..", "public");

// Middlewares globales
app.use(express.json());
app.use(express.static(publicDir));
app.use(cors()); // Permite peticiones desde Live Server (puerto 5500)

// Rutas de la API
app.use("/api", apiRoutes);

// Rutas de Gestión de NCF (Agregadas directamente)
app.post("/api/ncf/configurar", ncfController.configurarRango);
app.get("/api/ncf/estado", ncfController.obtenerEstado);

// Ruta principal (Frontend)
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "calculadora_general.html"));
});

// Ruta para la página de edición de facturas
app.get("/editar-factura", (req, res) => {
  res.sendFile(path.join(publicDir, "editar_factura.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
