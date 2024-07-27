"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const updateTsconfig = async () => {
    const tsconfigPath = path_1.default.join(__dirname, '..', '..', 'tsconfig.json');
    try {
        const tsconfig = await fs_extra_1.default.readJson(tsconfigPath);
        if (!tsconfig.compilerOptions) {
            tsconfig.compilerOptions = {};
        }
        tsconfig.compilerOptions.baseUrl = 'src';
        tsconfig.compilerOptions.paths = {
            "@/*": ["*"],
            "@config": ["config"],
            "@controllers/*": ["controllers/*"],
            "@dtos/*": ["dtos/*"],
            "@exceptions/*": ["exceptions/*"],
            "@interfaces/*": ["interfaces/*"],
            "@middlewares/*": ["middlewares/*"],
            "@routes/*": ["routes/*"],
            "@services/*": ["services/*"],
            "@utils/*": ["utils/*"]
        };
        await fs_extra_1.default.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
        console.log('Updated tsconfig.json successfully.');
    }
    catch (error) {
        console.error('Error updating tsconfig.json:', error);
    }
};
updateTsconfig();
