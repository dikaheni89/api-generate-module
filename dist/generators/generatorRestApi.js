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
exports.generateRoutes = exports.getModelNames = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const client_1 = require("@prisma/client");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
const prisma = new client_1.PrismaClient();
// Mengambil nama model dari PostgreSQL
const getModelNames = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tables = yield prisma.$queryRaw `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
        return tables
            .map(table => table.table_name)
            .filter(name => !name.startsWith('_')); // Filter nama tabel yang tidak diinginkan
    }
    catch (error) {
        console.error('Error fetching model names:', error);
        throw new Error('Failed to fetch model names.');
    }
});
exports.getModelNames = getModelNames;
// Mengambil field dari model PostgreSQL
const getFieldsFromPostgres = (modelName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fields = yield prisma.$queryRaw `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${modelName.toLowerCase()}'
    `;
        return fields;
    }
    catch (error) {
        console.error(`Error fetching fields for model ${modelName}:`, error);
        throw new Error(`Failed to fetch fields for model ${modelName}.`);
    }
});
// Menulis file dan mencatat log
const writeFileAndLog = (filePath, content) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fs_extra_1.default.writeFile(filePath, content, 'utf8');
        console.log(`Created: ${filePath}`);
    }
    catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        throw new Error(`Failed to write file ${filePath}.`);
    }
});
// Template untuk file route
const modelTemplate = (modelName) => `
import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import { ValidationMiddleware } from '@middlewares/validation.middleware';
import { ${modelName}Dto } from '@dtos/${modelName.toLowerCase()}.dto';
import { ${modelName}Controller } from '@controllers/${modelName.toLowerCase()}.controller';

export class ${modelName}Route implements Routes {
  public path = '/${modelName.toLowerCase()}';
  public router = Router();
  public ${modelName.toLowerCase()}Controller = new ${modelName}Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(\`\${this.path}/create\`, ValidationMiddleware(${modelName}Dto), this.${modelName.toLowerCase()}Controller.create);
  }
}
`;
// Template untuk DTO
const dtoTemplate = (modelName, fields) => `
import { IsString, IsEmail, IsInt } from 'class-validator';

export class ${modelName}Dto {
  ${fields.map((field) => {
    let validator = 'IsString';
    if (field.data_type === 'integer')
        validator = 'IsInt';
    else if (field.data_type === 'text')
        validator = 'IsString';
    else if (field.data_type === 'character varying')
        validator = 'IsString';
    else if (field.data_type === 'email')
        validator = 'IsEmail';
    return `@${validator}()\n  public ${field.column_name}: ${field.data_type};`;
}).join('\n  ')}
}
`;
// Template untuk controller
const controllerTemplate = (modelName) => `
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ${modelName}Controller {
  public async create(req: Request, res: Response) {
    try {
      const ${modelName.toLowerCase()} = await prisma.${modelName.toLowerCase()}.create({
        data: req.body,
      });
      res.json(${modelName.toLowerCase()});
    } catch (error) {
      res.status(500).json({ message: 'Error creating ${modelName.toLowerCase()}', error });
    }
  }
}
`;
// Template untuk middleware validasi
const validationMiddlewareTemplate = () => `
import { plainToInstance } from 'class-transformer';
import { validateOrReject, ValidationError } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';

export const ValidationMiddleware = (
  type: any,
  skipMissingProperties = false,
  whitelist = false,
  forbidNonWhitelisted = false,
  dataPosition: 'body' | 'query' | 'params' = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let data = req.body;
    if (dataPosition === 'query') {
      data = req.query;
    }

    if (dataPosition === 'params') {
      data = req.params;
    }

    const dto = plainToInstance(type, data);

    validateOrReject(dto, { skipMissingProperties, whitelist, forbidNonWhitelisted })
      .then(() => {
        if (dataPosition === 'query') {
          req.query = dto as any;
        } else if (dataPosition === 'params') {
          req.params = dto as any;
        } else {
          req.body = dto;
        }

        next();
      })
      .catch((errors: ValidationError[]) => {
        try {
          const _errors = {};
          errors.forEach((error: ValidationError) => {
            if (!error.constraints) {
              const _obj: { [key: string]: string } = {};
              _obj[error.property] = 'invalid value';
              error.constraints = _obj;
            }
            _errors[error.property] = Object.values(error.constraints);
          });

          const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ');
          next(new HttpException(400, message, _errors));
        } catch (e) {
          next(new HttpException(500, 'Internal server error', e));
        }
      });
  };
};
`;
// Template untuk file konfigurasi
const configTemplate = () => `
import { config } from 'dotenv';

// Load environment variables from the appropriate .env file
config({ path: \`.env.${process.env.NODE_ENV || 'development'}.local\` });

// Export environment variables
export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const { NODE_ENV, PORT, SECRET_KEY, LOG_FORMAT, LOG_DIR, ORIGIN } = process.env;
`;
// Menghasilkan file HTTP berdasarkan schema model
const generateHttpFile = (modelName, fields) => __awaiter(void 0, void 0, void 0, function* () {
    const httpContent = `
    # baseURL
    @baseURL = http://localhost:3000
    
    ###
    # Find All ${modelName}s
    GET {{ baseURL }}/${modelName.toLowerCase()}
    
    ###
    # Find ${modelName} By Id
    GET {{ baseURL }}/${modelName.toLowerCase()}/1
    
    ###
    # Create ${modelName}
    POST {{ baseURL }}/${modelName.toLowerCase()}
    Content-Type: application/json
    
    {
        ${fields.map((field) => `"${field.column_name}": "value"`).join(',\n    ')}
    }
    
    ###
    # Modify ${modelName} By Id
    PUT {{ baseURL }}/${modelName.toLowerCase()}/1
    Content-Type: application/json
    
    {
        ${fields.map((field) => `"${field.column_name}": "value"`).join(',\n    ')}
    }
    
    ###
    # Delete ${modelName} By Id
    DELETE {{ baseURL }}/${modelName.toLowerCase()}/1
`;
    const httpFilePath = path_1.default.join(__dirname, '..', 'http', `${modelName.toLowerCase()}.http`);
    yield writeFileAndLog(httpFilePath, httpContent);
});
// Mencetak struktur direktori
const printDirectoryStructure = (dir_1, ...args_1) => __awaiter(void 0, [dir_1, ...args_1], void 0, function* (dir, prefix = '') {
    try {
        const files = yield fs_extra_1.default.readdir(dir);
        for (const file of files) {
            const filePath = path_1.default.join(dir, file);
            const stats = yield fs_extra_1.default.stat(filePath);
            const isDirectory = stats.isDirectory();
            console.log(`${prefix}${isDirectory ? '├── ' : '├── '}${file}`);
            if (isDirectory) {
                yield printDirectoryStructure(filePath, `${prefix}│   `);
            }
        }
    }
    catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        throw new Error(`Failed to read directory ${dir}.`);
    }
});
// Menginstal package jika diperlukan
const installPackageIfNeeded = (packageName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packageJsonPath = path_1.default.join(__dirname, '..', '..', 'package.json');
        const packageJson = yield fs_extra_1.default.readJson(packageJsonPath);
        const dependencies = Object.assign(Object.assign({}, packageJson.dependencies), packageJson.devDependencies);
        if (dependencies[packageName]) {
            console.log(`${packageName} is already installed.`);
            return;
        }
        console.log(`Installing ${packageName}...`);
        yield execPromise(`npm install ${packageName}`);
        console.log(`${packageName} installed successfully.`);
    }
    catch (error) {
        console.error(`Error installing package ${packageName}:`, error);
        throw new Error(`Failed to install package ${packageName}.`);
    }
});
// Memperbarui file .env
const updateEnvFile = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const envFilePath = path_1.default.join(__dirname, '..', '..', '.env');
        let envContent = '';
        if (yield fs_extra_1.default.pathExists(envFilePath)) {
            envContent = yield fs_extra_1.default.readFile(envFilePath, 'utf8');
        }
        const requiredVars = [
            { name: 'NODE_ENV', value: process.env.NODE_ENV || 'development' },
            { name: 'PORT', value: process.env.PORT || '3000' },
            { name: 'SECRET_KEY', value: process.env.SECRET_KEY || '' },
            { name: 'LOG_FORMAT', value: process.env.LOG_FORMAT || 'dev' },
            { name: 'LOG_DIR', value: process.env.LOG_DIR || '../logs' },
            { name: 'ORIGIN', value: process.env.ORIGIN || '' }
        ];
        requiredVars.forEach((envVar) => {
            const regex = new RegExp(`^${envVar.name}=`, 'm');
            if (!regex.test(envContent)) {
                envContent += `${envVar.name}=${envVar.value}\n`;
            }
        });
        yield fs_extra_1.default.writeFile(envFilePath, envContent, 'utf8');
        console.log('.env file updated with required environment variables.');
    }
    catch (error) {
        console.error('Error updating .env file:', error);
        throw new Error('Failed to update .env file.');
    }
});
// Fungsi utama untuk menghasilkan route
const generateRoutes = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const modelNames = yield (0, exports.getModelNames)();
        const routesDir = path_1.default.join(process.cwd(), 'src/routes');
        const dtosDir = path_1.default.join(process.cwd(), 'src/dtos');
        const controllersDir = path_1.default.join(process.cwd(), 'src/controllers');
        const middlewaresDir = path_1.default.join(process.cwd(), 'src/middlewares');
        const interfacesDir = path_1.default.join(process.cwd(), 'src/interfaces');
        const configDir = path_1.default.join(process.cwd(), 'src/config');
        const httpDir = path_1.default.join(process.cwd(), 'src/http');
        const exceptionsDir = path_1.default.join(process.cwd(), 'src/exceptions');
        yield fs_extra_1.default.ensureDir(routesDir);
        yield fs_extra_1.default.ensureDir(dtosDir);
        yield fs_extra_1.default.ensureDir(controllersDir);
        yield fs_extra_1.default.ensureDir(middlewaresDir);
        yield fs_extra_1.default.ensureDir(interfacesDir);
        yield fs_extra_1.default.ensureDir(configDir);
        yield fs_extra_1.default.ensureDir(httpDir);
        yield fs_extra_1.default.ensureDir(exceptionsDir);
        // Write the HttpException file
        const httpExceptionFilePath = path_1.default.join(exceptionsDir, 'HttpException.ts');
        const httpExceptionContent = `
          export class HttpException extends Error {
            public status: number;
            public message: string;
            public errors: { [key: string]: Array<string> };

            constructor(status: number, message: string, errors?: { [key: string]: Array<string> }) {
              super(message);
              this.status = status;
              this.message = message;
              this.errors = errors || {};
            }
          }
        `;
        yield writeFileAndLog(httpExceptionFilePath, httpExceptionContent);
        // Install packages if needed
        yield installPackageIfNeeded('dotenv');
        yield installPackageIfNeeded('class-transformer');
        yield installPackageIfNeeded('class-validator');
        // Write the validation middleware file
        const validationMiddlewareFilePath = path_1.default.join(middlewaresDir, 'validation.middleware.ts');
        yield writeFileAndLog(validationMiddlewareFilePath, validationMiddlewareTemplate());
        // Write the routes interface file
        const routesInterfaceFilePath = path_1.default.join(interfacesDir, 'routes.interface.ts');
        const routesInterfaceContent = `
          import { Router } from 'express';
    
          export interface Routes {
            path?: string;
            router: Router;
          }
        `;
        yield writeFileAndLog(routesInterfaceFilePath, routesInterfaceContent);
        // Write the config file
        const configFilePath = path_1.default.join(configDir, 'index.ts');
        yield writeFileAndLog(configFilePath, configTemplate());
        // Process each model
        for (const modelName of modelNames) {
            if (/^[A-Za-z0-9_]+$/.test(modelName)) {
                const modelFilePath = path_1.default.join(routesDir, `${modelName.toLowerCase()}.route.ts`);
                const dtoFilePath = path_1.default.join(dtosDir, `${modelName.toLowerCase()}.dto.ts`);
                const controllerFilePath = path_1.default.join(controllersDir, `${modelName.toLowerCase()}.controller.ts`);
                const fields = yield getFieldsFromPostgres(modelName);
                const routeContent = modelTemplate(modelName);
                const dtoContent = dtoTemplate(modelName, fields);
                const controllerContent = controllerTemplate(modelName);
                yield writeFileAndLog(modelFilePath, routeContent);
                yield writeFileAndLog(dtoFilePath, dtoContent);
                yield writeFileAndLog(controllerFilePath, controllerContent);
                // Generate HTTP request file
                yield generateHttpFile(modelName, fields);
                // Generate HTTP request file
                yield generateHttpFile(modelName, fields);
            }
        }
        // Update .env file
        yield updateEnvFile();
        console.log('File generation complete.');
        console.log('Directory structure:');
        yield printDirectoryStructure(path_1.default.join(process.cwd()));
    }
    catch (error) {
        console.error('Error generating routes:', error);
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.generateRoutes = generateRoutes;
(0, exports.generateRoutes)();
