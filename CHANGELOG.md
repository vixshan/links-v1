# 📦 Changelog

All notable changes to this project will be documented in this file.


# [v1.0.4](https://github.com/vixshan/linkapp/compare/v1.0.3...v1.0.4) (2024-11-18)



## [1.0.4](https://github.com/vixshan/linkapp/compare/v1.0.3...v1.0.4) (2024-11-18)

### Bug Fixes

* Update release configuration to include exec plugin for version replacement in README ([5bc8174](https://github.com/vixshan/linkapp/commit/5bc817443aeac80067efd84b047626977688ac68))

# [v1.0.3](https://github.com/vixshan/linkapp/compare/v1.0.2...v1.0.3) (2024-11-18)



## [1.0.3](https://github.com/vixshan/linkapp/compare/v1.0.2...v1.0.3) (2024-11-18)

### Bug Fixes

* Update release configuration and enhance link updater functionality ([bb4ea3d](https://github.com/vixshan/linkapp/commit/bb4ea3d34cf9d04ed67af2116f072b02ba8655e0))

# [v1.0.2](https://github.com/vixshan/linkapp/compare/v1.0.1...v1.0.2) (2024-11-18)



## [1.0.2](https://github.com/vixshan/linkapp/compare/v1.0.1...v1.0.2) (2024-11-18)

### Bug Fixes

* Enhance configuration parsing with improved path resolution and validation ([3d44768](https://github.com/vixshan/linkapp/commit/3d447682f2bdd02adf5fb0c493a6cb27f4dc1ffa))
* Improve configuration parsing with enhanced error handling and logging ([57eee52](https://github.com/vixshan/linkapp/commit/57eee5292e843edce2e5a9b0ee0fad7d2a399584))

# [v1.0.1](https://github.com/vixshan/linkapp/compare/v1.0.0...v1.0.1) (2024-11-18)



## [1.0.1](https://github.com/vixshan/linkapp/compare/v1.0.0...v1.0.1) (2024-11-18)

### Bug Fixes

* Enhance configuration parsing and add comprehensive tests ([7c39de1](https://github.com/vixshan/linkapp/commit/7c39de174b2daa8b7a22028670c89e601c951876))

## 1.0.0 (2024-11-09)

### Features
1. The action now; 
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

2. Added support for pr creation to allow reviewing the changes before merging.

* Cleanup project configuration and remove unused files ([c8420f7](https://github.com/vixshan/linkapp/commit/c8420f746e3d644f33e7d2f087eb379111bf09b7))
* Update project dependencies for improved stability ([c1de4ac](https://github.com/vixshan/linkapp/commit/c1de4acb9ad98283d3c9715376f142a8eda294ce))

### Bug Fixes

* Add conventional-changelog-gitmoji dependency for improved changelog generation ([51faa09](https://github.com/vixshan/linkapp/commit/51faa09ea6885ccd1d8b649f7e9c7dcbf9ae03d1))
* Update release configuration to use conventional commits preset ([8f80650](https://github.com/vixshan/linkapp/commit/8f8065024aaace790e92354bd4e37056072d74e9))

* Fixed a bug where the action would not scan the entire link if `all=true` and would all links `github.com` with the repo details instead of respecting the url structure.
