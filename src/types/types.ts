export interface LinkReplace {
  old: string
  new: string
}

export interface LinkChange {
  file: string
  oldLink: string
  newLink: string
  type: 'url' | 'keyword'
}

export interface Config {
  paths: string[]
  files: string[]
  links: LinkReplace[]
  ignore: string[]
  githubUrls?: {
    types: Array<'username' | 'repo' | 'sponsors' | 'all'>
  }
  createPr?: boolean
  commitMsg?: string
}
