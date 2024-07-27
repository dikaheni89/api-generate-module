"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const updateTsconfig = () => __awaiter(void 0, void 0, void 0, function* () {
    const tsconfigPath = path_1.default.join(process.cwd(), 'tsconfig.json');
    try {
        const tsconfig = yield fs_extra_1.default.readJson(tsconfigPath);
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
        yield fs_extra_1.default.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
        console.log('Updated tsconfig.json successfully.');
    }
    catch (error) {
        console.error('Error updating tsconfig.json:', error);
    }
});
updateTsconfig();
