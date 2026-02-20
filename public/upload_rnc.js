/**
 * 🚀 SCRIPT DE CARGA MASIVA DE RNC A FIREBASE
 * 
 * Instrucciones:
 * 1. Asegúrate de tener Node.js instalado.
 * 2. Coloca el archivo "DGII_RNC.txt" en esta misma carpeta.
 * 3. Coloca tu archivo de credenciales "serviceAccountKey.json" en esta carpeta.
 * 4. Ejecuta en la terminal: node upload_rnc.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

// 🔑 TU LLAVE DE SERVICIO (Descárgala de Firebase Console > Configuración del proyecto > Cuentas de servicio)
// Asegúrate de que el archivo se llame exactamente 'serviceAccountKey.json'
try {
  // Intentar ruta relativa estándar o fallback a la carpeta actual
  const rutaCredenciales = fs.existsSync("../backend/src/serviceAccountKey.json") ? "../backend/src/serviceAccountKey.json" : "./serviceAccountKey.json";
  const serviceAccount = require(rutaCredenciales);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://servigaco-default-rtdb.firebaseio.com"
  });
} catch (e) {
  console.error("❌ Error: No se encontró el archivo 'serviceAccountKey.json' o es inválido.");
  console.log("   Descárgalo desde Firebase Console -> Configuración del proyecto -> Cuentas de servicio.");
  process.exit(1);
}

const db = admin.database();

// 📄 NOMBRE EXACTO DEL ARCHIVO TXT
const RUTA_TXT = path.join(__dirname, "../data/DGII_RNC.txt");

async function procesarArchivo() {
  console.log(`🚀 Iniciando lectura del archivo: ${RUTA_TXT}`);
  
  if (!fs.existsSync(RUTA_TXT)) {
    console.error(`❌ Error: No se encuentra el archivo '${RUTA_TXT}' en esta carpeta.`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(RUTA_TXT, { encoding: 'latin1' }); // DGII suele usar encoding latin1
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch = {};
  let contador = 0;
  let totalProcesados = 0;

  console.log("⏳ Procesando datos... Esto puede tomar unos minutos.");

  for await (const line of rl) {
    // El formato del TXT de la DGII es separado por pipes (|)
    // RNC|RAZON_SOCIAL|NOMBRE_COMERCIAL|CATEGORIA...
    const partes = line.split('|');
    
    if (partes.length > 1) {
      const rnc = partes[0].trim();
      const nombre = partes[1].trim();
      
      // Solo guardamos si hay RNC y Nombre para ahorrar espacio
      if (rnc && nombre) {
        // Usamos 'n' como clave para el nombre para minimizar el tamaño de la BD
        batch[rnc] = { n: nombre }; 
        contador++;
      }
    }

    // Subir en lotes de 2000 registros para optimizar la conexión
    if (contador >= 2000) {
      await db.ref("maestro_contribuyentes").update(batch);
      totalProcesados += contador;
      process.stdout.write(`\r✅ Subidos: ${totalProcesados} contribuyentes...`);
      batch = {}; // Limpiar lote
      contador = 0;
    }
  }

  // Subir los registros restantes que no completaron un lote
  if (contador > 0) {
    await db.ref("maestro_contribuyentes").update(batch);
    totalProcesados += contador;
  }

  console.log(`\n\n🎉 FINALIZADO CON ÉXITO.`);
  console.log(`📊 Total de empresas cargadas: ${totalProcesados}`);
  process.exit();
}

procesarArchivo().catch(error => {
  console.error("\n❌ Ocurrió un error:", error);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log("   ⚠️ Te falta instalar la librería de firebase.");
    console.log("   Ejecuta: npm install firebase-admin");
  }
});