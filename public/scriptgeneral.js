// ============================================
// 📝 COTIZACIÓN - GLOBAL
// ============================================
let cotizacion = [];
let todasLasCotizaciones = []; // Para guardar múltiples cotizaciones
let idCotizacionActiva = null; // Para saber si estamos editando una cotización existente
let nombreCotizacionActiva = ''; // Para recordar el nombre del cliente y que no se borre
let cotizacionAFacturar = null; // Variable temporal para el proceso de facturación
let todasLasFacturas = []; // Para el historial de facturas
let searchDebounceTimer; // Timer para la búsqueda
let idFacturaAAnular = null; // Variable temporal para anulación segura
let idCotizacionAEliminar = null; // Variable temporal para eliminar cotización

console.log('🚀 Script cargando...');

// ============================================
// 🛡️ INTERRUPTOR DE SEGURIDAD
// ============================================
// FALSE = Modo Desarrollo (Todo abierto, fácil de trabajar)
// TRUE  = Modo Producción (Pide login para facturar)
const ACTIVAR_SEGURIDAD = true; 

// ============================================
// 🌐 CONFIGURACIÓN API (AUTO-DETECTAR PUERTO)
// ============================================
const API_BASE_URL = (window.location.port === '5500' || window.location.port === '5501')
  ? 'http://localhost:3000' // Si estamos en Live Server, apuntar al backend
  : 'https://servigacofactura.onrender.com'; // URL del backend en producción

// ============================================
// 🔥 CONFIGURACIÓN DE FIREBASE (BASE DE DATOS)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBgVrMPSwZg3O5zbuIozstpG0bM8XFEeZE",
  authDomain: "servigacofactura.firebaseapp.com",
  databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
  projectId: "servigaco",
  storageBucket: "servigaco.firebasestorage.app",
  messagingSenderId: "516579834487",
  appId: "1:516579834487:web:e7fb1c46d93bb62a98a472"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth(); // Inicializar Auth

document.addEventListener('DOMContentLoaded', () => {
  cargarDeLocalStorage(); // Carga la cotización en curso si la página se recarga
});

// ============================================
// 💰 TABLAS DE PRECIOS ACTUALIZADAS
// ============================================

// IMPRESIONES B/N (Blanco y Negro)
const preciosBN = {
  'carta': [
    { min: 1, max: 50, precio: 2.50 },
    { min: 51, max: 200, precio: 2.00 },
    { min: 201, max: Infinity, precio: 1.75 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 10.00 },
    { min: 51, max: 200, precio: 8.00 },
    { min: 201, max: Infinity, precio: 6.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 20.00 },
    { min: 51, max: 200, precio: 15.00 },
    { min: 201, max: Infinity, precio: 10.00 }
  ]
};

// IMPRESIONES COLOR (papel bond)
const preciosColor = {
  'carta': [
    { min: 1, max: 50, precio: 15.00 },
    { min: 51, max: 200, precio: 10.00 },
    { min: 201, max: Infinity, precio: 8.00 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 30.00 },
    { min: 51, max: 200, precio: 25.00 },
    { min: 201, max: Infinity, precio: 20.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 40.00 },
    { min: 51, max: 200, precio: 35.00 },
    { min: 201, max: Infinity, precio: 30.00 }
  ]
};

// IMPRESIONES FULL COLOR (papel bond)
const preciosFullColor = {
  'carta': [
    { min: 1, max: 50, precio: 20.00 },
    { min: 51, max: 200, precio: 18.00 },
    { min: 201, max: Infinity, precio: 15.00 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 35.00 },
    { min: 51, max: 200, precio: 30.00 },
    { min: 201, max: Infinity, precio: 25.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 60.00 },
    { min: 51, max: 200, precio: 50.00 },
    { min: 201, max: Infinity, precio: 40.00 }
  ]
};

// IMPRESIONES EN CARTONITE, SATINADO Y ADHESIVO
const preciosEspeciales = {
  'carta': [
    { min: 1, max: 50, precio: 35.00 },
    { min: 51, max: 200, precio: 30.00 },
    { min: 201, max: Infinity, precio: 25.00 }
  ],
  'legal': [
    { min: 1, max: 50, precio: 45.00 },
    { min: 51, max: 200, precio: 40.00 },
    { min: 201, max: Infinity, precio: 35.00 }
  ],
  'tabloide': [
    { min: 1, max: 50, precio: 70.00 },
    { min: 51, max: 200, precio: 60.00 },
    { min: 201, max: Infinity, precio: 50.00 }
  ]
};

// Encuadernado Espiral (precio por encuadernado según páginas)
const preciosEncuadernado = [
  { min: 1, max: 100, precio: 60 },
  { min: 101, max: 160, precio: 70 },
  { min: 161, max: 200, precio: 80 },
  { min: 201, max: 300, precio: 100 },
  { min: 301, max: 400, precio: 120 },
  { min: 401, max: 500, precio: 150 },
  { min: 501, max: Infinity, precio: 250 }
];

// Empastado (precio por unidad)
const preciosEmpastado = {
  'Tapa Dura': { carta: 500, legal: 800, tabloide: 1000 },
  'Tapa Blanda': { carta: 350 }
};

// Plastificado (precio base por tamaño)
const preciosPlastificado = {
  cedula: 30,
  carta: 40,
  legal: 50,
  tabloide: 60
};

// ============================================
// 🧮 FUNCIONES DE CÁLCULO
// ============================================

function calcularPrecioImpresion(cantidad, tipo, tamano) {
  let tablaPrecios;
  
  switch (tipo) {
    case 'bn':
      tablaPrecios = preciosBN[tamano];
      break;
    case 'color':
      tablaPrecios = preciosColor[tamano];
      break;
    case 'full_color':
      tablaPrecios = preciosFullColor[tamano];
      break;
    case 'especial':
      tablaPrecios = preciosEspeciales[tamano];
      break;
    default:
      return 0;
  }
  
  if (!tablaPrecios) return 0;
  
  // Buscar el rango correspondiente
  const rango = tablaPrecios.find(r => cantidad >= r.min && cantidad <= r.max);
  
  if (!rango) return 0;
  
  // Precio total = cantidad × precio unitario del rango
  return cantidad * rango.precio;
}

function calcularPrecioEncuadernado(paginas) {
  const rango = preciosEncuadernado.find(r => paginas >= r.min && paginas <= r.max);
  return rango ? rango.precio : 0;
}

function calcularPrecioEmpastado(tipo, tamano) {
  return preciosEmpastado[tipo]?.[tamano] || 0;
}

function calcularPrecioPloteo(tipo, tamano, cantidad, anchoCustom = 0, altoCustom = 0) {
  // Precios Bond Full Color (precio completo)
  const preciosBondFullColor = {
    '17x22': 150,
    '18x24': 150,
    '24x36': 360
  };
  
  // Precios Bond Color Normal (mitad del full color)
  const preciosBondColor = {
    '17x22': 75,
    '18x24': 75,
    '24x36': 180
  };
  
  // Precios Bond B/N
  const preciosBondBN = {
    '17x22': 50,
    '18x24': 50,
    '24x36': 90
  };
  
  // Precios por pie cuadrado
  const preciosPorPie = {
    'cartonite': 80,
    'fotografico': 160,
    'lona': 100,
    'cintra': 250,
    'canvas': 300
  };
  
  // Si es tamaño personalizado
  if (tamano === 'custom') {
    const pulgadasCuadradas = anchoCustom * altoCustom;
    const piesCuadrados = pulgadasCuadradas / 144;
    const precioPorPie = preciosPorPie[tipo] || 100;
    return piesCuadrados * precioPorPie * cantidad;
  }
  
  // Si es Bond B/N
  if (tipo === 'bond_bn') {
    const precioUnitario = preciosBondBN[tamano] || 0;
    return precioUnitario * cantidad;
  }
  
  // Si es Bond Color
  if (tipo === 'bond_color') {
    const precioUnitario = preciosBondColor[tamano] || 0;
    return precioUnitario * cantidad;
  }
  
  // Si es Bond Full Color
  if (tipo === 'bond_full_color') {
    const precioUnitario = preciosBondFullColor[tamano] || 0;
    return precioUnitario * cantidad;
  }
  
  // Si es material por pie cuadrado (cartonite, fotográfico, etc.)
  const [ancho, alto] = tamano.split('x').map(Number);
  const pulgadasCuadradas = ancho * alto;
  const piesCuadrados = pulgadasCuadradas / 144;
  const precioPorPie = preciosPorPie[tipo] || 100;
  
  return piesCuadrados * precioPorPie * cantidad;
}

function calcularPrecioPlastificado(tamano, llevaCorte, cantidadHojas, piezasPorHoja = 1) {
  const precioBase = preciosPlastificado[tamano] || 0;
  
  if (llevaCorte) {
    // Si lleva corte, se cobra por cada pieza individual
    const totalPiezas = cantidadHojas * piezasPorHoja;
    return precioBase * totalPiezas;
  } else {
    // Sin corte, se cobra por hoja completa
    return precioBase * cantidadHojas;
  }
}

// ============================================
// 📝 FUNCIONES DE COTIZACIÓN
// ============================================

function agregarACotizacion(servicio) {
  cotizacion.push(servicio);
  actualizarCotizacion();
  mostrarNotificacion('Servicio agregado correctamente', 'success');
}

function eliminarDeCotizacion(index) {
  cotizacion.splice(index, 1);
  actualizarCotizacion();
  mostrarNotificacion('Servicio eliminado', 'warning');
}

function cambiarCantidad(index, delta) {
  const item = cotizacion[index];
  if (!item) return;

  const nuevaCantidad = (item.cantidad || 1) + delta;
  if (nuevaCantidad < 1) return;

  // Actualizar descripción si empieza con el número anterior (para mantener coherencia visual)
  const cantidadAnterior = item.cantidad || 1;
  if (item.descripcion && item.descripcion.startsWith(cantidadAnterior.toString())) {
     item.descripcion = item.descripcion.replace(new RegExp('^' + cantidadAnterior), nuevaCantidad);
  }

  item.cantidad = nuevaCantidad;
  
  if (item.precioUnitario !== undefined) {
    item.precio = item.precioUnitario * nuevaCantidad;
  }

  actualizarCotizacion();
}

function limpiarCotizacion() {
  if (cotizacion.length === 0) {
    mostrarNotificacion('La cotización ya está vacía', 'warning');
    return;
  }
  
  // ABRIR MODAL EN LUGAR DE CONFIRM
  const modal = document.getElementById('modalConfirmarLimpiar');
  const texto = document.getElementById('textoConfirmarLimpiar');
  
  if (modal && texto) {
    texto.textContent = idCotizacionActiva
    ? '¿Salir de la edición y limpiar? Los cambios no guardados se perderán.'
    : '¿Limpiar toda la cotización actual?';
    
    modal.classList.remove('hidden');
  }
}

function ejecutarLimpiarCotizacion() {
  cotizacion = [];
  idCotizacionActiva = null;
  localStorage.removeItem('cotizacion_servigaco_id');
  localStorage.removeItem('cotizacion_servigaco_nombre');
  actualizarCotizacion();
  document.getElementById('modalConfirmarLimpiar').classList.add('hidden');
  mostrarNotificacion('Cotización limpiada', 'success');
}

function actualizarCotizacion() {
  const contador = document.getElementById('cotizacionCount');
  const cuerpoTabla = document.getElementById('cotizacionBody');
  const footerTabla = document.getElementById('cotizacionFooter');
  const subtotalEl = document.getElementById('subtotalAmount');
  const impuestoEl = document.getElementById('impuestoAmount');
  const impuestoRow = document.getElementById('impuestoRow');
  const subtotalRow = document.getElementById('subtotalRow');
  const totalEl = document.getElementById('totalAmount');
  const comprobanteSection = document.getElementById('comprobanteSection');
  const cotizacionAcciones = document.getElementById('cotizacionAcciones');
  const btnGuardar = document.getElementById('btnGuardarCotizacion');
  const btnCambios = document.getElementById('btnGuardarCambios');

  // Guardar en LocalStorage cada vez que cambia
  guardarEnLocalStorage();

  // Indicador de edición
  const headerH2 = document.querySelector('.cotizacion-header h2');
  const existingIndicator = headerH2?.querySelector('.editing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (contador) contador.textContent = cotizacion.length;

  if (cotizacion.length === 0) {
    if (cuerpoTabla) {
      cuerpoTabla.innerHTML = `
        <tr class="cotizacion-vacia bg-gray-50 dark:bg-gray-800">
          <td colspan="6" class="p-12 text-center">
            <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <span class="text-6xl mb-4">📭</span>
              <p class="text-lg font-medium">No hay servicios en la cotización</p>
              <p class="text-sm text-gray-400 mt-1">Selecciona un servicio abajo para empezar</p>
            </div>
          </td>
        </tr>
      `;
    }
    if (footerTabla) footerTabla.style.display = 'none';
    if (comprobanteSection) comprobanteSection.style.display = 'none';
    if (cotizacionAcciones) cotizacionAcciones.style.display = 'none';
    return;
  }

  // Añadir indicador si se está editando
  if (idCotizacionActiva && headerH2) {
    const nombre = nombreCotizacionActiva || '...';
    const indicator = document.createElement('span');
    indicator.className = 'editing-indicator ml-4 text-sm font-normal bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 px-3 py-1 rounded-full';
    indicator.textContent = `📝 Editando: ${nombre}`;
    headerH2.appendChild(indicator);
  }

  // Alternar botones según si estamos editando o creando
  if (idCotizacionActiva) {
    if (btnGuardar) btnGuardar.style.display = 'none';
    if (btnCambios) btnCambios.style.display = 'flex';
  } else {
    if (btnGuardar) btnGuardar.style.display = 'flex';
    if (btnCambios) btnCambios.style.display = 'none';
  }

  if (comprobanteSection) comprobanteSection.style.display = 'block';
  if (cotizacionAcciones) cotizacionAcciones.style.display = 'flex';
  if (footerTabla) footerTabla.style.display = 'table-footer-group';

  const subtotal = cotizacion.reduce((sum, item) => sum + item.precio, 0);
  const aplicarItbis = document.getElementById('checkAplicarItbis')?.checked || false;

  let impuesto = 0;
  let nombreImpuesto = '';
  if (aplicarItbis) { impuesto = subtotal * 0.18; nombreImpuesto = 'ITBIS (18%)'; }

  const total = subtotal + impuesto;

  if (subtotalEl) subtotalEl.textContent = `RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (aplicarItbis) {
    if (subtotalRow) subtotalRow.style.display = 'table-row';
    if (impuestoRow) {
      impuestoRow.style.display = 'table-row';
      const label = impuestoRow.querySelector('.total-label');
      if (label) label.textContent = nombreImpuesto + ':';
      if (impuestoEl) impuestoEl.textContent = `RD$${impuesto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
  } else {
    if (subtotalRow) subtotalRow.style.display = 'none';
    if (impuestoRow) impuestoRow.style.display = 'none';
  }

  if (totalEl) totalEl.textContent = `RD$${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (cuerpoTabla) {
    cuerpoTabla.innerHTML = cotizacion.map((item, i) => `
      <tr class="bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-150 group border-b border-gray-50 dark:border-gray-700 last:border-none">
        <td class="px-6 py-4 text-gray-800 dark:text-gray-100 font-medium break-words">${item.nombre}</td>
        <td class="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm break-words">${item.descripcion}</td>
        <td class="px-6 py-4 text-center text-gray-700 dark:text-gray-200 font-medium bg-gray-50/50 dark:bg-gray-700/50">
          <div class="flex items-center justify-center gap-2">
            <button onclick="cambiarCantidad(${i}, -1)" class="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold flex items-center justify-center text-xs transition-colors" type="button">−</button>
            <span>${item.cantidad || 1}</span>
            <button onclick="cambiarCantidad(${i}, 1)" class="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 font-bold flex items-center justify-center text-xs transition-colors" type="button">+</button>
          </div>
        </td>
        <td class="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-medium">RD$${(item.precioUnitario || item.precio).toFixed(2)}</td>
        <td class="px-6 py-4 text-right font-bold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/20">RD$${item.precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        <td class="px-6 py-4 text-center">
          <button class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-100 transition-all duration-200 transform hover:scale-110 shadow-sm border border-transparent hover:border-red-200" onclick="eliminarDeCotizacion(${i})" title="Eliminar">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// ============================================
// ➕ AGREGAR SERVICIOS
// ============================================

function agregarImpresion() {
  const cant = parseInt(document.getElementById('cantidadPaginas')?.value);
  const tipo = document.getElementById('tipoImpresion')?.value;
  const tamano = document.getElementById('tamanoImpresion')?.value;
  const caras = document.getElementById('caras')?.value;
  const manual = parseFloat(document.getElementById('precioPersonalImpresion')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (!tipo) { mostrarNotificacion('Seleccione el tipo de impresión', 'error'); return; }
  if (!tamano) { mostrarNotificacion('Seleccione el tamaño', 'error'); return; }

  const tipos = { 
    bn: 'B/N', 
    color: 'Color', 
    full_color: 'Full Color',
    especial: 'Cartonite/Satinado/Adhesivo'
  };
  
  const tamanos = {
    carta: '8½ x 11 (Carta)',
    legal: '8½ x 14 (Legal)',
    tabloide: '11 x 17 (Tabloide)'
  };
  
  let precio;
  
  if (manual) {
    precio = manual * cant;
  } else {
    precio = calcularPrecioImpresion(cant, tipo, tamano);
    
    if (precio === 0) {
      mostrarNotificacion('No se pudo calcular el precio. Use precio personalizado.', 'error');
      return;
    }
  }

  const carasTexto = caras === 'doble' ? 'Doble Cara' : 'Simple Cara';
  const hojas = caras === 'doble' ? Math.ceil(cant / 2) : cant;
  
  agregarACotizacion({ 
    nombre: `Impresión ${tipos[tipo]}`, 
    descripcion: `${cant} páginas (${hojas} hojas) · ${tamanos[tamano]} · ${carasTexto}`, 
    cantidad: cant,
    precioUnitario: precio / cant,
    precio 
  });
  limpiarFormulario('formImpresion');
}

function agregarLibro() {
  const paginasBN = parseInt(document.getElementById('libroPaginasBN')?.value || 0);
  const paginasColor = parseInt(document.getElementById('libroPaginasColor')?.value || 0);
  const paginasFullColor = parseInt(document.getElementById('libroPaginasFullColor')?.value || 0);
  const tamano = document.getElementById('libroTamano')?.value || 'carta';
  const tipoTerminacion = document.getElementById('libroTerminacion')?.value || 'ninguna';
  const juegos = parseInt(document.getElementById('libroJuegos')?.value || 1);

  const totalPaginas = paginasBN + paginasColor + paginasFullColor;
  
  if (totalPaginas === 0) {
    mostrarNotificacion('Debe especificar al menos 1 página', 'error');
    return;
  }

  if (!juegos || juegos <= 0) {
    mostrarNotificacion('Número de juegos inválido', 'error');
    return;
  }

  if (tipoTerminacion === 'tapa_blanda' && tamano !== 'carta') {
    mostrarNotificacion('Tapa blanda solo disponible para carta', 'error');
    return;
  }

  let costoBN = 0;
  let costoColor = 0;
  let costoFullColor = 0;
  let costoTerminacion = 0;

  if (paginasBN > 0) {
    const totalPaginasBN = paginasBN * juegos;
    const precioTotalBN = calcularPrecioImpresion(totalPaginasBN, 'bn', tamano);
    costoBN = precioTotalBN / juegos;
  }

  if (paginasColor > 0) {
    const totalPaginasColor = paginasColor * juegos;
    const precioTotalColor = calcularPrecioImpresion(totalPaginasColor, 'color', tamano);
    costoColor = precioTotalColor / juegos;
  }

  if (paginasFullColor > 0) {
    const totalPaginasFull = paginasFullColor * juegos;
    const precioTotalFull = calcularPrecioImpresion(totalPaginasFull, 'full_color', tamano);
    costoFullColor = precioTotalFull / juegos;
  }

  if (tipoTerminacion === 'espiral') {
    costoTerminacion = calcularPrecioEncuadernado(totalPaginas);
  } else if (tipoTerminacion === 'tapa_dura') {
    costoTerminacion = calcularPrecioEmpastado('Tapa Dura', tamano);
  } else if (tipoTerminacion === 'tapa_blanda') {
    costoTerminacion = calcularPrecioEmpastado('Tapa Blanda', tamano);
  }

  const costoPorLibro = costoBN + costoColor + costoFullColor + costoTerminacion;
  const costoTotal = costoPorLibro * juegos;

  const tamanos = {
    carta: '8½ x 11',
    legal: '8½ x 14',
    tabloide: '11 x 17'
  };

  const terminacionTexto = {
    'espiral': 'Encuadernado espiral',
    'tapa_dura': 'Empastado tapa dura',
    'tapa_blanda': 'Empastado tapa blanda',
    'ninguna': 'Sin terminación'
  };

  let descripcion = `${juegos} libro(s) · ${totalPaginas} páginas totales · ${tamanos[tamano]}`;
  
  let desglosePaginas = [];
  if (paginasBN > 0) desglosePaginas.push(`${paginasBN} B/N`);
  if (paginasColor > 0) desglosePaginas.push(`${paginasColor} Color`);
  if (paginasFullColor > 0) desglosePaginas.push(`${paginasFullColor} Full Color`);
  
  if (desglosePaginas.length > 0) {
    descripcion += `\n(${desglosePaginas.join(' + ')})`;
  }
  
  descripcion += `\n${terminacionTexto[tipoTerminacion]}`;

  let desgloseCostos = [];
  if (costoBN > 0) desgloseCostos.push(`B/N: RD$${costoBN.toFixed(2)}`);
  if (costoColor > 0) desgloseCostos.push(`Color: RD$${costoColor.toFixed(2)}`);
  if (costoFullColor > 0) desgloseCostos.push(`Full Color: RD$${costoFullColor.toFixed(2)}`);
  if (costoTerminacion > 0) desgloseCostos.push(`${terminacionTexto[tipoTerminacion]}: RD$${costoTerminacion.toFixed(2)}`);
  
  if (desgloseCostos.length > 0 && juegos === 1) {
    descripcion += `\n[${desgloseCostos.join(' + ')}]`;
  } else if (desgloseCostos.length > 0 && juegos > 1) {
    descripcion += `\nCosto unitario: RD$${costoPorLibro.toFixed(2)}`;
  }

  agregarACotizacion({
    nombre: '📘 Libro Completo',
    descripcion: descripcion,
    cantidad: juegos,
    precioUnitario: costoPorLibro,
    precio: costoTotal
  });

  limpiarFormulario('formLibro');
  
  const resumenDiv = document.getElementById('resumenLibro');
  if (resumenDiv) resumenDiv.style.display = 'none';
}

function agregarEncuadernado() {
  const pag = parseInt(document.getElementById('paginasEncuadernado')?.value);
  const cant = parseInt(document.getElementById('cantidadEncuadernado')?.value || 1);
  const manual = parseFloat(document.getElementById('precioPersonalEncuadernado')?.value || 0);

  if (!pag || pag <= 0) { mostrarNotificacion('Páginas inválidas', 'error'); return; }
  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }

  if (pag > 1000 && !manual) {
    mostrarNotificacion('Límite de 1000 páginas. Use precio personalizado.', 'warning');
    return;
  }

  let precioUnitario;
  if (manual) {
    precioUnitario = manual;
  } else {
    precioUnitario = calcularPrecioEncuadernado(pag);
  }
  
  if (precioUnitario === 0 && !manual) {
    mostrarNotificacion('No se puede calcular. Use precio personalizado.', 'error');
    return;
  }
  
  const precioTotal = precioUnitario * cant;

  agregarACotizacion({ 
    nombre: 'Encuadernado Espiral', 
    descripcion: `${cant} encuadernado(s) de ${pag} páginas`, 
    cantidad: cant,
    precioUnitario: precioUnitario,
    precio: precioTotal 
  });
  limpiarFormulario('formEncuadernado');
}

function agregarEmpastado() {
  const tipoRaw = document.getElementById('tipoEmpastadoGeneral')?.value;
  const tam = document.getElementById('tamanoEmpastado')?.value;
  const cant = parseInt(document.getElementById('cantidadEmpastado')?.value);
  const manual = parseFloat(document.getElementById('precioPersonalEmpastado')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }

  const tipoMap = { tapa_dura: 'Tapa Dura', tapa_blanda: 'Tapa Blanda' };
  const tipo = tipoMap[tipoRaw];
  
  if (tipoRaw === 'tapa_blanda' && tam !== 'carta') {
    mostrarNotificacion('Tapa blanda solo para carta. Use personalizado.', 'warning');
    return;
  }
  
  let precioUnitario;
  if (manual) {
    precioUnitario = manual;
  } else {
    precioUnitario = calcularPrecioEmpastado(tipo, tam);
  }
  
  if (precioUnitario === 0 && !manual) {
    mostrarNotificacion('Tamaño no disponible. Use precio personalizado.', 'error');
    return;
  }
  
  const precioTotal = precioUnitario * cant;
  const tamanoTexto = tam === 'carta' ? '8.5x11' : tam === 'legal' ? '8.5x14' : '11x17';

  agregarACotizacion({ 
    nombre: `Empastado ${tipo}`, 
    descripcion: `${cant} empastado(s) ${tamanoTexto}`, 
    cantidad: cant,
    precioUnitario: precioUnitario,
    precio: precioTotal 
  });
  limpiarFormulario('formEmpastado');
}

function agregarPloteo() {
  const tipoPloteo = document.getElementById('tipoPloteo')?.value;
  const tipoTam = document.getElementById('opcionTamanoPloteo')?.value;
  const tam = document.getElementById('tamanoPloteo')?.value;
  const cant = parseInt(document.getElementById('cantidadPloteo')?.value);
  const ancho = parseFloat(document.getElementById('anchoPloteo')?.value || 0);
  const alto = parseFloat(document.getElementById('altoPloteo')?.value || 0);
  const manual = parseFloat(document.getElementById('precioPersonalPloteo')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (tipoTam === 'personalizado' && (!ancho || !alto)) { mostrarNotificacion('Ingrese ancho y alto', 'error'); return; }

  let precio;
  let precioUnitario;
  let desc;
  
  if (manual) {
    precio = manual * cant;
    precioUnitario = manual;
  } else if (tipoTam === 'personalizado') {
    precio = calcularPrecioPloteo(tipoPloteo, 'custom', cant, ancho, alto);
    precioUnitario = precio / cant;
  } else {
    precio = calcularPrecioPloteo(tipoPloteo, tam, cant);
    precioUnitario = precio / cant;
  }
  
  const tipoTexto = {
    'bond_bn': 'Bond B/N',
    'bond_color': 'Bond Color',
    'bond_full_color': 'Bond Full Color',
    'cartonite': 'Cartonite',
    'fotografico': 'Fotográfico',
    'canvas': 'Canvas',
    'lona': 'Lona',
    'cintra': 'Cintra'
  };
  
  desc = tipoTam === 'personalizado' ?
    `${cant} ${tipoTexto[tipoPloteo]} · ${ancho}" x ${alto}"` :
    `${cant} ${tipoTexto[tipoPloteo]} · ${tam}`;

  agregarACotizacion({
    nombre: 'Ploteo',
    descripcion: desc,
    cantidad: cant,
    precioUnitario: precioUnitario,
    precio: precio
  });
  limpiarFormulario('formPloteo');
}

function agregarPlastificado() {
  const tam = document.getElementById('tamanoPlastificado')?.value;
  const corte = document.getElementById('llevaCorte')?.value === 'si';
  const piezas = corte ? parseInt(document.getElementById('cantidadPiezas')?.value || 1) : 1;
  const cant = parseInt(document.getElementById('cantidadPlastificado')?.value);
  const manual = parseFloat(document.getElementById('precioPersonalPlastificado')?.value || 0);

  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (corte && (!piezas || piezas <= 0)) { mostrarNotificacion('Cantidad de piezas inválida', 'error'); return; }

  const tamanoTexto = {
    cedula: 'Cédula',
    carta: 'Carta (8.5x11)',
    legal: 'Legal (8.5x14)',
    tabloide: 'Tabloide (11x17)'
  };
  
  const desc = corte ? 
    `${cant * piezas} piezas plastificadas y cortadas (${cant} hojas ${tamanoTexto[tam]}, ${piezas} piezas/hoja)` :
    `${cant} hoja(s) plastificadas ${tamanoTexto[tam]}`;
  
  let precioTotal;
  if (manual) {
    if (corte) {
      const totalPiezas = cant * piezas;
      precioTotal = manual * totalPiezas;
    } else {
      precioTotal = manual * cant;
    }
  } else {
    precioTotal = calcularPrecioPlastificado(tam, corte, cant, piezas);
  }

  agregarACotizacion({ 
    nombre: 'Plastificado', 
    descripcion: desc, 
    cantidad: corte ? cant * piezas : cant, 
    precioUnitario: corte ? precioTotal / (cant * piezas) : precioTotal / cant, 
    precio: precioTotal 
  });
  limpiarFormulario('formPlastificado');
}

function agregarPersonalizado() {
  const desc = document.getElementById('descPersonalizado')?.value;
  const cant = parseInt(document.getElementById('cantPersonalizado')?.value || 1);
  const precioUnit = parseFloat(document.getElementById('precioPersonalizado')?.value || 0);

  if (!desc) { mostrarNotificacion('Ingrese una descripción', 'error'); return; }
  if (!cant || cant <= 0) { mostrarNotificacion('Cantidad inválida', 'error'); return; }
  if (precioUnit <= 0) { mostrarNotificacion('Ingrese el precio unitario', 'error'); return; }

  const total = cant * precioUnit;

  agregarACotizacion({
    nombre: 'Servicio Personalizado',
    descripcion: desc,
    cantidad: cant,
    precioUnitario: precioUnit,
    precio: total
  });
  
  limpiarFormulario('formPersonalizado');
}

// ============================================
// 🧹 LIMPIAR FORMULARIOS
// ============================================

function limpiarFormulario(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.querySelectorAll('input[type="number"], input[type="text"]').forEach(i => i.value = '');
  form.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

  if (formId === 'formPloteo') {
    const cf = document.getElementById('tamanoPersonalizado');
    if (cf) cf.style.display = 'none';
    const tp = document.getElementById('tamanosPredefinidos');
    if (tp) tp.style.display = 'block';
  }
  if (formId === 'formPlastificado') {
    const cc = document.getElementById('seccionPiezas');
    if (cc) cc.style.display = 'none';
  }
}

// ============================================
// 📄 GENERAR COTIZACIÓN
// ============================================

function generarCotizacion() {
  if (cotizacion.length === 0) { mostrarNotificacion('Cotización vacía', 'warning'); return; }

  let txt = '=== COTIZACIÓN ===\n\n';
  cotizacion.forEach((item, i) => {
    txt += `${i + 1}. ${item.nombre}\n   ${item.descripcion}\n   RD$${item.precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\n\n`;
  });

  const subtotal = cotizacion.reduce((s, i) => s + i.precio, 0);
  const aplicarItbis = document.getElementById('checkAplicarItbis')?.checked || false;
  let imp = 0;

  if (aplicarItbis) { 
    imp = subtotal * 0.18; 
    txt += `Subtotal: RD$${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\nITBIS (18%): RD$${imp.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}\n`; 
  }

  txt += `\nTOTAL: RD$${(subtotal + imp).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  
  registrarLogVenta({
    tipo: 'General',
    total: (subtotal + imp).toFixed(2),
    detalle: cotizacion.map(i => `• ${i.cantidad}x ${i.nombre} - RD$${i.precio.toFixed(2)}`).join('\n')
  });

  mostrarNotificacion('Resumen generado (ver PDF para detalle)', 'success');
}

// ============================================
// 💾 EXPORTACIÓN A SISTEMA LEGACY (VIEJO)
// ============================================

function exportarParaSistemaViejo() {
  if (cotizacion.length === 0) {
    mostrarNotificacion('No hay datos para exportar', 'warning');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Codigo,Cantidad,Descripcion,PrecioUnitario,Total\r\n";

  cotizacion.forEach((item, index) => {
    const descripcionLimpia = item.descripcion.replace(/(\r\n|\n|\r)/gm, " ").replace(/,/g, " ");
    const codigo = `SERV-${index + 1}`;
    const row = `${codigo},${item.cantidad},"${item.nombre} - ${descripcionLimpia}",${item.precioUnitario.toFixed(2)},${item.precio.toFixed(2)}`;
    csvContent += row + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `importacion_factura_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacion('Archivo de integración descargado', 'success');
}

// ============================================
// 🧭 NAVEGACIÓN
// ============================================

function marcarPaginaActiva() {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
}

function configurarMenuMovil() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const exp = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !exp);
    links.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('active');
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.main-nav')) {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('active');
    }
  });
}

// ============================================
// 🎯 EVENT LISTENERS
// ============================================

function inicializarEventListeners() {
  const tipoSrv = document.getElementById('tipoServicio');
  if (tipoSrv) {
    tipoSrv.addEventListener('change', e => {
      const val = e.target.value;
      document.querySelectorAll('.form-servicio').forEach(f => f.style.display = 'none');
      if (val) {
        const formId = `form${val.charAt(0).toUpperCase() + val.slice(1)}`;
        const form = document.getElementById(formId);
        if (form) form.style.display = 'block';
      }
    });
  }

  const tamPlot = document.getElementById('opcionTamanoPloteo');
  if (tamPlot) {
    tamPlot.addEventListener('change', e => {
      const cf = document.getElementById('tamanoPersonalizado');
      const tp = document.getElementById('tamanosPredefinidos');
      if (e.target.value === 'personalizado') {
        if (cf) cf.style.display = 'block';
        if (tp) tp.style.display = 'none';
      } else {
        if (cf) cf.style.display = 'none';
        if (tp) tp.style.display = 'block';
      }
    });
  }

  const corte = document.getElementById('llevaCorte');
  if (corte) {
    corte.addEventListener('change', e => {
      const cc = document.getElementById('seccionPiezas');
      if (cc) cc.style.display = e.target.value === 'si' ? 'block' : 'none';
    });
  }

  const checkItbis = document.getElementById('checkAplicarItbis');
  if (checkItbis) checkItbis.addEventListener('change', actualizarCotizacion);

  const btnLimp = document.getElementById('btnLimpiarCotizacion');
  if (btnLimp) btnLimp.addEventListener('click', limpiarCotizacion);

  const btnGen = document.getElementById('btnGenerarCotizacion');
  if (btnGen) btnGen.addEventListener('click', generarCotizacion);

  const btnWsp = document.getElementById('btnWhatsapp');
  if (btnWsp) btnWsp.addEventListener('click', enviarWhatsApp);

  const btnExp = document.getElementById('btnExportarSistema');
  if (btnExp) btnExp.addEventListener('click', exportarParaSistemaViejo);
  
  // --- EVENTOS LOGIN ---
  const btnAuthNav = document.getElementById('btnAuthNav');
  if (btnAuthNav) btnAuthNav.addEventListener('click', manejarClickAuth);
  document.getElementById('formLogin')?.addEventListener('submit', procesarLogin);
  document.getElementById('btnCerrarLogin')?.addEventListener('click', () => document.getElementById('modalLogin').classList.add('hidden'));

  // Event listeners para el resumen del libro en tiempo real
  const camposLibro = ['libroPaginasBN', 'libroPaginasColor', 'libroPaginasFullColor', 'libroJuegos', 'libroTerminacion'];
  camposLibro.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', actualizarResumenLibro);
      elemento.addEventListener('change', actualizarResumenLibro);
    }
  });

  // --- GESTIÓN DE COTIZACIONES ---
  const btnGuardar = document.getElementById('btnGuardarCotizacion');
  if (btnGuardar) btnGuardar.addEventListener('click', guardarCotizacionActual);

  const btnCambios = document.getElementById('btnGuardarCambios');
  if (btnCambios) btnCambios.addEventListener('click', guardarCambiosCotizacion);

  const btnVer = document.getElementById('btnVerGuardadas');
  if (btnVer) btnVer.addEventListener('click', abrirModalCotizaciones);

  const btnCerrarModal = document.getElementById('btnCerrarModal');
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalCotizaciones);

  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('modalCotizacionesGuardadas')?.classList.contains('hidden')) {
          cerrarModalCotizaciones();
      }
      if (e.key === 'Escape' && !document.getElementById('modalConfiguracionNCF')?.classList.contains('hidden')) {
          document.getElementById('modalConfiguracionNCF').classList.add('hidden');
          document.body.style.overflow = 'auto';
      }
  });

  const modal = document.getElementById('modalCotizacionesGuardadas');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModalCotizaciones();
    });
  }
  
  const modalNCF = document.getElementById('modalConfiguracionNCF');
  if (modalNCF) {
    modalNCF.addEventListener('click', (e) => {
      if (e.target === modalNCF) {
          modalNCF.classList.add('hidden');
          document.body.style.overflow = 'auto';
      }
    });
  }

  // --- EVENTOS FACTURACIÓN ---
  const btnBuscarRNC = document.getElementById('btnBuscarRNC');
  if (btnBuscarRNC) btnBuscarRNC.addEventListener('click', buscarClientePorRNC);

  const btnConfirmarFactura = document.getElementById('btnConfirmarFactura');
  if (btnConfirmarFactura) btnConfirmarFactura.addEventListener('click', generarFacturaFinal);

  const btnCancelarFactura = document.getElementById('btnCancelarFactura');
  if (btnCancelarFactura) btnCancelarFactura.addEventListener('click', () => {
    document.getElementById('modalFacturacion').classList.add('hidden');
  });
  
  document.getElementById('btnCerrarFacturaX')?.addEventListener('click', () => document.getElementById('modalFacturacion').classList.add('hidden'));

  const selectNCF = document.getElementById('facturaTipoNCF');
  if (selectNCF) selectNCF.addEventListener('change', actualizarPreviewNCF);
  
  const inputRNC = document.getElementById('facturaClienteRNC');
  if (inputRNC) {
    inputRNC.addEventListener('input', manejarBusquedaCliente);
  }

  // --- HISTORIAL FACTURAS ---
  const btnVerFacturas = document.getElementById('btnVerFacturas');
  if (btnVerFacturas) btnVerFacturas.addEventListener('click', abrirModalFacturas);

  const btnCerrarModalFacturas = document.getElementById('btnCerrarModalFacturas');
  if (btnCerrarModalFacturas) btnCerrarModalFacturas.addEventListener('click', () => document.getElementById('modalFacturasEmitidas').classList.add('hidden'));

  const filtroMes = document.getElementById('filtroMesFacturas');
  if (filtroMes) filtroMes.addEventListener('change', cargarFacturasPorMes);

  const checkAnuladas = document.getElementById('checkOcultarAnuladas');
  if (checkAnuladas) checkAnuladas.addEventListener('change', renderizarFacturas);

  const filtroCliente = document.getElementById('filtroClienteFacturas');
  if (filtroCliente) filtroCliente.addEventListener('change', renderizarFacturas);

  const btnExportar607 = document.getElementById('btnExportar607');
  if (btnExportar607) btnExportar607.addEventListener('click', generarReporte607);

  const btnBackup = document.getElementById('btnBackupFacturas');
  if (btnBackup) btnBackup.addEventListener('click', descargarBackupJSON);

  const btnReporteDiario = document.getElementById('btnReporteDiario');
  if (btnReporteDiario) btnReporteDiario.addEventListener('click', generarReporteDiario);

  const btnIT1Excel = document.getElementById('btnReporteIT1Excel');
  if (btnIT1Excel) btnIT1Excel.addEventListener('click', generarReporteIT1);

  // --- MODAL ANULACIÓN SEGURA ---
  const btnEjecutarAnulacion = document.getElementById('btnEjecutarAnulacion');
  if (btnEjecutarAnulacion) btnEjecutarAnulacion.addEventListener('click', procesarAnulacion);

  const btnCancelarAnulacion = document.getElementById('btnCancelarAnulacion');
  if (btnCancelarAnulacion) btnCancelarAnulacion.addEventListener('click', () => {
    document.getElementById('modalConfirmarAnulacion').classList.add('hidden');
    idFacturaAAnular = null;
  });

  const inputAnulacion = document.getElementById('inputConfirmacionAnular');
  if (inputAnulacion) {
    inputAnulacion.addEventListener('input', (e) => {
      const btn = document.getElementById('btnEjecutarAnulacion');
      if (btn) btn.disabled = e.target.value.toLowerCase() !== 'anular';
    });
    inputAnulacion.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && e.target.value.toLowerCase() === 'anular') {
        procesarAnulacion();
      }
    });
  }

  // --- MODAL LIMPIAR ---
  const btnEjecutarLimpiar = document.getElementById('btnEjecutarLimpiar');
  if (btnEjecutarLimpiar) btnEjecutarLimpiar.addEventListener('click', ejecutarLimpiarCotizacion);

  const btnCancelarLimpiar = document.getElementById('btnCancelarLimpiar');
  if (btnCancelarLimpiar) btnCancelarLimpiar.addEventListener('click', () => {
    document.getElementById('modalConfirmarLimpiar').classList.add('hidden');
  });

  // --- MODAL ELIMINAR COTIZACIÓN ---
  const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
  if (btnConfirmarEliminar) btnConfirmarEliminar.addEventListener('click', ejecutarEliminacionCotizacion);

  const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
  if (btnCancelarEliminar) btnCancelarEliminar.addEventListener('click', () => {
    document.getElementById('modalConfirmarEliminar').classList.add('hidden');
    idCotizacionAEliminar = null;
  });

  // --- MODAL NCF ---
  const btnConfigNCF = document.getElementById('btnConfigurarNCF');
  if (btnConfigNCF) btnConfigNCF.addEventListener('click', abrirModalNCF);

  const btnCerrarNCF = document.getElementById('btnCerrarModalNCF');
  if (btnCerrarNCF) btnCerrarNCF.addEventListener('click', () => {
      document.getElementById('modalConfiguracionNCF').classList.add('hidden');
      document.body.style.overflow = 'auto';
  });

  const formNCF = document.getElementById('formNCF');
  if (formNCF) formNCF.addEventListener('submit', guardarConfiguracionNCF);

  const ncfTipoConfig = document.getElementById('ncfTipoConfig');
  if (ncfTipoConfig) {
      ncfTipoConfig.addEventListener('change', (e) => {
          const val = e.target.value;
          document.getElementById('prefixInicio').textContent = val;
          document.getElementById('prefixFin').textContent = val;
      });
  }
}

// ============================================
// 📊 RESUMEN AUTOMÁTICO DEL LIBRO
// ============================================

function actualizarResumenLibro() {
  const bn = parseInt(document.getElementById('libroPaginasBN')?.value || 0);
  const color = parseInt(document.getElementById('libroPaginasColor')?.value || 0);
  const fullColor = parseInt(document.getElementById('libroPaginasFullColor')?.value || 0);
  const juegos = parseInt(document.getElementById('libroJuegos')?.value || 1);
  const terminacion = document.getElementById('libroTerminacion')?.value;
  
  const totalPaginas = bn + color + fullColor;
  
  if (totalPaginas > 0) {
    const resumenDiv = document.getElementById('resumenLibro');
    const contentDiv = document.getElementById('resumenContent');
    
    if (resumenDiv && contentDiv) {
      resumenDiv.style.display = 'block';
      
      let html = `<p><strong>Total de páginas:</strong> ${totalPaginas}</p>`;
      if (bn > 0) html += `<p>• ${bn} páginas B/N</p>`;
      if (color > 0) html += `<p>• ${color} páginas Color</p>`;
      if (fullColor > 0) html += `<p>• ${fullColor} páginas Full Color</p>`;
      
      const termTexto = {
        'ninguna': 'Sin terminación',
        'espiral': 'Con encuadernado espiral',
        'tapa_blanda': 'Con empastado tapa blanda',
        'tapa_dura': 'Con empastado tapa dura'
      };
      
      html += `<p><strong>Terminación:</strong> ${termTexto[terminacion] || 'N/A'}</p>`;
      html += `<p><strong>Copias:</strong> ${juegos} libro(s)</p>`;
      
      contentDiv.innerHTML = html;
    }
  } else {
    const resumenDiv = document.getElementById('resumenLibro');
    if (resumenDiv) resumenDiv.style.display = 'none';
  }
}

// ============================================
// 💲 CÁLCULO DE PRECIOS EN TIEMPO REAL
// ============================================

function calcularPrecioImpresionTiempoReal() {
  const cantidad = parseInt(document.getElementById('cantidadPaginas')?.value || 0);
  const tipo = document.getElementById('tipoImpresion')?.value;
  const tamano = document.getElementById('tamanoImpresion')?.value;
  const precioDiv = document.getElementById('precioImpresion');
  const unitarioSpan = document.getElementById('precioUnitarioImpresion');
  const totalSpan = document.getElementById('precioTotalImpresion');

  if (!cantidad || !tipo || !tamano || cantidad <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const precioUnitario = calcularPrecioImpresion(cantidad, tipo, tamano) / cantidad;
  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioEncuadernadoTiempoReal() {
  const paginas = parseInt(document.getElementById('paginasEncuadernado')?.value || 0);
  const cantidad = parseInt(document.getElementById('cantidadEncuadernado')?.value || 1);
  const precioDiv = document.getElementById('precioEncuadernado');
  const unitarioSpan = document.getElementById('precioUnitarioEncuadernado');
  const totalSpan = document.getElementById('precioTotalEncuadernado');

  if (!paginas || paginas <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const precioUnitario = calcularPrecioEncuadernado(paginas);
  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioEmpastadoTiempoReal() {
  const tipoRaw = document.getElementById('tipoEmpastadoGeneral')?.value;
  const tamano = document.getElementById('tamanoEmpastado')?.value;
  const cantidad = parseInt(document.getElementById('cantidadEmpastado')?.value || 1);
  const precioDiv = document.getElementById('precioEmpastado');
  const unitarioSpan = document.getElementById('precioUnitarioEmpastado');
  const totalSpan = document.getElementById('precioTotalEmpastado');

  if (!tipoRaw || !tamano) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const tipoMap = { tapa_dura: 'Tapa Dura', tapa_blanda: 'Tapa Blanda' };
  const tipo = tipoMap[tipoRaw];
  const precioUnitario = calcularPrecioEmpastado(tipo, tamano);
  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioPloteoTiempoReal() {
  const tipo = document.getElementById('tipoPloteo')?.value;
  const opcionTamano = document.getElementById('opcionTamanoPloteo')?.value;
  const tamano = document.getElementById('tamanoPloteo')?.value;
  const cantidad = parseInt(document.getElementById('cantidadPloteo')?.value || 1);
  const ancho = parseFloat(document.getElementById('anchoPloteo')?.value || 0);
  const alto = parseFloat(document.getElementById('altoPloteo')?.value || 0);
  const precioDiv = document.getElementById('precioPloteo');
  const unitarioSpan = document.getElementById('precioUnitarioPloteo');
  const totalSpan = document.getElementById('precioTotalPloteo');

  if (!tipo || !opcionTamano || cantidad <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  let precioUnitario = 0;
  if (opcionTamano === 'personalizado' && ancho > 0 && alto > 0) {
    precioUnitario = calcularPrecioPloteo(tipo, 'custom', 1, ancho, alto);
  } else if (tamano) {
    precioUnitario = calcularPrecioPloteo(tipo, tamano, 1);
  }

  const precioTotal = precioUnitario * cantidad;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioPlastificadoTiempoReal() {
  const tamano = document.getElementById('tamanoPlastificado')?.value;
  const llevaCorte = document.getElementById('llevaCorte')?.value === 'si';
  const cantidadHojas = parseInt(document.getElementById('cantidadPlastificado')?.value || 1);
  const piezasPorHoja = llevaCorte ? parseInt(document.getElementById('cantidadPiezas')?.value || 1) : 1;
  const precioDiv = document.getElementById('precioPlastificado');
  const unitarioSpan = document.getElementById('precioUnitarioPlastificado');
  const totalSpan = document.getElementById('precioTotalPlastificado');

  if (!tamano || cantidadHojas <= 0) {
    if (precioDiv) precioDiv.style.display = 'none';
    return;
  }

  const precioTotal = calcularPrecioPlastificado(tamano, llevaCorte, cantidadHojas, piezasPorHoja);
  const precioUnitario = llevaCorte ? precioTotal / (cantidadHojas * piezasPorHoja) : precioTotal / cantidadHojas;

  if (precioUnitario > 0) {
    if (unitarioSpan) unitarioSpan.textContent = `RD$${precioUnitario.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `RD$${precioTotal.toFixed(2)}`;
    if (precioDiv) precioDiv.style.display = 'block';
  } else {
    if (precioDiv) precioDiv.style.display = 'none';
  }
}

function calcularPrecioPersonalizadoTiempoReal() {
  const cant = parseInt(document.getElementById('cantPersonalizado')?.value || 0);
  const precio = parseFloat(document.getElementById('precioPersonalizado')?.value || 0);
  const div = document.getElementById('resumenPersonalizado');
  const totalSpan = document.getElementById('totalPersonalizado');

  if (cant > 0 && precio > 0) {
    if (div) div.style.display = 'block';
    if (totalSpan) totalSpan.textContent = `RD$${(cant * precio).toFixed(2)}`;
  } else {
    if (div) div.style.display = 'none';
  }
}

// ============================================
// 🎯 EVENT LISTENERS PARA PRECIOS EN TIEMPO REAL
// ============================================

function inicializarPrecioTiempoReal() {
  const camposImpresion = ['cantidadPaginas', 'tipoImpresion', 'tamanoImpresion'];
  camposImpresion.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioImpresionTiempoReal);
      elemento.addEventListener('change', calcularPrecioImpresionTiempoReal);
    }
  });

  const camposEncuadernado = ['paginasEncuadernado', 'cantidadEncuadernado'];
  camposEncuadernado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioEncuadernadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioEncuadernadoTiempoReal);
    }
  });

  const camposEmpastado = ['tipoEmpastadoGeneral', 'tamanoEmpastado', 'cantidadEmpastado'];
  camposEmpastado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioEmpastadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioEmpastadoTiempoReal);
    }
  });

  const camposPloteo = ['tipoPloteo', 'opcionTamanoPloteo', 'tamanoPloteo', 'cantidadPloteo', 'anchoPloteo', 'altoPloteo'];
  camposPloteo.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioPloteoTiempoReal);
      elemento.addEventListener('change', calcularPrecioPloteoTiempoReal);
    }
  });

  const camposPlastificado = ['tamanoPlastificado', 'llevaCorte', 'cantidadPlastificado', 'cantidadPiezas'];
  camposPlastificado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioPlastificadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioPlastificadoTiempoReal);
    }
  });

  const camposPersonalizado = ['cantPersonalizado', 'precioPersonalizado'];
  camposPersonalizado.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', calcularPrecioPersonalizadoTiempoReal);
      elemento.addEventListener('change', calcularPrecioPersonalizadoTiempoReal);
    }
  });
}

// ============================================
// 🖨️ IMPRIMIR COTIZACIÓN
// ============================================

async function imprimirCotizacion(e) {
  if (e && e.preventDefault) e.preventDefault();

  if (cotizacion.length === 0) { mostrarNotificacion('Cotización vacía', 'warning'); return; }

  const btn = document.getElementById('generarPDF');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Generando...';
  }

  mostrarNotificacion('📄 Generando PDF profesional...', 'info');

  const aplicarItbis = document.getElementById('checkAplicarItbis')?.checked || false;
  const fecha = new Date().toLocaleDateString('es-DO');
  const subtotal = cotizacion.reduce((s, i) => s + i.precio, 0);
  
  let impuestos = [];
  let totalImpuesto = 0;

  if (aplicarItbis) {
    const itbis = subtotal * 0.18;
    impuestos.push({ nombre: 'ITBIS (18%)', monto: itbis });
    totalImpuesto += itbis;
  }

  const total = subtotal + totalImpuesto;

  const datosFactura = {
    id: idCotizacionActiva,
    ncf: 'COTIZACIÓN',
    fecha: fecha,
    tituloDocumento: 'COTIZACIÓN DE SERVICIOS',
    cliente: {
      nombre: nombreCotizacionActiva || 'Cliente General',
      rnc: '',
      telefono: ''
    },
    items: cotizacion,
    subtotal: subtotal,
    impuestos: impuestos,
    total: total,
    condicion: 'Contado'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/generar-factura-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosFactura)
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("⚠️ Ruta no encontrada (404). Por favor, REINICIA el servidor backend.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error generando PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cotizacion_${nombreCotizacionActiva || 'General'}_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    mostrarNotificacion('✅ PDF descargado correctamente', 'success');

  } catch (error) {
    console.error(error);
    if (error.message && error.message.includes('Failed to fetch')) {
      mostrarNotificacion('❌ Error de conexión: El servidor backend no está encendido (Puerto 3000).', 'error');
    } else {
      mostrarNotificacion('Error al generar PDF: ' + error.message, 'error');
    }
  } finally {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
  }
}

// ============================================
// 💾 PERSISTENCIA (LOCALSTORAGE)
// ============================================

function guardarEnLocalStorage() {
  localStorage.setItem('cotizacion_servigaco', JSON.stringify(cotizacion));
  if (idCotizacionActiva) localStorage.setItem('cotizacion_servigaco_id', idCotizacionActiva);
  if (nombreCotizacionActiva) localStorage.setItem('cotizacion_servigaco_nombre', nombreCotizacionActiva);
}

function cargarDeLocalStorage() {
  const guardado = localStorage.getItem('cotizacion_servigaco');
  if (guardado) {
    try {
      cotizacion = JSON.parse(guardado);
      actualizarCotizacion();
    } catch (e) {
      console.error('Error cargando cotización guardada', e);
    }
  }
  const idGuardado = localStorage.getItem('cotizacion_servigaco_id');
  if (idGuardado) {
    idCotizacionActiva = idGuardado;
  }
  const nombreGuardado = localStorage.getItem('cotizacion_servigaco_nombre');
  if (nombreGuardado) {
    nombreCotizacionActiva = nombreGuardado;
  }
  if (idGuardado || nombreGuardado) actualizarCotizacion();
}

// ============================================
// ☁️ GESTIÓN CON FIREBASE REALTIME DATABASE
// ============================================

async function guardarCotizacionActual() {
  if (cotizacion.length === 0) {
    mostrarNotificacion("⚠️ La cotización está vacía. Agrega servicios primero.", "warning");
    return;
  }

  const nombre = nombreCotizacionActiva || "Cliente General";
  const subtotal = cotizacion.reduce((sum, item) => sum + item.precio, 0);
  const aplicarItbis = document.getElementById('checkAplicarItbis')?.checked || false;
  let impuesto = 0;
  if (aplicarItbis) impuesto = subtotal * 0.18;
  const total = subtotal + impuesto;

  const detallesTexto = cotizacion.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
  const descripcionFinal = detallesTexto.length > 100 ? detallesTexto.substring(0, 97) + '...' : detallesTexto;

  const paqueteDeDatos = {
    fecha: new Date().toISOString(),
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    tipo: "General",
    nombre: nombre,
    total: total.toFixed(2),
    descripcion: descripcionFinal,
    items: cotizacion
  };

  try {
    const newRef = await db.ref("cotizaciones").push(paqueteDeDatos);
    idCotizacionActiva = newRef.key;
    nombreCotizacionActiva = nombre;
    guardarEnLocalStorage();
    actualizarCotizacion();
    mostrarNotificacion(`✅ Cotización guardada`, "success");
  } catch (error) {
    console.error("❌ Error:", error);
    mostrarNotificacion("Error al guardar: " + error.message, "error");
  }
}

async function guardarCambiosCotizacion() {
  if (!idCotizacionActiva) {
    mostrarNotificacion("⚠️ No hay una cotización activa para editar.", "error");
    return;
  }

  const nombre = nombreCotizacionActiva || "Cliente General";
  const subtotal = cotizacion.reduce((sum, item) => sum + item.precio, 0);
  const aplicarItbis = document.getElementById('checkAplicarItbis')?.checked || false;
  let impuesto = 0;
  if (aplicarItbis) impuesto = subtotal * 0.18;
  const total = subtotal + impuesto;

  const detallesTexto = cotizacion.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
  const descripcionFinal = detallesTexto.length > 100 ? detallesTexto.substring(0, 97) + '...' : detallesTexto;

  const paqueteDeDatos = {
    fecha: new Date().toISOString(),
    tipo: "General",
    nombre: nombre,
    total: total.toFixed(2),
    descripcion: descripcionFinal,
    items: cotizacion
  };

  try {
    await db.ref("cotizaciones").child(idCotizacionActiva).update(paqueteDeDatos);
    mostrarNotificacion(`✅ Cambios guardados correctamente`, "success");
  } catch (error) {
    console.error("❌ Error actualizando:", error);
    mostrarNotificacion("Error al actualizar: " + error.message, "error");
  }
}

function corregirFacturaDesdeCotizacion(id) {
  const cotizacionOriginal = todasLasCotizaciones.find(c => c.id === id);
  
  if (!cotizacionOriginal) {
    mostrarNotificacion('Error: No se pudo encontrar la cotización para corregir.', 'error');
    return;
  }

  cotizacion = JSON.parse(JSON.stringify(cotizacionOriginal.items ? Object.values(cotizacionOriginal.items) : []));
  idCotizacionActiva = null;
  nombreCotizacionActiva = cotizacionOriginal.nombre || "Cliente General";
  
  actualizarCotizacion();
  cerrarModalCotizaciones();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  mostrarNotificacion('Cotización clonada. No olvides anular la factura original si es incorrecta.', 'warning');
}

function cargarCotizacionGuardada(id) {
  const cotizacionGuardada = todasLasCotizaciones.find(c => c.id === id);
  if (cotizacionGuardada) {
    idCotizacionActiva = id;
    nombreCotizacionActiva = cotizacionGuardada.nombre || "Cliente General";
    cotizacion = cotizacionGuardada.items ? Object.values(cotizacionGuardada.items) : [];
    actualizarCotizacion();
    cerrarModalCotizaciones();
    mostrarNotificacion(`Cotización "${cotizacionGuardada.nombre}" cargada para edición`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    mostrarNotificacion('Error: No se pudo encontrar la cotización seleccionada', 'error');
  }
}

function eliminarCotizacionGuardada(id) {
  const cotizacion = todasLasCotizaciones.find(c => c.id === id);
  if (cotizacion) {
    idCotizacionAEliminar = id;
    const nombreSpan = document.getElementById('nombreCotizacionEliminar');
    if (nombreSpan) nombreSpan.textContent = `"${cotizacion.nombre}"`;
    document.getElementById('modalConfirmarEliminar').classList.remove('hidden');
  }
}

async function ejecutarEliminacionCotizacion() {
  if (!idCotizacionAEliminar) return;
  const id = idCotizacionAEliminar;
  document.getElementById('modalConfirmarEliminar').classList.add('hidden');
  idCotizacionAEliminar = null;

  try {
    await db.ref("cotizaciones").child(id).remove();
    todasLasCotizaciones = todasLasCotizaciones.filter(c => c.id !== id);
    renderizarCotizacionesGuardadas();
    mostrarNotificacion('Cotización eliminada', 'success');
    if (idCotizacionActiva === id) limpiarCotizacion();
  } catch (error) {
    console.error("Error eliminando:", error);
    mostrarNotificacion('Error al eliminar.', 'error');
  }
}

function renderizarCotizacionesGuardadas() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (!container) return;

  if (!todasLasCotizaciones) {
    container.innerHTML = `<p class="text-center text-gray-500 py-8">Cargando...</p>`;
    return;
  }

  if (todasLasCotizaciones.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-8">No hay cotizaciones guardadas.</p>`;
    return;
  }

  container.innerHTML = todasLasCotizaciones.map(c => {
    let fechaObj = new Date();
    if (c.timestamp && c.timestamp.toDate) {
      fechaObj = c.timestamp.toDate();
    } else if (c.fecha) {
      fechaObj = new Date(c.fecha);
    }
    
    const fechaStr = fechaObj.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const total = Number(c.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    const icono = '📄';
    const descripcion = `${c.items ? c.items.length : 0} servicio(s)`;
    
    const btnFacturar = (!c.ncf) 
      ? `<button type="button" onclick="abrirModalFacturacion('${c.id}')" class="flex-1 md:flex-none min-w-[100px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm whitespace-nowrap">🧾 Facturar</button>`
      : (c.ncf ? `<span class="text-xs font-bold text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded whitespace-nowrap">✅ ${c.ncf}</span>` : '');

    const esFacturada = c.estado === 'facturada' || c.ncf;

    const btnEditarOCorregir = esFacturada
      ? `<button type="button" onclick="corregirFacturaDesdeCotizacion('${c.id}')" class="flex-1 md:flex-none min-w-[90px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-yellow-600 hover:bg-yellow-700 transition-all shadow-sm whitespace-nowrap" title="Clona esta cotización para corregir y generar una nueva factura.">🔁 Corregir</button>`
      : `<button type="button" onclick="cargarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none min-w-[90px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm whitespace-nowrap">📝 Editar</button>`;

    return `
      <div class="p-4 mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-blue-50 dark:hover:bg-gray-700/60 transition-colors">
        <div class="flex-grow w-full md:w-auto">
          <p class="font-bold text-lg text-blue-700 dark:text-blue-400 break-words">${icono} ${c.nombre}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Guardada el ${fechaStr} - ${descripcion}</p>
          <p class="text-md font-semibold text-gray-800 dark:text-gray-200 mt-1">Total: RD$${total}</p>
        </div>
        <div class="flex flex-wrap gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
          ${btnFacturar}
          ${btnEditarOCorregir}
          <button type="button" onclick="eliminarCotizacionGuardada('${c.id}')" class="flex-1 md:flex-none min-w-[90px] py-2 px-3 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm whitespace-nowrap">🗑️ Borrar</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// 🧾 LÓGICA DE FACTURACIÓN Y RNC
// ============================================

function validarRNC(str) {
  str = str.replace(/-/g, '').trim();
  if (![9, 11].includes(str.length)) return false;

  let total = 0;
  let multiplicadores;

  if (str.length === 9) {
      multiplicadores = [7, 9, 8, 6, 5, 4, 3, 2];
  } else {
      multiplicadores = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  }

  for (let i = 0; i < multiplicadores.length; i++) {
      let calculo = parseInt(str.charAt(i)) * multiplicadores[i];
      if (str.length === 11 && calculo >= 10) {
          let sum = calculo.toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
          total += sum;
      } else {
          total += calculo;
      }
  }

  let digitoVerificador;
  if (str.length === 9) {
      let resto = total % 11;
      digitoVerificador = resto === 0 ? 2 : (resto === 1 ? 1 : 11 - resto);
  } else {
      let resto = total % 10;
      digitoVerificador = resto === 0 ? 0 : 10 - resto;
  }

  return parseInt(str.charAt(str.length - 1)) === digitoVerificador;
}

// ============================================
// 🔍 BÚSQUEDA PREDICTIVA DE CLIENTES
// ============================================

function manejarBusquedaCliente(e) {
  const termino = e.target.value.trim();
  const lista = document.getElementById('listaResultadosClientes');
  
  clearTimeout(searchDebounceTimer);

  const esNumero = /^\d+$/.test(termino);
  const minChars = esNumero ? 3 : 4;

  if (termino.length < minChars) {
    lista.classList.add('hidden');
    return;
  }

  searchDebounceTimer = setTimeout(() => {
    ejecutarBusquedaFirebase(termino);
  }, 450);
}

// ============================================
// 💾 CACHÉ OFFLINE DE CLIENTES
// ============================================
function guardarEnCacheClientes(resultados) {
  if (!resultados) return;
  try {
    let cache = JSON.parse(localStorage.getItem('clientes_offline_cache') || '{}');
    Object.assign(cache, resultados);
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      const keysToKeep = keys.slice(keys.length - 500);
      const newCache = {};
      keysToKeep.forEach(k => newCache[k] = cache[k]);
      cache = newCache;
    }
    localStorage.setItem('clientes_offline_cache', JSON.stringify(cache));
  } catch (e) { console.warn('Cache full', e); }
}

function buscarEnCacheLocal(termino) {
  try {
    const cache = JSON.parse(localStorage.getItem('clientes_offline_cache') || '{}');
    const resultados = {};
    const esNumero = /^\d+$/.test(termino);
    const terminoNorm = termino.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    let count = 0;
    for (const [rnc, data] of Object.entries(cache)) {
      if (count >= 5) break;
      const nombre = (data.n || data.nombre || '').toUpperCase();
      if ((esNumero && rnc.includes(termino)) || (!esNumero && nombre.includes(terminoNorm))) {
        resultados[rnc] = data;
        count++;
      }
    }
    return Object.keys(resultados).length > 0 ? resultados : null;
  } catch (e) { return null; }
}

async function ejecutarBusquedaFirebase(termino) {
  const lista = document.getElementById('listaResultadosClientes');
  lista.innerHTML = `
    <div class="p-6 flex flex-col items-center justify-center text-blue-600">
      <svg class="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="font-bold text-sm animate-pulse">Buscando clientes...</span>
    </div>
  `;
  lista.classList.remove('hidden');

  if (!navigator.onLine) {
    const resultadosLocal = buscarEnCacheLocal(termino);
    renderizarResultadosBusqueda(resultadosLocal, termino, true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/rnc/${encodeURIComponent(termino)}`);
    
    if (!response.ok) throw new Error('Error en el servidor');
    
    const resultados = await response.json();

    if (resultados && Object.keys(resultados).length > 0) {
      guardarEnCacheClientes(resultados);
    }

    renderizarResultadosBusqueda(resultados, termino, false);

  } catch (error) {
    console.error("Error búsqueda:", error);
    const resultadosLocal = buscarEnCacheLocal(termino);
    if (resultadosLocal) {
      renderizarResultadosBusqueda(resultadosLocal, termino, true);
    } else {
      lista.innerHTML = '<div class="p-3 text-center text-red-500 text-xs">Error de conexión y sin datos locales</div>';
    }
  }
}

function renderizarResultadosBusqueda(resultados, termino, esOffline) {
  const lista = document.getElementById('listaResultadosClientes');
  if (!resultados) {
    lista.innerHTML = '<div class="p-3 text-center text-gray-500">No se encontraron resultados</div>';
    return;
  }
  const badge = esOffline ? '<span class="text-[10px] bg-gray-200 text-gray-600 px-1 rounded ml-2">📡 Offline</span>' : '';
  const safeTerm = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const html = Object.keys(resultados).map(key => {
    const datos = resultados[key];
    const nombre = datos.n || datos.nombre;
    const nombreResaltado = nombre.replace(new RegExp(`(${safeTerm})`, 'gi'), '<span class="bg-yellow-200 text-black">$1</span>');
    return `
      <div class="p-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors" onclick="seleccionarClienteBusqueda('${key}', '${nombre.replace(/'/g, "\\'")}')">
        <div class="flex justify-between items-start">
          <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${nombreResaltado}</p>
          ${badge}
        </div>
        <p class="text-xs text-gray-500 font-mono">RNC: ${key}</p>
      </div>
    `;
  }).join('');
  lista.innerHTML = html;
}

window.seleccionarClienteBusqueda = function(rnc, nombre) {
  document.getElementById('facturaClienteRNC').value = rnc;
  document.getElementById('facturaClienteNombre').value = nombre;
  document.getElementById('listaResultadosClientes').classList.add('hidden');
  
  const infoLabel = document.getElementById('infoClienteRNC');
  infoLabel.textContent = '✅ Cliente seleccionado';
  infoLabel.classList.remove('hidden');

  const selectNCF = document.getElementById('facturaTipoNCF');
  const rncLimpio = rnc.replace(/-/g, '');

  if (rncLimpio.length === 11) {
    selectNCF.value = 'B02';
  } else if (rncLimpio.length === 9) {
    if (rncLimpio.startsWith('4')) {
      selectNCF.value = 'B15';
    } else {
      selectNCF.value = 'B01';
    }
  } else {
    selectNCF.value = 'B02';
  }

  actualizarPreviewNCF();
};

async function buscarClientePorRNC() {
  const rncInput = document.getElementById('facturaClienteRNC');
  const nombreInput = document.getElementById('facturaClienteNombre');
  const infoLabel = document.getElementById('infoClienteRNC');
  const selectNCF = document.getElementById('facturaTipoNCF');
  
  const rnc = rncInput.value.replace(/-/g, '').trim();

  if (!validarRNC(rnc)) {
    mostrarNotificacion('RNC o Cédula inválido', 'error');
    infoLabel.classList.add('hidden');
    return;
  }

  if (rnc.length === 11) {
    selectNCF.value = 'B02';
  } else if (rnc.length === 9) {
    if (rnc.startsWith('4')) {
      selectNCF.value = 'B15';
    } else {
      selectNCF.value = 'B01';
    }
  }
  actualizarPreviewNCF();

  mostrarNotificacion('Buscando en base de datos...', 'info');

  try {
    const response = await fetch(`${API_BASE_URL}/api/rnc/${rnc}`);
    const resultados = await response.json();
    const datos = resultados ? resultados[rnc] : null;

    if (datos) {
      nombreInput.value = datos.n || datos.nombre;
      infoLabel.textContent = '✅ Cliente encontrado en DGII';
      infoLabel.classList.remove('hidden');
    } else {
      mostrarNotificacion('RNC válido pero no registrado en local. Ingrese nombre manual.', 'warning');
      infoLabel.innerHTML = `
        <span class="text-yellow-600 font-bold">⚠️ Nuevo Cliente</span>
        <button onclick="guardarNuevoCliente()" type="button" class="ml-3 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded border border-blue-200 transition-colors font-bold shadow-sm">
          💾 Guardar en BD
        </button>
      `;
      infoLabel.classList.remove('hidden');
      nombreInput.focus();
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error de conexión', 'error');
  }
}

async function guardarNuevoCliente() {
  const rncInput = document.getElementById('facturaClienteRNC');
  const nombreInput = document.getElementById('facturaClienteNombre');
  const infoLabel = document.getElementById('infoClienteRNC');

  const rnc = rncInput.value.replace(/-/g, '').trim();
  const nombre = nombreInput.value.trim();

  if (!validarRNC(rnc)) {
    mostrarNotificacion('RNC inválido', 'error');
    return;
  }

  if (!nombre) {
    mostrarNotificacion('Ingrese el nombre del cliente para guardarlo', 'warning');
    nombreInput.focus();
    return;
  }

  const btn = infoLabel.querySelector('button');
  if(btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Guardando...';
  }

  try {
    const nombreNormalizado = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    await db.ref('maestro_contribuyentes/' + rnc).set({
      n: nombreNormalizado,
      nombre: nombre 
    });

    mostrarNotificacion('✅ Cliente agregado a la base de datos', 'success');
    infoLabel.innerHTML = '<span class="text-green-600 font-bold">✅ Cliente registrado exitosamente</span>';
    
    const selectNCF = document.getElementById('facturaTipoNCF');
    if (selectNCF && !selectNCF.value) {
        if (rnc.length === 9) selectNCF.value = 'B01';
        else selectNCF.value = 'B02';
    }
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
    if(btn) {
        btn.disabled = false;
        btn.textContent = '💾 Guardar en BD';
    }
  }
}

// ============================================
// 🔢 CONTROL DE SECUENCIA NCF
// ============================================

async function actualizarPreviewNCF() {
  const tipo = document.getElementById('facturaTipoNCF').value;
  const label = document.getElementById('previewProximoNCF');
  const btnConfirmar = document.getElementById('btnConfirmarFactura');

  if (!label) return;

  label.textContent = '🔄 Verificando secuencia...';
  label.className = 'text-xs font-bold mt-2 text-right text-gray-500';
  
  if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.classList.add('opacity-50', 'cursor-not-allowed');
  }

  try {
    const snap = await db.ref(`secuencias_ncf/${tipo}`).once('value');
    const data = snap.val();

    if (!data) {
        label.textContent = '⚠️ TIPO NO CONFIGURADO';
        label.className = 'text-xs font-bold mt-2 text-right text-red-500 animate-pulse';
        return;
    }

    const actual = parseInt(data.actual || 0, 10);
    const desde = parseInt(data.desde || 1, 10);
    const hasta = parseInt(data.hasta || 0, 10);

    const effectiveActual = (actual < desde - 1) ? (desde - 1) : actual;
    const disponibles = hasta - effectiveActual;
    const siguiente = effectiveActual + 1;

    const ncfPreview = tipo + String(siguiente).padStart(8, '0');
    
    if (disponibles <= 0) {
        label.textContent = `⛔ AGOTADO (Límite: ${hasta})`;
        label.className = 'text-xs font-bold mt-2 text-right text-red-600 font-black';
    } else {
        if (disponibles <= 10) {
            label.textContent = `⚠️ Quedan ${disponibles} - Próximo: ${ncfPreview}`;
            label.className = 'text-xs font-bold mt-2 text-right text-orange-600 animate-pulse';
        } else {
            label.textContent = `Próximo: ${ncfPreview} • Disponibles: ${disponibles}`;
            label.className = 'text-xs font-bold mt-2 text-right text-blue-600';
        }
        
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
  } catch (e) {
    console.error(e);
    label.textContent = '⚠️ Error al consultar secuencia';
    label.className = 'text-xs font-bold mt-2 text-right text-red-500';
  }
}

// ============================================
// ✅ FIX PRINCIPAL: abrirModalFacturacion
// Normaliza items de Firebase (objeto → array) antes de todo
// ============================================
function abrirModalFacturacion(idCotizacion) {
  if (!verificarPermisoAdmin()) return;

  const cotOriginal = todasLasCotizaciones.find(c => c.id === idCotizacion);
  if (!cotOriginal) return;

  // Clonar cotización profundamente
  cotizacionAFacturar = JSON.parse(JSON.stringify(cotOriginal));

  // ✅ FIX: Firebase guarda arrays como objetos con claves numéricas.
  // Siempre normalizar a array real antes de continuar.
  if (cotizacionAFacturar.items && !Array.isArray(cotizacionAFacturar.items)) {
    cotizacionAFacturar.items = Object.values(cotizacionAFacturar.items);
  }
  if (!cotizacionAFacturar.items) {
    cotizacionAFacturar.items = [];
  }

  // Pre-llenar datos del modal
  document.getElementById('facturaClienteNombre').value = cotizacionAFacturar.nombre;
  document.getElementById('facturaClienteRNC').value = '';
  document.getElementById('facturaFecha').valueAsDate = new Date();
  document.getElementById('facturaAbono').value = '';

  document.getElementById('infoClienteRNC').classList.add('hidden');
  document.getElementById('listaResultadosClientes').classList.add('hidden');

  renderizarItemsFacturaModal();
  document.getElementById('modalFacturacion').classList.remove('hidden');
  cerrarModalCotizaciones();
  actualizarPreviewNCF();

  document.getElementById('facturaTipoNCF').addEventListener('change', () => {
    actualizarPreviewNCF();
    recalcularTotalesFacturaModal();
  });

  document.querySelectorAll('input[name="facturaCondicionVenta"]').forEach(r => {
    r.addEventListener('change', (e) => {
      const div = document.getElementById('divFacturaVencimiento');
      const val = e.target.value;
      if (val.startsWith('credito')) {
        div.classList.remove('hidden');
        const dias = val === 'credito_15' ? 15 : 30;
        const d = new Date();
        d.setDate(d.getDate() + dias);
        document.getElementById('facturaVencimiento').valueAsDate = d;
      } else {
        div.classList.add('hidden');
      }
    });
  });

  document.getElementById('facturaMetodoPago').addEventListener('change', (e) => {
    const ref = document.getElementById('facturaReferencia');
    if (e.target.value !== 'efectivo') ref.classList.remove('hidden');
    else ref.classList.add('hidden');
  });
}

// --- FUNCIONES PARA LA TABLA DEL MODAL ---

function renderizarItemsFacturaModal() {
    const tbody = document.getElementById('facturaTablaProductos');
    tbody.innerHTML = '';
    
    if (!cotizacionAFacturar.items || cotizacionAFacturar.items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">Sin items</td></tr>';
        return;
    }

    cotizacionAFacturar.items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors";
        
        const precio = parseFloat(item.precioUnitario || item.precio || 0);
        const total = parseFloat(item.precio || 0);

        row.innerHTML = `
            <td class="p-2"><input type="number" class="w-full text-center bg-transparent border border-gray-200 rounded p-1" value="${item.cantidad}" onchange="actualizarItemFactura(${index}, 'cantidad', this.value)"></td>
            <td class="p-2"><input type="text" class="w-full bg-transparent border border-gray-200 rounded p-1" value="${item.nombre} ${item.descripcion || ''}" onchange="actualizarItemFactura(${index}, 'descripcion', this.value)"></td>
            <td class="p-2"><input type="number" class="w-full text-right bg-transparent border border-gray-200 rounded p-1" value="${precio.toFixed(2)}" onchange="actualizarItemFactura(${index}, 'precio', this.value)"></td>
            <td class="p-2 text-center"><input type="checkbox" checked disabled class="opacity-50 cursor-not-allowed"></td>
            <td class="p-2 text-right font-bold text-gray-700 dark:text-gray-300">RD$ ${total.toFixed(2)}</td>
            <td class="p-2 text-center"><button onclick="eliminarItemFactura(${index})" class="text-red-500 hover:bg-red-100 rounded p-1">✕</button></td>
        `;
        tbody.appendChild(row);
    });
    
    recalcularTotalesFacturaModal();
}

window.actualizarItemFactura = function(index, campo, valor) {
    const item = cotizacionAFacturar.items[index];
    if (campo === 'cantidad') item.cantidad = parseFloat(valor);
    if (campo === 'precio') item.precioUnitario = parseFloat(valor);
    if (campo === 'descripcion') item.descripcion = valor;
    
    item.precio = item.cantidad * item.precioUnitario;
    renderizarItemsFacturaModal();
}

window.eliminarItemFactura = function(index) {
    cotizacionAFacturar.items.splice(index, 1);
    renderizarItemsFacturaModal();
}

window.facturaAgregarItemVacio = function() {
    cotizacionAFacturar.items.push({
        cantidad: 1,
        nombre: "Nuevo Item",
        precioUnitario: 0,
        precio: 0
    });
    renderizarItemsFacturaModal();
}

function recalcularTotalesFacturaModal() {
    let subtotal = 0;
    cotizacionAFacturar.items.forEach(i => subtotal += parseFloat(i.precio || 0));
    
    const tipoNCF = document.getElementById('facturaTipoNCF').value;
    let itbis = 0;
    
    if (tipoNCF === 'B01' || tipoNCF === 'B02') {
        itbis = subtotal * 0.18;
    }
    
    const total = subtotal + itbis;
    
    document.getElementById('facturaSubtotal').textContent = `RD$ ${subtotal.toFixed(2)}`;
    document.getElementById('facturaITBIS').textContent = `RD$ ${itbis.toFixed(2)}`;
    document.getElementById('facturaTotalGeneral').textContent = `RD$ ${total.toFixed(2)}`;
    
    cotizacionAFacturar.total = total;
}

function validarFormatoNCF(ncf) {
  const regex = /^B(01|02|04|14|15)\d{8}$/;
  return regex.test(ncf);
}

// ============================================
// ✅ FIX PRINCIPAL: generarFacturaFinal
// Normaliza items, recalcula total, maneja errores con finally
// ============================================
async function generarFacturaFinal() {
  if (!cotizacionAFacturar) return;

  const btnConfirmar = document.getElementById('btnConfirmarFactura');
  if (btnConfirmar && btnConfirmar.disabled) {
    mostrarNotificacion('⛔ No se puede facturar: NCF Agotado o no configurado.', 'error');
    return;
  }

  const rnc     = document.getElementById('facturaClienteRNC').value.trim();
  const nombre  = document.getElementById('facturaClienteNombre').value.trim();
  const tipoNCF = document.getElementById('facturaTipoNCF').value;
  const abono   = parseFloat(document.getElementById('facturaAbono').value || 0);

  if (!nombre) {
    mostrarNotificacion('El nombre del cliente es obligatorio', 'error');
    return;
  }

  if (tipoNCF === 'B01' && !validarRNC(rnc)) {
    mostrarNotificacion('Para Crédito Fiscal (B01) se requiere un RNC válido', 'error');
    return;
  }

  // ✅ FIX 1: Normalizar items — Firebase los puede devolver como objeto
  const itemsNormalizados = Array.isArray(cotizacionAFacturar.items)
    ? cotizacionAFacturar.items
    : (cotizacionAFacturar.items ? Object.values(cotizacionAFacturar.items) : []);

  if (itemsNormalizados.length === 0) {
    mostrarNotificacion('La cotización no tiene items válidos', 'error');
    return;
  }

  // ✅ FIX 2: Recalcular total desde los items normalizados (no confiar en el campo guardado)
  const subtotal = itemsNormalizados.reduce((sum, item) => sum + parseFloat(item.precio || 0), 0);
  const tieneItbis = tipoNCF === 'B01' || tipoNCF === 'B02';
  const itbisCalculado = tieneItbis ? subtotal * 0.18 : 0;
  const totalFinal = subtotal + itbisCalculado;

  // ✅ FIX 3: Construir objeto limpio para el backend
  const cotizacionParaBackend = {
    id: cotizacionAFacturar.id,
    nombre: cotizacionAFacturar.nombre,
    items: itemsNormalizados,
    subtotal: subtotal,
    itbis_total: itbisCalculado,
    total: totalFinal
  };

  console.log(`🧾 [FACTURACIÓN] Enviando a backend:`, cotizacionParaBackend);
  mostrarNotificacion(`Generando NCF ${tipoNCF}...`, 'info');

  // Deshabilitar botón para evitar doble clic
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.classList.add('opacity-50', 'cursor-not-allowed');
  }

  try {
    const condicionVenta = document.querySelector('input[name="facturaCondicionVenta"]:checked')?.value || 'contado';
    const metodoPago     = document.getElementById('facturaMetodoPago').value;
    const referenciaPago = document.getElementById('facturaReferencia').value;

    const response = await fetch(`${API_BASE_URL}/api/facturar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cotizacion:    cotizacionParaBackend,
        cliente:       { rnc, nombre },
        tipoNCF,
        condicionVenta,
        metodoPago,
        referenciaPago,
        abono
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en el servidor');
    }

    mostrarNotificacion(`✅ ${data.mensaje}`, 'success');
    document.getElementById('modalFacturacion').classList.add('hidden');
    cotizacionAFacturar = null;
    abrirModalCotizaciones();

  } catch (error) {
    console.error('Error facturando:', error);
    mostrarNotificacion('❌ ' + error.message, 'error');
  } finally {
    // ✅ FIX 4: Siempre rehabilitar el botón, tanto en éxito como en error
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

// ============================================
// 📜 HISTORIAL DE FACTURAS Y REPORTE 607
// ============================================

async function abrirModalFacturas() {
  if (!verificarPermisoAdmin()) return;

  const modal = document.getElementById('modalFacturasEmitidas');
  const lista = document.getElementById('listaFacturas');
  const filtro = document.getElementById('filtroMesFacturas');
  
  if (!modal) return;
  
  modal.classList.remove('hidden');
  if (lista) lista.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔄 Cargando facturas...</p></div>';

  if (!filtro.value) {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    filtro.value = `${hoy.getFullYear()}-${mes}`;
  }

  try {
    const snapshot = await db.ref("facturas").limitToLast(100).once("value");
    const data = snapshot.val();

    if (data) {
      todasLasFacturas = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion));
    } else {
      todasLasFacturas = [];
    }

    poblarFiltroClientes();
    renderizarFacturas();
  } catch (error) {
    console.error("Error cargando facturas:", error);
    lista.innerHTML = '<p class="text-center text-red-500">Error al cargar datos.</p>';
  }
}

function poblarFiltroClientes() {
  const select = document.getElementById('filtroClienteFacturas');
  if (!select) return;
  
  const clientes = new Set();
  todasLasFacturas.forEach(f => {
    if (f.razon_social) clientes.add(f.razon_social);
  });
  
  const valorActual = select.value;
  select.innerHTML = '<option value="">Todos los clientes</option>';
  
  Array.from(clientes).sort().forEach(cliente => {
    const option = document.createElement('option');
    option.value = cliente;
    option.textContent = cliente;
    select.appendChild(option);
  });
  
  if (valorActual && clientes.has(valorActual)) {
    select.value = valorActual;
  }
}

async function cargarFacturasPorMes() {
  const filtro = document.getElementById('filtroMesFacturas').value;
  if (!filtro) return;

  const lista = document.getElementById('listaFacturas');
  if (lista) lista.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔄 Buscando en el servidor...</p></div>';

  const start = filtro + "-01";
  const end = filtro + "-31T23:59:59";

  try {
    const snapshot = await db.ref("facturas").orderByChild("fecha_facturacion").startAt(start).endAt(end).once("value");
    const data = snapshot.val();
    
    if (data) {
      todasLasFacturas = Object.keys(data).map(key => ({ ...data[key], id: key })).sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion));
    } else {
      todasLasFacturas = [];
    }
    poblarFiltroClientes();
    renderizarFacturas();
  } catch (error) {
    console.error("Error cargando mes:", error);
    if (lista) lista.innerHTML = '<p class="text-center text-red-500">Error al cargar datos del mes.</p>';
  }
}

function renderizarFacturas() {
  const lista = document.getElementById('listaFacturas');
  const filtro = document.getElementById('filtroMesFacturas').value;
  const ocultarAnuladas = document.getElementById('checkOcultarAnuladas')?.checked;
  const filtroCliente = document.getElementById('filtroClienteFacturas')?.value;
  const totalLabel = document.getElementById('totalFacturasMes');
  
  if (!lista) return;

  const facturasFiltradas = todasLasFacturas.filter(f => {
    if (!f.fecha_facturacion) return false;
    const coincideMes = f.fecha_facturacion.startsWith(filtro);
    if (ocultarAnuladas && f.estado === 'anulada') return false;
    if (filtroCliente && f.razon_social !== filtroCliente) return false;
    return coincideMes;
  });

  if (facturasFiltradas.length === 0) {
    lista.innerHTML = `<div class="text-center py-10 text-gray-500">No hay facturas emitidas en ${filtro}</div>`;
    totalLabel.textContent = 'Total Facturado: RD$0.00';
    return;
  }

  let sumaTotal = 0;

  lista.innerHTML = facturasFiltradas.map(f => {
    const fecha = new Date(f.fecha_facturacion).toLocaleDateString('es-DO');
    const monto = parseFloat(f.total || 0);
    sumaTotal += monto;
    
    const esAnulada = f.estado === 'anulada';
    const esNotaCredito = f.tipo_documento === 'Nota de Crédito';
    
    let estiloContenedor = "bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow";
    let estiloTexto = "font-bold text-gray-800 dark:text-gray-200";
    let estiloMonto = esNotaCredito ? 'text-red-600' : 'text-gray-800 dark:text-white';
    
    let etiquetaEstado;
    if (esAnulada) {
        etiquetaEstado = '<span class="text-xs text-red-500 dark:text-red-400 font-bold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">🚫 Anulada</span>';
        estiloContenedor = "bg-gray-100 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center opacity-60 grayscale";
        estiloTexto = "font-bold text-gray-500 line-through";
        estiloMonto = "text-gray-400 line-through";
    } else if (esNotaCredito) {
        etiquetaEstado = '<span class="text-xs text-purple-600 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">↩️ Nota Crédito</span>';
    } else {
        etiquetaEstado = `
          <button type="button" onclick="abrirModalEditarFactura('${f.id}')" class="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded border border-yellow-600 transition-colors font-bold mr-2 shadow-sm">✏️ Editar</button>
          <button type="button" onclick="imprimirFactura('${f.id}')" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded border border-blue-700 transition-colors font-bold mr-2 shadow-sm">🖨️ Imprimir</button>
          <button type="button" onclick="anularFactura('${f.id}')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded border border-red-200 transition-colors font-bold">🚫 Anular</button>
        `;
    }

    const ncfSafe = f.ncf ? f.ncf.replace(/['"]/g, "") : "SIN-NCF";

    return `
      <div class="${estiloContenedor}">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded text-sm">${f.ncf}</span>
            <span class="text-sm text-gray-500">${fecha}</span>
          </div>
          <p class="${estiloTexto} mt-1">${f.razon_social}</p>
          <p class="text-xs text-gray-500">RNC: ${f.rnc_cliente}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-black ${estiloMonto}">RD$${monto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
          <div class="mt-1 flex items-center justify-end gap-2">
            ${etiquetaEstado}
          </div>
        </div>
      </div>
    `;
  }).join('');

  totalLabel.textContent = `Total Facturado: RD$${sumaTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

async function imprimirFactura(idFactura) {
  const factura = todasLasFacturas.find(f => f.id === idFactura);
  if (!factura) {
    mostrarNotificacion('Error: Factura no encontrada en el historial.', 'error');
    return;
  }

  mostrarNotificacion(`📄 Generando PDF para ${factura.ncf}...`, 'info');

  const items = Array.isArray(factura.items) ? factura.items : (factura.items ? Object.values(factura.items) : []);
  const subtotal = items.reduce((s, i) => s + parseFloat(i.precio || 0), 0);
  const itbis = factura.itbis_total || (subtotal * 0.18);

  const datosFactura = {
    id: factura.id,
    ncf: factura.ncf,
    fecha: new Date(factura.fecha_facturacion).toLocaleDateString('es-DO'),
    tituloDocumento: factura.tipo_documento || 'FACTURA',
    cliente: {
      nombre: factura.razon_social,
      rnc: factura.rnc_cliente,
      telefono: factura.telefono || ''
    },
    items: items,
    subtotal: subtotal,
    impuestos: [{ nombre: 'ITBIS (18%)', monto: itbis }],
    total: factura.total,
    condicion: factura.condicion_venta,
    vencimiento: factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString('es-DO') : 'N/A',
    abono: factura.abono || 0
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/generar-factura-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosFactura)
    });

    if (!response.ok) throw new Error('Error generando PDF desde el servidor');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura_${factura.ncf}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    mostrarNotificacion('✅ PDF de la factura descargado.', 'success');

  } catch (error) {
    console.error(error);
    mostrarNotificacion(error.message, 'error');
  }
}

async function anularFactura(idFactura) {
  if (!verificarPermisoAdmin()) return;

  const facturaOriginal = todasLasFacturas.find(f => f.id === idFactura);
  if (!facturaOriginal) return;

  const fechaFactura = new Date(facturaOriginal.fecha_facturacion);
  const fechaActual = new Date();
  
  if (fechaFactura.getFullYear() < fechaActual.getFullYear() || 
     (fechaFactura.getFullYear() === fechaActual.getFullYear() && fechaFactura.getMonth() < fechaActual.getMonth())) {
    mostrarNotificacion('⛔ No se puede anular una factura de un mes fiscal cerrado.', 'error');
    return;
  }

  idFacturaAAnular = idFactura;
  const modal = document.getElementById('modalConfirmarAnulacion');
  const input = document.getElementById('inputConfirmacionAnular');
  const btn = document.getElementById('btnEjecutarAnulacion');
  
  if (modal && input && btn) {
    input.value = '';
    btn.disabled = true;
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
  }
}

async function procesarAnulacion() {
  if (!idFacturaAAnular) return;
  const idFactura = idFacturaAAnular;
  const facturaOriginal = todasLasFacturas.find(f => f.id === idFactura);
  
  document.getElementById('modalConfirmarAnulacion').classList.add('hidden');
  idFacturaAAnular = null;

  if (!facturaOriginal) return;
  
  mostrarNotificacion('Generando Nota de Crédito...', 'info');

  try {
    const secuenciaRef = db.ref('secuencias_ncf/B04');
    const result = await secuenciaRef.transaction((currentData) => {
      if (currentData === null) return { actual: 1 };
      return { ...currentData, actual: (currentData.actual || 0) + 1 };
    });

    const numeroSecuencia = result.snapshot.val().actual;
    const ncfNota = 'B04' + String(numeroSecuencia).padStart(8, '0');

    const notaCredito = {
      ...facturaOriginal,
      tipo_documento: 'Nota de Crédito',
      ncf: ncfNota,
      ncf_modificado: facturaOriginal.ncf,
      fecha_facturacion: new Date().toISOString(),
      origen_factura: idFactura,
      total: -Math.abs(facturaOriginal.total)
    };
    
    delete notaCredito.id;

    const newRef = db.ref('facturas').push(notaCredito);
    await newRef;

    await db.ref(`facturas/${idFactura}`).update({ estado: 'anulada' });

    const indexOriginal = todasLasFacturas.findIndex(f => f.id === idFactura);
    if (indexOriginal !== -1) {
      todasLasFacturas[indexOriginal].estado = 'anulada';
    }

    notaCredito.id = newRef.key;
    todasLasFacturas.unshift(notaCredito);
    todasLasFacturas.sort((a, b) => new Date(b.fecha_facturacion) - new Date(a.fecha_facturacion));
    
    renderizarFacturas();

    mostrarNotificacion(`✅ Factura anulada con ${ncfNota}`, 'success');

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al anular: ' + error.message, 'error');
  }
}

// ============================================
// ✏️ EDICIÓN DE FACTURA (MODAL ROBUSTO)
// ============================================

function formatearMonedaModal(valor) { 
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0); 
}

function renderizarItemsEditablesModal(items) {
    if (!items || items.length === 0) {
        return '<tr><td colspan="5" class="p-8 text-center text-gray-400 italic">No hay items en esta factura. Agrega uno para empezar.</td></tr>';
    }

    return items.map((item, index) => {
        const cantidad = item.cantidad || 1;
        const total = item.precio || 0;
        const unitario = item.precioUnitario || (cantidad > 0 ? total / cantidad : 0) || 0;
        
        return `
        <tr data-index="${index}" class="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <td class="p-3">
                <input type="text" name="item_desc_${index}" value="${item.descripcion || item.nombre || ''}" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all">
            </td>
            <td class="p-3">
                <input type="number" name="item_cant_${index}" value="${cantidad}" min="1" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-center transition-all" oninput="recalcularTotalesModal()">
            </td>
            <td class="p-3">
                <input type="number" name="item_precio_${index}" value="${unitario.toFixed(2)}" min="0" step="0.01" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium text-right transition-all" oninput="recalcularTotalesModal()">
            </td>
            <td id="total_row_${index}" class="p-3 text-right font-bold text-gray-700 dark:text-gray-300">RD$ ${formatearMonedaModal(total)}</td>
            <td class="p-3 text-center">
                <button type="button" onclick="eliminarFilaModal(this)" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar item">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>
    `}).join('');
}

window.abrirModalEditarFactura = function(id) {
    const factura = todasLasFacturas.find(f => f.id === id);
    if (!factura) return mostrarNotificacion('Factura no encontrada en memoria', 'error');

    const modalAnterior = document.getElementById('modalEditarFactura');
    if (modalAnterior) modalAnterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modalEditarFactura';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900 bg-opacity-75 backdrop-blur-sm p-4 animate-fade-in';

    modal.innerHTML = `
        <div class="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden relative" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-2xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
                    <span class="text-4xl">✏️</span>
                    <div>
                        <span>Editar Factura</span>
                        <span class="block text-sm font-mono text-blue-600 dark:text-blue-400">${factura.ncf || 'BORRADOR'}</span>
                    </div>
                </h3>
                <button type="button" onclick="cerrarModalEditarFactura()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
            </div>
            <div class="p-6 overflow-y-auto" id="contenidoModalEditar">
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const items = Array.isArray(factura.items) ? factura.items : (factura.items ? Object.values(factura.items) : []);
    
    const htmlFormulario = `
        <form id="formEdicionFactura" class="space-y-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">Detalles</h2>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Fecha Emisión</label>
                            <input type="text" value="${new Date(factura.fecha_facturacion).toLocaleString('es-DO')}" disabled class="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 font-medium cursor-not-allowed">
                        </div>
                    </div>
                </div>
                <div class="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">Datos del Cliente</h2>
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

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span class="bg-green-100 text-green-600 p-1.5 rounded-lg text-sm">💰</span> Condición de Pago
                    </h2>
                    <div class="flex flex-wrap gap-4">
                        <label class="cursor-pointer relative">
                            <input type="radio" name="condicion_venta_modal" value="contado" class="peer sr-only" ${!factura.condicion_venta || factura.condicion_venta === 'contado' ? 'checked' : ''}>
                            <div class="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700 hover:bg-white shadow-sm">
                                💵 Contado
                            </div>
                        </label>
                        <label class="cursor-pointer relative">
                            <input type="radio" name="condicion_venta_modal" value="credito_15" class="peer sr-only" ${factura.condicion_venta === 'credito_15' ? 'checked' : ''}>
                            <div class="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700 hover:bg-white shadow-sm">
                                📅 Crédito 15 días
                            </div>
                        </label>
                        <label class="cursor-pointer relative">
                            <input type="radio" name="condicion_venta_modal" value="credito_30" class="peer sr-only" ${factura.condicion_venta === 'credito_30' ? 'checked' : ''}>
                            <div class="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold transition-all peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 hover:bg-white shadow-sm">
                                📅 Crédito 30 días
                            </div>
                        </label>
                    </div>
                </div>
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <span class="bg-cyan-100 text-cyan-600 p-1.5 rounded-lg text-sm">💳</span> Método de Pago
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Método</label>
                            <select name="metodo_pago_modal" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-800 dark:text-white">
                                <option value="efectivo" ${factura.metodo_pago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                                <option value="transferencia" ${factura.metodo_pago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                                <option value="tarjeta" ${factura.metodo_pago === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                                <option value="cheque" ${factura.metodo_pago === 'cheque' ? 'selected' : ''}>Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Abono</label>
                            <input type="number" name="abono_modal" value="${factura.abono || 0}" min="0" step="0.01" class="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-800 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Referencia</label>
                            <input type="text" name="referencia_modal" value="${factura.referencia || ''}" placeholder="Ej: #Cheque, ID Trans." class="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-800 dark:text-white">
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">Items de la Factura</h2>
                    <button type="button" class="py-2 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2" onclick="agregarItemVacioModal()">
                        <span>➕</span> Agregar Item
                    </button>
                </div>
                <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-100 dark:bg-gray-700 text-left">
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[40%]">Descripción</th>
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%] text-center">Cant.</th>
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%] text-right">Precio Unit.</th>
                                <th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%] text-right">Subtotal</th>
                                <th class="p-4 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody id="itemsTableModal" class="divide-y divide-gray-100 dark:divide-gray-700">
                            ${renderizarItemsEditablesModal(items)}
                        </tbody>
                    </table>
                </div>
                <div class="flex flex-col md:flex-row justify-end items-start gap-8">
                    <div class="mt-4">
                        <label class="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <input type="checkbox" id="checkItbisModal" onchange="recalcularTotalesModal()" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500">
                            <span class="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Aplicar ITBIS (18%)</span>
                        </label>
                    </div>
                    <div class="w-full md:w-80 bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center mb-3 text-gray-600 dark:text-gray-400 text-sm">
                            <span>Subtotal:</span>
                            <span id="subtotalFacturaModal" class="font-bold">RD$ 0.00</span>
                        </div>
                        <div class="flex justify-between items-center mb-4 text-gray-600 dark:text-gray-400 text-sm">
                            <span>ITBIS (18%):</span>
                            <span id="itbisFacturaModal" class="font-bold text-orange-500">RD$ 0.00</span>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
                            <span class="font-black text-gray-800 dark:text-white text-lg">TOTAL</span>
                            <span id="totalFacturaModal" class="font-black text-2xl text-blue-600 dark:text-blue-400">RD$ ${formatearMonedaModal(factura.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex flex-wrap justify-end gap-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" class="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors" onclick="cerrarModalEditarFactura()">Cancelar</button>
                <button type="button" onclick="guardarEdicionFactura('${id}')" class="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 shadow-lg shadow-blue-500/30 transform transition-all hover:-translate-y-1">💾 Guardar Cambios</button>
            </div>
        </form>`;

    document.getElementById('contenidoModalEditar').innerHTML = htmlFormulario;

    setTimeout(() => {
        const tieneItbisGuardado = factura.itbis_total > 0 || (factura.aplicar_itbis === true);
        document.getElementById('checkItbisModal').checked = tieneItbisGuardado;
        recalcularTotalesModal();
    }, 100);
}

window.cerrarModalEditarFactura = function() {
    const modal = document.getElementById('modalEditarFactura');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
}

window.agregarItemVacioModal = function() {
    const tbody = document.getElementById('itemsTableModal');
    if (tbody.rows.length === 1 && tbody.rows[0].cells.length > 1 && tbody.rows[0].innerText.includes('No hay items')) {
        tbody.innerHTML = '';
    }
    let maxIndex = -1;
    document.querySelectorAll('#itemsTableModal tr[data-index]').forEach(row => {
        const idx = parseInt(row.getAttribute('data-index'));
        if (idx > maxIndex) maxIndex = idx;
    });
    const newIndex = maxIndex + 1;
    tbody.insertAdjacentHTML('beforeend', renderizarItemsEditablesModal([{nombre: 'Nuevo Item', cantidad: 1, precio: 0, precioUnitario: 0, descripcion: ''}]).replace('data-index="0"', `data-index="${newIndex}"`));
    recalcularTotalesModal();
};

window.eliminarFilaModal = function(btn) {
    if (confirm('¿Eliminar este item?')) {
        const row = btn.closest('tr');
        row.remove();
        recalcularTotalesModal();
    }
};

window.recalcularTotalesModal = function() {
    let subtotalGlobal = 0;
    const rows = document.querySelectorAll('#itemsTableModal tr');

    rows.forEach((row) => {
        if (!row.dataset.index) return;
        const index = row.dataset.index;
        const inputCant = row.querySelector(`input[name="item_cant_${index}"]`);
        const inputPrecio = row.querySelector(`input[name="item_precio_${index}"]`);
        const cellTotal = document.getElementById(`total_row_${index}`);

        const cantidad = parseFloat(inputCant.value) || 0;
        const precio = parseFloat(inputPrecio.value) || 0;
        const subtotal = cantidad * precio;

        if(cellTotal) cellTotal.textContent = `RD$ ${formatearMonedaModal(subtotal)}`;
        subtotalGlobal += subtotal;
    });

    const tieneItbis = document.getElementById('checkItbisModal').checked;
    const itbis = tieneItbis ? subtotalGlobal * 0.18 : 0;
    const total = subtotalGlobal + itbis;

    document.getElementById('subtotalFacturaModal').textContent = `RD$ ${formatearMonedaModal(subtotalGlobal)}`;
    document.getElementById('itbisFacturaModal').textContent = `RD$ ${formatearMonedaModal(itbis)}`;
    document.getElementById('totalFacturaModal').textContent = `RD$ ${formatearMonedaModal(total)}`;
};

window.guardarEdicionFactura = async function(id) {
    const items = [];
    let nuevoTotal = 0;

    document.querySelectorAll('#itemsTableModal tr').forEach((row) => {
        if (!row.dataset.index) return;
        const index = row.dataset.index;
        const desc = row.querySelector(`input[name="item_desc_${index}"]`).value;
        const cant = parseFloat(row.querySelector(`input[name="item_cant_${index}"]`).value) || 0;
        const unitario = parseFloat(row.querySelector(`input[name="item_precio_${index}"]`).value) || 0;
        const subtotal = cant * unitario;

        nuevoTotal += subtotal;
        items.push({ descripcion: desc, cantidad: cant, precioUnitario: unitario, precio: subtotal });
    });
    
    const tieneItbis = document.getElementById('checkItbisModal').checked;
    const itbis = tieneItbis ? nuevoTotal * 0.18 : 0;
    const totalFinal = nuevoTotal + itbis;

    const updates = {
        razon_social: document.querySelector('input[name="razon_social"]').value,
        rnc_cliente: document.querySelector('input[name="rnc_cliente"]').value,
        items: items,
        total: totalFinal,
        itbis_total: itbis,
        aplicar_itbis: tieneItbis,
        condicion_venta: document.querySelector('input[name="condicion_venta_modal"]:checked')?.value,
        metodo_pago: document.querySelector('select[name="metodo_pago_modal"]').value,
        abono: parseFloat(document.querySelector('input[name="abono_modal"]').value) || 0,
        referencia: document.querySelector('input[name="referencia_modal"]').value
    };

    try {
        await fetch(`${API_BASE_URL}/api/facturas/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        mostrarNotificacion('✅ Factura actualizada', 'success');
        cerrarModalEditarFactura();
        if (!document.getElementById('modalFacturasEmitidas').classList.contains('hidden')) {
            abrirModalFacturas(); 
        }
    } catch (e) {
        mostrarNotificacion('Error al guardar: ' + e.message, 'error');
    }
}

// ⛔ SEGURIDAD FISCAL: Función de eliminación desactivada
window.eliminarFacturaPermanente = function() {
  alert("⛔ ACCIÓN DENEGADA POR SEGURIDAD FISCAL\n\nSegún la Norma General 06-2018 de la DGII, las facturas con NCF emitido NO pueden ser eliminadas.\n\nDebe realizar una Nota de Crédito (Anulación) para revertir la operación.");
};

async function generarReporte607() {
  const filtro = document.getElementById('filtroMesFacturas').value;
  
  if (!filtro) {
    mostrarNotificacion('Seleccione un mes para el reporte', 'warning');
    return;
  }

  mostrarNotificacion('⏳ Descargando datos del mes...', 'info');

  const start = filtro + "-01";
  const end = filtro + "-31T23:59:59";

  const snapshot = await db.ref("facturas")
    .orderByChild("fecha_facturacion")
    .startAt(start).endAt(end)
    .once("value");
  
  const dataRaw = snapshot.val() || {};
  const facturasFiltradas = Object.values(dataRaw);

  if (facturasFiltradas.length === 0) {
    mostrarNotificacion('No hay datos para exportar en este mes', 'warning');
    return;
  }

  const data = facturasFiltradas.map(f => {
    const rnc = f.rnc_cliente || '';
    const tipoId = rnc.length === 9 ? 1 : 2; 
    const fecha = f.fecha_facturacion.slice(0, 10);
    const total = parseFloat(f.total || 0);
    const ncfModificado = f.ncf_modificado || '';
    const motivo = f.motivo_anulacion || '';
    
    const esGravado = f.ncf.startsWith('B01') || f.ncf.startsWith('B02');
    const itbis = esGravado ? (total - (total / 1.18)) : 0;
    const monto = total - itbis;

    return {
      "RNC/CEDULA": rnc,
      "TIPO ID": tipoId,
      "NCF": f.ncf,
      "NCF MODIFICADO": ncfModificado || " ",
      "FECHA COMPROBANTE": fecha,
      "MONTO FACTURADO": parseFloat(monto.toFixed(2)),
      "ITBIS FACTURADO": parseFloat(itbis.toFixed(2)),
      "TOTAL": parseFloat(total.toFixed(2)),
      "ESTADO": f.estado === 'anulada' ? 'ANULADA' : 'VIGENTE',
      "MOTIVO ANULACION": motivo || " "
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  const wscols = [
    {wch: 15}, {wch: 8}, {wch: 13}, {wch: 15}, {wch: 12},
    {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte 607");
  XLSX.writeFile(workbook, `Reporte_607_${filtro}.xlsx`);
  
  mostrarNotificacion('Reporte 607 (Excel) descargado', 'success');
}

async function generarReporteDiario() {
  const hoy = new Date().toISOString().slice(0, 10);
  mostrarNotificacion('⏳ Generando reporte de ventas de hoy...', 'info');

  const start = hoy + "T00:00:00";
  const end = hoy + "T23:59:59";

  try {
    const snapshot = await db.ref("facturas")
      .orderByChild("fecha_facturacion")
      .startAt(start).endAt(end)
      .once("value");

    const dataRaw = snapshot.val() || {};
    const facturas = Object.values(dataRaw);

    if (facturas.length === 0) {
      mostrarNotificacion('No hay ventas registradas hoy', 'warning');
      return;
    }

    const data = facturas.map(f => ({
      "Hora": new Date(f.fecha_facturacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
      "NCF": f.ncf,
      "Cliente": f.razon_social,
      "RNC": f.rnc_cliente || "N/A",
      "Estado": f.estado === 'anulada' ? 'ANULADA' : 'VIGENTE',
      "Total": parseFloat(f.total || 0)
    }));

    const totalVentas = facturas
      .filter(f => f.estado !== 'anulada')
      .reduce((sum, f) => sum + parseFloat(f.total || 0), 0);

    data.push({});
    data.push({ 
      "Cliente": "TOTAL VENDIDO HOY:", 
      "Total": totalVentas 
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas Hoy");
    XLSX.writeFile(workbook, `Cierre_Caja_${hoy}.xlsx`);

    mostrarNotificacion('✅ Reporte descargado', 'success');

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error generando reporte', 'error');
  }
}

function descargarBackupJSON() {
  if (todasLasFacturas.length === 0) {
    mostrarNotificacion('No hay facturas para respaldar', 'warning');
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todasLasFacturas, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "backup_facturas_" + new Date().toISOString().slice(0,10) + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  mostrarNotificacion('📦 Copia de seguridad descargada correctamente', 'success');
}

async function generarReporteIT1(formato = 'excel') {
  const filtro = document.getElementById('filtroMesFacturas').value;
  
  if (!filtro) return mostrarNotificacion('Seleccione mes', 'warning');
  mostrarNotificacion('⏳ Procesando IT-1...', 'info');

  const start = filtro + "-01";
  const end = filtro + "-31T23:59:59";

  const snapshot = await db.ref("facturas")
    .orderByChild("fecha_facturacion")
    .startAt(start).endAt(end)
    .once("value");

  const dataRaw = snapshot.val() || {};
  const facturasFiltradas = Object.values(dataRaw).filter(f => f.estado !== 'anulada');

  if (facturasFiltradas.length === 0) {
    mostrarNotificacion('No hay operaciones para el reporte IT-1', 'warning');
    return;
  }

  const resumen = {
    totalOperaciones: 0,
    ventasGravadas: 0,
    ventasExentas: 0,
    itbisFacturado: 0,
    cantidadFacturas: facturasFiltradas.length,
    periodo: filtro
  };

  facturasFiltradas.forEach(f => {
    const total = parseFloat(f.total || 0);
    const ncfPrefix = f.ncf.substring(0, 3);
    
    let itbisCalculado = 0;
    let montoBase = total;
    let esExento = false;

    if (ncfPrefix === 'B14') {
      esExento = true;
      itbisCalculado = 0;
      montoBase = total;
    } else {
      itbisCalculado = total - (total / 1.18);
      montoBase = total - itbisCalculado;
    }

    resumen.totalOperaciones += total;
    
    if (esExento) {
      resumen.ventasExentas += montoBase;
    } else {
      resumen.ventasGravadas += montoBase;
      resumen.itbisFacturado += itbisCalculado;
    }
  });

  const itbisAdelantado = 0.00;
  const itbisAPagar = resumen.itbisFacturado - itbisAdelantado;
  
  const data = [
    { "CONCEPTO": "Periodo Fiscal", "VALOR": filtro },
    { "CONCEPTO": "Cantidad Comprobantes", "VALOR": resumen.cantidadFacturas },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "TOTAL OPERACIONES (VENTAS BRUTAS)", "VALOR": parseFloat(resumen.totalOperaciones.toFixed(2)) },
    { "CONCEPTO": "Ventas Exentas (B14)", "VALOR": parseFloat(resumen.ventasExentas.toFixed(2)) },
    { "CONCEPTO": "Ventas Gravadas (Base Imponible)", "VALOR": parseFloat(resumen.ventasGravadas.toFixed(2)) },
    { "CONCEPTO": "", "VALOR": "" },
    { "CONCEPTO": "ITBIS Facturado (18%)", "VALOR": parseFloat(resumen.itbisFacturado.toFixed(2)) },
    { "CONCEPTO": "ITBIS Adelantado (Compras)", "VALOR": parseFloat(itbisAdelantado.toFixed(2)) },
    { "CONCEPTO": "ITBIS A PAGAR", "VALOR": parseFloat(itbisAPagar.toFixed(2)) }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const wscols = [{wch: 40}, {wch: 20}];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen IT-1");
  XLSX.writeFile(workbook, `Resumen_IT1_${filtro}.xlsx`);
  mostrarNotificacion('📗 Excel IT-1 generado', 'success');
}

async function abrirModalCotizaciones() {
  const container = document.getElementById('listaCotizacionesGuardadas');
  if (container) container.innerHTML = '<div class="text-center py-10"><p class="text-xl animate-pulse">🔥 Cargando desde Base de Datos...</p></div>';
  
  document.getElementById('modalCotizacionesGuardadas')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    const snapshot = await db.ref("cotizaciones").limitToLast(20).once("value");
    const data = snapshot.val();

    if (data) {
      todasLasCotizaciones = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => {
        return new Date(b.fecha || b.fechaISO) - new Date(a.fecha || a.fechaISO);
      });
    } else {
      todasLasCotizaciones = [];
    }

    renderizarCotizacionesGuardadas();
  } catch (error) {
    console.error("Error cargando cotizaciones:", error);
    if (container) container.innerHTML = '<p class="text-center text-red-500 py-8">Error al cargar las cotizaciones.</p>';
  }
}

function cerrarModalCotizaciones() {
  document.getElementById('modalCotizacionesGuardadas')?.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// ============================================
// 💬 WHATSAPP
// ============================================

function enviarWhatsApp() {
  if (cotizacion.length === 0) {
    mostrarNotificacion('Agrega productos antes de enviar', 'warning');
    return;
  }

  let mensaje = "*HOLA, QUIERO COTIZAR LO SIGUIENTE:*\n\n";
  
  cotizacion.forEach((item, i) => {
    mensaje += `*${i + 1}. ${item.nombre}*\n`;
    mensaje += `   ${item.descripcion}\n`;
    mensaje += `   Precio: RD$${item.precio.toFixed(2)}\n\n`;
  });

  const totalEl = document.getElementById('totalAmount');
  const totalTexto = totalEl ? totalEl.textContent : '0.00';
  
  mensaje += `*TOTAL ESTIMADO: ${totalTexto}*`;

  const numeroTelefono = "18096821075";
  const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
}

// ============================================
// 🔔 NOTIFICACIONES TOAST
// ============================================

function mostrarNotificacion(mensaje, tipo = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const iconos = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <span class="toast-icon">${iconos[tipo]}</span>
    <span class="toast-message">${mensaje}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================
// ☁️ FIREBASE DATABASE LOGS
// ============================================

function registrarLogVenta(datos, accion = 'guardar') {
  try {
    db.ref("ventas_log").push({
      ...datos,
      accion: accion,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    console.log(`✅ Registro de venta guardado en Firebase`);
  } catch (e) {
    console.error("Error guardando log de venta:", e);
  }
}

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  marcarPaginaActiva();
  configurarMenuMovil();
  inicializarEventListeners();
  inicializarSeguridad();
  inicializarPrecioTiempoReal();
  inicializarCombos();
  const btnGenPDF = document.getElementById('generarPDF');
  if (btnGenPDF) btnGenPDF.addEventListener('click', imprimirCotizacion);

  console.log('✅ Script inicializado. Escribe "probarConexionFirebase()" en la consola para verificar.');
});

// ============================================
// 🧪 HERRAMIENTA DE DIAGNÓSTICO (GLOBAL)
// ============================================
window.probarConexionFirebase = async function() {
  console.clear();
  console.group("🕵️ Diagnóstico de Conexión Firebase");
  console.log("1. Verificando URL:", firebaseConfig.databaseURL);
  
  try {
    const testRef = db.ref(".info/connected");
    console.log("2. Verificando estado de conexión...");
    const snap = await testRef.once("value");
    
    if (snap.val() === true) {
      console.log("   ✅ Cliente conectado al servidor.");
    } else {
      console.warn("   ⚠️ Cliente desconectado (posiblemente offline).");
    }

    console.log("3. Intentando escribir dato de prueba...");
    const writeRef = db.ref("diagnostico/prueba_" + Date.now());
    await writeRef.set({ prueba: "exitosa", fecha: new Date().toISOString() });
    console.log("   ✅ Escritura exitosa en Realtime Database.");

    console.log("4. Limpiando dato de prueba...");
    await writeRef.remove();
    console.log("   ✅ Borrado exitoso.");

    alert("✅ CONEXIÓN EXITOSA\n\nTu calculadora está conectada correctamente a Firebase Realtime Database.");
  } catch (e) {
    console.error("❌ FALLO:", e);
    alert("❌ ERROR DE CONEXIÓN: " + e.message);
  }
  console.groupEnd();
};

// ============================================
// 👤 HISTORIAL POR CLIENTE (NUEVO)
// ============================================

let historialClienteState = {
  lastDocId: null,
  isLoading: false,
  clienteId: null,
  clienteNombre: null
};

function cerrarModalHistorialCliente() {
  document.getElementById('modalHistorialCliente')?.classList.add('hidden');
}

async function abrirModalHistorialCliente(clienteId, clienteNombre) {
  const modal = document.getElementById('modalHistorialCliente');
  const listaContainer = document.getElementById('listaHistorialCliente');
  const nombreHeader = document.getElementById('nombreClienteHistorial');

  if (!modal || !listaContainer || !nombreHeader) return;

  // Resetear estado para el nuevo cliente
  historialClienteState = {
    lastDocId: null,
    isLoading: false,
    clienteId: clienteId,
    clienteNombre: clienteNombre
  };

  nombreHeader.textContent = clienteNombre;
  listaContainer.innerHTML = '<p class="text-center py-8 text-gray-500 animate-pulse">Cargando historial...</p>';
  modal.classList.remove('hidden');

  // Cargar la primera página del historial
  await fetchHistorialCliente(true);
}

async function fetchHistorialCliente(isInitialLoad = false) {
  if (historialClienteState.isLoading) return;
  historialClienteState.isLoading = true;

  const { clienteId, lastDocId } = historialClienteState;
  const listaContainer = document.getElementById('listaHistorialCliente');
  
  try {
    // Construimos la URL para llamar al backend
    let url = `${API_BASE_URL}/api/facturas/cliente/${clienteId}?limit=20`;
    if (lastDocId) {
      url += `&lastDocId=${lastDocId}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error del servidor al buscar historial.');
    }

    const result = await response.json();
    const { facturas } = result.data;

    if (isInitialLoad && facturas.length === 0) {
      listaContainer.innerHTML = '<p class="text-center py-8 text-gray-500">Este cliente no tiene facturas registradas.</p>';
      return;
    }

    const facturasHtml = facturas.map(factura => {
      // El backend devuelve el Timestamp como un objeto con _seconds
      const fecha = new Date(factura.createdAt._seconds * 1000).toLocaleDateString('es-DO');
      const total = parseFloat(factura.total || 0).toFixed(2);
      return `
        <div class="p-3 mb-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div><p class="font-bold text-sm text-blue-700 dark:text-blue-400">${factura.ncf}</p><p class="text-xs text-gray-500 dark:text-gray-400">Emitida el ${fecha}</p></div>
          <div class="text-right"><p class="font-semibold text-gray-800 dark:text-gray-200">RD$ ${total}</p></div>
        </div>`;
    }).join('');

    if (isInitialLoad) listaContainer.innerHTML = facturasHtml;
    else listaContainer.insertAdjacentHTML('beforeend', facturasHtml);

  } catch (error) {
    console.error('Error al cargar historial del cliente:', error);
    listaContainer.innerHTML = `<p class="text-center py-8 text-red-500">Error: ${error.message}</p>`;
  } finally {
    historialClienteState.isLoading = false;
  }
}

// ============================================
// 🔐 LÓGICA DE AUTENTICACIÓN Y SEGURIDAD
// ============================================

function inicializarSeguridad() {
  auth.onAuthStateChanged(user => {
    actualizarIconoAuth(user);
  });
}

function verificarPermisoAdmin() {
  if (!ACTIVAR_SEGURIDAD) return true;

  const user = auth.currentUser;
  if (user) {
    return true;
  } else {
    document.getElementById('modalLogin').classList.remove('hidden');
    mostrarNotificacion('🔒 Acceso restringido a personal autorizado', 'warning');
    return false;
  }
}

function manejarClickAuth() {
  const user = auth.currentUser;
  if (user) {
    if (!confirm("¿Estás seguro de que deseas cerrar la sesión?")) return;

    auth.signOut().then(() => {
      mostrarNotificacion('Sesión cerrada', 'info');
      if (ACTIVAR_SEGURIDAD) {
        document.getElementById('modalFacturacion').classList.add('hidden');
        document.getElementById('modalFacturasEmitidas').classList.add('hidden');
      }
    });
  } else {
    document.getElementById('modalLogin').classList.remove('hidden');
  }
}

function actualizarIconoAuth(user) {
  const btn = document.getElementById('btnAuthNav');
  if (!btn) return;

  if (user) {
    const nombreUsuario = user.email ? user.email.split('@')[0] : 'Usuario';
    btn.innerHTML = `<span class="mr-1 text-lg">🚪</span><span class="font-bold">Salir (${nombreUsuario})</span>`;
    btn.className = "flex items-center text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-3 py-2 mr-2 transition-all shadow-md";
    btn.title = "Cerrar Sesión";
  } else {
    btn.innerHTML = `<span id="iconAuth">🔒</span>`;
    btn.className = "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all";
    btn.title = "Acceso Empleados";
  }
}

async function procesarLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('usuarioLogin').value.trim();
  const pass = document.getElementById('passwordLogin').value;
  
  const email = `${usuario}@servigaco.com`;

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    document.getElementById('modalLogin').classList.add('hidden');
    reproducirSonidoExito();
    const nombreDisplay = usuario.charAt(0).toUpperCase() + usuario.slice(1);
    mostrarBienvenida(nombreDisplay);
    document.getElementById('formLogin').reset();
  } catch (error) {
    console.error(error);
    mostrarNotificacion('❌ Error: Credenciales incorrectas', 'error');
  }
}

// ============================================
// ⚡ GESTIÓN DE COMBOS (FIREBASE)
// ============================================

let combosDataCache = {};

function inicializarCombos() {
  const select = document.getElementById('selectCombos');
  if (!select) return;

  db.ref('combos').on('value', (snapshot) => {
    combosDataCache = snapshot.val() || {};
    filtrarCombos();
  });
}

window.filtrarCombos = function() {
  const select = document.getElementById('selectCombos');
  const input = document.getElementById('inputFiltroCombos');
  const filtro = input ? input.value.toLowerCase() : '';
  
  if (!select) return;

  const valorActual = select.value;

  select.innerHTML = '<option value="">-- Selecciona un paquete --</option>';

  Object.keys(combosDataCache).forEach(key => {
    const combo = combosDataCache[key];
    const nombre = (combo.nombre || '').toLowerCase();
    
    if (nombre.includes(filtro)) {
      const precio = parseFloat(combo.precio || 0).toFixed(2);
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${combo.nombre} - RD$${precio}`;
      select.appendChild(option);
    }
  });

  if (valorActual && select.querySelector(`option[value="${valorActual}"]`)) {
    select.value = valorActual;
  }
}

async function guardarNuevoCombo() {
  if (!verificarPermisoAdmin()) return;

  const nombreInput = document.getElementById('inputNombreCombo');
  const precioInput = document.getElementById('inputPrecioCombo');
  
  const nombre = nombreInput.value.trim();
  const precio = parseFloat(precioInput.value);

  if (!nombre || isNaN(precio)) {
    mostrarNotificacion('Ingresa una descripción y un precio válido', 'warning');
    return;
  }

  try {
    await db.ref('combos').push({
      nombre: nombre,
      precio: precio,
      creado: firebase.database.ServerValue.TIMESTAMP
    });
    
    nombreInput.value = '';
    precioInput.value = '';
    mostrarNotificacion('✅ Combo guardado exitosamente', 'success');
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

function usarComboSeleccionado() {
  const select = document.getElementById('selectCombos');
  const id = select.value;
  if (!id) {
    mostrarNotificacion('Selecciona un combo primero', 'warning');
    return;
  }
  usarCombo(id);
}

function eliminarComboSeleccionado() {
  const select = document.getElementById('selectCombos');
  const id = select.value;
  if (!id) {
    mostrarNotificacion('Selecciona un combo para eliminar', 'warning');
    return;
  }
  eliminarCombo(id);
}

async function usarCombo(id) {
  try {
    const snapshot = await db.ref(`combos/${id}`).once('value');
    const combo = snapshot.val();
    
    if (combo) {
      agregarACotizacion({
        nombre: '📦 Combo / Paquete',
        descripcion: combo.nombre,
        cantidad: 1,
        precioUnitario: parseFloat(combo.precio),
        precio: parseFloat(combo.precio)
      });
      mostrarNotificacion('Combo agregado a la cotización', 'success');
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al cargar el combo', 'error');
  }
}

async function eliminarCombo(id) {
  if (!verificarPermisoAdmin()) return;
  
  if (confirm('¿Estás seguro de eliminar este combo permanentemente?')) {
    try {
      await db.ref(`combos/${id}`).remove();
      mostrarNotificacion('Combo eliminado', 'success');
    } catch (error) {
      mostrarNotificacion('Error al eliminar', 'error');
    }
  }
}

// ============================================
// ⚙️ GESTIÓN DE NCF (MODAL)
// ============================================

async function abrirModalNCF() {
    if (!verificarPermisoAdmin()) return;

    document.getElementById('modalConfiguracionNCF').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    cargarEstadoNCF();
}

async function cargarEstadoNCF() {
    const tbody = document.getElementById('tablaEstadoNCF');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">Cargando...</td></tr>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/ncf/estado`);
        const data = await res.json();
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">No hay rangos configurados</td></tr>';
            return;
        }

        data.forEach(item => {
            let estadoHtml = '<span class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs">Activo</span>';
            let rowClass = '';

            if (item.agotado) {
                estadoHtml = '<span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-xs font-bold">AGOTADO</span>';
                rowClass = 'bg-red-50 dark:bg-red-900/10';
            } else if (item.alerta) {
                estadoHtml = '<span class="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded text-xs font-bold">POCOS</span>';
            }

            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${rowClass}`;
            tr.innerHTML = `
                <td class="p-4 font-bold text-gray-900 dark:text-white">${item.tipo}</td>
                <td class="p-4 font-mono text-blue-600 dark:text-blue-400">${item.actual}</td>
                <td class="p-4 font-mono text-gray-500 dark:text-gray-400">${item.hasta}</td>
                <td class="p-4 font-bold ${item.alerta ? 'text-yellow-600' : (item.agotado ? 'text-red-600' : 'text-green-600')}">${item.disponibles}</td>
                <td class="p-4 text-center">${estadoHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error cargando estado</td></tr>';
    }
}

async function guardarConfiguracionNCF(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Guardando...';

    const tipo = document.getElementById('ncfTipoConfig').value;
    const inicio = document.getElementById('ncfSecuenciaInicio').value;
    const fin = document.getElementById('ncfSecuenciaFin').value;

    const desde = tipo + String(inicio).padStart(8, '0');
    const hasta = tipo + String(fin).padStart(8, '0');

    try {
        const res = await fetch(`${API_BASE_URL}/api/ncf/configurar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ desde, hasta })
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.error);

        mostrarNotificacion('✅ ' + result.message, 'success');
        document.getElementById('formNCF').reset();
        cargarEstadoNCF();

    } catch (error) {
        mostrarNotificacion('❌ ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// ============================================
// 🎵 EFECTOS DE SONIDO
// ============================================
function reproducirSonidoExito() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.warn("Audio no soportado o bloqueado:", e);
  }
}

// ============================================
// 🎉 BIENVENIDA ANIMADA
// ============================================
function mostrarBienvenida(nombre) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-500';
  overlay.style.opacity = '0';

  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-gray-800 p-12 rounded-[2rem] shadow-2xl text-center transform scale-50 opacity-0 border-4 border-blue-50 dark:border-blue-900/30';
  card.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'; 

  card.innerHTML = `
    <div class="text-8xl mb-6 animate-bounce">👋</div>
    <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6 tracking-tight">
      ¡Hola, ${nombre}!
    </h2>
    <p class="text-2xl text-gray-600 dark:text-gray-300 font-medium">
      Qué alegría verte de nuevo. 🚀
    </p>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    card.style.transform = 'scale(1)';
    card.style.opacity = '1';
  });

  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }, 2500);
}



