// linkProcessor.ts
import { Config, LinkChange } from './types'
import * as github from '@actions/github'
import { GITHUB_URL_PATTERNS, processGitHubUrls } from './githubProcessor'

export let linkChanges: LinkChange[] = []

function isUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function determineType(value: string): 'url' | 'keyword' {
  if (isUrl(value)) return 'url'
  // Keywords are single words without spaces
  return value.trim().split(/\s+/).length === 1 ? 'keyword' : 'url'
}

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
              type: 'url'
            })
          }
        }
      }
    }
  }

  // Process regular link and keyword replacements
  for (const link of config.links) {
    if (config.ignore.includes(link.old)) {
      continue
    }

    const type = determineType(link.old)
    const regex =
      type === 'keyword'
        ? new RegExp(`\\b${escapeRegExp(link.old)}\\b`, 'g')
        : new RegExp(escapeRegExp(link.old), 'g')

    const originalContent = updatedContent
    updatedContent = updatedContent.replace(regex, link.new)

    if (originalContent !== updatedContent) {
      const matches = originalContent.match(regex) || []
      matches.forEach(() => {
        linkChanges.push({
          file: filePath,
          oldLink: link.old,
          newLink: link.new,
          type
        })
      })
    }
  }

  return updatedContent
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
