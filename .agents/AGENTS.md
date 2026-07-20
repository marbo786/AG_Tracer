# Antigravity Tracer — Project Rules

## Coding Standards

- Use strict TypeScript throughout. No `any` types.
- Prefer explicit typing over inference where it improves readability.
- Keep modules focused on a single responsibility.
- Avoid unnecessary abstraction — do not add layers that don't earn their existence.
- Avoid files becoming excessively large. Split when a module handles more than one concern.
- Prefer composition over inheritance.
- Write self-documenting code. Use descriptive names instead of abbreviations.
- Only comment code where the reasoning is not obvious from the code itself.
- Handle errors explicitly. Fail gracefully — never swallow errors silently.

## Architecture Boundaries

Maintain strict separation between these layers:

```
Ingestion → Parser → Normalizer → Storage → Extension → Webview UI
```

Do not merge these responsibilities together for convenience. Each layer has a single job:

- **Ingestion**: watches the filesystem, tails JSONL files incrementally.
- **Parser**: converts raw JSONL lines into typed objects, tolerant of incomplete/truncated data.
- **Normalizer**: maps raw parsed objects into the versioned span schema. Isolates the rest of the app from Antigravity's raw log shape.
- **Storage**: SQLite access. Tables: `spans`, `tool_calls`, `file_access`.
- **Extension**: VS Code extension host. Owns the collector lifecycle and bridges data to the webview via `postMessage`.
- **Webview UI**: React + Vite. Renders the timeline and related views.

If architecture changes become necessary, explain the reasoning before making them.

## Avoid Overengineering

Do not solve problems that do not yet exist. Avoid adding:

- Configuration systems
- Plugin systems
- Authentication
- Telemetry or analytics
- Cloud synchronization
- Feature flags
- Dependency injection frameworks
- Unnecessary abstraction layers

unless they are explicitly required by the current milestone.

Choose the simplest implementation that satisfies the specification.

## Milestone Discipline

Each milestone should be completed independently. For every milestone:

1. Implement the feature.
2. Verify correctness.
3. Fix discovered issues.
4. Ensure no regressions.
5. Update documentation.
6. Stop before moving to the next milestone.

Do not begin a future milestone until the current one is complete.

## Data Source Rules

- Always parse `transcript_full.jsonl`, never `transcript.jsonl`.
- `step_index` is the ordering source of truth — do not invent a separate sequencing scheme.
- The collector must tail files incrementally (track byte offsets), never re-read the whole file.
- Tolerate incomplete final lines (retry on next read, never crash or drop data).
- Handle `truncated_fields` gracefully — treat truncated content as valid but incomplete.
- Support multiple simultaneous conversations under `brain/`.
- Auto-detect new conversation folders without requiring a restart.

## File Path Extraction — Confirmed Tool Mapping

When extracting `target_file` from tool calls, use these confirmed argument keys:

| Tool Name | Path Argument Key |
|---|---|
| `view_file` | `AbsolutePath` |
| `write_to_file` | `TargetFile` |
| `replace_file_content` | `TargetFile` |
| `multi_replace_file_content` | `TargetFile` |
| `grep_search` | `SearchPath` |
| `list_dir` | `DirectoryPath` |

## UI Philosophy

- Information density over decoration.
- Every animation should communicate state, not decorate.
- Keyboard-first interactions where practical.
- Minimal clicks to inspect information.
- Consistent spacing and resizable layouts.
- Fast rendering — use virtualization for large datasets.
- Respect VS Code themes via CSS variables (`--vscode-*`).
- Avoid unnecessary visual noise.

## Technology Constraints

### MVP Only (do not add until their corresponding roadmap phase)
- Monaco Editor / Monaco Diff Editor → Phase 2
- React Flow → Phase 3
- Zustand → Phase 3
- Recharts → Phase 4
- Framer Motion → Phase 5
- Fuse.js / TanStack Query → Phase 6+

### MVP Tech Stack
- TypeScript (strict)
- better-sqlite3 (storage)
- chokidar (file watching)
- React + Vite (webview)
- shadcn/ui (components)
- react-resizable-panels (layout)
- @tanstack/react-virtual (virtualization)
- VS Code theme CSS variables (styling)

## Token/Cost Tracking

Token counts, cache statistics, and cost/usage data are confirmed NOT present in the transcript logs. Do not attempt to build cost dashboards or token counters from this data source.

## Final Principle

When multiple valid implementations exist, choose the one that minimizes long-term maintenance rather than the one requiring the fewest lines of code. Prefer clarity over cleverness. Prefer explicitness over magic. Optimize for another engineer reading this project six months from now.
