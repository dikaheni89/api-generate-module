"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
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
    const folderPath = path_1.default.join(process.cwd(), folder);
    fs_extra_1.default.ensureDirSync(folderPath);
    console.log(`Ensured: ${folder}`);
});
