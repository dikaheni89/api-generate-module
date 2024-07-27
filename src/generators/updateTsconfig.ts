import fs from 'fs-extra';
import path from 'path';

const updateTsconfig = async () => {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');

    try {
        const tsconfig = await fs.readJson(tsconfigPath);

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

        await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
        console.log('Updated tsconfig.json successfully.');
    } catch (error) {
        console.error('Error updating tsconfig.json:', error);
    }
};

updateTsconfig();
