"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const importMapResolve = __importStar(require("@import-maps/resolve"));
const fs_1 = __importDefault(require("fs"));
const file_url_1 = __importDefault(require("file-url"));
const file_uri_to_path_1 = __importDefault(require("file-uri-to-path"));
function fileURLToPath(url) {
    return file_uri_to_path_1.default(url);
}
function pathToFileURL(path) {
    return file_url_1.default(path, {
        resolve: true,
    });
}
const emptyImportMap = (() => {
    return importMapResolve.parseFromString(JSON.stringify({ imports: {} }, undefined, 2), '');
})();
function $(modules) {
    const ts = modules.typescript;
    function create(info) {
        const logInfo = (message) => info.project.projectService.logger.info(`[TSImportMap] ${message}`);
        const logError = (message) => info.project.projectService.logger.info(`[TSImportMap] ${message}`);
        const logVerbose = (message) => info.project.projectService.logger.info(`[TSImportMap] ${message}`);
        logInfo("I'm getting set up now! Check the log for this message.");
        const parsedImportMap = readImportMap();
        // Set up decorator
        const proxy = Object.create(null);
        for (let k of Object.keys(info.languageService)) {
            const x = info.languageService[k];
            // @ts-ignore
            proxy[k] = (...args) => x.apply(info.languageService, args);
        }
        const oldFunction = info.languageServiceHost.resolveModuleNames; // Hold onto old function handle for future use.
        info.languageServiceHost.resolveModuleNames = (moduleNames, containingFile, reusedNames, redirectedReference, options) => {
            var _a, _b;
            logVerbose(`Resolving [\n${moduleNames.join('\n')}]\n from ${containingFile}...`);
            const importMapResolveResult = moduleNames.map((moduleName) => {
                try {
                    const resolvedURL = importMapResolve.resolve(moduleName, parsedImportMap, pathToFileURL(containingFile).toString());
                    const resolvedFilePath = fileURLToPath(resolvedURL);
                    return resolvedFilePath;
                }
                catch (error) {
                    return moduleName;
                }
            });
            logVerbose(`Import map resolve result: [\n${importMapResolveResult.map((r, i) => `${moduleNames[i]} -> ${r}`).join('\n')}\n]`);
            const oldResult = (_b = (_a = oldFunction) === null || _a === void 0 ? void 0 : _a.call(info.languageServiceHost, importMapResolveResult, containingFile, reusedNames, redirectedReference, options), (_b !== null && _b !== void 0 ? _b : []));
            logVerbose(`Vender resolve result: [\n${oldResult.map((r, i) => `${moduleNames[i]}: ${r}`).join('\n')}\n]`);
            return oldResult;
        };
        return proxy;
        function readImportMap() {
            const options = info.config;
            const importMapInfos = Array.isArray(options.importMap) ? options.importMap : [options.importMap];
            const parsedImportMaps = [];
            for (const importMapInfo of importMapInfos) {
                let baseURL;
                let importMapSource;
                if (typeof importMapInfo === 'object') {
                    baseURL = '';
                    importMapSource = JSON.stringify(importMapInfo, undefined, 2);
                }
                else {
                    const importMapFile = importMapInfo;
                    baseURL = pathToFileURL(importMapFile).toString();
                    importMapSource = fs_1.default.readFileSync(importMapFile, { encoding: 'utf8' });
                }
                let parsedImportMap;
                try {
                    parsedImportMap = importMapResolve.parseFromString(importMapSource, baseURL);
                }
                catch (error) {
                    logError(`Failed to parse import map <${importMapSource}> at ${fileURLToPath(baseURL)}`);
                }
                if (parsedImportMap) {
                    parsedImportMaps.push(parsedImportMap);
                }
            }
            if (parsedImportMaps.length === 0) {
                logInfo(`No available import maps.`);
                return emptyImportMap;
            }
            else {
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
module.exports = $;
//# sourceMappingURL=index.js.map