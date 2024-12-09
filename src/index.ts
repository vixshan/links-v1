/* eslint-disable @typescript-eslint/no-unused-vars */
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import { parseConfig, defaultConfigMsg } from './config'
import { processDirectory } from './fileProcessor'
import { createPullRequest } from './prCreator'
import { linkChanges as linkChangesImport } from './linkProcessor'
let linkChanges: typeof linkChangesImport = []
import { exec as execCommand } from '@actions/exec'

async function exec(command: string, args: string[]): Promise<string> {
  let output = ''

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      }
    }
  }

  await execCommand(command, args, options)
  return output.trim()
}

async function isGitTracked(file: string): Promise<boolean> {
  try {
    await exec('git', ['ls-files', '--error-unmatch', file])
    return true
  } catch {
    return false
  }
}

async function setRemoteWithToken(token: string): Promise<void> {
  const { owner, repo } = github.context.repo
  const authenticatedUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
  await exec('git', ['remote', 'set-url', 'origin', authenticatedUrl])
}

export async function run(): Promise<void> {
  try {
    linkChanges = []

    const token =
      process.env.INPUT_GITHUB_TOKEN || core.getInput('GITHUB_TOKEN')
    const configPath =
      process.env.INPUT_CONFIG_PATH || core.getInput('CONFIG_PATH')

    core.info(`Starting with config path: ${configPath}`)

    if (!token) {
      throw new Error('GitHub token not found')
    }

    const octokit = github.getOctokit(token)
    const config = parseConfig(configPath)

    core.info('📝 Starting link updates with configuration:')
    core.info(`Paths: ${config.paths.join(', ')}`)
    core.info(`Files: ${config.files.join(', ')}`)
    core.info(`Number of link replacements: ${config.links?.length || 0}`)
    core.info(
      `Number of GitHub URL types: ${config.githubUrls?.types.length || 0}`
    )
    core.info(`Mode: ${config.createPr ? 'Pull Request' : 'Direct Commit'}`)

    let hasChanges = false

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
        'link-updater[bot]@users.noreply.github.com'
      ])
      await exec('git', ['config', '--local', 'user.name', 'link-updater[bot]'])

      await exec('git', ['add', '--all'])
      const commitMsg = config.commitMsg || defaultConfigMsg

      if (config.createPr) {
        const branchName = `link-updates-${Date.now()}`
        await exec('git', ['checkout', '-b', branchName])
        await exec('git', ['commit', '-m', commitMsg])

        await setRemoteWithToken(token)
        try {
          await exec('git', ['push', 'origin', branchName])
          await createPullRequest(octokit, branchName)
        } finally {
          await exec('git', [
            'remote',
            'set-url',
            'origin',
            `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}.git`
          ])
        }
      } else {
        await exec('git', ['commit', '-m', commitMsg])

        await setRemoteWithToken(token)
        try {
          await exec('git', ['push'])
        } finally {
          await exec('git', [
            'remote',
            'set-url',
            'origin',
            `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}.git`
          ])
        }
      }

      core.info(
        config.createPr
          ? '✨ Successfully created PR with link updates!'
          : '✨ Successfully updated links and pushed changes to main!'
      )
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
