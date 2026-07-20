import * as vscode from 'vscode';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Collector } from '@ag-tracer/collector';
import { TracerWebviewProvider } from './webview-provider.js';
import type { WebviewToExtensionMessage } from './messaging.js';

let collector: Collector | null = null;
let webviewProvider: TracerWebviewProvider | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const brainPath = join(homedir(), '.gemini', 'antigravity', 'brain');
  const databasePath = join(context.globalStorageUri.fsPath, 'tracer.db');
  
  // Ensure the storage directory exists
  vscode.workspace.fs.createDirectory(context.globalStorageUri);
  
  // Track the currently selected conversation
  let activeConversationId: string | null = null;
  
  // Create the webview provider
  webviewProvider = new TracerWebviewProvider(context, (message: WebviewToExtensionMessage) => {
    handleWebviewMessage(message);
  });
  
  // Start the collector — it begins watching immediately (always-on)
  collector = new Collector(brainPath, databasePath, {
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
        const conversationIds = collector?.getConversationIds() ?? [];
        webviewProvider?.postMessage({ type: 'conversations:list', conversationIds });
        break;
      }
      case 'request:spans': {
        activeConversationId = message.conversationId;
        const data = collector?.getSpansByConversation(message.conversationId);
        if (data) {
          webviewProvider?.postMessage({
            type: 'spans:initial',
            conversationId: message.conversationId,
            ...data
          });
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
