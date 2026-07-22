# Antigravity Tracer — Feature Backlog (Post-MVP)

## What this document is

This is the consolidated, de-duplicated, and scoped feature backlog for Antigravity Tracer, covering everything beyond the MVP (Timeline, Tool Calls, File Touches) and beyond the already-phased roadmap (Step Inspector, Execution Graph, Heatmap, Replay, Decision Attribution). Paste this into Antigravity alongside the original build spec when picking up new feature work — it explains not just what to build, but the scoping decisions and cautions behind each item, so none of that reasoning needs to be re-derived.

One idea — a Model Recommendation Engine that classifies prompts and suggests which Antigravity model to use — was deliberately excluded from this backlog. It needs data this tool doesn't have (token/context usage, ground-truth task success) and a live LLM classification call, making it a different kind of project with a different cost/infrastructure profile. If it gets built, it should be a separate tool that consumes this one's SQLite data as an input, not a phase of this project.

---

## Group A — Understanding a single session more deeply

### 1. File Evolution View
For any file touched during a session, show every read, write, and rewrite it went through, in order. This is a different *view* over the same file-access data already collected since MVP — not a new data source, just a per-file filter/lens on top of what the Timeline already has.

### 2. File Dependency View
Visualize relationships between files touched in a session — which files import which, and how reads/writes propagated across them. Implement as a second view sharing the same underlying file-access data as the File Evolution View above; don't stand these up as two separately-collected features.

### 3. Causal Navigation
From any Timeline row or file event, jump straight into the Execution Graph centered on that point, showing the chain of steps that led there. Before building new logic, check whether this is genuinely separate from the Execution Graph or just a different entry point into it — if the latter, this is a navigation/UX addition on top of Phase 3, not new backend work.

### 4. Monaco Diff Viewer
Already scoped in Phase 2 (Step Inspector) — included here only as a reminder that every `write_to_file` (and equivalent) event should render as an actual diff, not a raw dump of tool arguments.

---

## Group B — Understanding a session's shape and outliers

### 5. Session Summary
After a session, compute and display: duration, files touched, tools used and their frequency, failed/interrupted steps (see #7), and repeated edits. Build this first — it's the raw stats layer everything in this group depends on.

### 6. Session Insights
On top of Session Summary's raw stats, flag genuinely unusual patterns: repeated edits to the same file, excessive tool usage, large editing bursts. **Caution, carried over from the pacing/duration discussion earlier in this project:** if this surfaces "unusually long reasoning phases," derive that strictly from `created_at` gaps and label it as step duration, not as "the agent thought hard" — a long gap could just as easily mean the user was idle before responding, and the data can't distinguish the two. Same discipline already applied to the `thinking` field and the Execution Graph's naming — don't let this feature quietly reintroduce an overclaim through a different door.

### 7. Failed Step Highlighting
Distinguish failed, cancelled, interrupted, or retried steps from successful ones in the Timeline and Execution Graph, instead of treating every step as uniformly `DONE`. **Verify before building:** grep a few real transcripts — including one where a tool call is known to have errored — to confirm `status` actually carries values other than `DONE` in practice. Don't commit engineering time to this until that's confirmed.

### 8. Thrash / Loop Detection
Detect when the agent repeatedly rewrites the same file, oscillates between versions, or otherwise appears stuck in a loop, using step_index proximity + repeated `target_file` values — a pure pattern-match over data already collected, no new data source needed.

### 9. Tool Usage Statistics
Frequency and distribution of tool calls by name, rendered as a bar chart (not pie — tool names are categories best compared by bar height, and this holds up better as the number of distinct tools grows). Support filtering the Timeline by tool from this same view.

### 10. Session Minimap
A compact, clickable overview of an entire session — one mark per step, color-coded by step type (LLM / tool / write / error) — for jumping to any point in a long trace without scrolling.

---

## Group C — Navigation and day-to-day usability

### 11. Timeline Filters
Filter the Timeline by event type: LLM responses, tool calls, file reads, file writes, errors, user messages.

### 12. Keyboard-First Navigation
`j`/`k` or arrow keys to step through the Timeline, `Enter` to open the Step Inspector, `Esc` to close it — matches the VS Code-native feel already established via theme variables and layout choices.

### 13. Bookmarks & Annotations
Let the user flag specific steps as noteworthy, optionally tagging them (e.g. Bug, Insight, Needs Review), stored locally, surfaced as a filter for quick return to "the moment it figured out the bug" in a long session.

### 14. Multi-Conversation Browser
Browse, search, and switch between past Antigravity sessions from inside the extension, using the `brain/<conversation-id>` folders already being watched.

### 15. Session Comparison
Once the Multi-Conversation Browser and Session Summary both exist, compare two sessions' tool usage, duration, and files touched side by side — e.g. this session vs. a previous session on the same bug. This is a genuinely distinctive angle competitors in this space don't offer, since they compare across users/production traffic, not a single developer's own history.

---

## Group D — Sharing and correctness infrastructure

### 16. Export as Static HTML Report
Generate a self-contained HTML file with a session's Timeline, Execution Graph, and Session Summary — viewable without the live collector running. This is the artifact worth showing in a portfolio review or demo video.

### 17. Git Diff Correlation
Cross-reference files touched during a session against the workspace's actual `git diff` / `git log`, closing the loop from "the agent touched these files" to "here's the real commit it produced." Fully local, no new infrastructure, and a genuinely distinctive feature — nothing else in this space ties agent activity to real version-control outcomes.

### 18. Multi-Window Awareness
Not a user-facing feature — a correctness requirement in the collector. Ensure events from concurrent Antigravity windows or overlapping conversations are correctly associated with the right workspace/session, rather than assuming a single global log.

---

## Already fully specified elsewhere — included here only for completeness

- **Decision Attribution** (Phase 6) — explicit, independently-computed evidence tags per file touch (mentioned in user request / direct tool target / imported by a touched file / referenced in AGENTS.md / referenced in a previous step). Already correctly scoped — do not let it drift back toward a single vague "why" explanation as more features accumulate around it.
- **Workspace Playback / Replay** (Phase 5) — the most ambitious item in the whole project. It depends on Timeline, Execution Graph, and File Evolution View (#1) all already working, since it synchronizes all of them via a scrubber. Build it last, after everything it depends on is independently solid.

---

## Suggested build order for this backlog

Group A and Group B items are mostly independent of each other and can be built in either order once Phases 1–4 (MVP through Heatmap) are done. Group C is cheap, high-value polish that can be layered in incrementally at any point once its dependencies exist (e.g. #15 needs #14). Group D's #16 and #17 are good "showcase" milestones worth prioritizing before a portfolio review or demo; #18 is infrastructure and should happen whenever multi-window use is actually observed, not before.
