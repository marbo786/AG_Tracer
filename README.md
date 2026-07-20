# Antigravity Tracer

Antigravity Tracer is a DevTools panel for AI coding agents. It provides a real-time view into what Antigravity is doing: its step-by-step reasoning, tool calls, file accesses, and timeline of execution.

## Architecture Overview

The system is built as a monorepo containing the following workspaces:

1. **`@ag-tracer/shared`**  
   Contains the single-source-of-truth TypeScript definitions for the data model (`Span`, `ToolCallRecord`, `FileAccessRecord`, `RawStep`, etc.). These types are used strictly across all layers of the stack.

2. **`@ag-tracer/collector`**  
   The ingestion backend. It watches for `transcript_full.jsonl` files in the Antigravity `brain/` directory.  
   - **Parser**: Incrementally reads JSONL files, tolerant of truncated, incomplete, or corrupted lines from ongoing writes.  
   - **Normalizer**: Transforms raw Antigravity execution steps into strongly-typed domain objects.  
   - **Storage**: Uses `better-sqlite3` to persist execution data. Provides fast lookups, deduplication, and ordered retrieval. SQLite is used to enable complex queries (e.g., file access heatmaps, multi-conversation indexing) and persistence across IDE reloads without blowing up memory footprint.

3. **`@ag-tracer/extension`**  
   The VS Code Extension Host layer.  
   - Manages the lifecycle of the `Collector` to ensure "always-on" tracking.  
   - Handles the Webview Panel instance.  
   - Facilitates the messaging protocol (`ExtensionToWebviewMessage`, `WebviewToExtensionMessage`) pushing live `spans:update` events to the frontend.

4. **`@ag-tracer/ui`**  
   The React frontend running inside the VS Code Webview. Built with Vite.  
   - Provides an information-dense, scalable timeline view of agent steps.  
   - Implements performance techniques like list virtualization to handle thousands of trace events fluidly.  
   - Respects native VS Code theming through standard CSS variables.

## Build Requirements

**Native Module Warning:** The `@ag-tracer/collector` workspace depends on `better-sqlite3`. Native compilation is required because it binds to the SQLite C library.

### On Windows
If you encounter `gyp ERR!` during `npm install`, you must install the Visual Studio C++ Build Tools.

1. Install Visual Studio Build Tools.
2. Ensure the "Desktop development with C++" workload is selected.
3. Once installed, run `npm install` again.

*Alternatively, if using a very recent Node.js version (e.g., v24) where prebuilds are not yet available, `node-gyp` requires these tools to compile from source.*

## Building from Source

1. Run `npm install` at the root directory to install all workspace dependencies.
2. Build the shared definitions first:
   ```bash
   npx tsc -b shared
   ```
3. Build the UI:
   ```bash
   npm run build --workspace=ui
   ```
4. Build the extension and collector:
   ```bash
   npx tsc -b collector extension
   ```

## Getting Started

In VS Code, press `F5` to run the Extension. The `Antigravity Tracer` view will become available and will begin tailing `transcript_full.jsonl` files inside `~/.gemini/antigravity/brain/` automatically.
