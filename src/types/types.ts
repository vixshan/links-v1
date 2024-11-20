export interface LinkReplace {
  old: string
  new: string
}

export interface LinkChange {
  file: string
  oldLink: string
  newLink: string
}

export interface Config {
  paths: string[]
  fileTypes: string[]
  links: LinkReplace[]
  ignore: string[]
  githubUrls?: {
    types: Array<'username' | 'repo' | 'sponsors' | 'all'>
  }
  createPr?: boolean
  commitMessage?: string
}
