// src/__tests__/linkProcessor.test.ts
import { updateContent } from '../linkProcessor'
import { Config } from '../types'

describe('LinkProcessor', () => {
  const mockConfig: Config = {
    paths: ['.'],
    files: ['*.md'],
    links: [
      { old: 'old-link', new: 'new-link' },
      { old: 'https://oldurl.com', new: 'https://newurl.com' }
    ],
    ignore: [],
    githubUrls: { types: [] }
  }

  test('replaces keywords correctly', () => {
    const content = 'This contains old-link in text'
    const result = updateContent(content, mockConfig, 'test.md')
    expect(result).toBe('This contains new-link in text')
  })

  test('replaces URLs correctly', () => {
    const content = 'Check https://oldurl.com for more'
    const result = updateContent(content, mockConfig, 'test.md')
    expect(result).toBe('Check https://newurl.com for more')
  })

  test('ignores items in ignore list', () => {
    const configWithIgnore = {
      ...mockConfig,
      ignore: ['old-link']
    }
    const content = 'This contains old-link in text'
    const result = updateContent(content, configWithIgnore, 'test.md')
    expect(result).toBe(content)
  })
})