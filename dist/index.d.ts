interface LinkReplace {
    old: string;
    new: string;
}
interface Config {
    paths: string[];
    fileTypes: string[];
    links: LinkReplace[];
    ignore: string[];
}
export declare function parseConfig(configPath: string): Config;
export declare function updateContent(content: string, config: Config): string;
export declare function processDirectory(dirPath: string, config: Config): Promise<boolean>;
export declare function run(): Promise<void>;
export {};
