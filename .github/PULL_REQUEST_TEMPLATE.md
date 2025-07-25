# Refactor: modularise shared code & DRY clean-up

## Overview

This PR restructures the codebase for improved maintainability and developer experience. It centralises shared utilities, removes code duplication, and modularises core components.

## Key Changes

- Added `flow-sdk` and `shared-utils` packages for Flow/Cadence helpers and env logic
- Removed duplicate Cadence scripts and helpers from front-end and API gateway
- Extracted front-end components (Tabs, LeaderboardTable, OnboardingModal) into their own files
- Introduced root `tsconfig.base.json` for strict TypeScript settings
- Updated all workspace configs and import paths for consistency

## How to Test

```bash
bun install
bun run build # (or bun run dev) in each workspace
cd api-gateway && bun run dev
cd frontend-leaderboard && bun run dev
```

## Checklist

- [ ] Code builds in all workspaces
- [ ] Tests pass (if present)
- [ ] Docs and README updated as needed