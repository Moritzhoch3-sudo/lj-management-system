/**
 * Central Access Code Guard for Landjugend Scheuring Vorstands-Zentrale
 * Protects the entire application behind a shared board-member access code.
 */
import { StorageEngine, escapeHTML } from '../storage.js';

const CENTRAL_AUTH_KEY = 'lj_central_unlocked';
const CENTRAL_REMEMBER_KEY = 'lj_central_remember';

export class AppAuth {
    static isCentralUnlocked() {
        return sessionStorage.getItem(CENTRAL_AUTH_KEY) === 'true' || 
               localStorage.getItem(CENTRAL_REMEMBER_KEY) === 'true';
    }

    static lockCentral(containerEl, onUnlockedCallback) {
        sessionStorage.removeItem(CENTRAL_AUTH_KEY);
        localStorage.removeItem(CENTRAL_REMEMBER_KEY);

        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'none';

        this.renderCentralLockScreen(containerEl || document.body, onUnlockedCallback);
    }

    static renderCentralLockScreen(containerEl, onUnlockedCallback) {
        // Remove existing lock screens if any
        const existing = document.getElementById('central-lock-screen-root');
        if (existing) existing.remove();

        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'none';

        const lockRoot = document.createElement('div');
        lockRoot.id = 'central-lock-screen-root';
        lockRoot.style.cssText = `
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            z-index: 100000;
            background: radial-gradient(circle at 50% 30%, #143725 0%, #0c2016 60%, #06110b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            box-sizing: border-box;
            overflow-y: auto;
            font-family: 'Plus Jakarta Sans', sans-serif;
        `;

        lockRoot.innerHTML = `
            <div class="central-lock-card" style="max-width: 440px; width: 100%; background: #ffffff; border-radius: 24px; padding: 2.75rem 2.25rem; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45); text-align: center; border: 1px solid rgba(255,255,255,0.2); animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <!-- Official Scheuring Coat of Arms -->
                <div style="margin-bottom: 1.25rem;">
                    <img src="assets/wappen_scheuring.png" alt="Wappen Scheuring" style="width: 76px; height: 90px; object-fit: contain; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15));" />
                </div>

                <h1 style="font-size: 1.55rem; font-weight: 900; color: #0f172a; margin: 0 0 0.4rem; letter-spacing: -0.02em;">Landjugend Scheuring e.V.</h1>
                <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 800; font-size: 0.76rem; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1.15rem;">
                    <span>🔒</span> <span>Vorstands-Zentrale geschützt</span>
                </div>

                <p style="font-size: 0.9rem; color: #64748b; line-height: 1.5; margin: 0 0 1.75rem;">
                    Dieser Bereich ist verschlüsselt. Bitte gib den Vorstand-Zugangscode ein, um Zugriff auf die Zentrale zu erhalten.
                </p>

                <form id="central-unlock-form" autocomplete="off">
                    <!-- Anti-Bot Honeypot Field (Invisible to Humans) -->
                    <input type="text" name="website_verification_trap" id="central-bot-trap" value="" style="display:none !important; position:absolute; left:-9999px;" tabindex="-1" autocomplete="off" />

                    <div style="margin-bottom: 1.25rem; text-align: left;">
                        <label for="central-code-input" style="display: block; font-size: 0.8rem; font-weight: 800; color: #334155; margin-bottom: 0.4rem;">
                            Zentraler Vorstand-Zugangscode:
                        </label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <input 
                                type="password" 
                                id="central-code-input" 
                                class="form-control" 
                                required 
                                autofocus 
                                placeholder="Zugangscode eingeben..." 
                                style="width: 100%; padding: 0.8rem 2.8rem 0.8rem 1rem; font-size: 1.05rem; font-weight: 700; border: 2px solid #e2e8f0; border-radius: 12px; transition: border-color 0.2s; outline: none; box-sizing: border-box;" 
                            />
                            <button 
                                type="button" 
                                id="toggle-code-visibility-btn" 
                                style="position: absolute; right: 10px; background: none; border: none; font-size: 1.15rem; cursor: pointer; color: #94a3b8; padding: 4px;"
                                title="Code einblenden / ausblenden"
                            >
                                👁️
                            </button>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: flex-start; gap: 0.5rem; margin-bottom: 1.5rem; text-align: left;">
                        <input type="checkbox" id="central-remember-me" style="width: 17px; height: 17px; cursor: pointer; accent-color: #10b981;" />
                        <label for="central-remember-me" style="font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer; user-select: none;">
                            Auf diesem Gerät angemeldet bleiben
                        </label>
                    </div>

                    <div id="central-code-error" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.6rem 0.85rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700; margin-bottom: 1.25rem;">
                        ⚠️ Falscher Zugangscode! Nur für die Vorstandschaft.
                    </div>

                    <button 
                        type="submit" 
                        id="central-unlock-submit-btn" 
                        style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 800; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: transform 0.15s ease, box-shadow 0.15s ease;"
                    >
                        🔓 Zentrale freischalten
                    </button>
                </form>

                <div style="margin-top: 1.5rem; border-top: 1px solid #f1f5f9; padding-top: 1rem; font-size: 0.74rem; color: #94a3b8; line-height: 1.4;">
                    🛡️ Verschlüsselte Vorstands-Zentrale der Landjugend Scheuring e.V.
                </div>
            </div>
        `;

        containerEl.appendChild(lockRoot);

        const form = lockRoot.querySelector('#central-unlock-form');
        const codeInput = lockRoot.querySelector('#central-code-input');
        const errorEl = lockRoot.querySelector('#central-code-error');
        const rememberCheckbox = lockRoot.querySelector('#central-remember-me');
        const toggleBtn = lockRoot.querySelector('#toggle-code-visibility-btn');
        const submitBtn = lockRoot.querySelector('#central-unlock-submit-btn');
        const botTrapInput = lockRoot.querySelector('#central-bot-trap');
        const renderTime = Date.now();

        // Immediate autofocus
        setTimeout(() => codeInput?.focus(), 80);

        // Toggle code visibility
        toggleBtn?.addEventListener('click', () => {
            if (codeInput.type === 'password') {
                codeInput.type = 'text';
                toggleBtn.textContent = '🙈';
            } else {
                codeInput.type = 'password';
                toggleBtn.textContent = '👁️';
            }
        });

        // Submit Handler
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Anti-Bot Protection: Honeypot & Timing Check
            if ((botTrapInput && botTrapInput.value) || (Date.now() - renderTime < 250)) {
                errorEl.textContent = '⚠️ Automatisierte Anfrage abgewiesen (Bot-Schutz).';
                errorEl.style.display = 'block';
                return;
            }

            const inputVal = (codeInput.value || '').trim();
            if (!inputVal) return;

            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Prüfe Code...';
            errorEl.style.display = 'none';

            const isValid = await StorageEngine.verifyCentralAccessCode(inputVal);

            if (isValid) {
                sessionStorage.setItem(CENTRAL_AUTH_KEY, 'true');
                if (rememberCheckbox && rememberCheckbox.checked) {
                    localStorage.setItem(CENTRAL_REMEMBER_KEY, 'true');
                } else {
                    localStorage.removeItem(CENTRAL_REMEMBER_KEY);
                }

                submitBtn.textContent = '✅ Freigeschaltet!';
                submitBtn.style.background = '#059669';

                setTimeout(() => {
                    lockRoot.remove();
                    if (onUnlockedCallback) onUnlockedCallback();
                }, 300);
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = '🔓 Zentrale freischalten';
                errorEl.style.display = 'block';
                codeInput.style.borderColor = '#ef4444';
                codeInput.focus();
                codeInput.select();
            }
        });
    }

    /**
     * "Wer bist du?" Post-Login Modal
     * Directly asks which board member is accessing the Vorstands-Zentrale
     */
    static promptUserSelection(containerEl, onSelectedCallback) {
        const existing = document.getElementById('user-selection-modal-root');
        if (existing) existing.remove();

        const members = StorageEngine.getMembers();
        const currentUserId = StorageEngine.getCurrentUserId();

        const modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'user-selection-modal-root';
        modalBackdrop.style.cssText = `
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            z-index: 100001;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            box-sizing: border-box;
            overflow-y: auto;
            font-family: 'Plus Jakarta Sans', sans-serif;
            animation: fadeIn 0.2s ease-out;
        `;

        modalBackdrop.innerHTML = `
            <div class="user-selection-card" style="max-width: 680px; width: 100%; background: #ffffff; border-radius: 24px; padding: 2.25rem 2rem; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4); text-align: center; border: 1px solid rgba(255,255,255,0.6); animation: fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 1.75rem; box-shadow: 0 8px 18px rgba(16, 185, 129, 0.35); margin-bottom: 1rem;">
                    👋
                </div>
                <h2 style="font-size: 1.55rem; font-weight: 900; color: #0f172a; margin: 0 0 0.4rem; letter-spacing: -0.02em;">
                    Wer bist du?
                </h2>
                <p style="font-size: 0.92rem; color: #64748b; line-height: 1.5; margin: 0 0 1.5rem;">
                    Bitte wähle dein Vorstands-Profil aus, um an der Zentrale zu arbeiten:
                </p>

                <div id="user-selection-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; max-height: 52vh; overflow-y: auto; padding: 0.25rem; margin-bottom: 0.5rem;">
                    ${members.map(m => `
                        <button type="button" class="user-select-tile" data-member-id="${m.id}" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.9rem; background: ${m.id === currentUserId ? '#ecfdf5' : '#f8fafc'}; border: 2px solid ${m.id === currentUserId ? '#10b981' : '#e2e8f0'}; border-radius: 14px; cursor: pointer; text-align: left; transition: all 0.15s ease; outline: none; width: 100%;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: ${m.color}20; color: ${m.color}; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0; border: 1.5px solid ${m.color}44;">
                                ${m.avatar || '👤'}
                            </div>
                            <div style="overflow: hidden; flex: 1;">
                                <div style="font-weight: 800; font-size: 0.88rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${escapeHTML(m.name)}
                                </div>
                                <div style="font-size: 0.74rem; font-weight: 700; color: ${m.color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${escapeHTML(m.role)}
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        (containerEl || document.body).appendChild(modalBackdrop);

        modalBackdrop.querySelectorAll('.user-select-tile[data-member-id]').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.borderColor = '#10b981';
                btn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.15)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'none';
                const isCur = btn.dataset.memberId === StorageEngine.getCurrentUserId();
                btn.style.borderColor = isCur ? '#10b981' : '#e2e8f0';
                btn.style.boxShadow = 'none';
            });
            btn.addEventListener('click', (e) => {
                const memberId = e.currentTarget.dataset.memberId;
                const member = members.find(m => m.id === memberId);
                StorageEngine.setCurrentUserId(memberId);

                modalBackdrop.style.transition = 'opacity 0.2s ease-out';
                modalBackdrop.style.opacity = '0';
                setTimeout(() => {
                    modalBackdrop.remove();
                    if (onSelectedCallback) onSelectedCallback(member);
                }, 200);
            });
        });
    }
}
