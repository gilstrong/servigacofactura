const admin = require("firebase-admin");
const path = require("path");

// Cargar credenciales (Asegúrate de que serviceAccountKey.json esté en backend/src/)
const serviceAccountPath = path.join(__dirname, "src", "serviceAccountKey.json");

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://servigaco-default-rtdb.firebaseio.com"
  });
  console.log("🔥 Conectado a Firebase correctamente.");
} catch (e) {
  console.error("❌ Error cargando credenciales:", e.message);
  console.error("Verifica que 'serviceAccountKey.json' esté en la carpeta 'backend/src/'");
  process.exit(1);
}

const db = admin.database();

// Configuración inicial estándar (Ajusta los límites 'hasta' según tus necesidades)
const secuencias = {
  "B01": { tipo: "B01", descripcion: "Crédito Fiscal", actual: 0, desde: 1, hasta: 5000, activo: true, fecha_vencimiento: "2026-12-31" },
  "B02": { tipo: "B02", descripcion: "Consumidor Final", actual: 0, desde: 1, hasta: 5000, activo: true, fecha_vencimiento: "2026-12-31" },
  "B14": { tipo: "B14", descripcion: "Régimen Especial", actual: 0, desde: 1, hasta: 5000, activo: true, fecha_vencimiento: "2026-12-31" },
  "B15": { tipo: "B15", descripcion: "Gubernamental", actual: 0, desde: 1, hasta: 5000, activo: true, fecha_vencimiento: "2026-12-31" },
  "B04": { tipo: "B04", descripcion: "Nota de Crédito", actual: 0, desde: 1, hasta: 5000, activo: true, fecha_vencimiento: "2026-12-31" }
};

async function inicializar() {
  console.log("⚙️  Inicializando secuencias NCF en la base de datos...");
  try {
    await db.ref("secuencias_ncf").update(secuencias);
    console.log("✅ ¡Listo! Secuencias B01, B02, B04, B14 y B15 configuradas.");
    console.log("👉 Ahora puedes facturar sin errores.");
  } catch (error) {
    console.error("❌ Error al guardar:", error);
  }
  process.exit();
}

inicializar();