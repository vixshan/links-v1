# LinkApp Action

A GitHub Action to automatically update links across your repository files.
Perfect for maintaining documentation, updating deprecated URLs, or managing
repository-wide link changes.

## Features

- 🔄 Automatically updates URLs across multiple files and directories
- ⚙️ Configurable through YAML file
- 📁 Supports multiple file types (md, html, etc.)
- 🎯 Selective path processing
- ⛔ Link ignore list support
- 🔑 Template and environment variable support
- 📝 Detailed logging and error reporting

## Quick Start

1. Create a configuration file `.github/updatelinks.yml`:

```yaml
paths:
  - 'docs'
  - 'src'
  - '.'
fileTypes:
  - 'md'
  - 'html'
links:
  - old: 'https://old-url.com'
    new: 'https://new-url.com'
ignore:
  - 'https://dont-change-this.com'
```

2. Create a workflow file `.github/workflows/update-links.yml`:

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
      - uses: vixshan/linkapp@v1
        with:
          token: ${{ secrets.GH_TOKEN }}
          create-pr: 'true'  # Optional, defaults to false
```

## Configuration Options

### Configuration File Structure

The configuration file (default: `.github/updatelinks.yml`) supports the
following options:

```yaml
# Directories to process
paths:
  - 'docs'
  - 'src'
  - '.'

# File types to process
fileTypes:
  - 'md'
  - 'html'
  - 'txt'

# Regular link mappings (for non-GitHub URLs)
links:
  - old: 'https://discord.gg/oldlink'
    new: 'https://discord.gg/newlink'
  - old: 'https://example.com/docs'
    new: ${{ secrets.NEW_DOCS_URL }}

# Links to ignore during processing
ignore:
  - 'https://github.com/special-repo'
  - 'https://keep-this-link.com'
```

### Action Inputs

| Input         | Required | Default                   | Description                        |
| ------------- | -------- | ------------------------- | ---------------------------------- |
| `token`       | Yes      | N/A                       | GitHub token for repository access |
| `config-path` | No       | `.github/updatelinks.yml` | Path to configuration file         |

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
fileTypes:
  - 'md'
  - 'mdx'
  - 'html'
  - 'rst'
  - 'txt'
```

### Selective Path Processing

Choose specific directories or files to process:

```yaml
paths:
  - 'docs' # Process entire docs directory
  - 'src/components' # Process specific subdirectory
  - 'README.md' # Process specific file
```

## Installation

### Option 1: Using the Action from the Marketplace

1. Create the configuration file `.github/updatelinks.yml`
2. Create the workflow file `.github/workflows/update-links.yml`
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

Contributions are welcome! Please feel free to submit a Pull Request. For major
changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Support

If you encounter any problems or have questions, please open an issue in the
repository.

## Security

This action requires a `GH_TOKEN` with write permissions to update repository
files. The token is automatically provided by GitHub Actions but needs to be
explicitly passed to the action.

For security best practices:

- Only grant the minimum required permissions
- Be careful when using custom configuration files
- Review the link replacement patterns before deployment

## Acknowledgments

This action was inspired by the need to maintain consistent documentation and
links across repositories. You can say i am lazy but after forking repositories,
i have to update the links in the README.md file and i thought why not automate
this process. So here it is.

![Alt](https://repobeats.axiom.co/api/embed/6e20f9307c6fd3e13ca8be9c5832c432d0fe121b.svg "Repobeats analytics image")
