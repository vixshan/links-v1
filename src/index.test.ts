import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import { parseConfig, updateContent, processDirectory } from './index'

// Mock the required modules
jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('fs')
jest.mock('path')

describe('Link Update Action Tests', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset github.context
    Object.defineProperty(github.context, 'repo', {
      value: {
        owner: 'testOwner',
        repo: 'testRepo'
      }
    })
  })

  describe('parseConfig', () => {
    const mockConfigPath = 'config.yml'
    const mockConfigContent = `
paths:
  - docs
  - src
fileTypes:
  - md
  - mdx
links:
  - old: https://oldlink.com
    new: https://newlink.com
ignore:
  - https://ignorethis.com
githubUrls:
  types:
    - username
    - repo
createPr: true
`

    beforeEach(() => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(mockConfigContent)
    })

    it('should parse configuration file correctly', () => {
      const config = parseConfig(mockConfigPath)

      expect(config).toEqual({
        paths: ['docs', 'src'],
        fileTypes: ['md', 'mdx'],
        links: [
          {
            old: 'https://oldlink.com',
            new: 'https://newlink.com'
          }
        ],
        ignore: ['https://ignorethis.com'],
        githubUrls: {
          types: ['username', 'repo']
        }
      })
    })

    it('should throw error if config file not found', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      expect(() => parseConfig(mockConfigPath)).toThrow(
        'Configuration file not found'
      )
    })

    it('should use default values for missing optional fields', () => {
      const minimalConfig = `
paths:
  - docs
`
      ;(fs.readFileSync as jest.Mock).mockReturnValue(minimalConfig)

      const config = parseConfig(mockConfigPath)

      expect(config).toEqual({
        paths: ['docs'],
        fileTypes: ['md'],
        links: [],
        ignore: [],
        githubUrls: { types: [] }
      })
    })
  })

  describe('updateContent', () => {
    const mockConfig = {
      paths: ['.'],
      fileTypes: ['md'],
      links: [
        {
          old: 'https://oldlink.com',
          new: 'https://newlink.com'
        }
      ],
      ignore: ['https://ignorethis.com'],
      githubUrls: {
        types: ['username', 'repo'] as (
          | 'username'
          | 'repo'
          | 'sponsors'
          | 'all'
        )[]
      }
    }

    it('should update regular links correctly', () => {
      const content = 'Check out [our website](https://oldlink.com)'
      const expected = 'Check out [our website](https://newlink.com)'

      const result = updateContent(content, mockConfig, 'test.md')
      expect(result).toBe(expected)
    })

    it('should update GitHub URLs correctly', () => {
      const content =
        'Visit https://github.com/oldowner/oldrepo for more information'
      const expected =
        'Visit https://github.com/testOwner/testRepo for more information'

      const result = updateContent(content, mockConfig, 'test.md')
      expect(result).toBe(expected)
    })

    it('should not update ignored links', () => {
      const content = 'Do not update [this link](https://ignorethis.com)'
      const result = updateContent(content, mockConfig, 'test.md')
      expect(result).toBe(content)
    })

    it('should handle template literals in URLs', () => {
      const content =
        'Dynamic link: https://github.com/${user}/repo and ${variable}'
      const result = updateContent(content, mockConfig, 'test.md')
      expect(result).toBe(content)
    })
  })

  describe('processDirectory', () => {
    const mockConfig = {
      paths: ['.'],
      fileTypes: ['md'],
      links: [
        {
          old: 'https://oldlink.com',
          new: 'https://newlink.com'
        }
      ],
      ignore: [],
      githubUrls: {
        types: []
      }
    }

    beforeEach(() => {
      ;(fs.readdirSync as jest.Mock).mockReturnValue([
        {
          name: 'test.md',
          isDirectory: () => false,
          isFile: () => true
        },
        {
          name: 'docs',
          isDirectory: () => true,
          isFile: () => false
        },
        {
          name: '.git',
          isDirectory: () => true,
          isFile: () => false
        }
      ])
      ;(fs.readFileSync as jest.Mock).mockReturnValue(
        'Check out [our website](https://oldlink.com)'
      )
      ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {})
    })

    it('should process files with matching extensions', async () => {
      const result = await processDirectory('.', mockConfig)
      expect(result).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should skip .git and node_modules directories', async () => {
      await processDirectory('.', mockConfig)
      expect(fs.readdirSync).not.toHaveBeenCalledWith(
        expect.stringContaining('.git')
      )
      expect(fs.readdirSync).not.toHaveBeenCalledWith(
        expect.stringContaining('node_modules')
      )
    })

    it('should return false when no changes are needed', async () => {
      ;(fs.readFileSync as jest.Mock).mockReturnValue(
        'Content with no links to update'
      )
      const result = await processDirectory('.', mockConfig)
      expect(result).toBe(false)
    })
  })

  describe('GitHub URL processing', () => {
    const mockConfig = {
      paths: ['.'],
      fileTypes: ['md'],
      links: [],
      ignore: [],
      githubUrls: {
        types: ['username', 'repo', 'sponsors', 'all'] as (
          | 'username'
          | 'repo'
          | 'sponsors'
          | 'all'
        )[]
      }
    }

    const testCases = [
      {
        name: 'username URLs',
        input: 'https://github.com/olduser',
        expected: 'https://github.com/testOwner'
      },
      {
        name: 'repository URLs',
        input: 'https://github.com/olduser/oldrepo',
        expected: 'https://github.com/testOwner/testRepo'
      },
      {
        name: 'sponsor URLs',
        input: 'https://github.com/sponsors/olduser',
        expected: 'https://github.com/sponsors/testOwner'
      },
      {
        name: 'URLs with paths',
        input: 'https://github.com/olduser/oldrepo/issues/1',
        expected: 'https://github.com/testOwner/testRepo/issues/1'
      }
    ]

    testCases.forEach(({ name, input, expected }) => {
      it(`should handle ${name}`, () => {
        const result = updateContent(input, mockConfig, 'test.md')
        expect(result).toBe(expected)
      })
    })
  })
})
