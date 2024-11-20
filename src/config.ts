import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { Config } from '@src/types'

export function parseConfig(configPath: string): Config {
  try {
    const finalPath = configPath || '.github/updatelinks.yml'
    core.info(`Looking for config at: ${finalPath}`)

    const absolutePath = path.resolve(process.cwd(), finalPath)
    core.info(`Resolved absolute path: ${absolutePath}`)

    if (!fs.existsSync(absolutePath)) {
      core.warning(`Configuration file not found at ${absolutePath}`)
      throw new Error(`Configuration file not found at ${absolutePath}`)
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf8')
    core.debug(`Config file content: ${fileContent}`)

    const config = yaml.load(fileContent) as Partial<Config>
    core.debug(`Parsed config: ${JSON.stringify(config, null, 2)}`)

    return validateAndNormalizeConfig(config)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error parsing configuration: ${error.message}`)
    }
    throw new Error('Unknown error parsing configuration')
  }
}

function validateFilePattern(pattern: string): boolean {
  // Valid patterns:
  // 1. filename
  // 2. filename.ext
  // 3. *.ext
  return (
    /^[a-zA-Z0-9_-]+$/.test(pattern) || // filename
    /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(pattern) || // filename.ext
    /^\*\.[a-zA-Z0-9]+$/.test(pattern) // *.ext
  )
}

function validateAndNormalizeConfig(config: Partial<Config>): Config {
  if (!config) {
    throw new Error('Configuration is empty or invalid')
  }

  if (!Array.isArray(config.paths)) {
    throw new Error('Configuration must include paths array')
  }

  if (!Array.isArray(config.fileTypes)) {
    throw new Error('Configuration must include fileTypes array')
  }

  if (!Array.isArray(config.links)) {
    throw new Error('Configuration must include links array')
  }

  if (!config.fileTypes.every(validateFilePattern)) {
    throw new Error('Invalid file type pattern detected')
  }

  if (config.ignore && !config.ignore.every(validateFilePattern)) {
    throw new Error('Invalid ignore pattern detected')
  }
  const normalized: Config = {
    paths: config.paths,
    fileTypes: config.fileTypes,
    links: config.links.map(link => {
      if (!link.old || !link.new) {
        throw new Error('Each link must have both old and new properties')
      }
      return {
        old: link.old,
        new: processTemplate(link.new)
      }
    }),
    ignore: config.ignore || [],
    githubUrls: config.githubUrls || { types: [] },
    createPr: typeof config.createPr === 'boolean' ? config.createPr : false,
    commitMessage:
      config.commitMessage ||
      'chore: update repository links\n\nSigned-off-by: linkapp[bot] <linkapp[bot]@users.noreply.github.com>'
  }

  core.debug(`Normalized config: ${JSON.stringify(normalized, null, 2)}`)
  return normalized
}

function processTemplate(value: string): string {
  if (typeof value !== 'string') return value

  // Replace GitHub-specific variables
  if (value.includes('${{ github.repository }}')) {
    return `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`
  }

  // Replace secrets
  return value.replace(/\${{[\s]*secrets\.([\w]+)[\s]*}}/g, (_, key) => {
    const envValue = process.env[key]
    return envValue || ''
  })
}
