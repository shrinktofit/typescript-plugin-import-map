
declare module '@import-maps/resolve' {
    interface ParsedImportMap {}

    export function parseFromString(map: string, baseURL: string): ParsedImportMap;

    /**
     * Resolves a given specifier via a parsedImportMap. Knowledge about the path/url of the currently
     * executing script is required.
     *
     * @example
     * const importMap = { import: {
     *  'foo': ['/node_modules/foo/foo.js']
    * }};
     * resolve('foo', importMap, '/path/to/root::/src/index.html');
     * // => /path/to/root/node_modules/foo/foo.js
     *
     * resolve('foo', importMap, 'http://example.com/my-app/src/index.html');
     * // => http://example.com/node_modules/foo/foo.js
     * @param specifier can be a full URL or a bare_specifier or bare_specifier + path
     * @param parsedImportMap normalized map string (already processed by parseFromString)
     * @param scriptURL the scripts url/path that is requesting the resolve (needed to support scopes)
     */
    export function resolve(specifier: string, parsedImportMap: ParsedImportMap, scriptURL: string): string;

    export function mergeImportMaps(one: ParsedImportMap, another: ParsedImportMap): ParsedImportMap;
}