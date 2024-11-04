import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

interface LinkReplace {
  old: string
  new: string
}

interface LinkChange {
  file: string
  oldLink: string
  newLink: string
}

interface Config {
  paths: string[]
  fileTypes: string[]
  links: LinkReplace[]
  ignore: string[]
  githubUrls?: {
    types: Array<'username' | 'repo' | 'sponsors' | 'all'>
  }
  createPr?: boolean
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
  username: /https?:\/\/github\.com\/([a-zA-Z0-9-]+)(?!\/)(?:\s|$)/g,
  repo: /https?:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)(?:\/[^)\s]*)?/g,
  sponsors: /https?:\/\/github\.com\/sponsors\/([a-zA-Z0-9-]+)/g,
  // Updated all pattern to capture the full structure
  all: /https?:\/\/github\.com(?:\/[^)\s${}\n]*)?/g,
}

// Helper function to detect if URL is a template literal
function isTemplateLiteral(str: string): boolean {
  return /\${[^}]*}/.test(str)
}

// Helper function to determine URL type
function getUrlType(url: string): 'username' | 'repo' | 'sponsors' | null {
  if (url.includes('/sponsors/')) return 'sponsors'
  const parts = url.split('/').filter(Boolean)
  if (parts.length >= 4) return 'repo'
  if (parts.length === 3 && !url.endsWith('/')) return 'username'
  return null
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
      // Skip if URL is in ignore list or contains template literals
      if (
        ignore.some(ignoreUrl => match.includes(ignoreUrl)) ||
        isTemplateLiteral(match)
      ) {
        return match
      }

      // For 'all' type, determine the actual URL type first
      if (type === 'all') {
        const urlType = getUrlType(match)
        if (!urlType) return match // Skip if we can't determine the type

        switch (urlType) {
          case 'sponsors':
            const sponsorMatch = match.match(/sponsors\/([a-zA-Z0-9-]+)/)
            if (sponsorMatch && sponsorMatch[1] !== owner) {
              return match.replace(sponsorMatch[1], owner)
            }
            break

          case 'repo':
            const repoMatch = match.match(
              /github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)/
            )
            if (
              repoMatch &&
              (repoMatch[1] !== owner || repoMatch[2] !== repo)
            ) {
              const subpath = match.slice(
                match.indexOf(repoMatch[2]) + repoMatch[2].length
              )
              return `https://github.com/${owner}/${repo}${subpath}`
            }
            break

          case 'username':
            const usernameMatch = match.match(
              /github\.com\/([a-zA-Z0-9-]+)(?!\/)/
            )
            if (usernameMatch && usernameMatch[1] !== owner) {
              return match.replace(usernameMatch[1], owner)
            }
            break
        }
      } else {
        // Original type-specific processing
        switch (type) {
          case 'username':
            const usernameMatch = match.match(/github\.com\/([a-zA-Z0-9-]+)/)
            if (usernameMatch && usernameMatch[1] !== owner) {
              return match.replace(usernameMatch[1], owner)
            }
            break

          case 'repo':
            const repoMatch = match.match(
              /github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)/
            )
            if (
              repoMatch &&
              (repoMatch[1] !== owner || repoMatch[2] !== repo)
            ) {
              const subpath = match.slice(
                match.indexOf(repoMatch[2]) + repoMatch[2].length
              )
              return `https://github.com/${owner}/${repo}${subpath}`
            }
            break

          case 'sponsors':
            const sponsorMatch = match.match(/sponsors\/([a-zA-Z0-9-]+)/)
            if (sponsorMatch && sponsorMatch[1] !== owner) {
              return match.replace(sponsorMatch[1], owner)
            }
            break
        }
      }

      return match
    })
  }

  return updatedContent
}

let linkChanges: LinkChange[] = []

export function updateContent(
  content: string,
  config: Config,
  filePath: string
): string {
  let updatedContent = content

  // Process GitHub URLs if configured
  if ((config.githubUrls?.types ?? []).length > 0) {
    const originalContent = updatedContent
    updatedContent = processGitHubUrls(
      updatedContent,
      config.githubUrls?.types ?? [],
      config.ignore,
      github.context
    )

    // Track GitHub URL changes
    if (originalContent !== updatedContent) {
      const { owner, repo } = github.context.repo
      // Use regex to find all GitHub URLs that were changed
      const urlMatches = originalContent.matchAll(GITHUB_URL_PATTERNS.all)
      for (const match of urlMatches) {
        const oldUrl = match[0]
        if (!config.ignore.includes(oldUrl)) {
          const newUrl = oldUrl.replace(
            /github\.com\/([a-zA-Z0-9-]+)(?:\/([a-zA-Z0-9-_.]+))?/,
            `github.com/${owner}${match[0].includes('/') ? `/${repo}` : ''}`
          )
          if (oldUrl !== newUrl) {
            linkChanges.push({
              file: filePath,
              oldLink: oldUrl,
              newLink: newUrl,
            })
          }
        }
      }
    }
  }

  // Process regular link replacements
  for (const link of config.links) {
    if (config.ignore.includes(link.old)) {
      continue
    }
    const regex = new RegExp(escapeRegExp(link.old), 'g')
    const originalContent = updatedContent
    updatedContent = updatedContent.replace(regex, link.new)

    // Track regular link changes
    if (originalContent !== updatedContent) {
      linkChanges.push({
        file: filePath,
        oldLink: link.old,
        newLink: link.new,
      })
    }
  }

  return updatedContent
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function generatePrBody(): string {
  if (linkChanges.length === 0) {
    return 'No links were changed in this update.'
  }

  // Group changes by file
  const changesByFile = linkChanges.reduce(
    (acc, change) => {
      if (!acc[change.file]) {
        acc[change.file] = []
      }
      acc[change.file].push(change)
      return acc
    },
    {} as Record<string, LinkChange[]>
  )

  let body = '## Link Updates\n\n'

  // Add summary
  body += `This PR updates ${linkChanges.length} link${linkChanges.length === 1 ? '' : 's'} across ${Object.keys(changesByFile).length} file${Object.keys(changesByFile).length === 1 ? '' : 's'}.\n\n`

  // Add details for each file
  for (const [file, changes] of Object.entries(changesByFile)) {
    body += `### ${file}\n`
    for (const change of changes) {
      body += `- \`${change.oldLink}\` → \`${change.newLink}\`\n`
    }
    body += '\n'
  }

  body += '---\n'
  body += '_This PR was automatically generated by the LinkApp Action._'

  return body
}

async function createPullRequest(
  octokit: ReturnType<typeof github.getOctokit>,
  branchName: string
): Promise<void> {
  const { owner, repo } = github.context.repo

  const prTitle = '🔗 chore: update repository links'
  const prBody = generatePrBody()

  try {
    const response = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prTitle,
      body: prBody,
      head: branchName,
      base: 'main',
    })

    core.info(
      `✨ Created PR #${response.data.number}: ${response.data.html_url}`
    )
  } catch (error) {
    throw new Error(`Failed to create PR: ${error}`)
  }
}

async function updateFile(filePath: string, config: Config): Promise<boolean> {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const updatedContent = updateContent(content, config, filePath)

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
    // Reset linkChanges at the start of each run
    linkChanges = []

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
    core.info(`Mode: ${config.createPr ? 'Pull Request' : 'Direct Commit'}`)

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

      // Add changes
      await exec('git', ['add', '.'])

      if (config.createPr) {
        // Create a new branch for PR
        const branchName = `link-updates-${Date.now()}`
        await exec('git', ['checkout', '-b', branchName])

        // Commit changes
        await exec('git', ['commit', '-m', '🔗 chore: update repository links'])

        // Push branch
        await exec('git', ['push', 'origin', branchName])

        // Create PR with detailed changes
        await createPullRequest(octokit, branchName)

        core.info('✨ Successfully created PR with link updates!')
      } else {
        // Commit directly to main
        await exec('git', ['commit', '-m', '🔗 chore: update repository links'])
        await exec('git', ['push'])

        core.info('✨ Successfully updated links and pushed changes to main!')
      }
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
