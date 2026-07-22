import * as vscode from 'vscode';
import { join } from 'node:path';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './messaging.js';

export class TracerWebviewProvider {
  private panel: vscode.WebviewPanel | null = null;
  private context: vscode.ExtensionContext;
  private onMessage: (message: WebviewToExtensionMessage) => void;
  private extensionUri: vscode.Uri;

  constructor(context: vscode.ExtensionContext, onMessage: (message: WebviewToExtensionMessage) => void) {
    this.context = context;
    this.onMessage = onMessage;
    this.extensionUri = context.extensionUri;
  }

  public showPanel(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    // The UI build output lives in ../ui/dist relative to the extension root during dev.
    // In a packaged extension, these assets are bundled into 'ui-dist' alongside the extension.
    let uiDistUri = vscode.Uri.joinPath(this.extensionUri, '..', 'ui', 'dist');
    if (this.context.extensionMode === vscode.ExtensionMode.Production) {
      uiDistUri = vscode.Uri.joinPath(this.extensionUri, 'ui-dist');
    }

    this.panel = vscode.window.createWebviewPanel(
      'antigravityTracer',
      'Antigravity Tracer',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [uiDistUri]
      }
    );

    this.panel.webview.html = this.getWebviewContent(uiDistUri);

    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this.onMessage(message),
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(() => {
      this.panel = null;
    }, undefined, this.context.subscriptions);
  }

  public postMessage(message: ExtensionToWebviewMessage): void {
    this.panel?.webview.postMessage(message);
  }

  public isVisible(): boolean {
    return this.panel !== null;
  }

  private getWebviewContent(uiDistUri: vscode.Uri): string {
    const webview = this.panel!.webview;

    // Resolve the built assets from ui/dist/assets/
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(uiDistUri, 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(uiDistUri, 'assets', 'index.css'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https:; font-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval' https:; worker-src blob:; img-src ${webview.cspSource} data: https:;">
  <link rel="stylesheet" href="${styleUri}" crossorigin>
  <title>Antigravity Tracer</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}" crossorigin></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

