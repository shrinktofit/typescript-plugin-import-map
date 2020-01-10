import * as importMapResolve from '@import-maps/resolve';
import fs from 'fs';
import ps from 'path';
import xFileURL from 'file-url';
import xFileURIToPath from 'file-uri-to-path';

function fileURLToPath (url: string) {
    return xFileURIToPath(url);
}

function pathToFileURL (path: string) {
    return xFileURL(path, {
        resolve: true,
    });
}

type ImportMapInfo = string | object;

interface Options {
    importMap: ImportMapInfo | ImportMapInfo[];
}

const emptyImportMap = (() => {
    return importMapResolve.parseFromString(JSON.stringify({}, undefined, 2), '');
})();

function $ (modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
    const ts = modules.typescript;

    function create (info: ts.server.PluginCreateInfo) {
        const logInfo = (message: string) => info.project.projectService.logger.info(`[TSImportMap] ${message}`);
        const logError = (message: string) => info.project.projectService.logger.info(`[TSImportMap] ${message}`);
        const logVerbose = (message: string) => info.project.projectService.logger.info(`[TSImportMap] ${message}`);
        
        if (!(info.project instanceof ts.server.ConfiguredProject)) {
            logInfo('The project is not a configured project.');
            return;
        }
        const project = info.project as ts.server.ConfiguredProject;
        const configureFilePath = info.project.getConfigFilePath();
        logInfo(`Configure file path ${configureFilePath}`);

        logInfo(
            "I'm getting set up now! Check the log for this message."
        );

        const parsedImportMap = readImportMap();

        // Set up decorator
        const proxy: ts.LanguageService = Object.create(null);
        for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
            const x = info.languageService[k];
            // @ts-ignore
            proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
        }

        const oldFunction = info.languageServiceHost.resolveModuleNames; // Hold onto old function handle for future use.
        info.languageServiceHost.resolveModuleNames = (
            moduleNames: string[],
            containingFile: string,
            reusedNames: string[],
            redirectedReference: ts.ResolvedProjectReference,
            options: ts.CompilerOptions): Array<ts.ResolvedModule | undefined> => {
                logVerbose(`Resolving [\n${moduleNames.join('\n')}]\n from ${containingFile}...`);

            const importMapResolveResult = moduleNames.map((moduleName): string => {
                try {
                    const resolvedURL = importMapResolve.resolve(moduleName, parsedImportMap, pathToFileURL(containingFile).toString());
                    const resolvedFilePath = fileURLToPath(resolvedURL);
                    return resolvedFilePath;
                } catch (error) {
                    return moduleName;
                }
            });
            logVerbose(
                `Import map resolve result: [\n${importMapResolveResult.map((r, i) => `${moduleNames[i]} -> ${r}`).join('\n')}\n]`);

            const oldResult = oldFunction?.call(
                info.languageServiceHost,
                importMapResolveResult,
                containingFile,
                reusedNames,
                redirectedReference, options) ?? [];
                logVerbose(
                `Vender resolve result: [\n${oldResult.map((r, i) => `${moduleNames[i]}: ${JSON.stringify(r, undefined, 2)}`).join('\n')}\n]`);

            return oldResult;
        };

        return proxy;

        function readImportMap () {
            const options = info.config as Options;
            const importMapInfos = Array.isArray(options.importMap) ? options.importMap : [options.importMap];
            const parsedImportMaps: importMapResolve.ParsedImportMap[] = [];
            for (const importMapInfo of importMapInfos) {
                let baseURL: string;
                let importMapSource: string;
                if (typeof importMapInfo === 'object') {
                    baseURL = pathToFileURL(configureFilePath);
                    importMapSource = JSON.stringify(importMapInfo, undefined, 2);
                } else {
                    const importMapFile = ps.resolve(ps.dirname(configureFilePath), importMapInfo);
                    baseURL = pathToFileURL(importMapFile).toString();
                    importMapSource = fs.readFileSync(importMapFile, { encoding: 'utf8' });
                }
                let parsedImportMap: importMapResolve.ParsedImportMap | undefined;
                try {
                    parsedImportMap = importMapResolve.parseFromString(importMapSource, baseURL);
                } catch (error) {
                    logError(`Failed to parse import map <${importMapSource}> at ${fileURLToPath(baseURL)}`);
                }
                if (parsedImportMap) {
                    parsedImportMaps.push(parsedImportMap);
                }
            }
            if (parsedImportMaps.length === 0) {
                logInfo(`No available import maps.`);
                return emptyImportMap;
            } else {
                let result = parsedImportMaps[0];
                for (let i = 1; i < parsedImportMaps.length; ++i) {
                    result = importMapResolve.mergeImportMaps(result, parsedImportMaps[i]);
                }
                logVerbose(`The import map after parse and merge: ${JSON.stringify(result, undefined, 2)}`);
                return result;
            }
        }
    }

    return { create };
}

export = $;