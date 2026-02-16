const { db } = require("../config/firebase");

/**
 * Crear una nueva factura desde una cotización
 */
const crearFactura = async (req, res) => {
  // 1. Validaciones iniciales
  if (!db) {
    return res.status(500).json({ error: "Base de datos no disponible" });
  }

  let { cotizacion, cliente, tipoNCF, condicionVenta, metodoPago, referenciaPago, abono } = req.body;

  // Sanitizar tipoNCF (Forzar mayúsculas y quitar espacios) para evitar errores como "b1"
  if (tipoNCF) tipoNCF = tipoNCF.trim().toUpperCase();

  console.log(`🔍 [Facturación] Procesando solicitud para NCF: '${tipoNCF}'`);

  if (!cotizacion || !cliente || !tipoNCF) {
    return res.status(400).json({ 
      error: "Datos incompletos para facturar. Se requiere cotización, cliente y tipo de NCF." 
    });
  }

  try {
    // Obtener la secuencia de NCF de forma atómica para evitar duplicados
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

    // Validación 2.1: Fecha de Vencimiento (Nueva)
    if (data.fecha_vencimiento) {
        const hoy = new Date().toISOString().split('T')[0];
        if (hoy > data.fecha_vencimiento) {
            return res.status(400).json({ 
                error: `La secuencia NCF '${tipoNCF}' venció el ${data.fecha_vencimiento}.` 
            });
        }
    }

    // Validación 2: Activo
    if (data.activo === false || data.activo === 'false') {
        return res.status(400).json({ 
            error: `La secuencia NCF '${tipoNCF}' está desactivada.` 
        });
    }

    // Validación 3: Campos obligatorios y tipos (Evita el error de "incompletos")
    const actual = parseInt(data.actual, 10);
    const hasta = parseInt(data.hasta, 10);

    if (isNaN(actual) || isNaN(hasta)) {
        return res.status(400).json({ 
            error: `Configuración corrupta para '${tipoNCF}'. Faltan campos 'actual' o 'hasta'.` 
        });
    }

    // Validación 4: Límite (Pre-check)
    // Nota: Si actual == hasta, ya se usó el último, así que no hay disponibles.
    if (actual >= hasta) {
        return res.status(400).json({ 
            error: `⛔ Comprobantes '${tipoNCF}' AGOTADOS. Actual: ${actual}, Límite: ${hasta}.` 
        });
    }

    // 3. TRANSACCIÓN ATÓMICA (Incremento seguro)
    const result = await secuenciaRef.transaction((currentData) => {
      // Si el nodo no existe o es nulo, abortamos (no creamos nada)
      if (currentData === null) return;
      
      // Validaciones de seguridad dentro de la transacción (Concurrency safe)
      if (!currentData.activo) return;

      // Validación atómica de fecha
      if (currentData.fecha_vencimiento) {
          const hoy = new Date().toISOString().split('T')[0];
          if (hoy > currentData.fecha_vencimiento) return;
      }

      // Obtener valores numéricos seguros
      const actual = currentData.actual !== undefined ? Number(currentData.actual) : 0;
      const desde = currentData.desde !== undefined ? Number(currentData.desde) : 1;
      const hasta = Number(currentData.hasta);

      if (isNaN(hasta)) return;

      // Calcular siguiente y validar rango
      let siguiente = actual + 1;
      if (siguiente < desde) siguiente = desde;
      
      if (siguiente > hasta) return; // Agotado

      // Retornar nuevo estado
      return { ...currentData, actual: siguiente };
    });

    // 4. Manejo del resultado de la transacción
    if (!result.committed || !result.snapshot.exists()) {
        // Si falló, probablemente fue por una de las condiciones de aborto en la transacción
        // Como ya hicimos pre-validación, lo más probable es concurrencia extrema o borrado
        return res.status(400).json({ 
            error: `No se pudo generar el NCF '${tipoNCF}'. Verifique que esté activo y tenga disponibilidad.` 
        });
    }

    // El valor que usamos es el que tenía 'actual' ANTES de incrementarse en la transacción
    // CORRECCIÓN: Ahora 'actual' representa el ÚLTIMO USADO.
    // Al incrementarse en la transacción, el valor en snapshot es el que acabamos de reservar.
    const numeroSecuencia = parseInt(result.snapshot.val().actual, 10);
    
    console.log(`✅ [Facturación] Secuencia ${tipoNCF} consumida. Nuevo contador en DB: ${result.snapshot.val().actual}`);
    
    const ncfCompleto = tipoNCF + String(numeroSecuencia).padStart(8, '0');

    // Crear el objeto final de la factura
    const nuevaFactura = {
      ...cotizacion,
      tipo_documento: 'Factura',
      ncf: ncfCompleto,
      rnc_cliente: cliente.rnc,
      razon_social: cliente.nombre,
      fecha_facturacion: new Date().toISOString(),
      origen_cotizacion: cotizacion.id,
      estado: 'vigente', // Estado inicial de la factura
      impresa: false, // Bandera informativa (no bloquea edición)
      fecha_creacion: new Date().toISOString(),
      historial_modificaciones: [], // Inicializamos el historial
      condicion_venta: condicionVenta || 'contado',
      metodo_pago: metodoPago || 'efectivo',
      referencia: referenciaPago || '',
      abono: abono || 0
    };

    delete nuevaFactura.id;

    // Guardar la nueva factura
    const facturaRef = await db.ref('facturas').push(nuevaFactura);

    // Marcar la cotización como facturada
    await db.ref(`cotizaciones/${cotizacion.id}`).update({ 
      ncf: ncfCompleto, 
      estado: 'facturada' 
    });

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
    if (!snapshot.exists()) return res.status(404).json({ success: false, error: 'Factura no encontrada' });
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