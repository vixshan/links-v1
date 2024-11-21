// index.test.ts
import { run } from './index'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import path from 'path'

// Mock dependencies
jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('@actions/exec')
jest.mock('fs')
jest.mock('./config')
jest.mock('./fileProcessor')
jest.mock('./prCreator')

describe('run', () => {
  const mockToken = 'mock-token'
  const mockConfigPath = 'mock-config.yml'
  const mockOctokit = {
    rest: {
      pulls: {
        create: jest.fn()
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Setup core input mocks
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      if (name === 'token') return mockToken
      if (name === 'config-path') return mockConfigPath
      return ''
    })
    // Setup github mock
    ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)
    // Setup fs mocks
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)
  })

  it('should process files and create PR when changes detected', async () => {
    // Mock processDirectory to return true (changes detected)
    const processDirectory = require('./fileProcessor').processDirectory
    processDirectory.mockResolvedValue(true)

    // Mock exec command
    const exec = require('@actions/exec').exec
    exec.mockResolvedValue(0)

    await run()

    // Verify core info calls
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Starting'))
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully created PR')
    )

    // Verify git commands were called
    expect(exec).toHaveBeenCalledWith(
      'git',
      [
        'config',
        '--local',
        'user.email',
        'linkapp[bot]@users.noreply.github.com'
      ],
      expect.any(Object)
    )
  })

  it('should handle errors gracefully', async () => {
    // Mock processDirectory to throw error
    const processDirectory = require('./fileProcessor').processDirectory
    processDirectory.mockRejectedValue(new Error('Test error'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Action failed: Test error')
  })

  it('should do nothing when no changes detected', async () => {
    // Mock processDirectory to return false (no changes)
    const processDirectory = require('./fileProcessor').processDirectory
    processDirectory.mockResolvedValue(false)

    await run()

    expect(core.info).toHaveBeenCalledWith('ℹ️ No changes were needed')

    // Verify git commands were not called
    const exec = require('@actions/exec').exec
    expect(exec).not.toHaveBeenCalled()
  })
})
