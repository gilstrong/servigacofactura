const { db } = require("../config/firebase");

const crearFactura = async (req, res) => {
  if (!db) return res.status(500).json({ error: "Base de datos no disponible" });

  const { cotizacion, cliente, tipoNCF } = req.body;

  if (!cotizacion || !cliente || !tipoNCF) {
    return res.status(400).json({ error: "Datos incompletos para facturar" });
  }

  try {
    // 1. Obtener secuencia de NCF (Transacción atómica)
    const secuenciaRef = db.ref(`secuencias_ncf/${tipoNCF}`);
    const result = await secuenciaRef.transaction((currentData) => {
      if (currentData === null) return { actual: 1 };
      return { ...currentData, actual: (currentData.actual || 0) + 1 };
    });

    const numeroSecuencia = result.snapshot.val().actual;
    const ncfCompleto = tipoNCF + String(numeroSecuencia).padStart(8, '0');

    // 2. Crear objeto Factura
    const nuevaFactura = {
      ...cotizacion,
      tipo_documento: 'Factura',
      ncf: ncfCompleto,
      rnc_cliente: cliente.rnc,
      razon_social: cliente.nombre,
      fecha_facturacion: new Date().toISOString(),
      origen_cotizacion: cotizacion.id
    };

    delete nuevaFactura.id; 

    // 3. Guardar en nodo 'facturas'
    const facturaRef = await db.ref('facturas').push(nuevaFactura);

    // 4. Actualizar la cotización original
    if (cotizacion.id) {
      await db.ref(`cotizaciones/${cotizacion.id}`).update({
        ncf: ncfCompleto,
        estado: 'facturada'
      });
    }

    res.json({ 
      success: true, 
      ncf: ncfCompleto, 
      id: facturaRef.key,
      mensaje: `Factura ${ncfCompleto} generada correctamente`
    });

  } catch (error) {
    console.error("Error al facturar:", error);
    res.status(500).json({ error: "Error interno al procesar la factura" });
  }
};

module.exports = { crearFactura };