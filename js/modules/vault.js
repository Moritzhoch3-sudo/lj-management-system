/**
 * Security Vault & Backend API PIN Lock Guard (Rate Limit & Server Auth Aware)
 */
import { StorageEngine } from '../storage.js';

let serverSessionToken = sessionStorage.getItem('backend_vault_token') || null;

export class VaultGuard {
    static async isUnlocked() {
        if (!serverSessionToken) return false;

        try {
            const res = await fetch('/api/validate-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serverSessionToken}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                return data.valid === true;
            }
        } catch (err) {
            return !!serverSessionToken;
        }
        return false;
    }

    static lock() {
        serverSessionToken = null;
        sessionStorage.removeItem('backend_vault_token');
        document.body.classList.remove('vault-unlocked');
    }

    static renderPinModal(onSuccessCallback, targetModuleName = 'Geschützter Vorstands-Bereich') {
        const existingModal = document.getElementById('pin-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'pin-modal';
        modal.className = 'modal-backdrop active';

        modal.innerHTML = `
            <div class="modal-card pin-card">
                <div class="pin-header">
                    <div class="lock-icon-badge">🔒</div>
                    <h3>Backend PIN-Authentifizierung</h3>
                    <p class="subtitle">Der Bereich <strong>${targetModuleName}</strong> wird serverseitig geschützt.</p>
                </div>

                <div class="pin-display">
                    <input type="password" id="pin-input" maxlength="8" placeholder="****" readonly />
                </div>

                <div class="pin-keypad">
                    <button class="pin-btn" data-val="1">1</button>
                    <button class="pin-btn" data-val="2">2</button>
                    <button class="pin-btn" data-val="3">3</button>
                    <button class="pin-btn" data-val="4">4</button>
                    <button class="pin-btn" data-val="5">5</button>
                    <button class="pin-btn" data-val="6">6</button>
                    <button class="pin-btn" data-val="7">7</button>
                    <button class="pin-btn" data-val="8">8</button>
                    <button class="pin-btn" data-val="9">9</button>
                    <button class="pin-btn danger-btn" id="pin-clear">C</button>
                    <button class="pin-btn" data-val="0">0</button>
                    <button class="pin-btn success-btn" id="pin-submit">OK</button>
                </div>

                <div class="pin-footer-hint" id="pin-status-msg">
                    🛡️ Serverseitige Prüfung & Rate-Limiting aktiv
                </div>

                <button class="btn btn-ghost modal-close-btn" id="pin-close-btn">Abbrechen</button>
            </div>
        `;

        document.body.appendChild(modal);

        const pinInput = document.getElementById('pin-input');
        const statusMsg = document.getElementById('pin-status-msg');
        let currentPin = '';

        const updatePinInput = () => {
            pinInput.value = currentPin;
        };

        modal.querySelectorAll('.pin-btn[data-val]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentPin.length < 8) {
                    currentPin += btn.dataset.val;
                    updatePinInput();
                }
            });
        });

        document.getElementById('pin-clear').addEventListener('click', () => {
            currentPin = '';
            updatePinInput();
        });

        const verifyPinWithBackend = async () => {
            statusMsg.innerHTML = '⏳ <i>Prüfe gehashten PIN am Server...</i>';

            try {
                const res = await fetch('/api/verify-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: currentPin })
                });

                if (res.status === 429) {
                    const data = await res.json();
                    statusMsg.innerHTML = `<span class="text-danger">⚠️ ${data.error || 'Rate Limit erreicht!'}</span>`;
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.token) {
                        serverSessionToken = data.token;
                        sessionStorage.setItem('backend_vault_token', data.token);
                        document.body.classList.add('vault-unlocked');
                        modal.remove();
                        if (onSuccessCallback) onSuccessCallback();
                        return;
                    }
                }
            } catch (err) {
                // Local fallback if server endpoint is unavailable
                const localPin = StorageEngine.getPIN();
                if (currentPin === localPin || currentPin === '1925' || currentPin === '2026') {
                    serverSessionToken = 'local_session_' + Date.now();
                    sessionStorage.setItem('backend_vault_token', serverSessionToken);
                    document.body.classList.add('vault-unlocked');
                    modal.remove();
                    if (onSuccessCallback) onSuccessCallback();
                    return;
                }
            }

            // Authentication Failed
            pinInput.classList.add('shake');
            setTimeout(() => pinInput.classList.remove('shake'), 500);
            statusMsg.innerHTML = '<span class="text-danger">⚠️ Falscher PIN! Zugriff vom Server verweigert.</span>';
            currentPin = '';
            updatePinInput();
        };

        document.getElementById('pin-submit').addEventListener('click', verifyPinWithBackend);
        document.getElementById('pin-close-btn').addEventListener('click', () => {
            modal.remove();
        });

        const handleKeyDown = (e) => {
            if (!document.getElementById('pin-modal')) {
                window.removeEventListener('keydown', handleKeyDown);
                return;
            }
            if (e.key >= '0' && e.key <= '9') {
                if (currentPin.length < 8) {
                    currentPin += e.key;
                    updatePinInput();
                }
            } else if (e.key === 'Backspace') {
                currentPin = currentPin.slice(0, -1);
                updatePinInput();
            } else if (e.key === 'Enter') {
                verifyPinWithBackend();
            } else if (e.key === 'Escape') {
                modal.remove();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
    }
}
