import * as github from '@actions/github'

export const GhUrlPatterns = {
  username: /https?:\/\/github\.com\/([a-zA-Z0-9-]+)(?!\/)(?:\s|$|"|'|>)/g,
  repo: /https?:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)(\.git)?(?:\/[^)"'\s>]*)?(?=[\s"'>]|$)/g,
  sponsors: /https?:\/\/github\.com\/sponsors\/([a-zA-Z0-9-]+)(?=[\s"'>]|$)/g,
  all: /https?:\/\/github\.com(?:\/[^)"'\s>]*)?(?=[\s"'>]|$)/g
}

export function isTemplateLiteral(str: string): boolean {
  return /\${[^}]*}/.test(str)
}

export function getUrlType(
  url: string
): 'username' | 'repo' | 'sponsors' | null {
  // First check for sponsors to avoid misclassification
  if (url.includes('/sponsors/')) return 'sponsors'

  // Clean the URL from any HTML or markdown artifacts
  const cleanUrl = url.split(/[\s"'>]/)[0]
  const parts = cleanUrl.split('/').filter(Boolean)

  if (parts.length >= 4) return 'repo'
  if (parts.length === 3 && !cleanUrl.endsWith('/')) return 'username'
  return null
}

export function processGhUrls(
  content: string,
  types: Array<'username' | 'repo' | 'sponsors' | 'all'>,
  ignore: string[],
  context: typeof github.context
): string {
  let updatedContent = content
  const { owner, repo } = context.repo

  // Helper function to check if URL should be ignored
  const shouldIgnore = (url: string): boolean => {
    return ignore.some(ignoreUrl => {
      // Clean both URLs for comparison
      const cleanUrl = url.split(/[\s"'>]/)[0]
      const cleanIgnoreUrl = ignoreUrl.split(/[\s"'>]/)[0]
      return cleanUrl.startsWith(cleanIgnoreUrl)
    })
  }

  // Process each URL type based on configuration
  for (const type of types) {
    const pattern = GhUrlPatterns[type]

    updatedContent = updatedContent.replace(pattern, (match, ...args) => {
      // Extract the pure URL part from potentially HTML/markdown content
      const urlPart = match.split(/[\s"'>]/)[0]
      const postUrlPart = match.slice(urlPart.length)

      // Check for ignore list and template literals
      if (shouldIgnore(urlPart) || isTemplateLiteral(urlPart)) {
        return match
      }

      // For 'all' type processing
      if (type === 'all') {
        const urlType = getUrlType(urlPart)
        if (!urlType) return match

        switch (urlType) {
          case 'sponsors':
            // Keep sponsors URL processing separate
            const sponsorMatch = urlPart.match(/sponsors\/([a-zA-Z0-9-]+)/)
            if (sponsorMatch && sponsorMatch[1] !== owner) {
              return urlPart.replace(sponsorMatch[1], owner) + postUrlPart
            }
            break

          case 'repo':
            const repoMatch = urlPart.match(
              /github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)(\.git)?/
            )
            if (
              repoMatch &&
              (repoMatch[1] !== owner || repoMatch[2] !== repo)
            ) {
              const hasGitExtension = urlPart.includes('.git')
              const subpath = urlPart.slice(
                urlPart.indexOf(repoMatch[2]) +
                  repoMatch[2].length +
                  (repoMatch[3]?.length || 0)
              )
              return `https://github.com/${owner}/${repo}${
                hasGitExtension ? '.git' : ''
              }${subpath}${postUrlPart}`
            }
            break

          case 'username':
            const usernameMatch = urlPart.match(
              /github\.com\/([a-zA-Z0-9-]+)(?!\/)/
            )
            if (usernameMatch && usernameMatch[1] !== owner) {
              return urlPart.replace(usernameMatch[1], owner) + postUrlPart
            }
            break
        }
      } else {
        // Original type-specific processing
        switch (type) {
          case 'username':
            const usernameMatch = urlPart.match(/github\.com\/([a-zA-Z0-9-]+)/)
            if (usernameMatch && usernameMatch[1] !== owner) {
              return urlPart.replace(usernameMatch[1], owner) + postUrlPart
            }
            break

          case 'repo':
            const repoMatch = urlPart.match(
              /github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-_.]+)(\.git)?/
            )
            if (
              repoMatch &&
              (repoMatch[1] !== owner || repoMatch[2] !== repo)
            ) {
              const hasGitExtension = urlPart.includes('.git')
              const subpath = urlPart.slice(
                urlPart.indexOf(repoMatch[2]) +
                  repoMatch[2].length +
                  (repoMatch[3]?.length || 0)
              )
              return `https://github.com/${owner}/${repo}${
                hasGitExtension ? '.git' : ''
              }${subpath}${postUrlPart}`
            }
            break

          case 'sponsors':
            const sponsorMatch = urlPart.match(/sponsors\/([a-zA-Z0-9-]+)/)
            if (sponsorMatch && sponsorMatch[1] !== owner) {
              return urlPart.replace(sponsorMatch[1], owner) + postUrlPart
            }
            break
        }
      }

      return match
    })
  }

  return updatedContent
}
