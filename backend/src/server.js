// backend/src/server.js

const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Inicializar Firebase
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
      });

      console.log("🔥 Firebase Admin inicializado desde Variables de Entorno.");
    } else {
      const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
      });

      console.log("🔥 Firebase Admin inicializado desde archivo local JSON.");
    }
  }
} catch (error) {
  console.error("❌ Error en configuración de Firebase:", error.message);
}

// Base de datos de Firebase
const db = admin.database();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Carpeta pública para frontend estático
// Estructura esperada: raiz/public
const publicDir = path.join(__dirname, "../../public");
app.use(express.static(publicDir));

// Rutas API
const apiRoutes = require("./routes/apiRoutes");
const ncfController = require("./controllers/ncfController");

app.use("/api", apiRoutes);

// Rutas de NCF adicionales
app.post("/api/ncf/configurar", ncfController.configurarRango);
app.get("/api/ncf/estado", ncfController.obtenerEstado);

// Rutas del frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "calculadora_general.html"));
});

app.get("/editar-factura", (req, res) => {
  res.sendFile(path.join(publicDir, "editar_factura.html"));
});

// Fallback para rutas no encontradas: carga frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "calculadora_general.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = { app, db };
