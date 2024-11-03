import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { parseConfig, updateContent, processDirectory, run } from './index'

// Mock the modules
jest.mock('fs')
jest.mock('path')
jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('@actions/exec')
jest.mock('js-yaml', () => ({
  load: jest.fn(content => {
    // Simple mock implementation that returns the sample config
    return {
      paths: ['docs'],
      fileTypes: ['md'],
      links: [
        {
          old: 'https://old-domain.com',
          new: 'https://new-domain.com',
        },
      ],
      ignore: ['https://ignore-this.com'],
    }
  }),
}))

describe('Link Updater Action', () => {
  // Sample config for testing
  const sampleConfig = {
    paths: ['docs'],
    fileTypes: ['md'],
    links: [
      {
        old: 'https://old-domain.com',
        new: 'https://new-domain.com',
      },
    ],
    ignore: ['https://ignore-this.com'],
  }

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Setup default mocks
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    jest.spyOn(fs, 'readFileSync').mockReturnValue('mock yaml content')
    jest.spyOn(path, 'resolve').mockImplementation((...args) => args.join('/'))
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'token') return 'fake-token'
      if (name === 'config-path') return 'config.yml'
      return ''
    })

    // Mock GitHub context
    const mockContext = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo',
      },
    }
    jest.spyOn(github, 'getOctokit').mockReturnValue({} as any)
    Object.defineProperty(github, 'context', {
      get: () => mockContext,
    })
  })

  describe('parseConfig', () => {
    it('should parse configuration file correctly', () => {
      const configPath = 'config.yml'
      const result = parseConfig(configPath)

      expect(result).toEqual({
        paths: ['docs'],
        fileTypes: ['md'],
        links: [
          {
            old: 'https://old-domain.com',
            new: 'https://new-domain.com',
          },
        ],
        ignore: ['https://ignore-this.com'],
      })
    })

    it('should throw error if config file not found', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false)

      expect(() => parseConfig('non-existent.yml')).toThrow(
        'Configuration file not found'
      )
    })
  })

  describe('updateContent', () => {
    it('should replace links according to configuration', () => {
      const content = 'Check our docs at https://old-domain.com/guide'
      const result = updateContent(content, sampleConfig)

      expect(result).toBe('Check our docs at https://new-domain.com/guide')
    })

    it('should not replace ignored links', () => {
      const content = 'Check https://ignore-this.com'
      const result = updateContent(content, sampleConfig)

      expect(result).toBe(content)
    })
  })

  describe('processDirectory', () => {
    beforeEach(() => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        {
          name: 'test.md',
          isDirectory: () => false,
          isFile: () => true,
        } as fs.Dirent,
      ])
    })

    it('should process markdown files in directory', async () => {
      const result = await processDirectory('docs', sampleConfig)

      expect(fs.readFileSync).toHaveBeenCalled()
      expect(result).toBeFalsy() // No changes made in this test case
    })

    it('should skip .git and node_modules directories', async () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        {
          name: '.git',
          isDirectory: () => true,
          isFile: () => false,
        } as fs.Dirent,
        {
          name: 'node_modules',
          isDirectory: () => true,
          isFile: () => false,
        } as fs.Dirent,
      ])

      await processDirectory('docs', sampleConfig)

      expect(fs.readFileSync).not.toHaveBeenCalled()
    })
  })

  describe('run', () => {
    it('should execute successfully with no changes', async () => {
      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(core.info).toHaveBeenCalledWith('ℹ️ No changes were needed')
    })

    it('should throw error when token is missing', async () => {
      jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) =>
          name === 'config-path' ? 'config.yml' : ''
        )

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('GitHub token not found')
    })
  })
})
