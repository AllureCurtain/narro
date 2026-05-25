# Source Adapters M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the verified free source research into executable Narro source presets and a first RSS/Atom ingestion adapter.

**Architecture:** Add `lib/sources/` as the boundary for source metadata, feed parsing, normalization, dedupe, and preview fetching. Keep storage out of this slice; database persistence remains the next milestone after the adapter contract is stable.

**Tech Stack:** TypeScript 6, Next.js 16 app code, Vitest, built-in `fetch`, no crawler and no paid data source.

---

### Task 1: Source Presets

**Files:**
- Create: `lib/sources/types.ts`
- Create: `lib/sources/presets.ts`
- Test: `tests/source-presets.test.ts`

- [x] Write tests that require a non-empty verified preset list, only free sources, stable ids, no failed candidates, and presence of key default sources.
- [x] Implement the preset type and the verified free preset list from `docs/validated-free-sources.md`.
- [x] Run `pnpm test tests/source-presets.test.ts`.

### Task 2: Feed Adapter

**Files:**
- Create: `lib/sources/feed-adapter.ts`
- Test: `tests/feed-adapter.test.ts`

- [x] Write tests for parsing RSS and Atom sample strings into normalized raw entries.
- [x] Write tests for normalizing entries into Narro `Item` objects with stable ids, source ids, published time, summary, tags, entities, and action labels.
- [x] Write tests for deduping by canonical URL or external id.
- [x] Implement parser, normalizer, deduper, and `fetchSourcePreview`.
- [x] Run `pnpm test tests/feed-adapter.test.ts`.

### Task 3: App Integration

**Files:**
- Modify: `lib/mock-data.ts`
- Modify: `tests/runtime-polish.test.ts`
- Optionally modify: `components/agent-tasks/agent-sidebar.tsx`

- [x] Replace the old small `dataSourceCandidates` list with candidate summaries generated from verified presets.
- [x] Add a runtime test that the app exposes verified free source categories and no crawler-only candidates.
- [x] Run `pnpm test`.

### Task 4: Verification

**Files:**
- No new files expected.

- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Confirm `http://localhost:3001` returns HTTP 200 after the changes.
