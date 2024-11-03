import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

interface LinkReplace {
  old: string
  new: string
}

interface Config {
  paths: string[]
  fileTypes: string[]
  links: LinkReplace[]
  ignore: string[]
  githubUrls?: {
    types: Array<'username' | 'repo' | 'sponsors' | 'all'>
  }
}

export function parseConfig(configPath: string): Config {
  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`)
    }

    const fileContent = fs.readFileSync(configPath, 'utf8')
    const config = yaml.load(fileContent) as Config

    return {
      paths: config.paths || ['.'],
      fileTypes: config.fileTypes || ['md'],
      links: (config.links || []).map(link => ({
        old: link.old,
        new: processTemplate(link.new),
      })),
      ignore: config.ignore || [],
      githubUrls: config.githubUrls || { types: [] },
    }
  } catch (error) {
    throw new Error(`Error parsing configuration: ${error}`)
  }
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

// Regular expressions for different GitHub URL patterns
const GITHUB_URL_PATTERNS = {
  // Matches github.com/username format
  username: /https?:\/\/github\.com\/([a-zA-Z0-9-]+)(?!\/)(?:\s|$)/g,
  // Matches github.com/username/repo format (including subpaths)
  repo: /https?:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)(?:\/[^)\s]*)?/g,
  // Matches github.com/sponsors/username format
  sponsors: /https?:\/\/github\.com\/sponsors\/([a-zA-Z0-9-]+)/g,
  // Matches any GitHub URL
  all: /https?:\/\/github\.com\/[a-zA-Z0-9-]+(?:\/[^)\s]*)*/g,
}

function processGitHubUrls(
  content: string,
  types: Array<'username' | 'repo' | 'sponsors' | 'all'>,
  ignore: string[],
  context: typeof github.context
): string {
  let updatedContent = content
  const { owner, repo } = context.repo

  // Process each URL type based on configuration
  for (const type of types) {
    const pattern = GITHUB_URL_PATTERNS[type]

    updatedContent = updatedContent.replace(pattern, match => {
      // Skip if URL is in ignore list
      if (ignore.some(ignoreUrl => match.includes(ignoreUrl))) {
        return match
      }

      switch (type) {
        case 'username':
          // Replace username only if it's different from current owner
          const usernameMatch = match.match(/github\.com\/([a-zA-Z0-9-]+)/)
          if (usernameMatch && usernameMatch[1] !== owner) {
            return match.replace(usernameMatch[1], owner)
          }
          break

        case 'repo':
          // Replace repo references if they match the pattern but aren't current repo
          const repoMatch = match.match(
            /github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)/
          )
          if (repoMatch && (repoMatch[1] !== owner || repoMatch[2] !== repo)) {
            // Preserve any subpaths after the repo name
            const subpath = match.slice(
              match.indexOf(repoMatch[2]) + repoMatch[2].length
            )
            return `https://github.com/${owner}/${repo}${subpath}`
          }
          break

        case 'sponsors':
          // Update sponsor links to point to the current owner
          const sponsorMatch = match.match(/sponsors\/([a-zA-Z0-9-]+)/)
          if (sponsorMatch && sponsorMatch[1] !== owner) {
            return match.replace(sponsorMatch[1], owner)
          }
          break

        case 'all':
          // For 'all' type, we need to be more careful to preserve structure
          if (!match.includes(`${owner}/${repo}`)) {
            const parts = match.split('/')
            if (parts.length >= 5) {
              // Has subpaths
              return `https://github.com/${owner}/${repo}/${parts.slice(5).join('/')}`
            } else {
              return `https://github.com/${owner}/${repo}`
            }
          }
          break
      }

      return match
    })
  }

  return updatedContent
}

export function updateContent(content: string, config: Config): string {
  let updatedContent = content

  // Process GitHub URLs if configured
  if ((config.githubUrls?.types ?? []).length > 0) {
    updatedContent = processGitHubUrls(
      updatedContent,
      config.githubUrls?.types ?? [],
      config.ignore,
      github.context
    )
  }

  // Process regular link replacements
  for (const link of config.links) {
    if (config.ignore.includes(link.old)) {
      continue
    }
    const regex = new RegExp(escapeRegExp(link.old), 'g')
    updatedContent = updatedContent.replace(regex, link.new)
  }

  return updatedContent
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function updateFile(filePath: string, config: Config): Promise<boolean> {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const updatedContent = updateContent(content, config)

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent)
      core.info(`✅ Updated ${filePath}`)
      return true
    }
    return false
  } catch (error) {
    core.warning(`⚠️ Error updating ${filePath}: ${error}`)
    return false
  }
}

export async function processDirectory(
  dirPath: string,
  config: Config
): Promise<boolean> {
  let hasChanges = false
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      // Skip .git directory and node_modules
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      hasChanges = (await processDirectory(fullPath, config)) || hasChanges
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).replace('.', '')
      if (config.fileTypes.includes(ext)) {
        const fileChanged = await updateFile(fullPath, config)
        hasChanges = hasChanges || fileChanged
      }
    }
  }

  return hasChanges
}

async function exec(command: string, args: string[]): Promise<string> {
  const { exec } = require('@actions/exec')
  let output = ''

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
    },
  }

  await exec(command, args, options)
  return output.trim()
}

export async function run(): Promise<void> {
  try {
    // Get inputs
    const token = core.getInput('token')
    const configPath = core.getInput('config-path')

    if (!token) {
      throw new Error('GitHub token not found')
    }

    // Initialize octokit
    const octokit = github.getOctokit(token)

    // Parse configuration
    const config = parseConfig(configPath)

    core.info('📝 Starting link updates with configuration:')
    core.info(`Paths: ${config.paths.join(', ')}`)
    core.info(`File Types: ${config.fileTypes.join(', ')}`)
    core.info(`Number of link replacements: ${config.links.length}`)

    let hasChanges = false

    // Process each configured path
    for (const configPath of config.paths) {
      const absolutePath = path.resolve(process.cwd(), configPath)
      if (fs.existsSync(absolutePath)) {
        const pathChanges = await processDirectory(absolutePath, config)
        hasChanges = hasChanges || pathChanges
      } else {
        core.warning(`⚠️ Path not found: ${configPath}`)
      }
    }

    if (hasChanges) {
      // Configure git
      await exec('git', [
        'config',
        '--local',
        'user.email',
        'action@github.com',
      ])
      await exec('git', ['config', '--local', 'user.name', 'GitHub Action'])

      // Commit and push changes
      await exec('git', ['add', '.'])
      await exec('git', ['commit', '-m', 'chore: update repository links'])
      await exec('git', ['push'])

      core.info('✨ Successfully updated links and pushed changes!')
    } else {
      core.info('ℹ️ No changes were needed')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
