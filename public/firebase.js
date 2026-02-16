const admin = require("firebase-admin");
const path = require("path");

let db;

try {
  // __dirname = backend/src/config
  // ..        = backend/src (donde debe estar serviceAccountKey.json)
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  
  // Singleton: Prevenir error "Default app already exists"
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
  console.error("❌ Error crítico en Firebase Config:", error.message);
  // No hacemos process.exit() aquí para permitir diagnóstico, pero db será undefined
}

module.exports = { db };