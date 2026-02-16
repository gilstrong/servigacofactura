const { db } = require("../config/firebase");

const buscarRNC = async (req, res) => {
  // 1. Validaciones previas
  if (!db) {
    console.error("❌ Error: DB no inicializada en rncController");
    return res.status(500).json({ error: "Base de datos no conectada" });
  }

  const query = req.params.query;
  if (!query) {
    return res.status(400).json({ error: "Falta el parámetro de búsqueda" });
  }

  console.log(`🔍 Buscando RNC/Nombre: "${query}"`);

  // 2. Lógica de negocio
  // Eliminamos guiones por si acaso el usuario los envía
  const terminoLimpio = query.replace(/-/g, '').trim();
  const esNumero = /^\d+$/.test(terminoLimpio);
  const ref = db.ref("maestro_contribuyentes");

  try {
    let snapshot;
    
    if (esNumero) {
      // Búsqueda por RNC (Clave primaria)
      snapshot = await ref.orderByKey()
        .startAt(terminoLimpio)
        .endAt(terminoLimpio + "\uf8ff")
        .limitToFirst(5)
        .once("value");
    } else {
      // Búsqueda por Nombre (Propiedad 'n')
      const terminoMayus = query.toUpperCase();
      snapshot = await ref.orderByChild("n")
        .startAt(terminoMayus)
        .endAt(terminoMayus + "\uf8ff")
        .limitToFirst(5)
        .once("value");
    }
    
    const resultados = snapshot.val() || {};
    console.log(`✅ Encontrados: ${Object.keys(resultados).length} resultados`);
    res.json(resultados);

  } catch (error) {
    console.error("Error en controlador RNC:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { buscarRNC };