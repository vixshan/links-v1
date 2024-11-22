// src/__tests__/config.test.ts
import { expect, test, describe, beforeEach, mock } from 'bun:test'
import { parseConfig, defaultConfigMsg } from '../config'
import * as fs from 'fs'
import * as yaml from 'js-yaml'

describe('Config Parser', () => {
  beforeEach(() => {
    // Reset mocks between tests
    mock.restore()
  })

  test('parses valid config correctly', () => {
    const mockConfig = {
      paths: ['.'],
      files: ['*.md'],
      links: [{ old: 'oldlink', new: 'newlink' }],
      githubUrls: { types: ['repo'] }
    }

    // Mock fs functions using Bun's mock API
    mock.module('fs', () => ({
      existsSync: () => true,
      readFileSync: () => yaml.dump(mockConfig)
    }))

    const config = parseConfig('.github/updatelinks.yml')
    expect(config.paths).toEqual(['.'])
    expect(config.files).toEqual(['*.md'])
    expect(config.links).toHaveLength(1)
  })

  test('throws on invalid config', () => {
    const invalidConfig = {}

    mock.module('fs', () => ({
      existsSync: () => true,
      readFileSync: () => yaml.dump(invalidConfig)
    }))

    expect(() => parseConfig('.github/updatelinks.yml')).toThrow()
  })
})
