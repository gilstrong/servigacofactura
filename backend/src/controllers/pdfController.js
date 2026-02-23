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
    // ✅ Optimización: Limpieza proactiva si el navegador existe pero está desconectado
    if (browser) {
        if (browser.isConnected()) return;
        try { await browser.close(); } catch (e) {}
        browser = null;
    }

    try {
        console.log("🚀 Iniciando navegador Puppeteer...");
        browser = await puppeteer.launch({
            headless: true,
            args: puppeteerArgs
        });

        // ✅ Optimización: Detectar desconexión para limpiar la referencia
        browser.on('disconnected', () => {
            console.warn("⚠️ Navegador desconectado. Se reiniciará en la próxima solicitud.");
            browser = null;
        });

        console.log("✅ Navegador listo.");
    } catch (e) {
        console.error("❌ Error iniciando navegador:", e);
        browser = null; // Asegurar que sea null para reintentar luego
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
        
        // 1. Preparar datos y Logo
        const logoSrc = logoBase64Cache; // Usar variable en memoria (Instantáneo)
        const { ncf, fecha, cliente, items, subtotal, impuestos, total, tituloDocumento, condicion } = data;
        
        const formatearCondicion = (valor) => {
            if (!valor) return "Contado";
        
            if (valor.startsWith("credito_")) {
                const dias = valor.split("_")[1];
                return `Crédito a ${dias} días`;
            }
        
            return "Contado";
        };
        
        const condicionFormateada = formatearCondicion(condicion);

        // Validación de seguridad para evitar crash si items es undefined
        const listaItems = Array.isArray(items) ? items : [];
        const datosCliente = cliente || {};

        // 2. Construir HTML
        const rows = listaItems.map((item, i) => `
            <tr class="${i % 2 === 0 ? 'bg-gray' : ''}">
                <td class="col-desc">
                    <div class="item-name">${item.nombre || 'Item'}</div>
                    <div class="item-desc">${item.descripcion || ''}</div>
                </td>
                <td class="col-center">${item.cantidad || 0}</td>
                <td class="col-right">RD$ ${parseFloat(item.precioUnitario || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                <td class="col-right font-bold">RD$ ${parseFloat(item.precio || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

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
                .logo-img { height: 70px; width: auto; object-fit: contain; }

                /* Invoice Details */
                .invoice-details { text-align: right; }
                .invoice-title { font-size: 32px; font-weight: 900; color: #1e293b; margin: 0 0 5px 0; letter-spacing: -1px; }
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
                        RNC: 131-27958-9<br>
                        Av. Independencia esq. Héroes de Luperón
                    </p>
                </div>
                <div class="invoice-details">
                    <h1 class="invoice-title">${tituloDocumento || 'FACTURA'}</h1>
                    <div class="meta-item"><span class="meta-label">NCF:</span><span class="meta-value" style="color: #2563eb;">${ncf || 'N/A'}</span></div>
                    <div class="meta-item"><span class="meta-label">Fecha:</span><span class="meta-value">${fecha}</span></div>
                    <div class="meta-item"><span class="meta-label">Condición:</span><span class="meta-value" style="text-transform: capitalize;">${condicionFormateada}</span></div>
                </div>
            </div>

            <div class="client-box">
                <div class="client-label">Facturado a:</div>
                <div class="client-name">${datosCliente.nombre || 'Cliente General'}</div>
                <div class="client-meta">RNC/Cédula: ${datosCliente.rnc || 'N/A'} • Tel: ${datosCliente.telefono || 'N/A'}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="col-desc">Descripción</th>
                        <th class="col-center">Cant.</th>
                        <th class="col-right">Precio</th>
                        <th class="col-right">Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

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
                </table>
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

        // ✅ Optimización: Verificación extra por si initBrowser falló
        if (!browser) throw new Error("No se pudo inicializar el navegador.");

        page = await browser.newPage();
        
        // ✅ Optimización: Manejo de errores a nivel de página
        page.on('error', err => console.error('❌ Error en página Puppeteer:', err));

        // CAMBIO: Usamos 'domcontentloaded' para evitar que se cuelgue esperando recursos
        // ✅ Optimización: Timeout reducido a 30s para evitar bloqueos largos
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // ✅ Optimización: Timeout explícito en generación de PDF
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true, 
            margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
            timeout: 30000 
        });

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
        
        // ✅ Optimización: Detección de crash del navegador para forzar reinicio
        if (error.message && (
            error.message.includes('Protocol error') || 
            error.message.includes('Target closed') ||
            error.message.includes('Session closed')
        )) {
            console.warn("⚠️ Detectado fallo crítico en navegador. Reiniciando instancia...");
            try { if (browser) await browser.close(); } catch(e) {}
            browser = null;
        }

        if (!res.headersSent) {
            res.status(500).json({ error: "Error al generar el PDF", details: error.message });
        }
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (e) {
                // Ignorar errores si la página ya estaba cerrada o el navegador murió
                if (!e.message.includes('Protocol error') && !e.message.includes('Target closed')) {
                    console.error("Error cerrando página:", e);
                }
            }
        }
    }
};


// ✅ NUEVO: Endpoint para verificar el estado de salud del navegador
const verificarSalud = async (req, res) => {
    try {
        if (browser && browser.isConnected()) {
            // Si está conectado, obtenemos la versión como una prueba adicional.
            const version = await browser.version();
            res.status(200).json({
                status: 'ok',
                message: 'Navegador Puppeteer conectado y listo.',
                connected: true,
                version: version,
            });
        } else {
            // Si no está conectado o la instancia es nula, el servicio no está disponible.
            res.status(503).json({
                status: 'error',
                message: 'Navegador Puppeteer no inicializado o desconectado.',
                connected: false,
            });
        }
    } catch (error) {
        console.error("❌ Error en health check de Puppeteer:", error);
        res.status(500).json({ status: 'error', message: 'Ocurrió un error interno al verificar el estado del navegador.', details: error.message });
    }
};

module.exports = { generarPDF, verificarSalud };
