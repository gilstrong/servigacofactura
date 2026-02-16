const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Función auxiliar para cargar imágenes en Base64 (Logo, Firma, Sello)
const getImageBase64 = (filename) => {
    try {
        const imagePath = path.join(__dirname, '../../../public/assets/', filename);
        if (fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            return `data:image/png;base64,${bitmap.toString('base64')}`;
        }
    } catch (e) { console.error(`Error cargando imagen ${filename}:`, e); }
    return null;
};

const generarPDF = async (req, res) => {
    let browser = null;
    try {
        console.log("🔵 [PDF] Solicitud recibida. Datos:", req.body ? "OK" : "VACÍO");
        const data = req.body || {};
        
        // 1. Preparar datos y Logo
        const logoSrc = getImageBase64('logo.png');
        const selloSrc = getImageBase64('sello.png');
        const firmaSrc = getImageBase64('firma.png');
        const { ncf, fecha, cliente, items, subtotal, impuestos, total, tituloDocumento, condicion, vencimiento, abono } = data;
        
        // Validación de seguridad para evitar crash si items es undefined
        const listaItems = Array.isArray(items) ? items : [];
        const datosCliente = cliente || {};

        // Detectar si es venta a crédito para mostrar saldo pendiente
        const esCredito = (condicion || '').toLowerCase().includes('credito');
        const montoAbono = parseFloat(abono || 0);
        const montoPendiente = parseFloat(total || 0) - montoAbono;

        // Lógica inteligente para fecha de vencimiento
        let fechaVencimiento = vencimiento;

        // 1. Si es crédito y no hay fecha, calcularla automáticamente
        if (esCredito && (!fechaVencimiento || fechaVencimiento === 'N/A')) {
            const diasMatch = (condicion || '').match(/\d+/);
            const dias = diasMatch ? parseInt(diasMatch[0], 10) : 30; // Default 30 días si no especifica
            
            if (fecha && typeof fecha === 'string') {
                try {
                    // Soportar formatos DD/MM/YYYY y YYYY-MM-DD
                    let fechaObj;
                    if (fecha.includes('/')) {
                        const [dia, mes, anio] = fecha.split('/').map(Number);
                        fechaObj = new Date(anio, mes - 1, dia);
                    } else {
                        const [anio, mes, dia] = fecha.split('-').map(Number);
                        fechaObj = new Date(anio, mes - 1, dia);
                    }
                    
                    if (!isNaN(fechaObj.getTime())) {
                        fechaObj.setDate(fechaObj.getDate() + dias);
                        fechaVencimiento = fechaObj.toLocaleDateString('es-DO');
                    }
                } catch (e) { /* Fallback silencioso */ }
            }
        }

        // 2. Formatear si viene como YYYY-MM-DD para que se vea bonita (DD/MM/YYYY)
        if (fechaVencimiento && typeof fechaVencimiento === 'string' && fechaVencimiento.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = fechaVencimiento.split('-');
            fechaVencimiento = `${d}/${m}/${y}`;
        }

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

                /* Signatures */
                .signatures-section { margin-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                .signature-box { width: 200px; text-align: center; position: relative; }
                .signature-line { border-top: 1px solid #333; padding-top: 5px; font-size: 12px; font-weight: bold; color: #333; }
                .signature-image { height: 60px; width: auto; margin-bottom: -10px; position: relative; z-index: 10; }
                .seal-image { 
                    position: absolute; 
                    top: -50px; 
                    left: 50%; 
                    transform: translateX(-50%) rotate(-5deg); 
                    height: 110px; 
                    width: auto; 
                    opacity: 0.8; 
                    z-index: 5; 
                }

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
                        Av. Independencia esq. Héroes de Luperón<br>
                        Tel: 809-682-1075
                    </p>
                </div>
                <div class="invoice-details">
                    <h1 class="invoice-title">${tituloDocumento || 'FACTURA'}</h1>
                    <div class="meta-item"><span class="meta-label">NCF:</span><span class="meta-value" style="color: #2563eb;">${ncf || 'N/A'}</span></div>
                    <div class="meta-item"><span class="meta-label">Fecha:</span><span class="meta-value">${fecha}</span></div>
                    ${esCredito && fechaVencimiento ? `
                    <div class="meta-item">
                        <span class="meta-label" style="color: #dc2626;">Vence:</span>
                        <span class="meta-value" style="color: #dc2626;">${fechaVencimiento}</span>
                    </div>` : ''}
                    <div class="meta-item"><span class="meta-label">Condición:</span><span class="meta-value" style="text-transform: capitalize;">${condicion || 'Contado'}</span></div>
                </div>
            </div>

            <div class="client-box">
                <div class="client-label">Facturado a:</div>
                <div class="client-name">${datosCliente.nombre || 'Cliente General'}</div>
                <div class="client-meta">RNC/Cédula: <strong>${datosCliente.rnc || 'N/A'}</strong> • Tel: ${datosCliente.telefono || 'N/A'}</div>
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
                    ${esCredito ? `
                    ${montoAbono > 0 ? `
                    <tr>
                        <td class="label" style="color: #16a34a; padding-top: 5px;">Abonado:</td>
                        <td class="value" style="color: #16a34a; padding-top: 5px;">RD$ ${montoAbono.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>` : ''}
                    <tr>
                        <td class="label" style="color: #dc2626; padding-top: 5px;">Pendiente:</td>
                        <td class="value" style="color: #dc2626; padding-top: 5px; font-weight: bold;">RD$ ${montoPendiente.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    </tr>` : ''}
                </table>
            </div>

            <div class="signatures-section">
                <div class="signature-box">
                    <div style="height: 50px;"></div>
                    <div class="signature-line">Recibido Conforme</div>
                </div>
                
                <div class="signature-box">
                    ${selloSrc ? `<img src="${selloSrc}" class="seal-image" />` : ''}
                    ${firmaSrc ? `<img src="${firmaSrc}" class="signature-image" />` : '<div style="height: 50px;"></div>'}
                    <div class="signature-line">Firma Autorizada</div>
                </div>
            </div>

            <div class="footer">Documento generado electrónicamente por ServiGaco System.</div>
        </body>
        </html>
        `;

        // 3. Generar PDF con Puppeteer
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-gpu',            // Vital para evitar errores de renderizado
                '--disable-dev-shm-usage',   // Evita problemas de memoria en el proceso
                '--font-render-hinting=none' // Optimización de fuentes
            ]
        });
        const page = await browser.newPage();
        
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
        if (browser) await browser.close();
    }
};

module.exports = { generarPDF };
