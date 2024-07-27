import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import * as process from "node:process";

dotenv.config();

const execPromise = promisify(exec);

const prismaSchemaPath = process.env.PRISMA_SCHEMA_PATH || './prisma/schema.prisma';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in the environment variables.');
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

// Mengambil nama model dari PostgreSQL
export const getModelNames = async (): Promise<string[]> => {
    try {
        const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
        return tables
            .map(table => table.table_name)
            .filter(name => !name.startsWith('_')); // Filter nama tabel yang tidak diinginkan
    } catch (error) {
        console.error('Error fetching model names:', error);
        throw new Error('Failed to fetch model names.');
    }
};

// Mengambil field dari model PostgreSQL
const getFieldsFromPostgres = async (modelName: string) => {
    try {
        const fields = await prisma.$queryRaw<{ column_name: string, data_type: string }[]>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${modelName.toLowerCase()}'
    `;
        return fields;
    } catch (error) {
        console.error(`Error fetching fields for model ${modelName}:`, error);
        throw new Error(`Failed to fetch fields for model ${modelName}.`);
    }
};

// Menulis file dan mencatat log
const writeFileAndLog = async (filePath: string, content: string) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`Created: ${filePath}`);
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        throw new Error(`Failed to write file ${filePath}.`);
    }
};

// Template untuk file route
const modelTemplate = (modelName: string) => `
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
const dtoTemplate = (modelName: string, fields: any) => `
import { IsString, IsEmail, IsInt } from 'class-validator';

export class ${modelName}Dto {
  ${fields.map((field: any) => {
    let validator = 'IsString';
    if (field.data_type === 'integer') validator = 'IsInt';
    else if (field.data_type === 'text') validator = 'IsString';
    else if (field.data_type === 'character varying') validator = 'IsString';
    else if (field.data_type === 'email') validator = 'IsEmail';

    return `@${validator}()\n  public ${field.column_name}: ${field.data_type};`;
}).join('\n  ')}
}
`;

// Template untuk controller
const controllerTemplate = (modelName: string) => `
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
const generateHttpFile = async (modelName: string, fields: any) => {
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
        ${fields.map((field: any) => `"${field.column_name}": "value"`).join(',\n    ')}
    }
    
    ###
    # Modify ${modelName} By Id
    PUT {{ baseURL }}/${modelName.toLowerCase()}/1
    Content-Type: application/json
    
    {
        ${fields.map((field: any) => `"${field.column_name}": "value"`).join(',\n    ')}
    }
    
    ###
    # Delete ${modelName} By Id
    DELETE {{ baseURL }}/${modelName.toLowerCase()}/1
`;

    const httpFilePath = path.join(process.cwd(), 'src/http', `${modelName.toLowerCase()}.http`);
    await writeFileAndLog(httpFilePath, httpContent);
};

const appTemplate = () => `
import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { json } from 'body-parser';
import { ValidationMiddleware } from '@middlewares/validation.middleware';
import { Routes } from '@interfaces/routes.interface';
import { CREDENTIALS, NODE_ENV, PORT } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { logger, stream } from '@utils/logger';
import morgan from 'morgan';
import cors from 'cors';
import hpp from 'hpp';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

const prisma = new PrismaClient();

class App {
  public app: express.Application;
  public env: string;
  public port: number;

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT ? parseInt(PORT, 10) : 3000;

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(\`=================================\`);
      console.log(\`======= ENV: \${this.env} =======\`);
      console.log(\`🚀 App listening on the port \${this.port}\`);
      console.log(\`=================================\`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morganMiddleware);
    this.app.use(cors({ origin: process.env.ORIGIN, credentials: CREDENTIALS }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(json());
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/api', route.router);
    });
  }
}

private initializeErrorHandling() {
    console.log('Initialize Error Handler');
  }
`;

const serversTemplate = () => `
import { App } from '@/app';
import * as process from 'process';
import * as path from 'path';
import fs from 'fs';

async function checkDatabaseConnection() {
  console.log('Checking DB Connection');
  try {
    await prisma.$connect();
  } catch (e) {
    console.error('Database Connection Failed', e);
    process.exit(1);
  }
}

(async () => {
  await checkDatabaseConnection();

  const app = new App([
  //TODO default root
  ]);

  app.listen();
})();

`

// Mencetak struktur direktori
const printDirectoryStructure = async (dir: string, prefix: string = '') => {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);
            const isDirectory = stats.isDirectory();
            console.log(`${prefix}${isDirectory ? '├── ' : '├── '}${file}`);
            if (isDirectory) {
                await printDirectoryStructure(filePath, `${prefix}│   `);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        throw new Error(`Failed to read directory ${dir}.`);
    }
};

// Menginstal package jika diperlukan
const installPackageIfNeeded = async (packageName: string) => {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (dependencies[packageName]) {
            console.log(`${packageName} is already installed.`);
            return;
        }

        console.log(`Installing ${packageName}...`);
        await execPromise(`npm install ${packageName}`);
        console.log(`${packageName} installed successfully.`);
    } catch (error) {
        console.error(`Error installing package ${packageName}:`, error);
        throw new Error(`Failed to install package ${packageName}.`);
    }
};

// Memperbarui file .env
const updateEnvFile = async () => {
    try {
        const envFilePath = path.join(process.cwd(), '.env');
        let envContent = '';

        if (await fs.pathExists(envFilePath)) {
            envContent = await fs.readFile(envFilePath, 'utf8');
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

        await fs.writeFile(envFilePath, envContent, 'utf8');
        console.log('.env file updated with required environment variables.');
    } catch (error) {
        console.error('Error updating .env file:', error);
        throw new Error('Failed to update .env file.');
    }
};

// Fungsi utama untuk menghasilkan route
export const generateRoutes = async () => {
    try {
        const modelNames = await getModelNames();

        const routesDir = path.join(process.cwd(), 'src/routes');
        const dtosDir = path.join(process.cwd(), 'src/dtos');
        const controllersDir = path.join(process.cwd(), 'src/controllers');
        const middlewaresDir = path.join(process.cwd(), 'src/middlewares');
        const interfacesDir = path.join(process.cwd(), 'src/interfaces');
        const configDir = path.join(process.cwd(), 'src/config');
        const appDir = path.join(process.cwd(), 'src');
        const serverDir = path.join(process.cwd(), 'src');
        const httpDir = path.join(process.cwd(), 'src/http');
        const exceptionsDir = path.join(process.cwd(), 'src/exceptions');

        await fs.ensureDir(routesDir);
        await fs.ensureDir(dtosDir);
        await fs.ensureDir(controllersDir);
        await fs.ensureDir(middlewaresDir);
        await fs.ensureDir(interfacesDir);
        await fs.ensureDir(configDir);
        await fs.ensureDir(httpDir);
        await fs.ensureDir(exceptionsDir);

        // Write the HttpException file
        const httpExceptionFilePath = path.join(exceptionsDir, 'HttpException.ts');
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
        await writeFileAndLog(httpExceptionFilePath, httpExceptionContent);

        // Install packages if needed
        await installPackageIfNeeded('express');
        await installPackageIfNeeded('body-parser');
        await installPackageIfNeeded('morgan');
        await installPackageIfNeeded('cors');
        await installPackageIfNeeded('hpp');
        await installPackageIfNeeded('helmet');
        await installPackageIfNeeded('compression');
        await installPackageIfNeeded('cookie-parser')
        await installPackageIfNeeded('dotenv');
        await installPackageIfNeeded('class-transformer');
        await installPackageIfNeeded('class-validator');

        // Write the validation middleware file
        const validationMiddlewareFilePath = path.join(middlewaresDir, 'validation.middleware.ts');
        await writeFileAndLog(validationMiddlewareFilePath, validationMiddlewareTemplate());

        // Write the routes interface file
        const routesInterfaceFilePath = path.join(interfacesDir, 'routes.interface.ts');
        const routesInterfaceContent = `
          import { Router } from 'express';
    
          export interface Routes {
            path?: string;
            router: Router;
          }
        `;
        await writeFileAndLog(routesInterfaceFilePath, routesInterfaceContent);

        // Write the config file
        const configFilePath = path.join(configDir, 'index.ts');
        await writeFileAndLog(configFilePath, configTemplate());

        const appFilePath = path.join(appDir, 'app.ts');
        await writeFileAndLog(appFilePath, appTemplate());

        const serverFilePath = path.join(serverDir, 'server.ts');
        await writeFileAndLog(serverFilePath, serversTemplate());

        // Process each model
        for (const modelName of modelNames) {
            if (/^[A-Za-z0-9_]+$/.test(modelName)) {
                const modelFilePath = path.join(routesDir, `${modelName.toLowerCase()}.route.ts`);
                const dtoFilePath = path.join(dtosDir, `${modelName.toLowerCase()}.dto.ts`);
                const controllerFilePath = path.join(controllersDir, `${modelName.toLowerCase()}.controller.ts`);

                const fields = await getFieldsFromPostgres(modelName);

                const routeContent = modelTemplate(modelName);
                const dtoContent = dtoTemplate(modelName, fields);
                const controllerContent = controllerTemplate(modelName);

                await writeFileAndLog(modelFilePath, routeContent);
                await writeFileAndLog(dtoFilePath, dtoContent);
                await writeFileAndLog(controllerFilePath, controllerContent);

                // Generate HTTP request file
                await generateHttpFile(modelName, fields);

                // Generate HTTP request file
                await generateHttpFile(modelName, fields);

            }
        }

        // Update .env file
        await updateEnvFile();

        console.log('File generation complete.');
        console.log('Directory structure:');
        await printDirectoryStructure(path.join(process.cwd()));
    } catch (error) {
        console.error('Error generating routes:', error);
    } finally {
        await prisma.$disconnect();
    }
};

generateRoutes();
