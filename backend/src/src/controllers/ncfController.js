const { db } = require("../config/firebase");

// Función auxiliar para parsear NCF (Ej: B0100000001 -> { tipo: 'B01', secuencia: 1 })
const parseNCF = (ncf) => {
    const match = ncf.match(/^([A-Z]\d{2})(\d{8})$/);
    if (!match) return null;
    return { tipo: match[1], secuencia: parseInt(match[2], 10) };
};

const configurarRango = async (req, res) => {
    try {
        const { desde, hasta, fecha_vencimiento } = req.body;

        // 1. Validaciones de formato
        const inicio = parseNCF(desde);
        const fin = parseNCF(hasta);

        if (!inicio || !fin) {
            return res.status(400).json({ error: "Formato inválido. Debe ser Tipo (3 chars) + 8 dígitos. Ej: B0100000001" });
        }

        // 2. Validaciones de lógica
        if (inicio.tipo !== fin.tipo) {
            return res.status(400).json({ error: "El tipo de comprobante inicial y final no coinciden." });
        }

        if (fin.secuencia < inicio.secuencia) {
            return res.status(400).json({ error: "El rango final debe ser mayor o igual al inicial." });
        }

        // 3. Guardar en Base de Datos
        // Sobrescribe la configuración anterior para este tipo
        await db.ref(`secuencias_ncf/${inicio.tipo}`).set({
            tipo: inicio.tipo,
            desde: inicio.secuencia,
            hasta: fin.secuencia,
            actual: inicio.secuencia - 1, // Inicializamos en (desde - 1) para que el primero sea 'desde'
            activo: true,
            fecha_vencimiento: fecha_vencimiento || null,
            fecha_configuracion: new Date().toISOString()
        });

        res.json({ 
            success: true, 
            message: `Rango ${inicio.tipo} configurado correctamente (${inicio.secuencia} - ${fin.secuencia})` 
        });

    } catch (error) {
        console.error("Error configurando NCF:", error);
        res.status(500).json({ error: "Error interno al guardar la configuración." });
    }
};

const obtenerEstado = async (req, res) => {
    try {
        const snapshot = await db.ref("secuencias_ncf").once("value");
        const data = snapshot.val() || {};
        
        const estados = Object.keys(data).map(key => {
            const item = data[key];
            // Corrección cálculo disponibles (actual es el último usado)
            const disponibles = item.hasta - item.actual;
            const porcentaje = ((item.actual - item.desde) / (item.hasta - item.desde)) * 100;
            
            // Calcular próximo
            let proximo = (item.actual || 0) + 1;
            // Sincronizar con lógica de facturación: si es menor al inicio, saltar al inicio
            if (item.desde && proximo < item.desde) proximo = item.desde;

            let proximoStr = item.tipo + String(proximo).padStart(8, '0');
            if (proximo > item.hasta) proximoStr = "AGOTADO";

            return {
                tipo: item.tipo,
                actual: item.tipo + String(item.actual).padStart(8, '0'),
                proximo: proximoStr,
                hasta: item.tipo + String(item.hasta).padStart(8, '0'),
                disponibles: disponibles > 0 ? disponibles : 0,
                agotado: item.actual >= item.hasta,
                alerta: disponibles <= 10 && disponibles > 0,
                fecha_vencimiento: item.fecha_vencimiento || 'N/A'
            };
        });

        res.json(estados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { configurarRango, obtenerEstado };