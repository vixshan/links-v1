// .releaserc.js
module.exports = {
  // Only release from main branch
  branches: ['main'],

  plugins: [
    // Gitmoji release rules configuration
    [
      'semantic-release-gitmoji',
      {
        releaseRules: {
          patch: {
            include: [':bug:', ':ambulance:', ':lock:', ':adhesive_bandage:']
          },
          minor: {
            include: [':sparkles:', ':rocket:', ':boom:', ':lipstick:', ':zap:']
          },
          major: {
            include: [':boom:', ':warning:']
          }
        }
      }
    ],

    // Standard semantic release plugins
    '@semantic-release/commit-analyzer',

    // Configure release notes generation
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        writerOpts: {
          types: [
            { type: 'feat', section: '✨ Features' },
            { type: 'fix', section: '🐛 Bug Fixes' },
            { type: 'perf', section: '⚡ Performance Improvements' },
            { type: 'revert', section: '⏪ Reverts' },
            { type: 'docs', section: '📚 Documentation' },
            { type: 'style', section: '💄 Styles' },
            { type: 'chore', section: '🔧 Miscellaneous' },
            { type: 'refactor', section: '♻️ Code Refactoring' },
            { type: 'test', section: '✅ Tests' },
            { type: 'build', section: '👷 Build System' },
            { type: 'ci', section: '🔄 CI/CD' }
          ]
        }
      }
    ],

    // Changelog configuration
    [
      '@semantic-release/changelog',
      {
        changelogTitle:
          '# 📦 Changelog\n\nAll notable changes to this project will be documented in this file.\n'
      }
    ],

    // NPM publish configuration (skip once)
    /*
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
        pkgRoot: ".",
        tarballDir: "dist"
      }
    ],
    */

    // GitHub release configuration
    [
      '@semantic-release/github',
      {
        assets: ['dist/*.tgz'],
        successComment:
          "🎉 This ${issue.pull_request ? 'PR is included' : 'issue has been resolved'} in version ${nextRelease.version}",
        failTitle: '❌ The release failed',
        failComment:
          'This release from branch ${branch.name} failed to publish.',
        labels: ['released']
      }
    ],

    // Execute commands during release
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          "sed -i 's|vixshan/linkapp@v[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+|vixshan/linkapp@v${nextRelease.version}|g' README.md",
        publishCmd:
          "gh api --method POST /repos/${process.env.GITHUB_REPOSITORY}/releases/${nextRelease.version}/assets -F 'name=action.yml' -F 'label=Action Metadata'"
      }
    ],

    // Git commit configuration
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md', 'README.md'],
        message:
          'Release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
}
