import * as github from '@actions/github';
export declare function createPullRequest(octokit: ReturnType<typeof github.getOctokit>, branchName: string): Promise<void>;
