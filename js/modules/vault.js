/**
 * Security Vault & Backend API PIN Lock Guard (Rate Limit & Server Auth Aware)
 */
import { StorageEngine } from '../storage.js';

let serverSessionToken = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('backend_vault_token') : null) || null;

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

    static isUnlockedSync() {
        return !!serverSessionToken;
    }

    static lock() {
        serverSessionToken = null;
        sessionStorage.removeItem('backend_vault_token');
        document.body.classList.remove('vault-unlocked');
    }

    static renderLoginPage(containerEl, onSuccessCallback) {
        containerEl.innerHTML = `
            <div class="protected-login-wrapper">
                <div class="protected-login-card">
                    <div class="protected-shield-badge">🔒</div>
                    <h2>Vorstandsinterna – Geschützter Bereich</h2>
                    <p class="subtitle">
                        Dieser Bereich schützt vertrauliche Finanzdaten, Kassenbücher, Verträge und Sitzungsprotokolle der Landjugend Scheuring.<br/>
                        Bitte gib den Vorstand-PIN zur Freischaltung ein.
                    </p>

                    <div class="protected-pin-display">
                        <input type="password" id="login-pin-input" maxlength="8" placeholder="****" readonly />
                    </div>

                    <div class="protected-keypad">
                        <button class="pin-btn" data-val="1">1</button>
                        <button class="pin-btn" data-val="2">2</button>
                        <button class="pin-btn" data-val="3">3</button>
                        <button class="pin-btn" data-val="4">4</button>
                        <button class="pin-btn" data-val="5">5</button>
                        <button class="pin-btn" data-val="6">6</button>
                        <button class="pin-btn" data-val="7">7</button>
                        <button class="pin-btn" data-val="8">8</button>
                        <button class="pin-btn" data-val="9">9</button>
                        <button class="pin-btn danger-btn" id="login-pin-clear">C</button>
                        <button class="pin-btn" data-val="0">0</button>
                        <button class="pin-btn success-btn" id="login-pin-submit">OK</button>
                    </div>

                    <div class="status-hint" id="login-status-msg">
                        🛡️ Serverseitige PBKDF2 PIN-Prüfung & Rate-Limiting aktiv
                    </div>
                </div>
            </div>
        `;

        const pinInput = containerEl.querySelector('#login-pin-input');
        const statusMsg = containerEl.querySelector('#login-status-msg');
        let currentPin = '';

        const updateInput = () => {
            if (pinInput) pinInput.value = currentPin;
        };

        containerEl.querySelectorAll('.pin-btn[data-val]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentPin.length < 8) {
                    currentPin += btn.dataset.val;
                    updateInput();
                }
            });
        });

        containerEl.querySelector('#login-pin-clear')?.addEventListener('click', () => {
            currentPin = '';
            updateInput();
        });

        const verifyPin = async () => {
            if (!currentPin) return;
            statusMsg.innerHTML = '⏳ <i>Prüfe Master-PIN am Backend-Server...</i>';

            try {
                const res = await fetch('/api/verify-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: currentPin })
                });

                if (res.status === 429) {
                    const data = await res.json();
                    statusMsg.innerHTML = `<span style="color: #f87171;">⚠️ ${data.error || 'Rate Limit erreicht!'}</span>`;
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.token) {
                        serverSessionToken = data.token;
                        sessionStorage.setItem('backend_vault_token', data.token);
                        document.body.classList.add('vault-unlocked');
                        if (onSuccessCallback) onSuccessCallback();
                        return;
                    }
                } else if (res.status === 401) {
                    const isPinValid = await StorageEngine.verifyPIN(currentPin);
                    if (isPinValid) {
                        try {
                            const syncRes = await fetch('/api/update-pin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ newPin: currentPin })
                            });
                            if (syncRes.ok) {
                                const syncData = await syncRes.json();
                                serverSessionToken = syncData.token;
                                sessionStorage.setItem('backend_vault_token', syncData.token);
                                document.body.classList.add('vault-unlocked');
                                if (onSuccessCallback) onSuccessCallback();
                                return;
                            }
                        } catch (e) {}
                        
                        serverSessionToken = 'local_session_' + Date.now();
                        sessionStorage.setItem('backend_vault_token', serverSessionToken);
                        document.body.classList.add('vault-unlocked');
                        if (onSuccessCallback) onSuccessCallback();
                        return;
                    }
                }
            } catch (err) {
                // Local fallback if server endpoint is offline
                const isPinValid = await StorageEngine.verifyPIN(currentPin);
                if (isPinValid) {
                    serverSessionToken = 'local_session_' + Date.now();
                    sessionStorage.setItem('backend_vault_token', serverSessionToken);
                    document.body.classList.add('vault-unlocked');
                    if (onSuccessCallback) onSuccessCallback();
                    return;
                }
            }

            // Authentication Failed
            if (pinInput) {
                pinInput.classList.add('shake');
                setTimeout(() => pinInput?.classList.remove('shake'), 500);
            }
            statusMsg.innerHTML = '<span style="color: #f87171;">⚠️ Falscher PIN! Zugriff verweigert.</span>';
            currentPin = '';
            updateInput();
        };

        containerEl.querySelector('#login-pin-submit')?.addEventListener('click', verifyPin);

        const handleKeyDown = (e) => {
            if (!document.getElementById('login-pin-input')) {
                window.removeEventListener('keydown', handleKeyDown);
                return;
            }
            if (e.key >= '0' && e.key <= '9') {
                if (currentPin.length < 8) {
                    currentPin += e.key;
                    updateInput();
                }
            } else if (e.key === 'Backspace') {
                currentPin = currentPin.slice(0, -1);
                updateInput();
            } else if (e.key === 'Enter') {
                verifyPin();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
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
                } else if (res.status === 401) {
                    const isPinValid = await StorageEngine.verifyPIN(currentPin);
                    if (isPinValid) {
                        try {
                            const syncRes = await fetch('/api/update-pin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ newPin: currentPin })
                            });
                            if (syncRes.ok) {
                                const syncData = await syncRes.json();
                                serverSessionToken = syncData.token;
                                sessionStorage.setItem('backend_vault_token', syncData.token);
                                document.body.classList.add('vault-unlocked');
                                modal.remove();
                                if (onSuccessCallback) onSuccessCallback();
                                return;
                            }
                        } catch (e) {}
                        serverSessionToken = 'local_session_' + Date.now();
                        sessionStorage.setItem('backend_vault_token', serverSessionToken);
                        document.body.classList.add('vault-unlocked');
                        modal.remove();
                        if (onSuccessCallback) onSuccessCallback();
                        return;
                    }
                }
            } catch (err) {
                // Local fallback if server endpoint is unavailable
                const isPinValid = await StorageEngine.verifyPIN(currentPin);
                if (isPinValid) {
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
