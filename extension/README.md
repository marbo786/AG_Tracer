# Antigravity Tracer

Antigravity Tracer is a DevTools panel for AI coding agents. It provides a real-time view into what Antigravity is doing: its step-by-step reasoning, tool calls, file accesses, and timeline of execution.

## Installation

You can install the extension directly from the built-in Extensions view in VS Code (it is published on [Open VSX](https://open-vsx.org/extension/marbo786/antigravity-tracer)). Just search for **Antigravity Tracer**.

Alternatively, you can download the `.vsix` file from the [Releases](https://github.com/marbo786/AG_Tracer/releases) page of this repository and install it manually via **Extensions > Install from VSIX...** in VS Code.

## Architecture Overview

The system is built as a monorepo containing the following workspaces:

1. **`@ag-tracer/shared`**  
   Contains the single-source-of-truth TypeScript definitions for the data model (`Span`, `ToolCallRecord`, `FileAccessRecord`, `RawStep`, etc.). These types are used strictly across all layers of the stack.

2. **`@ag-tracer/collector`**  
   The ingestion backend. It watches for `transcript_full.jsonl` files in the Antigravity `brain/` directory.  
   - **Parser**: Incrementally reads JSONL files, tolerant of truncated, incomplete, or corrupted lines from ongoing writes.  
   - **Normalizer**: Transforms raw Antigravity execution steps into strongly-typed domain objects.  
   - **Storage**: Uses `sql.js` (WebAssembly SQLite) to persist execution data. Provides fast lookups, deduplication, and ordered retrieval. SQLite is used to enable complex queries (e.g., file access heatmaps, multi-conversation indexing) and persistence across IDE reloads without blowing up memory footprint, all without requiring native module compilation.

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

## Building from Source

1. Run `npm install` at the root directory to install all workspace dependencies.
2. Build the entire project (shared, ui, collector, and extension) via:
   ```bash
   npm run build:all
   ```

## Getting Started

In VS Code, press `F5` to run the Extension. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **`Antigravity Tracer: Open Antigravity Tracer`**. The panel will open and will begin tailing `transcript_full.jsonl` files inside `~/.gemini/antigravity/brain/` automatically.
