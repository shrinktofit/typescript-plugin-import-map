declare function $(modules: {
    typescript: typeof import("typescript/lib/tsserverlibrary");
}): {
    create: (info: import("typescript/lib/tsserverlibrary").server.PluginCreateInfo) => import("typescript/lib/tsserverlibrary").LanguageService | undefined;
};
export = $;
