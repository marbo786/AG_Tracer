import * as vscode from 'vscode';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Collector } from '@ag-tracer/collector';
import { TracerWebviewProvider } from './webview-provider.js';
import type { WebviewToExtensionMessage } from './messaging.js';
import { mkdirSync, existsSync } from 'node:fs';

let collector: Collector | null = null;
let webviewProvider: TracerWebviewProvider | null = null;

/**
 * All known Antigravity product directories that contain a `brain/` folder.
 * - "antigravity"     → Antigravity CLI / Antigravity 2.0
 * - "antigravity-ide" → Antigravity IDE (VS Code-based editor)
 */
const KNOWN_BRAIN_PARENTS = ['antigravity', 'antigravity-ide'] as const;

export function activate(context: vscode.ExtensionContext): void {
  const home = homedir();
  
  // Discover all existing brain directories across Antigravity products
  const brainPaths = KNOWN_BRAIN_PARENTS
    .map(parent => join(home, '.gemini', parent, 'brain'))
    .filter(brainPath => {
      const exists = existsSync(brainPath);
      if (exists) {
        console.log(`[AG Tracer] Found brain directory: ${brainPath}`);
      }
      return exists;
    });

  if (brainPaths.length === 0) {
    const searchedPaths = KNOWN_BRAIN_PARENTS
      .map(parent => join(home, '.gemini', parent, 'brain'))
      .join(', ');
    console.warn(`[AG Tracer] No brain directories found. Searched: ${searchedPaths}`);
    vscode.window.showWarningMessage(
      'Antigravity Tracer: No Antigravity data found. Make sure you have used Antigravity CLI or Antigravity IDE at least once.'
    );
  }

  const databasePath = join(context.globalStorageUri.fsPath, 'tracer.db');
  
  // Ensure the storage directory exists before sql.js attempts to write
  mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  
  // Track the currently selected conversation
  let activeConversationId: string | null = null;
  
  // Create the webview provider
  webviewProvider = new TracerWebviewProvider(context, (message: WebviewToExtensionMessage) => {
    handleWebviewMessage(message);
  });
  
  // Start the collector — it begins watching immediately (always-on)
  collector = new Collector(brainPaths, databasePath, {
    onConversationFound: (newConversationId) => {
      // Re-send the full list of known conversations
      if (webviewProvider?.isVisible()) {
        const conversations = collector?.getConversations() ?? [];
        webviewProvider.postMessage({ type: 'conversations:list', conversations });
      }
    },
    onSpansIngested: (conversationId, spans, toolCalls, fileAccesses) => {
      // Push updates to webview if it's showing this conversation
      if (webviewProvider?.isVisible() && conversationId === activeConversationId) {
        webviewProvider.postMessage({
          type: 'spans:update',
          conversationId,
          spans,
          toolCalls,
          fileAccesses
        });
      }
    }
  });
  
  collector.start().catch(error => {
    console.error('Failed to start Antigravity Tracer collector:', error);
  });
  
  // Register the command to open the panel
  const openPanelCommand = vscode.commands.registerCommand(
    'antigravityTracer.openPanel',
    () => {
      webviewProvider?.showPanel();
    }
  );
  
  context.subscriptions.push(openPanelCommand);
  
  function handleWebviewMessage(message: WebviewToExtensionMessage): void {
    switch (message.type) {
      case 'request:conversations': {
        const conversations = collector?.getConversations() ?? [];
        webviewProvider?.postMessage({ type: 'conversations:list', conversations });
        break;
      }
      case 'request:spans': {
        try {
          activeConversationId = message.conversationId;
          const data = collector?.getSpansByConversation(message.conversationId);
          
          if (data) {
            webviewProvider?.postMessage({
              type: 'spans:initial',
              conversationId: message.conversationId,
              ...data
            });
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('[AG Tracer] Error fetching spans:', err);
          webviewProvider?.postMessage({ type: 'error', message: 'Failed to load spans: ' + errorMessage });
          vscode.window.showErrorMessage('Antigravity Tracer: Error fetching spans: ' + errorMessage);
        }
        break;
      }
      case 'select:conversation': {
        activeConversationId = message.conversationId;
        break;
      }
    }
  }
}

export function deactivate(): void {
  collector?.stop();
  collector = null;
}
