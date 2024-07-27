#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
function setupScriptPath() {
    const scriptPath = path_1.default.resolve(__dirname, 'generators', 'setup.js');
    (0, child_process_1.spawnSync)('node', [scriptPath], { stdio: 'inherit' });
}
function runScript(scriptName) {
    const scriptPath = path_1.default.resolve(__dirname, 'generators', `${scriptName}.js`);
    (0, child_process_1.spawnSync)('node', [scriptPath], { stdio: 'inherit' });
}
function checkSetup() {
    const srcPath = path_1.default.resolve(process.cwd(), 'src');
    if (!fs_1.default.existsSync(srcPath)) {
        console.log(`Error: 'src' folder not found. Please run 'npx api-generate-module setup' first.`);
        process.exit(1);
    }
}
function checkDependencies() {
    try {
        require.resolve('prisma');
        require.resolve('@prisma/client');
    }
    catch (error) {
        console.log(`Error: Dependencies 'prisma' and '@prisma/client' are not installed. Please run 'npm install prisma @prisma/client' to install them and generate db You have to generate the database first and generate the schema`);
        process.exit(1);
    }
}
// Menangani argumen perintah
const [, , command] = process.argv;
switch (command) {
    case 'setup':
        checkDependencies();
        setupScriptPath();
        break;
    case 'generateApi':
        checkDependencies();
        checkSetup();
        runScript('generatorRestApi');
        break;
    case 'generateTsconfig':
        checkDependencies();
        checkSetup();
        runScript('updateTsconfig');
        break;
    default:
        console.log(`Unknown command: ${command}`);
}
