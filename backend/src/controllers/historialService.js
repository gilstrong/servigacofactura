const { db } = require("../config/firebase"); // Asegúrate que exporte admin.firestore()

/**
 * Obtiene el historial de facturas de un cliente con paginación y filtro de fecha.
 * @param {string} clienteId - El ID del cliente a buscar.
 * @param {object} options - Opciones de paginación y filtro.
 * @param {number} options.limit - Cantidad de documentos a traer.
 * @param {string|null} options.lastDocId - El ID del último documento de la página anterior.
 * @param {string|null} options.fechaInicio - Fecha de inicio del rango (YYYY-MM-DD).
 * @param {string|null} options.fechaFin - Fecha de fin del rango (YYYY-MM-DD).
 * @returns {Promise<{facturas: Array, lastDocId: string|null, hasMore: boolean}>}
 */
const getHistorialPorCliente = async (clienteId, { limit = 10, lastDocId = null, fechaInicio = null, fechaFin = null }) => {
  // 1. Construir la consulta base
  let query = db.collection('facturas')
    .where('clienteId', '==', clienteId);

  // 2. Aplicar filtros de fecha si existen
  if (fechaInicio) {
    // new Date('2024-05-21') crea una fecha a las 00:00:00, lo cual es correcto para '>='
    query = query.where('createdAt', '>=', new Date(fechaInicio));
  }
  if (fechaFin) {
    // Para incluir el día completo, ajustamos la fecha de fin a las 23:59:59.999
    const fechaFinCompleta = new Date(fechaFin);
    fechaFinCompleta.setHours(23, 59, 59, 999);
    query = query.where('createdAt', '<=', fechaFinCompleta);
  }

  // 3. Aplicar ordenamiento y límite
  query = query
    .orderBy('createdAt', 'desc') // Ordenar por fecha de creación, más recientes primero
    .limit(limit);

  // 4. Aplicar el cursor para paginación
  if (lastDocId) {
    const lastDocSnapshot = await db.collection('facturas').doc(lastDocId).get();
    if (!lastDocSnapshot.exists) {
      throw new Error("El documento para paginación no existe.");
    }
    query = query.startAfter(lastDocSnapshot);
  }

  // 5. Ejecutar la consulta
  const snapshot = await query.get();

  // 6. Procesar y formatear los resultados
  if (snapshot.empty) {
    return { facturas: [], lastDocId: null, hasMore: false };
  }

  const facturas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // 7. Determinar si hay más páginas
  // Si el número de documentos devueltos es igual al límite, es muy probable que haya más.
  const hasMore = facturas.length === limit;
  const newLastDocId = hasMore ? facturas[facturas.length - 1].id : null;

  return {
    facturas,
    lastDocId: newLastDocId,
    hasMore
  };
};

module.exports = {
  getHistorialPorCliente
};