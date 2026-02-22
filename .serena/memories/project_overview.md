# Project Overview

## Purpose
cffnpwr's shared Renovate configuration presets. This repository provides reusable Renovate bot configurations that can be extended by other repositories.

## Tech Stack
- **Renovate**: Dependency update automation tool
- **Node.js / TypeScript**: For configuration validation and testing scripts
- **pnpm**: Package manager
- **Nix / flake**: System-level dependency management
- **JSON**: Preset configuration files

## Project Structure
```
renovate-config/
├── default.json          # Main entry point, extends all presets
├── presets/              # Individual configuration presets
│   ├── automerge.json    # Auto-merge settings
│   ├── base.json         # Base/common settings
│   ├── ci.json           # CI dependency rules
│   ├── javascript.json   # JavaScript/npm-specific rules
│   ├── nixFlake.json     # Nix flake update rules
│   └── security.json     # Security vulnerability settings
├── scripts/              # Test/validation scripts
├── package.json          # Node dependencies (renovation, eslint, tsx, etc.)
├── flake.nix             # Nix flake definition
└── renovate.json         # Self-hosted Renovate config (uses this repo's own config)
```

## Preset Details
- **default.json**: Extends automerge, base, ci, nixFlake, security presets
- **base.json**: Timezone Asia/Tokyo, schedule 0-3 AM daily, config:best-practices, semantic commits
- **automerge.json**: Auto-merge enabled for minor/patch/pin, squash strategy
- **ci.json**: CI manager grouping rules
- **security.json**: Vulnerability alerts, 3-day minimum release age
- **javascript.json**: Node versioning, npm/bun dev/prod dependency grouping
- **nixFlake.json**: Nix flake update with chore(flake): prefix
