/**
 * Security Vault & PIN Lock Guard
 */
import { StorageEngine } from '../storage.js';

let isUnlocked = false;

export class VaultGuard {
    static isUnlocked() {
        return isUnlocked;
    }

    static lock() {
        isUnlocked = false;
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
                    <h3>Kennwort-Sperre</h3>
                    <p class="subtitle">Der Bereich <strong>${targetModuleName}</strong> ist passwortgeschützt.</p>
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

                <div class="pin-footer-hint">
                    💡 Standard Vorstands-PIN: <code>1925</code> (oder <code>2026</code>)
                </div>

                <button class="btn btn-ghost modal-close-btn" id="pin-close-btn">Abbrechen</button>
            </div>
        `;

        document.body.appendChild(modal);

        const pinInput = document.getElementById('pin-input');
        let currentPin = '';

        const updatePinInput = () => {
            pinInput.value = currentPin;
        };

        modal.querySelectorAll('.pin-btn[data-val]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentPin.length < 6) {
                    currentPin += btn.dataset.val;
                    updatePinInput();
                }
            });
        });

        document.getElementById('pin-clear').addEventListener('click', () => {
            currentPin = '';
            updatePinInput();
        });

        const verifyPin = () => {
            const correctPin = StorageEngine.getPIN();
            if (currentPin === correctPin || currentPin === '2026' || currentPin === '1925') {
                isUnlocked = true;
                document.body.classList.add('vault-unlocked');
                modal.remove();
                if (onSuccessCallback) onSuccessCallback();
            } else {
                pinInput.classList.add('shake');
                setTimeout(() => pinInput.classList.remove('shake'), 500);
                currentPin = '';
                updatePinInput();
                alert('⚠️ Falsche PIN! Zugriff verweigert.');
            }
        };

        document.getElementById('pin-submit').addEventListener('click', verifyPin);
        document.getElementById('pin-close-btn').addEventListener('click', () => {
            modal.remove();
        });

        // Allow physical keyboard entry
        const handleKeyDown = (e) => {
            if (!document.getElementById('pin-modal')) {
                window.removeEventListener('keydown', handleKeyDown);
                return;
            }
            if (e.key >= '0' && e.key <= '9') {
                if (currentPin.length < 6) {
                    currentPin += e.key;
                    updatePinInput();
                }
            } else if (e.key === 'Backspace') {
                currentPin = currentPin.slice(0, -1);
                updatePinInput();
            } else if (e.key === 'Enter') {
                verifyPin();
            } else if (e.key === 'Escape') {
                modal.remove();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
    }
}
