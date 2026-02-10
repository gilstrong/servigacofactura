const path = require("path");
const express = require("express");
const apiRoutes = require("./routes/apiRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de rutas estáticas
// __dirname apunta a backend/src, subimos dos niveles para llegar a public
const publicDir = path.join(__dirname, "..", "..", "public");

// Middlewares globales
app.use(express.json());
app.use(express.static(publicDir));

// Rutas de la API (prefijo /api para orden)
app.use("/api", apiRoutes);

// Ruta principal (Frontend)
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "calculadora_general.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
