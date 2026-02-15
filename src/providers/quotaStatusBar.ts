import * as vscode from 'vscode';
import { QuotaService } from '../services/quotaService';

export class QuotaStatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private quotaService = QuotaService.getInstance();

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'zero-gravity.focusView';
        this.update();

        // Update every minute naturally
        setInterval(() => this.update(), 60000);
    }

    public async update() {
        const enabled = vscode.workspace.getConfiguration('zeroGravity').get('showInStatusBar', true);
        if (!enabled) {
            this.statusBarItem.hide();
            return;
        }

        try {
            const quotas = await this.quotaService.fetchQuotas();
            if (quotas.length > 0) {
                // Calculate Average Percentage
                const totalFraction = quotas.reduce((acc, curr) => acc + (curr.quotaInfo?.remainingFraction ?? 0), 0);
                const avgFraction = totalFraction / quotas.length;
                const perc = Math.round(avgFraction * 100);

                // Lowest percentage for icon warning level
                const minPerc = Math.min(...quotas.map(m => Math.round((m.quotaInfo?.remainingFraction ?? 0) * 100)));

                const icon = minPerc < 20 ? '$(warning)' : '$(rocket)';

                this.statusBarItem.text = `${icon} Avg: ${perc}%`;
                this.statusBarItem.tooltip = `Zero Gravity: Orbital Average ${perc}%\nLowest Model: ${minPerc}%\nClick to open analytics`;

                // Color based on urgency
                if (perc < 20) {
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                } else if (perc < 50) {
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                } else {
                    this.statusBarItem.backgroundColor = undefined;
                }

                this.statusBarItem.show();
            } else {
                this.statusBarItem.hide();
            }
        } catch (e) {
            this.statusBarItem.hide();
        }
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
