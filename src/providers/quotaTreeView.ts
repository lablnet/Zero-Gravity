import * as vscode from 'vscode';
import { QuotaService } from '../services/quotaService';
import { ClientModelConfig } from '../types';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export class QuotaTreeView implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private nextFetchTime = Date.now() + REFRESH_INTERVAL_MS;
    private cachedModels: ClientModelConfig[] = [];
    private quotaService = QuotaService.getInstance();

    constructor() {
        setInterval(() => {
            this._onDidChangeTreeData.fire();
            if (Date.now() >= this.nextFetchTime) {
                this.refresh();
            }
        }, 1000);
    }

    async manualRefresh() {
        await this.refresh();
        this.nextFetchTime = Date.now() + REFRESH_INTERVAL_MS;
    }

    async refresh() {
        try {
            this.cachedModels = await this.quotaService.fetchQuotas();
            this.nextFetchTime = Date.now() + REFRESH_INTERVAL_MS;
        } catch (e) {
            console.error(e);
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem) {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (element) return [];
        if (this.cachedModels.length === 0) await this.refresh();

        const secondsLeft = Math.max(0, Math.floor((this.nextFetchTime - Date.now()) / 1000));
        const timerItem = new vscode.TreeItem(`Next check in: ${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`);
        timerItem.iconPath = new vscode.ThemeIcon('watch');

        const modelItems = this.cachedModels.map(m => {
            const perc = Math.round((m.quotaInfo?.remainingFraction ?? 0) * 100);
            const item = new vscode.TreeItem(m.label);
            item.description = `${perc}% remaining`;

            const filled = Math.round(perc / 10);
            item.tooltip = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${perc}%\nResets: ${m.quotaInfo?.resetTime || 'N/A'}`;

            const color = perc > 50 ? 'charts.green' : (perc > 20 ? 'charts.yellow' : 'charts.red');
            const icon = perc > 50 ? 'check' : (perc > 20 ? 'warning' : 'error');

            item.iconPath = new vscode.ThemeIcon(icon, new vscode.ThemeColor(color));
            return item;
        });

        return [timerItem, ...modelItems];
    }
}
