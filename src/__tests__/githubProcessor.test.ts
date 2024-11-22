// src/__tests__/githubProcessor.test.ts
import { processGhUrls, getUrlType } from '../githubProcessor'
import * as github from '@actions/github'

describe('GithubProcessor', () => {
  const mockContext = {
    repo: {
      owner: 'testowner',
      repo: 'testrepo'
    }
  } as typeof github.context

  test('processes username URLs correctly', () => {
    const content = 'https://github.com/olduser'
    const result = processGhUrls(content, ['username'], [], mockContext)
    expect(result).toBe('https://github.com/testowner')
  })

  test('processes repo URLs correctly', () => {
    const content = 'https://github.com/olduser/oldrepo'
    const result = processGhUrls(content, ['repo'], [], mockContext)
    expect(result).toBe('https://github.com/testowner/testrepo')
  })

  test('detects URL types correctly', () => {
    expect(getUrlType('https://github.com/user')).toBe('username')
    expect(getUrlType('https://github.com/user/repo')).toBe('repo')
    expect(getUrlType('https://github.com/sponsors/user')).toBe('sponsors')
  })
})