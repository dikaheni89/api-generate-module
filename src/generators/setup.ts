import fs from 'fs-extra';
import path from 'path';

// Nama folder yang akan dibuat
const folder = 'src';

// Membuat folder jika tidak ada
const folderPath = path.join(process.cwd(), folder);
fs.ensureDirSync(folderPath);
console.log(`Ensured: ${folder} directory at ${folderPath}`);
