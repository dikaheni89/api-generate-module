const fs = require('fs-extra');
const path = require('path');

// Daftar folder yang akan dibuat
const folders = [
    'src/config',
    'src/controllers',
    'src/dtos',
    'src/exceptions',
    'src/generators',
    'src/http',
    'src/interfaces',
    'src/middlewares',
    'src/routes'
];

// Membuat setiap folder jika tidak ada
folders.forEach(folder => {
    fs.ensureDirSync(path.join(__dirname, '..', folder));
    console.log(`Ensured: ${folder}`);
});
