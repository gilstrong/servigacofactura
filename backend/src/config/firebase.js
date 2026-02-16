const admin = require("firebase-admin");
const path = require("path");

let db;

try {
  // Construimos la ruta absoluta de forma segura
  // __dirname es 'backend/src/config', subimos uno (..) para buscar en 'backend/src'
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  
  // Verificamos si ya existe una app inicializada para evitar el error "Default app already exists"
  if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://servigaco-default-rtdb.firebaseio.com"
    });
    console.log("🔥 Firebase Admin inicializado correctamente.");
  }
  
  db = admin.database();
} catch (error) {
  console.error("❌ Error en configuración de Firebase:", error.message);
  // No lanzamos throw para no tumbar el servidor completo, pero db quedará undefined
}

module.exports = { db };