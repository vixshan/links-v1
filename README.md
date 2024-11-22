# LinkApp Action

A GitHub Action to automatically update links across your repository files. Perfect for maintaining
documentation, updating deprecated URLs, or managing repository-wide link changes.

## Features

- 🔄 Automatically updates URLs across multiple files and directories
- ⚙️ Configurable through YAML file
- 📁 Supports multiple file types (md, html, etc.)
- 🎯 Selective path processing
- ⛔ Link ignore list support
- 🔑 Template and environment variable support
- 📝 Detailed logging and error reporting

## Quick Start

1. Create a workflow file `.github/workflows/link-updater.yml`:

```yaml
name: Update Repository Links
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  update-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vixshan/link-updater@v1.1.3
        with:
          token: ${{ secrets.GH_TOKEN }}
```

#### Action Inputs

| Input         | Required | Default                   | Description                        |
| ------------- | -------- | ------------------------- | ---------------------------------- |
| `token`       | Yes      | N/A                       | GitHub token for repository access |
| `config-path` | No       | `.github/updatelinks.yml` | Path to configuration file         |

### Configuration Options

2. Create a configuration file `.github/updatelinks.yml` The configuration file (default:
   `.github/updatelinks.yml`) supports the following options:

```yaml
# Directories/files to process
# if not specified, the action will process all files in the repository
paths:
  - 'docs'
  - 'src/components'
  - '.'

# File patterns to include
# if both paths and files are not specified, the action will process all files in the repository
# if only paths are specified, the action will process all files in the specified directories
files:
  - '*.md'
  - 'README'
# Custom link and keyword replacements
# optional only if githubUrls is specified
links:
  - old: 'https://old-domain.com/docs'
    new: 'https://new-domain.com/documentation'
  - old: 'https://discord.gg/oldlink'
    new: 'https://discord.gg/newlink'
  # one word only, else it will be treated as a link
  - old: 'oldkeyword'
    new: 'newkeyword'

# Links/patterns to ignore
# optional, defaults 'node_modules'
ignore:
  - 'node_modules'
  - '*.test.ts'
  - 'https://keep-this-link.com'
```

> Note: `links` cannot be empty if `githubUrls` is not specified

## Advanced Usage

### Using GitHub Context Variables

You can use GitHub context variables in your configuration:

```yaml
links:
  - old: 'https://github.com/old/repo'
    new: ${{ github.repository }}
  - old: 'https://example.com/docs'
    new: ${{ secrets.NEW_DOCS_URL }}

# Automatic GitHub URL processing
githubUrls:
  types:
    - 'username' # Will update any github.com/username references and only those, not the repo or sponsors
    - 'repo' # Will update any github.com/username/repo references
    - 'sponsors' # Will update any github.com/sponsors/username references
    # - 'all'     # Uncomment to update all GitHub URLs
```

### Multiple File Type Processing

Process different file types with specific patterns:

```yaml
files:
  - 'README' # Simple filename
  - 'config.yml' # Filename with extension
  - '*.md' # All markdown files
```

### Selective Path Processing

Choose specific directories or files to process:

```yaml
paths:
  - '.' # Process entire repository
  - 'docs' # Process entire docs directory
  - 'src/components' # Process specific subdirectory
  - 'README.md' # Process specific file
  - 'docs/index.html' # Specific file in a directory
```

### Whether to Create a Pull Request

```yaml
# Create PR instead of direct commits
# optional, default `false`
createPr: true
```

### Custom commit message

```yaml
# optional, defaults 'chore: update repository links and keywords[skip ci]'
commitMsg: 'chore: update repository links and references[skip ci]'
```

## Installation

### Option 1: Using the Action from the Marketplace

1. Create the configuration file `.github/updatelinks.yml`
2. Create the workflow file `.github/workflows/link-updater.yml`
3. Configure the workflow to use this action
4. Commit and push the changes

### Option 2: Building and Publishing Your Own Version

1. Clone this repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Make your modifications
4. Build the action:
   ```bash
   bun run build
   ```
5. Commit all changes, including the `dist` folder
6. Create a new release with a tag (e.g., v1)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open
an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have questions, please open an issue in the repository.

## Security

This action requires a `GH_TOKEN` with write permissions to update repository files. The token is
automatically provided by GitHub Actions but needs to be explicitly passed to the action.

For security best practices:

- Only grant the minimum required permissions
- Be careful when using custom configuration files
- Review the link replacement patterns before deployment

## Acknowledgments

This action was inspired by the need to maintain consistent documentation and links across
repositories. You can say i am lazy but after forking repositories, i have to update the links in
the README.md file and i thought why not automate this process. So here it is.

![Alt](https://repobeats.axiom.co/api/embed/6e20f9307c6fd3e13ca8be9c5832c432d0fe121b.svg 'Repobeats analytics image')
