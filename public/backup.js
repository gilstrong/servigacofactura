const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

// Carpeta de tu proyecto
const projectFolder = __dirname; // La carpeta donde está el script
// Carpeta donde se guardarán los backups
const backupFolder = path.join(__dirname, 'backups');

// Crear carpeta de backup si no existe
if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
}

// Nombre del zip con fecha y hora
const date = new Date();
const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}`;
const zipName = `backup_${timestamp}.zip`;

const output = fs.createWriteStream(path.join(backupFolder, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`Backup completado: ${zipName} (${archive.pointer()} bytes)`);
});

archive.on('error', err => { throw err; });
archive.pipe(output);

// Filtrar solo .js y .html
const files = fs.readdirSync(projectFolder).filter(file => {
    return file.endsWith('.js') || file.endsWith('.html');
});

// Agregar los archivos filtrados al zip
files.forEach(file => {
    archive.file(path.join(projectFolder, file), { name: file });
});

archive.finalize();
