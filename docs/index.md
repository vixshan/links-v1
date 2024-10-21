# Update Links Action

This action updates links in your repository based on a configuration file.

## Usage

1.  Create an `updatelinks.yml` file in the root of your repository.
2.  Configure the `paths`, `fileTypes`, `links`, and `ignore` options in the `updatelinks.yml` file.
3.  Add the action to your workflow file.

## Example `updatelinks.yml`

```yaml
paths:
  - 'docs'
  - 'src'
fileTypes:
  - 'md'
  - 'html'
links:
  - old: '[https://discord.gg/xxxxxx](https://discord.gg/xxxxxx)'
    new: '[https://discord.gg/yyyyyy](https://discord.gg/yyyyyy)'
  - old: '[https://github.com/username/repo](https://github.com/username/repo)'
    new: ${{ secrets.GITHUB_REPOSITORY }}
ignore:
  - '[https://github.com/USERNAME1/REPO1](https://github.com/USERNAME1/REPO1)'

```