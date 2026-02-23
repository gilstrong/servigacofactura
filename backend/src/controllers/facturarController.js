const { db } = require("../config/firebase");

/**
 * Crear una nueva factura desde una cotización
 */
const crearFactura = async (req, res) => {
  // 1. Validaciones iniciales
  if (!db) {
    return res.status(500).json({ error: "Base de datos no disponible" });
  }

  let { cotizacion, cliente, tipoNCF, condicionVenta, metodoPago, referenciaPago, abono, observaciones } = req.body;

  // Sanitizar tipoNCF (Forzar mayúsculas y quitar espacios) para evitar errores como "b1"
  if (tipoNCF) tipoNCF = tipoNCF.trim().toUpperCase();

  console.log(`🔍 [Facturación] Procesando solicitud para NCF: '${tipoNCF}'`);

  if (!cotizacion || !cliente || !tipoNCF) {
    return res.status(400).json({
      error: "Datos incompletos para facturar. Se requiere cotización, cliente y tipo de NCF."
    });
  }

  // Normalizar items: Firebase puede devolverlos como objeto en lugar de array
  if (cotizacion.items && !Array.isArray(cotizacion.items)) {
    cotizacion.items = Object.values(cotizacion.items);
  }

  try {
    // Obtener la referencia de secuencia NCF
    const secuenciaRef = db.ref(`secuencias_ncf/${tipoNCF}`);

    // 2. PRE-VALIDACIÓN ESTRICTA (Lectura sin modificación)
    const snapshot = await secuenciaRef.once('value');
    const data = snapshot.val();

    // Validación 1: Existencia
    if (!snapshot.exists() || !data) {
      console.warn(`⚠️ [Facturación] Intento de uso de NCF no configurado: ${tipoNCF}`);
      return res.status(400).json({
        error: `El tipo de NCF '${tipoNCF}' no está configurado en el sistema.`
      });
    }

    // Validación 2: Fecha de Vencimiento
    if (data.fecha_vencimiento) {
      const hoy = new Date().toISOString().split('T')[0];
      if (hoy > data.fecha_vencimiento) {
        return res.status(400).json({
          error: `La secuencia NCF '${tipoNCF}' venció el ${data.fecha_vencimiento}.`
        });
      }
    }

    // Validación 3: Activo (soporta boolean true/false y string "true"/"false")
    if (data.activo === false || data.activo === 'false') {
      return res.status(400).json({
        error: `La secuencia NCF '${tipoNCF}' está desactivada.`
      });
    }

    // Validación 4: Campos obligatorios y tipos
    const actual = parseInt(data.actual, 10);
    const hasta  = parseInt(data.hasta,  10);

    if (isNaN(actual) || isNaN(hasta)) {
      return res.status(400).json({
        error: `Configuración corrupta para '${tipoNCF}'. Faltan campos 'actual' o 'hasta'.`
      });
    }

    // Validación 5: Límite (Pre-check antes de la transacción)
    if (actual >= hasta) {
      return res.status(400).json({
        error: `⛔ Comprobantes '${tipoNCF}' AGOTADOS. Actual: ${actual}, Límite: ${hasta}.`
      });
    }

    // 3. TRANSACCIÓN ATÓMICA (Incremento seguro y concurrente)
    const result = await secuenciaRef.transaction((currentData) => {
      // Firebase llama primero con null para "tentar" el resultado.
      // Retornar currentData (null) le dice que reintente — NO abortamos aquí.
      if (currentData === null) return currentData;

      // Normalización robusta del campo 'activo' (soporta boolean y string)
      const isActivo = currentData.activo === true || currentData.activo === 'true';
      if (!isActivo) return; // Abort intencional

      // Validación atómica de fecha de vencimiento
      if (currentData.fecha_vencimiento) {
        const hoy = new Date().toISOString().split('T')[0];
        if (hoy > currentData.fecha_vencimiento) return; // Abort intencional
      }

      // Obtener valores numéricos de forma segura
      const actual = currentData.actual !== undefined ? Number(currentData.actual) : 0;
      const desde  = currentData.desde  !== undefined ? Number(currentData.desde)  : 1;
      const hasta  = Number(currentData.hasta);

      // Abortar si la configuración está corrupta
      if (isNaN(actual) || isNaN(desde) || isNaN(hasta)) return; // Abort intencional

      // Calcular siguiente número y validar rango
      let siguiente = actual + 1;
      if (siguiente < desde) siguiente = desde;
      if (siguiente > hasta) return; // Abort intencional — agotado

      return { ...currentData, actual: siguiente };
    });

    // 4. Manejo del resultado de la transacción
    if (!result.committed || !result.snapshot.exists()) {
      return res.status(400).json({
        error: `No se pudo generar el NCF '${tipoNCF}'. Verifique que esté activo y tenga disponibilidad.`
      });
    }

    const numeroSecuencia = parseInt(result.snapshot.val().actual, 10);

    console.log(`✅ [Facturación] Secuencia ${tipoNCF} consumida. Nuevo contador en DB: ${result.snapshot.val().actual}`);

    const ncfCompleto = tipoNCF + String(numeroSecuencia).padStart(8, '0');

    // Recalcular total desde los items para asegurar consistencia
    const items = cotizacion.items || [];
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.precio || 0), 0);
    const tieneItbis = tipoNCF === 'B01' || tipoNCF === 'B02';
    const itbisCalculado = tieneItbis ? subtotal * 0.18 : 0;
    const totalCalculado = subtotal + itbisCalculado;

    // Crear el objeto final de la factura
    const nuevaFactura = {
      ...cotizacion,
      tipo_documento: 'Factura',
      ncf: ncfCompleto,
      rnc_cliente: cliente.rnc,
      razon_social: cliente.nombre,
      telefono: cliente.telefono || '',
      fecha_facturacion: new Date().toISOString(),
      origen_cotizacion: cotizacion.id,
      estado: 'vigente',
      impresa: false,
      fecha_creacion: new Date().toISOString(),
      historial_modificaciones: [],
      condicion_venta: condicionVenta || 'contado',
      metodo_pago: metodoPago || 'efectivo',
      referencia: referenciaPago || '',
      abono: parseFloat(abono) || 0,
      subtotal: subtotal,
      itbis_total: itbisCalculado,
      total: cotizacion.total || totalCalculado, // Usar el total del frontend si viene, si no el calculado
      observaciones: observaciones || ''
    };

    delete nuevaFactura.id;

    // Guardar la nueva factura
    const facturaRef = await db.ref('facturas').push(nuevaFactura);

    // Marcar la cotización original como facturada
    if (cotizacion.id) {
      await db.ref(`cotizaciones/${cotizacion.id}`).update({
        ncf: ncfCompleto,
        estado: 'facturada'
      });
    }

    res.status(201).json({
      success: true,
      ncf: ncfCompleto,
      id: facturaRef.key,
      mensaje: `Factura ${ncfCompleto} generada correctamente`,
      factura: { id: facturaRef.key, ...nuevaFactura }
    });

  } catch (error) {
    console.error("❌ Error al generar la factura:", error);
    res.status(500).json({ error: "Error interno del servidor al facturar" });
  }
};

const obtenerFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`facturas/${id}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }
    res.json({ success: true, factura: { id, ...snapshot.val() }, puede_editar: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const editarFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const facturaRef = db.ref(`facturas/${id}`);

    // Obtener factura actual para historial
    const snapshot = await facturaRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }
    const facturaActual = snapshot.val();

    // Registrar cambios en historial
    const historial = facturaActual.historial_modificaciones || [];
    historial.push({
      fecha: new Date().toISOString(),
      campos_modificados: Object.keys(updates)
    });

    // Aplicar actualizaciones
    await facturaRef.update({
      ...updates,
      historial_modificaciones: historial
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const marcarComoImpresa = async (req, res) => {
  try {
    const { id } = req.params;
    await db.ref(`facturas/${id}`).update({
      impresa: true,
      fecha_impresion: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  crearFactura,
  obtenerFactura,
  editarFactura,
  marcarComoImpresa
};
