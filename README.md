# SimpleJournal

A diary app with collaborative features and handwriting support.

- **Web** (SvelteKit + Cloudflare Pages)
- **iOS / iPadOS** (SwiftUI + PencilKit)
- **Android / Android Tablet** (Jetpack Compose)
- **Backend** (Cloudflare Workers + Hono + D1 + R2 + Durable Objects)

## Repository structure

```
packages/        Shared TypeScript packages (types, config)
backend/         Cloudflare Workers API
web/             SvelteKit web app
ios/             iOS / iPadOS app
android/         Android app
docs/            Architecture & deployment docs
scripts/         Build / deploy / codegen scripts
```

## Development phases

1. Phase 0–1: Repo + shared packages (current)
2. Phase 2: Backend on Cloudflare
3. Phase 3–7: Web app + launch
4. Phase 8–13: iOS app + App Store
5. Phase 14–19: Android app + Play Store

See full roadmap in the project plan.

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm build
```

## Requirements

- Node.js 20+
- pnpm 10+
- Git
