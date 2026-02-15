(function() {
    const vscode = acquireVsCodeApi();
    const quotaList = document.getElementById('quota-list');

    // Notify extension we are ready to receive data
    vscode.postMessage({ type: 'ready' });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                renderQuotas(message.data);
                break;
        }
    });

    // Initial refresh request
    window.refresh = function() {
        document.body.classList.add('refreshing');
        vscode.postMessage({ type: 'refresh' });
    };

    function renderQuotas(data) {
        document.body.classList.remove('refreshing');
        if (!data || data.length === 0) {
            quotaList.innerHTML = '<div class="empty-state"><p>No orbital data detected.</p></div>';
            return;
        }

        quotaList.innerHTML = data.map((m, index) => {
            const perc = Math.round((m.quotaInfo?.remainingFraction ?? 0) * 100);
            
            // Premium color palette based on percentages
            let color = '#4facfe'; // Default Blue
            if (perc > 60) color = '#00f2fe'; // Cyan
            else if (perc > 30) color = '#f9d423'; // Warm Yellow
            else color = '#ff0844'; // Hot Red

            const radius = 28;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (perc / 100) * circumference;

            return `
                <div class="card" style="--status-color: ${color}; animation-delay: ${index * 0.1}s">
                    <div class="model-name">${m.label}</div>
                    <div class="quota-details">
                        <svg class="progress-ring">
                            <circle class="progress-ring__background" stroke-width="4" fill="transparent" r="${radius}" cx="32" cy="32"/>
                            <circle class="progress-ring__circle" stroke-width="4" stroke-dasharray="${circumference} ${circumference}" stroke-dashoffset="${offset}" fill="transparent" r="${radius}" cx="32" cy="32"/>
                        </svg>
                        <div class="percentage">${perc}%</div>
                    </div>
                    <div class="reset-info">CYCLE RESET: ${m.quotaInfo?.resetTime || 'PERSISTENT'}</div>
                </div>
            `;
        }).join('');
    }
})();
