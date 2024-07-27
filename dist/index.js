#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
function setupScriptPath(scriptName) {
    const scriptPath = path_1.default.resolve(__dirname, `setup.js`);
    (0, child_process_1.spawnSync)('ts-node', [scriptPath], { stdio: 'inherit' });
}
function runScript(scriptName) {
    const scriptPath = path_1.default.resolve(__dirname, 'generators', `${scriptName}.ts`);
    (0, child_process_1.spawnSync)('ts-node', [scriptPath], { stdio: 'inherit' });
}
// Menangani argumen perintah
const [, , command] = process.argv;
switch (command) {
    case 'setup':
        setupScriptPath('setup');
        break;
    case 'generate':
        runScript('generate');
        break;
    default:
        console.log(`Unknown command: ${command}`);
}
