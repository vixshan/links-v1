import * as github from '@actions/github';
export declare const GhUrlPatterns: {
    username: RegExp;
    repo: RegExp;
    sponsors: RegExp;
    all: RegExp;
};
export declare function isTemplateLiteral(str: string): boolean;
export declare function getUrlType(url: string): 'username' | 'repo' | 'sponsors' | null;
export declare function processGhUrls(content: string, types: Array<'username' | 'repo' | 'sponsors' | 'all'>, ignore: string[], context: typeof github.context): string;
