/**
 * Configuration module for the Update Links GitHub Action
 * Handles parsing, validation, and normalization of the configuration file
 */
import { Config } from './types';
/**
 * Default commit message used when updating repository links
 */
export declare const defaultConfigMsg = "chore: update repository links and keywords[skip ci]";
/**
 * Parses the configuration file from the specified path
 * @param configPath - Path to the configuration file (defaults to .github/links-config.yml)
 * @returns Validated and normalized configuration object
 * @throws Error if configuration file is invalid or not found
 */
export declare function parseConfig(configPath: string): Config;
