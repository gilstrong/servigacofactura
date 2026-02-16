// Configuración
const API_URL = (window.location.port === '5500' || window.location.port === '5501')
    ? 'http://localhost:3000/api'
    : '/api';

// Obtener ID de la factura desde la URL
const urlParams = new URLSearchParams(window.location.search);
const facturaId = urlParams.get('id');

let facturaActual = null;

// Cargar factura al iniciar
if (facturaId) {
    cargarFactura();
} else {
    mostrarError('No se especificó ID de factura en la URL');
}

async function cargarFactura() {
    try {
        const response = await fetch(`${API_URL}/facturas/${facturaId}`);
        const data = await response.json();

        if (data.success) {
            facturaActual = data.factura;
            renderizarFactura(data.factura, data.puede_editar);
        } else {
            mostrarError(data.error || 'Error al cargar la factura');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión con el servidor');
    }
}

function renderizarFactura(factura, puedeEditar) {
    const content = document.getElementById('content');
    const ncfDisplay = document.getElementById('ncfDisplay');
    
    // Diseño Senior para el NCF
    ncfDisplay.innerHTML = `
        <div class="flex flex-col items-center gap-2 animate-fade-in">
            <span class="text-4xl font-black text-gray-800 dark:text-white tracking-tight drop-shadow-sm">${factura.ncf}</span>
            ${factura.impresa 
                ? '<span class="px-4 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm flex items-center gap-1">🖨️ FACTURA IMPRESA</span>' 
                : '<span class="px-4 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm flex items-center gap-1">📝 BORRADOR EDITABLE</span>'}
        </div>
    `;

    let alertHtml = '';
    if (factura.impresa) {
        alertHtml = `
            <div class="mb-8 p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-start gap-4 shadow-sm animate-fade-in">
                <div class="p-3 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-200 shadow-inner">ℹ️</div>
                <div>
                    <h4 class="font-bold text-blue-800 dark:text-blue-200 text-lg">Factura ya impresa</h4>
                    <p class="text-sm text-blue-600 dark:text-blue-300 mt-1 leading-relaxed">
                        Esta factura fue generada el <strong>${new Date(factura.fecha_impresion).toLocaleString('es-DO')}</strong>. 
                        Puedes realizar correcciones, pero recuerda reimprimirla para mantener el físico actualizado.
                    </p>
                </div>
            </div>
        `;
    } else {
        // Opcional: Si no está impresa, no mostramos alerta para mantenerlo limpio, o una muy sutil.
        alertHtml = ''; 
    }

    content.innerHTML = `
        ${alertHtml}

        <form id="formEditar" class="space-y-8 animate-slide-in-up">
            
            <!-- SECCIÓN 1: DATOS GENERALES Y CLIENTE -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Columna Izquierda: Info Factura -->
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <span class="bg-purple-100 text-purple-600 p-1.5 rounded-lg text-sm">📅</span> Detalles
                    </h2>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">NCF (Comprobante)</label>
                            <input type="text" value="${factura.ncf}" disabled class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 font-mono font-medium cursor-not-allowed">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Fecha Emisión</label>
                            <input type="text" value="${new Date(factura.fecha_facturacion).toLocaleString('es-DO')}" disabled class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 font-medium cursor-not-allowed">
                        </div>
                    </div>
                </div>

                <!-- Columna Derecha: Info Cliente (Ocupa 2 espacios) -->
                <div class="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <span class="bg-blue-100 text-blue-600 p-1.5 rounded-lg text-sm">👤</span> Datos del Cliente
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">RNC / Cédula</label>
                            <input type="text" name="rnc_cliente" value="${factura.rnc_cliente || ''}" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-800 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Razón Social / Nombre</label>
                            <input type="text" name="razon_social" value="${factura.razon_social || ''}" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-800 dark:text-white">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 2: CONDICIÓN DE PAGO -->
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                    <span class="bg-green-100 text-green-600 p-1.5 rounded-lg text-sm">💰</span> Condición de Pago
                </h2>
                <div class="flex flex-wrap gap-4">
                    <label class="cursor-pointer relative">
                        <input type="radio" name="condicion_venta" value="contado" class="peer sr-only" ${!factura.condicion_venta || factura.condicion_venta === 'contado' ? 'checked' : ''}>
                        <div class="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700 hover:bg-white shadow-sm">
                            💵 Contado
                        </div>
                    </label>
                    <label class="cursor-pointer relative">
                        <input type="radio" name="condicion_venta" value="credito_15" class="peer sr-only" ${factura.condicion_venta === 'credito_15' ? 'checked' : ''}>
                        <div class="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700 hover:bg-white shadow-sm">
                            📅 Crédito 15 días
                        </div>
                    </label>
                    <label class="cursor-pointer relative">
                        <input type="radio" name="condicion_venta" value="credito_30" class="peer sr-only" ${factura.condicion_venta === 'credito_30' ? 'checked' : ''}>
                        <div class="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 hover:bg-white shadow-sm">
                            📅 Crédito 30 días
                        </div>
                    </label>
                </div>
            </div>

            <!-- SECCIÓN 3: ITEMS Y TOTALES -->
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span class="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg text-sm">🛒</span> Items de la Factura
                    </h2>
                    <button type="button" class="py-2 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2" onclick="agregarItemVacio()">
                        <span>➕</span> Agregar Item
                    </button>
                </div>

                <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-50 dark:bg-gray-700 text-left">
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[40%]">Descripción</th>
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%] text-center">Cant.</th>
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%] text-right">Precio Unit.</th>
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%] text-right">Subtotal</th>
                                <th class="p-4 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody id="itemsTable" class="divide-y divide-gray-100 dark:divide-gray-700">
                            ${renderizarItemsEditables(factura.items || [])}
                        </tbody>
                    </table>
                </div>

                <!-- TOTALES -->
                <div class="flex flex-col md:flex-row justify-end items-start gap-8">
                    <!-- Checkbox ITBIS -->
                    <div class="mt-4">
                        <label class="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div class="relative flex items-center">
                                <input type="checkbox" id="checkItbis" onchange="recalcularTotales()" class="peer sr-only">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </div>
                            <span class="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Aplicar ITBIS (18%)</span>
                        </label>
                    </div>

                    <!-- Tarjeta de Totales -->
                    <div class="w-full md:w-80 bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center mb-3 text-gray-600 dark:text-gray-400 text-sm">
                            <span>Subtotal:</span>
                            <span id="subtotalFactura" class="font-bold">RD$ 0.00</span>
                        </div>
                        <div class="flex justify-between items-center mb-4 text-gray-600 dark:text-gray-400 text-sm">
                            <span>ITBIS (18%):</span>
                            <span id="itbisFactura" class="font-bold text-orange-500">RD$ 0.00</span>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
                            <span class="font-black text-gray-800 dark:text-white text-lg">TOTAL</span>
                            <span id="totalFactura" class="font-black text-2xl text-blue-600 dark:text-blue-400">RD$ ${formatearMoneda(factura.total || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOTONES DE ACCIÓN -->
            <div class="flex flex-wrap justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" class="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors" onclick="window.history.back()">
                    ← Volver
                </button>
                <button type="submit" class="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 shadow-lg shadow-blue-500/30 transform transition-all hover:-translate-y-1">
                    💾 Guardar Cambios
                </button>
                <button type="button" class="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 shadow-lg shadow-green-500/30 transform transition-all hover:-translate-y-1" onclick="imprimirFactura()">
                    🖨️ Imprimir
                </button>
            </div>
        </form>

        ${factura.historial_modificaciones && factura.historial_modificaciones.length > 0 ? `
            <div class="mt-12 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">📜 Historial de Cambios</h3>
                ${renderizarHistorial(factura.historial_modificaciones)}
            </div>
        ` : ''}
    `;

    // Agregar event listener al formulario
    document.getElementById('formEditar').addEventListener('submit', guardarCambios);
    
    // Inicializar cálculos y detectar si tiene ITBIS
    setTimeout(() => {
        const rows = document.querySelectorAll('#itemsTable tr');
        let sum = 0;
        rows.forEach(row => {
            const cant = parseFloat(row.querySelector(`input[name^="item_cant_"]`).value) || 0;
            const price = parseFloat(row.querySelector(`input[name^="item_precio_"]`).value) || 0;
            sum += cant * price;
        });
        
        if (typeof factura.aplicar_itbis !== 'undefined') {
            document.getElementById('checkItbis').checked = factura.aplicar_itbis;
        } else if (factura.total > sum * 1.1) {
            document.getElementById('checkItbis').checked = true;
        }
        recalcularTotales();
    }, 100);
}

function renderizarItemsEditables(items) {
    if (!items || items.length === 0) {
        return '<tr><td colspan="5" class="p-8 text-center text-gray-400 italic">No hay items en esta factura</td></tr>';
    }

    return items.map((item, index) => {
        const cantidad = item.cantidad || 1;
        const total = item.precio || 0;
        const unitario = item.precioUnitario || (total / cantidad) || 0;
        
        return `
        <tr data-index="${index}" class="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <td class="p-3">
                <input type="text" name="item_desc_${index}" value="${item.descripcion || item.nombre || ''}" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all">
                <input type="hidden" name="item_nombre_${index}" value="${item.nombre || ''}">
            </td>
            <td class="p-3">
                <input type="number" name="item_cant_${index}" value="${cantidad}" min="1" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-center transition-all" oninput="recalcularTotales()">
            </td>
            <td class="p-3">
                <input type="number" name="item_precio_${index}" value="${unitario}" min="0" step="0.01" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-right transition-all" oninput="recalcularTotales()">
            </td>
            <td id="total_row_${index}" class="p-3 text-right font-bold text-gray-700 dark:text-gray-300">RD$ ${formatearMoneda(total)}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="eliminarFila(this)" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar item">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>
    `}).join('');
}

function renderizarHistorial(historial) {
    return historial.map(registro => `
        <div class="flex gap-4 mb-3 last:mb-0 text-sm">
            <div class="min-w-[150px] font-mono text-gray-500 text-xs pt-1">${new Date(registro.fecha).toLocaleString('es-DO')}</div>
            <div class="flex-1 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                <span class="font-semibold text-blue-600">Modificación:</span> 
                <span class="text-gray-600 dark:text-gray-400">${registro.campos_modificados.join(', ')}</span>
            </div>
        </div>
    `).join('');
}

async function guardarCambios(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Reconstruir items desde la tabla
    const items = [];
    const rows = document.querySelectorAll('#itemsTable tr');
    let nuevoTotal = 0;

    rows.forEach((row) => {
        if (!row.hasAttribute('data-index')) return;
        
        const index = row.getAttribute('data-index');
        const desc = formData.get(`item_desc_${index}`);
        const cant = parseFloat(formData.get(`item_cant_${index}`)) || 0;
        const unitario = parseFloat(formData.get(`item_precio_${index}`)) || 0;
        const nombre = formData.get(`item_nombre_${index}`);
        const subtotal = cant * unitario;

        nuevoTotal += subtotal;
        items.push({ nombre: nombre, descripcion: desc, cantidad: cant, precioUnitario: unitario, precio: subtotal });
    });
    
    const tieneItbis = document.getElementById('checkItbis').checked;
    const itbis = tieneItbis ? nuevoTotal * 0.18 : 0;
    const totalFinal = nuevoTotal + itbis;

    const datos = { 
        rnc_cliente: formData.get('rnc_cliente'), 
        razon_social: formData.get('razon_social'),
        condicion_venta: formData.get('condicion_venta'),
        items: items,
        aplicar_itbis: tieneItbis,
        total: totalFinal
    };

    try {
        const response = await fetch(`${API_URL}/facturas/${facturaId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        const result = await response.json();
        if (result.success) { mostrarMensaje('✅ Cambios guardados correctamente', 'success'); setTimeout(() => cargarFactura(), 1500); } else { mostrarMensaje('❌ ' + result.error, 'error'); }
    } catch (error) { console.error('Error:', error); mostrarMensaje('❌ Error de conexión', 'error'); }
}

async function imprimirFactura() {
    const btn = document.querySelector('button[onclick="imprimirFactura()"]');
    const originalText = btn ? btn.innerHTML : '🖨️ Imprimir';
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generando PDF...';
    }

    try {
        // Recopilar datos del formulario
        const items = [];
        const rows = document.querySelectorAll('#itemsTable tr');
        let nuevoTotal = 0;

        rows.forEach((row) => {
            if (!row.hasAttribute('data-index')) return;
            
            const index = row.getAttribute('data-index');
            const desc = document.querySelector(`input[name="item_desc_${index}"]`).value;
            const cant = parseFloat(document.querySelector(`input[name="item_cant_${index}"]`).value) || 0;
            const unitario = parseFloat(document.querySelector(`input[name="item_precio_${index}"]`).value) || 0;
            const nombre = document.querySelector(`input[name="item_nombre_${index}"]`).value;
            const subtotal = cant * unitario;

            nuevoTotal += subtotal;
            items.push({ 
                nombre: nombre, 
                descripcion: desc, 
                cantidad: cant, 
                precioUnitario: unitario, 
                precio: subtotal 
            });
        });
        
        const tieneItbis = document.getElementById('checkItbis').checked;
        const itbis = tieneItbis ? nuevoTotal * 0.18 : 0;
        const totalFinal = nuevoTotal + itbis;

        const datosFactura = {
            id: facturaId,
            ncf: facturaActual.ncf,
            fecha: facturaActual.fecha_facturacion,
            cliente: {
                rnc: document.querySelector('input[name="rnc_cliente"]').value,
                nombre: document.querySelector('input[name="razon_social"]').value,
                telefono: facturaActual.telefono || ''
            },
            items: items,
            subtotal: nuevoTotal,
            impuestos: [{ nombre: 'ITBIS (18%)', monto: itbis }],
            total: totalFinal,
            condicion: document.querySelector('input[name="condicion_venta"]:checked')?.value || 'contado'
        };

        const response = await fetch(`${API_URL}/generar-factura-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosFactura)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error generando PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Factura_${datosFactura.ncf}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        mostrarMensaje('✅ PDF descargado correctamente', 'success');

    } catch (error) {
        console.error(error);
        mostrarMensaje('❌ Error al generar PDF: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// Función para agregar item vacío
window.agregarItemVacio = function() {
    const tbody = document.getElementById('itemsTable');
    
    // Si hay mensaje de "No hay items", limpiarlo
    if (tbody.rows.length === 1 && tbody.rows[0].cells.length === 5 && tbody.rows[0].innerText.includes('No hay items')) {
        tbody.innerHTML = '';
    }

    // Calcular nuevo índice basado en los existentes para evitar colisiones
    let maxIndex = -1;
    document.querySelectorAll('#itemsTable tr[data-index]').forEach(row => {
        const idx = parseInt(row.getAttribute('data-index'));
        if (idx > maxIndex) maxIndex = idx;
    });
    const newIndex = maxIndex + 1;

    const row = document.createElement('tr');
    row.setAttribute('data-index', newIndex);
    row.className = "group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors animate-fade-in";
    row.innerHTML = `
        <td class="p-3">
            <input type="text" name="item_desc_${newIndex}" value="" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all" placeholder="Descripción del item">
            <input type="hidden" name="item_nombre_${newIndex}" value="Item Agregado">
        </td>
        <td class="p-3">
            <input type="number" name="item_cant_${newIndex}" value="1" min="1" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-center transition-all" oninput="recalcularTotales()">
        </td>
        <td class="p-3">
            <input type="number" name="item_precio_${newIndex}" value="0" min="0" step="0.01" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-right transition-all" oninput="recalcularTotales()">
        </td>
        <td id="total_row_${newIndex}" class="p-3 text-right font-bold text-gray-700 dark:text-gray-300">RD$ 0.00</td>
        <td class="p-3 text-center">
            <button type="button" onclick="eliminarFila(this)" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar item">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </td>
    `;
    tbody.appendChild(row);
    
    // Enfocar automáticamente el campo de descripción
    const inputDesc = row.querySelector(`input[name="item_desc_${newIndex}"]`);
    if (inputDesc) inputDesc.focus();

    recalcularTotales();
};

// Función para eliminar fila
window.eliminarFila = function(btn) {
    if (confirm('¿Eliminar este item?')) {
        const row = btn.closest('tr');
        row.remove();
        recalcularTotales();
    }
};

// Función global para recalcular totales en tiempo real
window.recalcularTotales = function() {
    let subtotalGlobal = 0;
    const rows = document.querySelectorAll('#itemsTable tr');

    rows.forEach((row) => {
        const index = row.getAttribute('data-index');
        const inputCant = row.querySelector(`input[name="item_cant_${index}"]`);
        const inputPrecio = row.querySelector(`input[name="item_precio_${index}"]`);
        const cellTotal = document.getElementById(`total_row_${index}`);

        const cantidad = parseFloat(inputCant.value) || 0;
        const precio = parseFloat(inputPrecio.value) || 0;
        const subtotal = cantidad * precio;

        cellTotal.textContent = `RD$ ${formatearMoneda(subtotal)}`;
        subtotalGlobal += subtotal;
    });

    const tieneItbis = document.getElementById('checkItbis').checked;
    const itbis = tieneItbis ? subtotalGlobal * 0.18 : 0;
    const total = subtotalGlobal + itbis;

    document.getElementById('subtotalFactura').textContent = `RD$ ${formatearMoneda(subtotalGlobal)}`;
    document.getElementById('itbisFactura').textContent = `RD$ ${formatearMoneda(itbis)}`;
    document.getElementById('totalFactura').textContent = `RD$ ${formatearMoneda(total)}`;
};

function formatearMoneda(valor) { return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor); }
function mostrarMensaje(mensaje, tipo) {
    const alertDiv = document.createElement('div'); alertDiv.className = `alert alert-${tipo}`; alertDiv.style.position = 'fixed'; alertDiv.style.top = '20px'; alertDiv.style.right = '20px'; alertDiv.style.zIndex = '9999'; alertDiv.style.minWidth = '300px'; alertDiv.innerHTML = `<span>${mensaje}</span>`; document.body.appendChild(alertDiv); setTimeout(() => { alertDiv.remove(); }, 3000);
}
function mostrarError(mensaje) {
    document.getElementById('content').innerHTML = `<div class="alert alert-error"><span style="font-size: 1.5rem;">❌</span><div><strong>Error</strong><br>${mensaje}</div></div><div class="btn-group"><button class="btn-secondary" onclick="window.history.back()">← Volver</button></div>`;
}