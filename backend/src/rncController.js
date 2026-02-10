const { db } = require("../config/firebase");

const buscarRNC = async (req, res) => {
  // 1. Validaciones previas
  if (!db) {
    return res.status(500).json({ error: "Base de datos no conectada" });
  }

  const query = req.params.query;
  if (!query) {
    return res.status(400).json({ error: "Falta el parámetro de búsqueda" });
  }

  // 2. Lógica de negocio
  const esNumero = /^\d+$/.test(query);
  const ref = db.ref("maestro_contribuyentes");

  try {
    let snapshot;
    
    if (esNumero) {
      // Búsqueda por RNC (Clave primaria)
      snapshot = await ref.orderByKey()
        .startAt(query)
        .endAt(query + "\uf8ff")
        .limitToFirst(5)
        .once("value");
    } else {
      // Búsqueda por Nombre (Propiedad 'n')
      const terminoNorm = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      snapshot = await ref.orderByChild("n")
        .startAt(terminoNorm)
        .endAt(terminoNorm + "\uf8ff")
        .limitToFirst(5)
        .once("value");
    }
    
    res.json(snapshot.val() || {});
  } catch (error) {
    console.error("Error en controlador RNC:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { buscarRNC };