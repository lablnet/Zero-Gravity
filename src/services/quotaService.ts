import * as process from 'process';
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
            const isWin = process.platform === 'win32';
            let pid: string = '';
            let commandLine: string = '';

            if (isWin) {
                // Windows approach: Use wmic to get commandline and pid
                // We search for language_server.exe or just language_server
                const { stdout: wmicOut } = await execAsync('wmic process where "name like \'%language_server%\'" get commandline,processid /format:list').catch(() => ({ stdout: '' }));

                // Using /format:list makes it easier to parse:
                // CommandLine=...
                // ProcessId=...
                const lines = wmicOut.split('\n').map(l => l.trim()).filter(l => l !== '');
                const clLine = lines.find(l => l.startsWith('CommandLine='));
                const pidLine = lines.find(l => l.startsWith('ProcessId='));

                if (!clLine || !pidLine) return [];

                commandLine = clLine.substring('CommandLine='.length);
                pid = pidLine.substring('ProcessId='.length);
            } else {
                // Unix approach
                const { stdout: psOut } = await execAsync("ps aux | grep language_server | grep -v grep").catch(() => ({ stdout: '' }));
                const line = psOut.split('\n')[0];
                if (!line) return [];
                pid = line.trim().split(/\s+/)[1];
                commandLine = line;
            }

            // 2. Extract CSRF token
            const csrfMatch = commandLine.match(/--csrf_token\s+([^\s]+)/) || commandLine.match(/--csrf_token=([^\s]+)/);
            const csrf = csrfMatch ? csrfMatch[1] : "";

            // 3. Find the listening port
            let ports: string[] = [];
            if (isWin) {
                const { stdout: netstatOut } = await execAsync(`netstat -ano | findstr LISTENING | findstr ${pid}`).catch(() => ({ stdout: '' }));
                ports = [...new Set(netstatOut.match(/0\.0\.0\.0:(\d+)/g)?.map(p => p.match(/:(\d+)/)![1]))];
                // Also check 127.0.0.1
                const localPorts = netstatOut.match(/127\.0\.0\.1:(\d+)/g)?.map(p => p.match(/:(\d+)/)![1]) || [];
                ports = [...new Set([...ports, ...localPorts])];
            } else {
                const { stdout: lsofOut } = await execAsync(`lsof -nP -a -p ${pid} -iTCP -sTCP:LISTEN`).catch(() => ({ stdout: '' }));
                ports = [...new Set(lsofOut.match(/:(\d+)\s+\(LISTEN\)/g)?.map(p => p.match(/:(\d+)/)![1]))];
            }

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
