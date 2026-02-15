import * as vscode from 'vscode';
import { QuotaTreeView } from './providers/quotaTreeView';
import { QuotaDashboardView } from './providers/quotaDashboardView';

import { QuotaStatusBar } from './providers/quotaStatusBar';

export function activate(context: vscode.ExtensionContext) {
    // 1. Sidebar Tree View
    const quotaTreeView = new QuotaTreeView();
    vscode.window.registerTreeDataProvider('quota-view', quotaTreeView);

    // 2. Dashboard Webview View
    const dashboardProvider = new QuotaDashboardView(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(QuotaDashboardView.viewType, dashboardProvider)
    );

    // 3. Status Bar
    const statusBar = new QuotaStatusBar();
    context.subscriptions.push(statusBar);

    // 4. Command Registrations
    context.subscriptions.push(
        vscode.commands.registerCommand('zero-gravity.focusView', () => {
            vscode.commands.executeCommand('workbench.view.extension.antigravity-quotas');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('quota-view.refreshEntry', () => {
            quotaTreeView.manualRefresh();
            dashboardProvider.updateDashboard();
            statusBar.update();
        })
    );

    // Listen for config changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('zeroGravity')) {
            statusBar.update();
        }
    }));
}

export function deactivate() { }
