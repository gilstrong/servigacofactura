# 🚀 Registro de Cambios y Mejoras - ServiGaco Calculadora

Este documento resume las reparaciones críticas y las nuevas funcionalidades implementadas en el proyecto, unificando la **Calculadora de Tesis** y la **Calculadora General**.

## 🛠️ 1. Reparaciones Críticas (Bug Fixes)

### En `script.js` (Calculadora de Tesis)
| Estado Anterior (Roto) ❌ | Estado Actual (Arreglado) ✅ |
|---------------------------|------------------------------|
| **Error de Sintaxis:** El objeto `IMAGEN_EJEMPLAR_TAPA` estaba mal cerrado, provocando `Uncaught SyntaxError: Unexpected token 'const'` y deteniendo todo el script. | **Sintaxis Corregida:** Se cerraron correctamente las llaves y se añadieron las comas faltantes en la lista de imágenes. |
| **Error al Imprimir:** Los botones "Imprimir" y "Descargar PDF" intentaban ejecutar `guardarEnFirebase()`, una función que no existía en ese contexto, causando un crash. | **Lógica Desacoplada:** Se eliminó la dependencia de guardado automático. Ahora imprimir solo imprime y guardar solo guarda. |
| **Variables Indefinidas:** Referencias a `timaCotizacion` (error de tipeo) en lugar de `ultimaCotizacion`. | **Corrección de Variables:** Se unificaron los nombres de variables para asegurar que los datos fluyan correctamente al generar el HTML. |
| **Código Basura:** Líneas corruptas como `d e acument.gs.color)` dentro de la función de cargar LocalStorage. | **Limpieza de Código:** Se eliminó el código corrupto y se restauró la lógica de carga desde `localStorage`. |

---

## ✨ 2. Nuevas Funcionalidades (Features)

### ☁️ Integración con Firebase (Base de Datos)
*   **Antes:** La Calculadora de Tesis solo guardaba en `localStorage` (se borraba si limpiabas caché) o intentaba conectar a un Google Sheet mal configurado.
*   **Ahora:**
    *   Conexión completa a **Firebase Realtime Database**.
    *   Botón dedicado **"Guardar en Nube"** que almacena todos los detalles técnicos (papel, color, tomos, empastado).
    *   Botón **"Ver Guardadas"** que abre un modal para ver el historial, cargar una cotización antigua o eliminarla.
    *   Sincronización entre la Calculadora General y la de Tesis (ambas usan la misma base de datos pero distinguen el tipo de cotización).

### 🖥️ Componentes Web (Arquitectura)
*   **Antes:** El menú de navegación y el pie de página (footer) estaban copiados y pegados en cada archivo HTML. Si cambiabas uno, tenías que editar todos.
*   **Ahora:** Se creó el archivo `components.js`.
    *   Uso de etiquetas personalizadas `<servigaco-nav>` y `<servigaco-footer>`.
    *   Cambiar el menú en un solo lugar actualiza todas las páginas automáticamente.
    *   Lógica de **Modo Oscuro** centralizada y funcional.

### 📄 Generación de PDF
*   **Mejora:** Se optimizó la generación de PDF usando `html2pdf.js`.
*   **Tesis:** Genera un PDF con formato A4 específico, incluyendo la imagen del color de la tapa seleccionada y las cuentas bancarias.
*   **General:** Genera un PDF tipo factura/presupuesto limpio, ocultando los botones y elementos de la interfaz.
*   **Optimización de Búsqueda:** Se mejoró el rendimiento de la búsqueda de RNC/Clientes aumentando el tiempo de espera (debounce) y reduciendo el límite de resultados para evitar lentitud.
*   **Búsqueda Inteligente:** Ahora la búsqueda de clientes ignora los acentos (ej. buscar "Gomez" encontrará "GÓMEZ").
*   **UI Mejorada:** Se agregó un indicador de carga animado (spinner) más visible al buscar clientes para mejorar la experiencia de usuario.

---

## 🎨 3. Mejoras Visuales y de UI

*   **Modo Oscuro:** Soporte nativo con Tailwind CSS. Las tablas y formularios se adaptan automáticamente.
*   **Feedback al Usuario:** Implementación de un sistema de **Notificaciones Toast** (pequeñas alertas flotantes) que avisan cuando se guarda, se elimina o hay un error, reemplazando los molestos `alert()` del navegador.
*   **Tablas Responsivas:** Las tablas de cotización ahora se adaptan mejor a pantallas de móviles.

---

## 📂 Estructura de Archivos Actualizada

*   `index.html`: Calculadora de Tesis (Principal).
*   `calculadora_general.html`: Calculadora para copias, ploteos, etc.
*   `script.js`: Lógica específica de la Tesis + Firebase Tesis.
*   `scriptgeneral.js`: Lógica de servicios generales + Firebase General.
*   `components.js`: Menú de navegación y Footer reutilizables.
*   `style.css`: Estilos globales y variables de diseño.
*   `reset_database.js`: Script de Node.js para limpiar la base de datos antes de producción.

---

## 🚀 Cómo probar los cambios

1.  Abre `index.html`.
2.  Calcula una tesis de prueba.
3.  Dale clic a **"Guardar en Nube"** (debería salir una notificación verde).
4.  Dale clic a **"Ver Guardadas"** (debería salir tu tesis en la lista).
5.  Dale clic a **"Imprimir"** (debería abrir la ventana de impresión sin errores).
6.  Navega a "Servicios Generales" desde el menú para verificar que la navegación funciona.

## ⚙️ Configuración de Firebase (Importante)

Para que la búsqueda de clientes por nombre sea rápida, debes configurar los índices en Firebase:

1.  Ve a la **Consola de Firebase** > **Realtime Database** > Pestaña **Reglas**.
2.  Copia y pega el contenido del archivo `database.rules.json` que se ha creado en el proyecto.
3.  Dale a **Publicar**.

## 🧨 Limpieza para Producción

Si has estado haciendo pruebas y quieres borrar todas las facturas falsas y reiniciar los NCF a 1:

1.  Abre la terminal en la carpeta del proyecto.
2.  Ejecuta: `node reset_database.js`