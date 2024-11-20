import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import { parseConfig } from './config'
import { processDirectory } from './fileProcessor'
import { createPullRequest } from './prCreator'
import { linkChanges as linkChangesImport } from './linkProcessor'
let linkChanges: typeof linkChangesImport = []

async function exec(command: string, args: string[]): Promise<string> {
  const { exec } = require('@actions/exec')
  let output = ''

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      }
    }
  }

  await exec(command, args, options)
  return output.trim()
}

export async function run(): Promise<void> {
  try {
    linkChanges = []

    const token = core.getInput('token')
    const configPath = core.getInput('config-path')

    core.info(`Starting with config path: ${configPath}`)

    if (!token) {
      throw new Error('GitHub token not found')
    }

    const octokit = github.getOctokit(token)

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
      await exec('git', [
        'config',
        '--local',
        'user.email',
        'linkapp[bot]@users.noreply.github.com'
      ])
      await exec('git', ['config', '--local', 'user.name', 'linkapp[bot]'])

      if (fs.existsSync('package.json') || fs.existsSync('bun.lockb')) {
        await exec('git', ['stash', 'push', 'package.json', 'bun.lockb'])
      }

      await exec('git', ['add', ':/', ':!package.json', ':!bun.lockb'])

      const commitMessage =
        config.commitMessage || 'chore: update links [skip ci]'

      if (config.createPr) {
        const branchName = `link-updates-${Date.now()}`
        await exec('git', ['checkout', '-b', branchName])
        await exec('git', ['commit', '-m', commitMessage])
        await exec('git', ['push', 'origin', branchName])
        await createPullRequest(octokit, branchName)

        if (fs.existsSync('.git/refs/stash')) {
          await exec('git', ['stash', 'pop'])
        }

        core.info('✨ Successfully created PR with link updates!')
      } else {
        await exec('git', ['commit', '-m', commitMessage])
        await exec('git', ['push'])

        if (fs.existsSync('.git/refs/stash')) {
          await exec('git', ['stash', 'pop'])
        }

        core.info('✨ Successfully updated links and pushed changes to main!')
      }
    } else {
      core.info('ℹ️ No changes were needed')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
