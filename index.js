const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos del frontend (carpeta public)
app.use(express.static(path.join(__dirname, '../public')));

// Importar Controladores
const pdfController = require('./src/controllers/pdfController');
const facturarController = require('./src/controllers/facturarController');
const rncController = require('./src/controllers/rncController');
const ncfController = require('./src/controllers/ncfController');

// Rutas API
app.post('/api/generar-factura-pdf', pdfController.generarPDF);
app.post('/api/facturar', facturarController.crearFactura);
app.get('/api/facturas/:id', facturarController.obtenerFactura);
app.post('/api/facturas/:id', facturarController.editarFactura);
app.put('/api/facturas/:id/impresa', facturarController.marcarComoImpresa);
app.get('/api/rnc/:query', rncController.buscarRNC);
app.post('/api/ncf/configurar', ncfController.configurarRango);
app.get('/api/ncf/estado', ncfController.obtenerEstado);

// Fallback para SPA (si usas rutas en el frontend) o redirección
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, '../public/calculadora_general.html'));
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
});