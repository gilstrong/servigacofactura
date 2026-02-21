// ============================================
// ⚙️ CONFIGURACIÓN FIREBASE & ESTADO
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyBgVrMPSwZg3O5zbuIozstpG0bM8XFEeZE",
    authDomain: "servigaco.firebaseapp.com",
    databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
    projectId: "servigaco",
    storageBucket: "servigaco.firebasestorage.app",
    messagingSenderId: "516579834487",
    appId: "1:516579834487:web:e7fb1c46d93bb62a98a472"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// CONFIGURACIÓN API (AUTO-DETECTAR PUERTO)
const API_BASE_URL = (window.location.port === '5500' || window.location.port === '5501')
  ? 'http://localhost:3000' // Si estamos en Live Server, apuntar al backend
  : 'https://servigacofactura.onrender.com'; // URL del backend en producción

let facturaActual = {
    items: [],
    cliente: {},
    totales: {}
};

const ITBIS_RATE = 0.18;

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // 🔒 SEGURIDAD: Verificar autenticación
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert("⚠️ Acceso denegado. Debes iniciar sesión como administrador.");
            window.location.href = "index.html";
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // Configurar fecha hoy por defecto
    document.getElementById('fechaFactura').valueAsDate = new Date();

    if (id) {
        await cargarFactura(id);
    } else {
        // Si es nueva, agregar una fila vacía
        agregarProductoVacio();
    }

    inicializarEventos();
});

function inicializarEventos() {
    // Cambio de condición (Crédito/Contado)
    document.querySelectorAll('input[name="condicionVenta"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const divVenc = document.getElementById('divVencimiento');
            const val = e.target.value;
            if (val.startsWith('credito')) {
                divVenc.classList.remove('hidden');
                // Calcular vencimiento (15 o 30 días)
                const dias = val === 'credito_15' ? 15 : 30;
                const fecha = new Date(document.getElementById('fechaFactura').value);
                fecha.setDate(fecha.getDate() + dias);
                document.getElementById('fechaVencimiento').valueAsDate = fecha;
            } else {
                divVenc.classList.add('hidden');
            }
        });
    });

    // Cambio de método de pago
    document.getElementById('metodoPago').addEventListener('change', (e) => {
        const val = e.target.value;
        const divBanco = document.getElementById('divBanco');
        const divRef = document.getElementById('divReferencia');

        if (val === 'transferencia' || val === 'cheque') {
            divBanco.classList.remove('hidden');
            divRef.classList.remove('hidden');
        } else {
            divBanco.classList.add('hidden');
            divRef.classList.add('hidden');
        }
    });

    // Búsqueda de Cliente (RNC)
    let timeoutRNC;
    document.getElementById('clienteRNC').addEventListener('input', (e) => {
        clearTimeout(timeoutRNC);
        const query = e.target.value.trim();
        if (query.length >= 3) {
            document.getElementById('spinnerRNC').classList.remove('hidden');
            timeoutRNC = setTimeout(() => buscarCliente(query), 600);
        } else {
            document.getElementById('spinnerRNC').classList.add('hidden');
        }
    });

    // Guardar
    document.getElementById('btnGuardar').addEventListener('click', guardarFactura);
}

// ============================================
// 📡 LÓGICA DE DATOS
// ============================================

async function cargarFactura(id) {
    try {
        const snapshot = await db.ref(`facturas/${id}`).once('value');
        const data = snapshot.val();
        if (!data) return alert('Factura no encontrada');

        facturaActual = { ...data, id };

        // Llenar campos
        document.getElementById('ncf').value = data.ncf || '';
        document.getElementById('tipoComprobante').value = (data.ncf || '').substring(0, 3) || 'B02';
        document.getElementById('fechaFactura').value = data.fecha_facturacion ? data.fecha_facturacion.split('T')[0] : new Date().toISOString().split('T')[0];
        
        // Condición de Venta (Radio)
        let cond = data.condicion_venta || 'contado';
        if (cond === 'credito') cond = 'credito_30'; // Compatibilidad con facturas viejas
        const radio = document.querySelector(`input[name="condicionVenta"][value="${cond}"]`);
        if (radio) {
            radio.checked = true;
        }

        // Mostrar y poblar fecha de vencimiento si es a crédito
        const divVenc = document.getElementById('divVencimiento');
        if (cond.startsWith('credito')) {
            divVenc.classList.remove('hidden');
            if (data.fecha_vencimiento) {
                document.getElementById('fechaVencimiento').value = data.fecha_vencimiento.split('T')[0];
            }
        }
        
        // Cliente
        document.getElementById('clienteRNC').value = data.rnc_cliente || '';
        document.getElementById('clienteNombre').value = data.razon_social || '';
        
        // Items
        const items = Array.isArray(data.items) ? data.items : Object.values(data.items || {});
        const tbody = document.getElementById('tablaProductos');
        tbody.innerHTML = '';
        
        if (items.length > 0) {
            items.forEach(item => agregarFilaProducto(item));
        } else {
            agregarProductoVacio();
        }

        recalcularTotales();

    } catch (error) {
        console.error("Error cargando factura:", error);
        alert("Error al cargar los datos de la factura.");
    }
}

async function buscarCliente(query) {
    try {
        // Buscar en Firebase (maestro_contribuyentes)
        // Nota: Esto asume que tienes la estructura de upload_rnc.js
        const ref = db.ref('maestro_contribuyentes');
        let snapshot;
        
        if (/^\d+$/.test(query)) {
            snapshot = await ref.orderByKey().startAt(query).endAt(query + "\uf8ff").limitToFirst(1).once('value');
        } else {
            const nombreMayus = query.toUpperCase();
            snapshot = await ref.orderByChild('n').startAt(nombreMayus).endAt(nombreMayus + "\uf8ff").limitToFirst(1).once('value');
        }

        const resultados = snapshot.val();
        document.getElementById('spinnerRNC').classList.add('hidden');

        if (resultados) {
            const key = Object.keys(resultados)[0];
            const cliente = resultados[key];
            document.getElementById('clienteRNC').value = key;
            document.getElementById('clienteNombre').value = cliente.nombre || cliente.n;
            
            // Simular búsqueda de deuda (Placeholder)
            document.getElementById('clienteDeuda').value = "RD$ 0.00"; 
        }
    } catch (e) {
        console.error(e);
        document.getElementById('spinnerRNC').classList.add('hidden');
    }
}

// ============================================
// 📦 GESTIÓN DE PRODUCTOS (TABLA)
// ============================================

function agregarProductoVacio() {
    agregarFilaProducto({ cantidad: 1, unidad: 'UND', descripcion: '', precio: 0, itbis: true });
}

function agregarFilaProducto(item) {
    const tbody = document.getElementById('tablaProductos');
    const row = document.createElement('tr');
    row.className = "hover:bg-gray-50 transition-colors group";
    
    // Determinar si tiene ITBIS (si viene del objeto o por defecto true)
    const tieneItbis = item.itbis !== undefined ? item.itbis : true;
    const precio = parseFloat(item.precioUnitario || item.precio || 0);
    const total = parseFloat(item.total || (precio * item.cantidad) || 0);

    row.innerHTML = `
        <td class="p-3">
            <input type="number" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-center transition-all" value="${item.cantidad || 1}" min="1" onchange="calcularFila(this)">
        </td>
        <td class="p-3">
            <input type="text" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-center uppercase" value="${item.unidad || 'UND'}">
        </td>
        <td class="p-3">
            <input type="text" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium" value="${item.descripcion || item.nombre || ''}" placeholder="Descripción">
        </td>
        <td class="p-3">
            <input type="number" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-right" value="${precio.toFixed(2)}" min="0" step="0.01" onchange="calcularFila(this)">
        </td>
        <td class="p-3 text-center">
            <input type="checkbox" class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" ${tieneItbis ? 'checked' : ''} onchange="calcularFila(this)">
        </td>
        <td class="p-3 text-right font-bold text-gray-700 dark:text-gray-300 row-total">
            RD$ ${total.toFixed(2)}
        </td>
        <td class="p-3 text-center no-print">
            <button type="button" onclick="eliminarFila(this)" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </td>
    `;

    tbody.appendChild(row);
    document.getElementById('emptyState').classList.add('hidden');
    recalcularTotales();
}

window.calcularFila = function(input) {
    const row = input.closest('tr');
    const inputs = row.querySelectorAll('input');
    
    const cant = parseFloat(inputs[0].value) || 0;
    const precio = parseFloat(inputs[3].value) || 0;
    const aplicaItbis = inputs[4].checked;

    let subtotal = cant * precio;
    let itbis = aplicaItbis ? subtotal * ITBIS_RATE : 0;
    let total = subtotal + itbis;

    row.querySelector('.row-total').textContent = `RD$ ${total.toFixed(2)}`;
    recalcularTotales();
}

window.eliminarFila = function(btn) {
    const row = btn.closest('tr');
    row.remove();
    
    const tbody = document.getElementById('tablaProductos');
    if (tbody.children.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
    }
    recalcularTotales();
}

function recalcularTotales() {
    let exento = 0;
    let gravado = 0;
    let itbisTotal = 0;

    const rows = document.querySelectorAll('#tablaProductos tr');
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const cant = parseFloat(inputs[0].value) || 0;
        const precio = parseFloat(inputs[3].value) || 0;
        const aplicaItbis = inputs[4].checked;

        const subtotal = cant * precio;

        if (aplicaItbis) {
            gravado += subtotal;
            itbisTotal += subtotal * ITBIS_RATE;
        } else {
            exento += subtotal;
        }
    });

    const totalGeneral = exento + gravado + itbisTotal;

    // Actualizar UI
    document.getElementById('totalExento').textContent = formatearMoneda(exento);
    document.getElementById('totalGravado').textContent = formatearMoneda(gravado);
    document.getElementById('totalItbis').textContent = formatearMoneda(itbisTotal);
    document.getElementById('totalGeneral').textContent = formatearMoneda(totalGeneral);

    // Guardar en estado global
    facturaActual.totales = { exento, gravado, itbis: itbisTotal, total: totalGeneral };
}

function formatearMoneda(val) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
}

// ============================================
// 💾 GUARDADO Y FINALIZACIÓN
// ============================================

async function guardarFactura() {
    const btn = document.getElementById('btnGuardar');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Guardando...';

    try {
        // 1. Recopilar Datos
        const items = [];
        document.querySelectorAll('#tablaProductos tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            items.push({
                cantidad: parseFloat(inputs[0].value),
                unidad: inputs[1].value,
                descripcion: inputs[2].value,
                precioUnitario: parseFloat(inputs[3].value),
                itbis: inputs[4].checked,
                total: parseFloat(row.querySelector('.row-total').textContent.replace(/[^0-9.-]+/g,""))
            });
        });

        if (items.length === 0) throw new Error("La factura debe tener al menos un producto.");

        const facturaData = {
            ...facturaActual,
            // Nota: Si es nueva, esto NO genera NCF automáticamente. Usar con precaución.
            ncf: document.getElementById('ncf').value || 'BORRADOR', 
            condicion_venta: document.querySelector('input[name="condicionVenta"]:checked')?.value || 'contado',
            fecha_facturacion: document.getElementById('fechaFactura').value,
            fecha_vencimiento: document.getElementById('fechaVencimiento').value || null,
            
            rnc_cliente: document.getElementById('clienteRNC').value,
            razon_social: document.getElementById('clienteNombre').value,
            telefono: document.getElementById('clienteTelefono').value,
            
            metodo_pago: document.getElementById('metodoPago').value,
            banco: document.getElementById('bancoDestino').value,
            referencia: document.getElementById('referenciaPago').value,
            
            items: items,
            total: facturaActual.totales.total,
            itbis_total: facturaActual.totales.itbis,
            
            ultima_modificacion: new Date().toISOString()
        };

        // 2. Guardar en Firebase
        let ref;
        if (facturaActual.id) {
            // Actualizar existente
            await db.ref(`facturas/${facturaActual.id}`).update(facturaData);
            ref = { key: facturaActual.id };
        } else {
            // Crear nueva (si se usa para crear)
            ref = await db.ref('facturas').push(facturaData);
        }

        alert('✅ Factura guardada correctamente');
        
        // Opcional: Recargar para ver cambios o NCF si el backend lo asigna
        if (!facturaActual.id) {
            window.location.href = `factura_admin.html?id=${ref.key}`;
        }

    } catch (error) {
        console.error(error);
        alert('❌ Error al guardar: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

window.imprimirFactura = async function() {
    const btn = document.querySelector('button[onclick="imprimirFactura()"]');
    const originalText = btn ? btn.innerHTML : '';
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generando PDF...';
    }

    try {
        // Recopilar datos actuales de la factura desde el formulario
        const items = [];
        document.querySelectorAll('#tablaProductos tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            items.push({
                cantidad: parseFloat(inputs[0].value),
                nombre: inputs[2].value, // Descripción como nombre
                descripcion: inputs[2].value,
                precioUnitario: parseFloat(inputs[3].value),
                precio: parseFloat(row.querySelector('.row-total').textContent.replace(/[^0-9.-]+/g,""))
            });
        });

        // Traducir el valor interno a texto legible para el PDF
        const condicionValue = document.querySelector('input[name="condicionVenta"]:checked')?.value || 'contado';
        let condicionTexto;
        switch (condicionValue) {
            case 'credito_15':
                condicionTexto = 'Crédito a 15 días';
                break;
            case 'credito_30':
                condicionTexto = 'Crédito a 30 días';
                break;
            default:
                condicionTexto = 'Contado';
        }

        const datosFactura = {
            id: facturaActual.id,
            ncf: document.getElementById('ncf').value || 'BORRADOR',
            fecha: document.getElementById('fechaFactura').value,
            vencimiento: document.getElementById('fechaVencimiento').value,
            cliente: {
                nombre: document.getElementById('clienteNombre').value,
                rnc: document.getElementById('clienteRNC').value,
                telefono: document.getElementById('clienteTelefono').value
            },
            items: items,
            subtotal: facturaActual.totales.exento + facturaActual.totales.gravado,
            impuestos: [{ nombre: 'ITBIS (18%)', monto: facturaActual.totales.itbis }],
            total: facturaActual.totales.total,
            condicion: condicionTexto // Se envía el texto legible
        };

        const response = await fetch(`${API_BASE_URL}/api/generar-factura-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosFactura)
        });

        if (!response.ok) throw new Error('Error en el servidor al generar el PDF');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Factura_${datosFactura.ncf}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

    } catch (error) {
        console.error(error);
        alert('Error al generar el PDF: ' + error.message);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}