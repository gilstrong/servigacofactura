const historialService = require('../services/historialService');

const obtenerHistorial = async (req, res) => {
  try {
    // 1. Validación de Parámetros
    const { clienteId } = req.params;
    if (!clienteId) {
      return res.status(400).json({ error: "El ID del cliente es obligatorio." });
    }

    // 2. Opciones de Paginación y Filtro desde Query String
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
      lastDocId: req.query.lastDocId || null,
      fechaInicio: req.query.fechaInicio || null, // Nuevo
      fechaFin: req.query.fechaFin || null      // Nuevo
    };

    // 3. Llamada al Servicio
    const resultado = await historialService.getHistorialPorCliente(clienteId, options);

    // 4. Manejo de respuesta exitosa (incluso si no hay facturas)
    if (resultado.facturas.length === 0 && !options.lastDocId) {
        return res.status(200).json({
            message: "El cliente no tiene facturas registradas.",
            data: resultado
        });
    }

    res.status(200).json({
        message: "Historial obtenido correctamente.",
        data: resultado
    });

  } catch (error) {
    console.error("Error en historialController:", error);
    // Manejo específico para el error de índice faltante
    if (error.code === 'FAILED_PRECONDITION' || (error.message && error.message.includes('index'))) {
        return res.status(500).json({ error: "Error de base de datos: Falta un índice compuesto en Firestore. Revisa la consola del backend para ver el link de creación." });
    }
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

module.exports = { obtenerHistorial };