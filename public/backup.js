const fs = require('fs');
const path = require('path');
let archiver;

try {
    archiver = require('archiver');
} catch (e) {
    try {
        // Fallback: Si no está en la raíz, la buscamos en backend/node_modules
        archiver = require(path.join(__dirname, '../backend/node_modules/archiver'));
    } catch (e2) {
        console.error('\n❌ Error: Falta la librería "archiver" necesaria para crear backups.');
        console.error('👉 Solución: Ejecuta el comando "npm install archiver" en la terminal.\n');
        process.exit(1);
    }
}

// Carpeta de tu proyecto
const projectFolder = path.resolve(__dirname, '..');
const backupFolder = path.join(projectFolder, 'backups'); // 🔒 GUARDAR FUERA DE PUBLIC (Seguridad)

// Crear carpeta de backup si no existe
if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
}

// Nombre del zip con fecha y hora
const date = new Date();
const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}`;
const zipName = `backup_${timestamp}.zip`;

console.log(`📦 Iniciando backup de toda la carpeta : ${projectFolder}`);

const output = fs.createWriteStream(path.join(backupFolder, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`✅ Backup completado: ${zipName} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
});

archive.on('error', err => { throw err; });
archive.pipe(output);

// Guardar todo el proyecto ignorando node_modules y backups
archive.glob('**/*', {
    cwd: projectFolder,
    ignore: [
        '**/node_modules/**', // Única excepción solicitada
        '**/backups/**',      // Evitar recursividad infinita (no guardar el backup dentro del backup)
        '**/.git/**'          // Ignorar historial git para ahorrar espacio (opcional, quítalo si quieres el .git)
    ],
    dot: true // IMPORTANTE: Incluir archivos ocultos y carpetas que empiezan con punto
});
archive.finalize();
