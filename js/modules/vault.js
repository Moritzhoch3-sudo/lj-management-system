/**
 * Vault Guard: PIN Authentication with Immediate Autofocus & Keyboard Entry
 */
import { StorageEngine } from '../storage.js';

let isVaultUnlocked = false;

export class VaultGuard {
    static isUnlocked() {
        return isVaultUnlocked;
    }

    static lock() {
        isVaultUnlocked = false;
    }

    static renderPinLockPage(containerEl, targetModuleName, onSuccessCallback) {
        containerEl.innerHTML = `
            <div class="vault-pin-viewport d-flex align-items-center justify-content-center p-4" style="min-height: 75vh;">
                <div class="card-glow pin-card text-center" style="max-width: 440px; width: 100%; border: 1px solid rgba(0,135,61,0.35); background: rgba(17, 19, 24, 0.96); box-shadow: 0 15px 40px rgba(0,0,0,0.6); padding: 2.2rem 1.8rem;">
                    
                    <div class="lock-icon-badge mb-3" style="width: 70px; height: 70px; border-radius: 50%; background: rgba(0,135,61,0.15); border: 2px solid #00873D; display: inline-flex; align-items: center; justify-content: center; font-size: 2.2rem; color: #34d399;">
                        🔒
                    </div>

                    <h2 class="mb-1" style="font-size: 1.5rem; font-weight: 800;">Bereichs-Sicherheit</h2>
                    <p class="text-muted mb-4" style="font-size: 0.88rem;">
                        Der Bereich <strong>${targetModuleName}</strong> ist PIN-geschützt.<br>Bitte gib den 4-stelligen Vorstands-PIN ein.
                    </p>

                    <form id="vault-pin-form" autocomplete="off" class="mb-4">
                        <div class="pin-display mb-3">
                            <input type="password" id="pin-input" maxlength="8" placeholder="••••" autofocus autocomplete="off" 
                                   style="width: 100%; text-align: center; font-size: 1.8rem; letter-spacing: 0.4em; padding: 0.6rem; border-radius: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #34d399; font-weight: bold;" />
                        </div>
                        <button type="submit" class="btn btn-emerald btn-glow w-100 mb-3" style="padding: 0.65rem; font-weight: 800;">
                            🔓 Entsperren
                        </button>
                    </form>

                    <div class="pin-keypad mb-4">
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

                    <div class="pin-footer-hint" id="pin-status-msg" style="font-size: 0.85rem; color: var(--text-muted);">
                        🛡️ Geschützte Vereinsinstanz der Landjugend Scheuring
                    </div>
                </div>
            </div>
        `;

        const pinInput = containerEl.querySelector('#pin-input');
        const form = containerEl.querySelector('#vault-pin-form');
        const statusMsg = containerEl.querySelector('#pin-status-msg');

        // Immediate Autofocus on page load
        setTimeout(() => pinInput?.focus(), 50);

        const verify = async () => {
            const val = pinInput.value.trim();
            if (!val) return;

            const isValid = await StorageEngine.verifyPIN(val);
            if (isValid) {
                isVaultUnlocked = true;
                statusMsg.style.color = '#34d399';
                statusMsg.textContent = '✅ PIN korrekt! Bereich wird geöffnet...';
                setTimeout(() => {
                    if (onSuccessCallback) onSuccessCallback();
                }, 300);
            } else {
                statusMsg.style.color = '#ef4444';
                statusMsg.textContent = '⚠️ Falscher PIN-Code! Zugriffsverweigerung.';
                pinInput.value = '';
                pinInput.classList.add('shake');
                setTimeout(() => pinInput.classList.remove('shake'), 500);
                setTimeout(() => pinInput.focus(), 50);
            }
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            verify();
        });

        // Keypad buttons
        containerEl.querySelectorAll('.pin-btn[data-val]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (pinInput.value.length < 8) {
                    pinInput.value += btn.dataset.val;
                    pinInput.focus();
                }
            });
        });

        containerEl.querySelector('#pin-clear')?.addEventListener('click', () => {
            pinInput.value = '';
            pinInput.focus();
        });

        containerEl.querySelector('#pin-submit')?.addEventListener('click', () => {
            verify();
        });
    }
}
