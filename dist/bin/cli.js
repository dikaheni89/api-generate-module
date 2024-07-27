"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const runScript = (scriptName) => {
    const scriptPath = path_1.default.join(__dirname, '..', `${scriptName}.js`);
    (0, child_process_1.execSync)(`node ${scriptPath}`, { stdio: 'inherit' });
};
const runSetup = () => {
    const setupPath = path_1.default.join(process.cwd(), 'node_modules', 'api-generate-module', 'dist', 'setup.js');
    (0, child_process_1.execSync)(`node ${setupPath}`, { stdio: 'inherit' });
};
const args = process.argv.slice(2);
if (args[0] === 'generate') {
    runScript('generators/generatorRestApi');
}
else if (args[0] === 'update-tsconfig') {
    runScript('generators/updateTsconfig');
}
else if (args[0] === 'setup') {
    runSetup();
}
else {
    console.log('Unknown command');
}
