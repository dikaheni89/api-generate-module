"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// Nama folder yang akan dibuat
const folder = 'src';
// Membuat folder jika tidak ada
const folderPath = path_1.default.join(process.cwd(), folder);
console.log(folderPath);
fs_extra_1.default.ensureDirSync(folderPath);
console.log(`Ensured: ${folder}`);
