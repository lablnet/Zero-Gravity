import { exec } from 'child_process';
import { promisify } from 'util';
import { ClientModelConfig } from '../types';

const execAsync = promisify(exec);

export class QuotaService {
    private static instance: QuotaService;

    private constructor() { }

    public static getInstance(): QuotaService {
        if (!QuotaService.instance) {
            QuotaService.instance = new QuotaService();
        }
        return QuotaService.instance;
    }

    public async fetchQuotas(): Promise<ClientModelConfig[]> {
        try {
            // 1. Find the language server process
            const { stdout: psOut } = await execAsync("ps aux | grep language_server | grep -v grep");
            const line = psOut.split('\n')[0];
            if (!line) return [];

            const pid = line.trim().split(/\s+/)[1];

            // 2. Extract CSRF token
            const csrfMatch = line.match(/--csrf_token\s+([^\s]+)/) || line.match(/--csrf_token=([^\s]+)/);
            const csrf = csrfMatch ? csrfMatch[1] : "";

            // 3. Find the listening port
            const { stdout: lsofOut } = await execAsync(`lsof -nP -a -p ${pid} -iTCP -sTCP:LISTEN`);
            const ports = [...new Set(lsofOut.match(/:(\d+)\s+\(LISTEN\)/g)?.map(p => p.match(/:(\d+)/)![1]))];

            for (const port of ports) {
                try {
                    const res = await fetch(`http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetUserStatus`, {
                        method: 'POST',
                        headers: {
                            'X-Codeium-Csrf-Token': csrf,
                            'Connect-Protocol-Version': '1',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            metadata: {
                                ideName: "antigravity",
                                extensionName: "antigravity",
                                locale: "en"
                            }
                        })
                    });

                    if (res.ok) {
                        const data = (await res.json()) as any;
                        return data.userStatus?.cascadeModelConfigData?.clientModelConfigs || [];
                    }
                } catch (err) {
                    console.warn(`Failed to fetch from port ${port}:`, err);
                }
            }
        } catch (e) {
            console.error("QuotaService Error:", e);
        }
        return [];
    }
}
