## Changelog

### v1.0.2
#### New Features
- The action now; 
  - Automatically detects GitHub URLs in the content.
  - Uses the current repository context to determine what needs to be changed
  - Preserves URL structure and subpaths when making changes
  - Respects the ignore list
  - Only updates URLs that differ from the current context

For example, if this action runs in the repository `neworg/newrepo`, it will automatically:

- [x] Change `https://github.com/oldorg` to `https://github.com/neworg` (if username type is enabled)
- [x] Change `https://github.com/oldorg/oldrepo` to `https://github.com/neworg/newrepo` (if repo type is enabled)
- [x] Change `https://github.com/sponsors/oldorg` to `https://github.com/sponsors/neworg` (if sponsors type is enabled)

The user doesn't need to specify the old/new values - the action figures it out based on the current repository context, respecting the ignored links.

### v1.0.1

- Bug fixes

### v1.0.0

- Initial release
- Basic link replacement functionality
- YAML configuration support
- Multiple path and file type support
