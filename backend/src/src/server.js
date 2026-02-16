const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno (Busca el .env en la carpeta backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Servir archivos estáticos del frontend
// __dirname es 'backend/src', así que subimos dos niveles para llegar a 'public'
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Importar Controladores (Rutas relativas desde src/)
const pdfController = require('./controllers/pdfController');
const facturarController = require('./controllers/facturarController');
const rncController = require('./controllers/rncController');
const ncfController = require('./controllers/ncfController');

// ✅ Rutas API
app.post('/api/generar-factura-pdf', pdfController.generarPDF);
app.post('/api/facturar', facturarController.crearFactura);
app.get('/api/facturas/:id', facturarController.obtenerFactura);
app.post('/api/facturas/:id', facturarController.editarFactura);
app.put('/api/facturas/:id/impresa', facturarController.marcarComoImpresa);
app.get('/api/rnc/:query', rncController.buscarRNC);
app.post('/api/ncf/configurar', ncfController.configurarRango);
app.get('/api/ncf/estado', ncfController.obtenerEstado);

// ✅ Fallback: Cualquier otra ruta carga el frontend
app.get('*', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.sendFile(path.join(publicPath, 'calculadora_general.html'));
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT} (desde src/server.js)`);
});
