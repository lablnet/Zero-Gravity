import * as vscode from 'vscode';
import * as fs from 'fs';
import { QuotaService } from '../services/quotaService';
import { ClientModelConfig } from '../types';

export class QuotaDashboardView implements vscode.WebviewViewProvider {
    public static readonly viewType = 'quota-dashboard';
    private _view?: vscode.WebviewView;
    private quotaService = QuotaService.getInstance();

    constructor(private readonly extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'src', 'media')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'ready':
                case 'refresh': {
                    this.updateDashboard();
                    break;
                }
            }
        });

        // Refresh when view becomes visible (user switches tabs/panels)
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateDashboard();
            }
        });
    }

    public async updateDashboard() {
        if (this._view) {
            const quotas = await this.quotaService.fetchQuotas();
            this._view.webview.postMessage({ type: 'update', data: quotas });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptPath = vscode.Uri.joinPath(this.extensionUri, 'src', 'media', 'dashboard.js');
        const stylePath = vscode.Uri.joinPath(this.extensionUri, 'src', 'media', 'dashboard.css');
        const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'src', 'media', 'dashboard.html');

        const scriptUri = webview.asWebviewUri(scriptPath);
        const styleUri = webview.asWebviewUri(stylePath);

        const nonce = getNonce();
        let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

        // Handling placeholders in the externalized HTML
        html = html.replace(/\${webview.cspSource}/g, webview.cspSource);
        html = html.replace(/\${styleUri}/g, styleUri.toString());
        html = html.replace(/\${scriptUri}/g, scriptUri.toString());
        html = html.replace(/\${nonce}/g, nonce);

        return html;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
