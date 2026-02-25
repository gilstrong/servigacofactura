const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let browser;
let logoBase64Cache = null;

// Configuración optimizada de argumentos para Render (Más agresiva)
const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--font-render-hinting=none',
    '--disable-extensions',            // Nuevo: Desactiva extensiones
    '--disable-background-networking', // Nuevo: Evita tráfico de red oculto
    '--disable-default-apps',          // Nuevo
    '--disable-sync',                  // Nuevo: Evita sincronización de Google
    '--mute-audio'                     // Nuevo: Ahorra recursos de audio
];

// Función centralizada para iniciar el navegador
const initBrowser = async () => {
    if (browser && browser.isConnected()) return;
    try {
        console.log("🚀 Iniciando navegador Puppeteer...");
        browser = await puppeteer.launch({
            headless: true,
            args: puppeteerArgs
        });
        console.log("✅ Navegador listo.");
    } catch (e) {
        console.error("❌ Error iniciando navegador:", e);
    }
};

// Inicialización al arranque (Browser + Logo Caché)
(async () => {
    // 1. Cargar Logo en memoria UNA SOLA VEZ (Evita lectura de disco por petición)
    try {
        const logoPath = path.join(__dirname, '../../../public/assets/logo.png');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            logoBase64Cache = `data:image/png;base64,${bitmap.toString('base64')}`;
        }
    } catch (e) { console.error("Error cargando logo al inicio:", e); }

    // 2. Iniciar navegador
    await initBrowser();
})();

const generarPDF = async (req, res) => {
    let page = null;
    try {
        console.log("🔵 [PDF] Solicitud recibida. Datos:", req.body ? "OK" : "VACÍO");
        const data = req.body || {};
        
        // 1. Preparar datos, Logo y Abono
        const logoSrc = logoBase64Cache; // Usar variable en memoria (Instantáneo)
        
        // Cargar firma dinámicamente (Fix solicitado)
        let firmaSrc = null;
        try {
            const firmaPath = path.join(__dirname, '../../../public/assets/firma.png');
            if (fs.existsSync(firmaPath)) {
                const firmaBase64 = fs.readFileSync(firmaPath, { encoding: 'base64' });
                firmaSrc = `data:image/png;base64,${firmaBase64}`;
            }
        } catch (e) { console.error("Error cargando firma:", e); }

        // Cargar sello dinámicamente
        let selloSrc = null;
        try {
            const selloPath = path.join(__dirname, '../../../public/assets/sello.png');
            if (fs.existsSync(selloPath)) {
                const selloBase64 = fs.readFileSync(selloPath, { encoding: 'base64' });
                selloSrc = `data:image/png;base64,${selloBase64}`;
            }
        } catch (e) { console.error("Error cargando sello:", e); }

        const { ncf, fecha, cliente, items, subtotal, impuestos, total, tituloDocumento, condicion, abono, vencimiento, observaciones } = data;
        
        // Detectar si es una cotización para ocultar campos fiscales
        const esCotizacion = (ncf === 'COTIZACIÓN') || (tituloDocumento && tituloDocumento.toUpperCase().includes('COTIZACIÓN'));

        // Determinar descripción del tipo de NCF para mostrar en Factura
        let tipoNCFDescripcion = '';
        if (!esCotizacion && ncf && ncf.length >= 3) {
            const prefix = ncf.substring(0, 3);
            const tiposNCF = {
                'B01': 'Comprobante Crédito Fiscal',
                'B02': 'Comprobante Consumidor Final',
                'B03': 'Comprobante Nota de Débito',
                'B04': 'Comprobante Nota de Crédito',
                'B14': 'Comprobante Regímenes Especiales',
                'B15': 'Comprobante Gubernamental'
            };
            tipoNCFDescripcion = tiposNCF[prefix] || '';
        }

        const formatearCondicion = (valor) => {
            if (!valor) return "Contado";

            // Si viene el código interno (ej: "credito_15"), lo traduce a texto legible.
            if (valor.startsWith("credito_")) {
                const dias = valor.split("_")[1];
                return `Crédito a ${dias} días`;
            }

            // Si el valor ya es un texto legible (ej: "Crédito a 15 días" o "Contado"), simplemente lo retornamos.
            return valor;
        };
        
        const condicionFormateada = formatearCondicion(condicion);
        const esCredito = condicionFormateada.toLowerCase().includes("crédito") || condicionFormateada.toLowerCase().includes("credito");

        // --- LÓGICA DE FECHAS (CORREGIDA) ---

        // 1. Función segura para parsear fechas y evitar problemas de zona horaria
        const parseDate = (dateString) => {
            if (!dateString) return null;
            let date;
            try {
                // Formato DD/MM/YYYY
                if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateString)) {
                    const [d, m, y] = dateString.split('/');
                    date = new Date(Date.UTC(y, parseInt(m, 10) - 1, d));
                } 
                // Formato YYYY-MM-DD o ISO
                else {
                    const parts = dateString.split('T')[0].split('-');
                    date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                }
                if (date && !isNaN(date.getTime())) return date;
            } catch (e) { /* Fall through */ }
            return null;
        };

        const fechaBaseFactura = parseDate(fecha);

        // 2. Calcular Vencimiento del NCF (Fecha de factura + 1 año)
        let vencimientoNCF = "";
        if (fechaBaseFactura) {
            try {
                const fechaVencNCF = new Date(fechaBaseFactura);
                fechaVencNCF.setUTCFullYear(fechaVencNCF.getUTCFullYear() + 1);
                vencimientoNCF = fechaVencNCF.toLocaleDateString('es-DO', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch (e) { console.error("Error calculando vencimiento NCF:", e); }
        }

        // 3. Calcular Vencimiento del Crédito (si aplica)
        let vencimientoCreditoFormateado = "";
        let fechaVencimientoCredito = null;
        if (esCredito && fechaBaseFactura) {
            try {
                fechaVencimientoCredito = new Date(fechaBaseFactura);
                if (condicion === 'credito_15' || condicionFormateada.includes('15')) {
                    fechaVencimientoCredito.setUTCDate(fechaVencimientoCredito.getUTCDate() + 15);
                } else if (condicion === 'credito_30' || condicionFormateada.includes('30')) {
                    fechaVencimientoCredito.setUTCDate(fechaVencimientoCredito.getUTCDate() + 30);
                }
                
                if (!isNaN(fechaVencimientoCredito.getTime())) {
                    vencimientoCreditoFormateado = fechaVencimientoCredito.toLocaleDateString('es-DO', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            } catch (e) { /* No hacer nada si el formato es inválido */ }
        }

        // Lógica para saldo pendiente y estado de vencimiento
        const saldoPendiente = parseFloat(total || 0) - parseFloat(abono || 0);
        let estaVencida = false;
        if (fechaVencimientoCredito && saldoPendiente > 0) {
            const hoy = new Date();
            const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
            if (fechaVencimientoCredito < hoyUTC) {
                estaVencida = true;
            }
        }

        // Definir estilos condicionales para el saldo pendiente
        const estiloPendienteLabel = `color: #dc2626; ${estaVencida ? 'font-weight: 900; font-size: 16px;' : ''}`;
        const estiloPendienteValor = `color: #dc2626; ${estaVencida ? 'font-weight: 900; font-size: 20px;' : ''}`;


        // Validación de seguridad para evitar crash si items es undefined
        const listaItems = Array.isArray(items) ? items : [];
        const datosCliente = cliente || {};

        // Determinar si hay ITBIS para mostrar la columna
        const mostrarItbis = (impuestos || []).some(i => parseFloat(i.monto) > 0);

        // HTML para las observaciones (solo si existen)
        const observacionesHTML = observaciones ? `
            <div class="notes-section">
                <div class="notes-title">Observaciones:</div>
                <p class="notes-text">${observaciones.replace(/\n/g, '<br>')}</p>
            </div>
        ` : '';

        // 2. Construir HTML
        const rows = listaItems.map((item, i) => {
            const precioTotalItem = parseFloat(item.precio || 0);
            const itbisItem = mostrarItbis ? precioTotalItem * 0.18 : 0;
            return `
            <tr class="${i % 2 === 0 ? 'bg-gray' : ''}">
                <td class="col-desc">
                    <div class="item-name">${item.nombre || 'Item'}</div>
                    <div class="item-desc">${item.descripcion || ''}</div>
                </td>
                <td class="col-center">${item.cantidad || 0}</td>
                <td class="col-right">RD$ ${parseFloat(item.precioUnitario || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                ${mostrarItbis ? `<td class="col-right">RD$ ${itbisItem.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>` : ''}
                <td class="col-right font-bold">RD$ ${precioTotalItem.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
            </tr>
        `}).join('');

        const impuestosHTML = (impuestos || []).map(imp => `
            <tr class="tax-row">
                <td class="label">${imp.nombre}:</td>
                <td class="value">RD$ ${parseFloat(imp.monto || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { margin: 0; size: A4; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    color: #333; 
                    font-size: 14px; 
                    line-height: 1.4; 
                    margin: 0;
                    padding: 40px; 
                    background: #fff;
                }
                
                /* Header */
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                .company-info h1 { margin: 0; font-size: 22px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
                .company-info p { margin: 5px 0 0; font-size: 12px; color: #666; }
                .logo-img { height: 90px; width: auto; object-fit: contain; }

                /* Invoice Details */
                .invoice-details { text-align: right; }
                .invoice-title { font-size: 32px; font-weight: 900; color: #1e293b; margin: 0 0 5px 0; letter-spacing: -1px; }
                .invoice-subtitle { font-size: 15px; font-weight: 800; color: #475569; margin: -2px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .meta-item { margin-bottom: 3px; }
                .meta-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; margin-right: 5px; }
                .meta-value { font-weight: bold; color: #333; font-size: 13px; }

                /* Client Info */
                .client-box { background-color: #f8fafc; border-radius: 6px; padding: 15px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .client-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                .client-name { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
                .client-meta { font-size: 12px; color: #475569; }

                /* Table */
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #1e293b; color: #fff; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
                .bg-gray { background-color: #f8fafc; }
                .col-desc { width: 50%; }
                .col-center { text-align: center; }
                .col-right { text-align: right; }
                .item-name { font-weight: 600; color: #333; }
                .item-desc { font-size: 11px; color: #666; margin-top: 2px; }
                .font-bold { font-weight: 700; }

                /* Totals */
                .totals-container { display: flex; justify-content: flex-end; }
                .totals-table { width: 280px; border-collapse: collapse; }
                .totals-table td { padding: 6px 0; border: none; }
                .totals-table .label { text-align: left; font-weight: 600; color: #64748b; }
                .totals-table .value { text-align: right; font-weight: 600; color: #333; }
                .totals-table .total-row td { border-top: 2px solid #1e293b; padding-top: 12px; padding-bottom: 0; }
                .total-final-label { font-size: 14px; font-weight: 900; color: #1e293b; }
                .total-final-value { font-size: 18px; font-weight: 900; color: #2563eb; }

                /* Notes */
                .notes-section { margin-top: 20px; margin-bottom: 20px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #f8fafc; }
                .notes-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
                .notes-text { font-size: 12px; color: #475569; margin: 0; white-space: pre-wrap; }

                /* Signatures */
                .signatures-container { display: flex; justify-content: space-between; text-align: center; margin-top: 80px; page-break-inside: avoid; }
                .signature-box { width: 30%; position: relative; }
                .signature-line { 
                    height: 60px; /* Espacio para firma y sello */
                    border-bottom: 1px solid #475569; 
                    margin-bottom: 8px; 
                    position: relative;
                    z-index: 10;
                }
                .signature-img {
                    position: absolute;
                    bottom: 8px;
                    left: 50%;
                    transform: translateX(-50%);
                    max-height: 180px;
                    max-width: 200%;
                    z-index: 1;
                }
                .seal-img {
                    width: 180px; /* Aumentado para mayor visibilidad */
                    opacity: 0.8;
                    margin-top: 15px; /* Espacio entre el texto "Realizado Por" y el sello */
                }
                .signature-box p { font-size: 12px; color: #333; margin: 0; font-weight: 600; position: relative; z-index: 10; }

                /* Footer */
                .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="company-info">
                    ${logoSrc ? `<img src="${logoSrc}" class="logo-img"/>` : '<h1>SERVICIOS</h1>'}
                    <p>
                        <strong>CENTRO DE COPIADO S & C, SRL</strong><br>
                         RNC: 130-84851-3<br>
                        Email: servigacosy@gmail.com<br>
                        Tel: 809-682-1075<br>
                        C/CORREA Y CIDRÓN, No. 22, PLAZA CIUDADELA
                    </p>
                </div>
                <div class="invoice-details">
                    <h1 class="invoice-title" style="${esCotizacion ? 'color: #ea580c;' : ''}">${tituloDocumento || 'FACTURA CON VALOR FISCAL'}</h1>
                    ${!esCotizacion && tipoNCFDescripcion ? `<h2 class="invoice-subtitle">${tipoNCFDescripcion}</h2>` : ''}
                    ${!esCotizacion ? `<div class="meta-item"><span class="meta-label">NCF:</span><span class="meta-value" style="color: #2563eb;">${ncf || 'N/A'}</span></div>` : ''}
                    ${!esCotizacion && vencimientoCreditoFormateado ? `<div class="meta-item"><span class="meta-label">Vencimiento del crédito:</span><span class="meta-value" style="color: red;">${vencimientoCreditoFormateado}</span></div>` : ''}
                    <div class="meta-item"><span class="meta-label">Fecha:</span><span class="meta-value">${fecha}</span></div>
                    ${!esCotizacion ? `<div class="meta-item"><span class="meta-label">Condición:</span><span class="meta-value" style="text-transform: capitalize;">${condicionFormateada}</span></div>` : ''}
                    ${!esCotizacion && vencimientoNCF ? `<div class="meta-item"><span class="meta-label">Vencimiento de NCF:</span><span class="meta-value">${vencimientoNCF}</span></div>` : ''}
                </div>
            </div>

            <div class="client-box">
                <div class="client-label">Facturado a:</div>
                <div class="client-name">${datosCliente.nombre || 'Cliente General'}</div>
                <div class="client-meta">RNC/Cédula: ${datosCliente.rnc || 'N/A'} • Tel: ${datosCliente.telefono || datosCliente.tel || 'N/A'}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="col-desc">Descripción</th>
                        <th class="col-center">Cant.</th>
                        <th class="col-right">Precio</th>
                        ${mostrarItbis ? '<th class="col-right">ITBIS</th>' : ''}
                        <th class="col-right">Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            ${observacionesHTML}

            <div class="totals-container">
                <table class="totals-table">
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="value">RD$ ${parseFloat(subtotal || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>
                    ${impuestosHTML}
                    <tr class="total-row">
                        <td class="total-final-label">TOTAL:</td>
                        <td class="total-final-value">RD$ ${parseFloat(total || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>
                    ${!esCotizacion && esCredito && saldoPendiente > 0 ? `
                    <tr class="total-row">
                        <td class="total-final-label" style="${estiloPendienteLabel}">PENDIENTE:</td>
                        <td class="total-final-value" style="${estiloPendienteValor}">RD$ ${saldoPendiente.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <div class="signatures-container">
                <div class="signature-box">
                    <div style="position: relative;">
                        ${firmaSrc ? `<img src="${firmaSrc}" class="signature-img" style="width: 250px;" alt="Firma" />` : ''}
                        <div class="signature-line"></div>
                    </div>
                    <p>Realizado Por:</p>
                    ${selloSrc ? `<img src="${selloSrc}" class="seal-img" alt="Sello" />` : ''}
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p>Entregado por:</p>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <p>Recibido por:</p>
                </div>
            </div>

            <div class="footer">Documento generado electrónicamente por ServiGaco System.</div>
        </body>
        </html>
        `;

        // 3. Generar PDF con Puppeteer
        // Verificar si el navegador está conectado, si no, reiniciarlo
        if (!browser || !browser.isConnected()) {
            await initBrowser();
        }

        page = await browser.newPage();
        
        // CAMBIO: Usamos 'domcontentloaded' para evitar que se cuelgue esperando recursos
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' } });

        // 🔎 Paso 2 — Verifica tamaño del PDF y guarda copia local
        console.log(`📦 Tamaño del PDF generado: ${pdfBuffer.length} bytes`);
        try {
            const tempPath = path.join(__dirname, `../../temp_pdf_${Date.now()}.pdf`);
            fs.writeFileSync(tempPath, pdfBuffer);
            console.log(`📝 Copia de depuración guardada en: ${tempPath}`);
        } catch (writeErr) {
            console.warn("⚠️ No se pudo guardar copia local (esto no afecta la descarga):", writeErr.message);
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("El PDF se generó vacío (0 bytes).");
        }

        // 4. Enviar PDF al cliente
        // Limpiamos el nombre de caracteres especiales (tildes, ñ) para evitar headers corruptos
        const ncfLimpio = (ncf || 'Generada').replace(/[^a-zA-Z0-9\-\_]/g, '');
        const downloadName = `Factura_${ncfLimpio}.pdf`;
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${downloadName}"`
            // No ponemos Content-Length como sugeriste para depurar.
        });
        res.end(pdfBuffer);

    } catch (error) {
        console.error("❌ [PDF] Error CRÍTICO:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Error al generar el PDF", details: error.message });
        }
    } finally {
        if (page) await page.close();
    }
};

module.exports = { generarPDF };
