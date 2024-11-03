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
}

export function parseConfig(configPath: string): Config {
  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at ${configPath}`)
    }

    const fileContent = fs.readFileSync(configPath, 'utf8')
    const config = yaml.load(fileContent) as Config

    // Process environment variables and GitHub context in config values
    return {
      paths: config.paths || ['.'],
      fileTypes: config.fileTypes || ['md'],
      links: (config.links || []).map(link => ({
        old: link.old,
        new: processTemplate(link.new),
      })),
      ignore: config.ignore || [],
    }
  } catch (error) {
    throw new Error(`Error parsing configuration: ${error}`)
  }
}

function processTemplate(value: string): string {
  if (typeof value !== 'string') return value

  // Replace ${{ secrets.GITHUB_REPOSITORY }} with actual repository
  if (value.includes('${{ secrets.GITHUB_REPOSITORY }}')) {
    return `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`
  }

  // Process other environment variables if needed
  return value.replace(/\${{[\s]*secrets\.([\w]+)[\s]*}}/g, (_, key) => {
    const envValue = process.env[key]
    return envValue || ''
  })
}

export function updateContent(content: string, config: Config): string {
  let updatedContent = content

  // Apply each link replacement
  for (const link of config.links) {
    // Skip if the old link is in the ignore list
    if (config.ignore.includes(link.old)) {
      continue
    }

    // Create a regex that matches the exact URL
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
