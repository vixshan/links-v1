interface LinkReplace {
    old: string;
    new: string;
}
interface Config {
    paths: string[];
    fileTypes: string[];
    links: LinkReplace[];
    ignore: string[];
    githubUrls?: {
        types: Array<'username' | 'repo' | 'sponsors' | 'all'>;
    };
    createPr?: boolean;
}
export declare function parseConfig(configPath: string): Config;
export declare function updateContent(content: string, config: Config, filePath: string): string;
export declare function processDirectory(dirPath: string, config: Config): Promise<boolean>;
export declare function run(): Promise<void>;
export {};
