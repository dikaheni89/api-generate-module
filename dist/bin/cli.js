"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const runScript = (scriptName) => {
    const scriptPath = path_1.default.join(__dirname, '..', 'scripts', `${scriptName}.ts`);
    (0, child_process_1.execSync)(`ts-node ${scriptPath}`, { stdio: 'inherit' });
};
const args = process.argv.slice(2);
if (args.length > 0) {
    const script = args[0];
    runScript(script);
}
else {
    console.error('Please specify a script to run.');
    process.exit(1);
}
