// fileProcessor.ts
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import { Config } from './types'
import { updateContent } from './linkProcessor'

function matchesPattern(filename: string, pattern: string): boolean {
  // Case 1: Exact match (filename or filename.ext)
  if (pattern === filename) {
    return true
  }

  // Case 2: *.ext pattern
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(2)
    return filename.endsWith(`.${ext}`)
  }

  return false
}

function shouldProcessFile(filename: string, config: Config): boolean {
  // Check if file should be ignored
  if (config.ignore.some(pattern => matchesPattern(filename, pattern))) {
    return false
  }

  // Check if file matches allowed types
  return config.fileTypes.some(pattern => matchesPattern(filename, pattern))
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
      if (shouldProcessFile(entry.name, config)) {
        const fileChanged = await updateFile(fullPath, config)
        hasChanges = hasChanges || fileChanged
      }
    }
  }

  return hasChanges
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
