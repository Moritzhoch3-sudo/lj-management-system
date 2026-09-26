/**
 * Central Access Code Guard for Landjugend Scheuring Vorstands-Zentrale
 * Protects the entire application behind a shared board-member access code.
 */
import { StorageEngine, escapeHTML } from '../storage.js';

const CENTRAL_AUTH_KEY = 'lj_central_unlocked';
const CENTRAL_REMEMBER_KEY = 'lj_central_remember';
const AUTH_VERSION_KEY = 'lj_auth_v44_reset';

export class AppAuth {
    static isCentralUnlocked() {
        if (localStorage.getItem(AUTH_VERSION_KEY) !== 'v44') {
            sessionStorage.removeItem(CENTRAL_AUTH_KEY);
            localStorage.removeItem(CENTRAL_REMEMBER_KEY);
            localStorage.setItem(AUTH_VERSION_KEY, 'v44');
            return false;
        }
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
                    Dieser Bereich ist verschlüsselt. Bitte gib das Vorstands-Passwort ein, um Zugriff auf die Zentrale und das Dashboard zu erhalten.
                </p>

                <form id="central-unlock-form" autocomplete="off">
                    <!-- Anti-Bot Honeypot Field (Invisible to Humans) -->
                    <input type="text" name="website_verification_trap" id="central-bot-trap" value="" style="display:none !important; position:absolute; left:-9999px;" tabindex="-1" autocomplete="off" />

                    <div style="margin-bottom: 1.25rem; text-align: left;">
                        <label for="central-code-input" style="display: block; font-size: 0.8rem; font-weight: 800; color: #334155; margin-bottom: 0.4rem;">
                            Vorstands-Passwort (Buchstaben & Zahlen):
                        </label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <input 
                                type="password" 
                                id="central-code-input" 
                                class="form-control" 
                                required 
                                autofocus 
                                placeholder="Passwort eingeben..." 
                                style="width: 100%; padding: 0.8rem 2.8rem 0.8rem 1rem; font-size: 1.05rem; font-weight: 700; border: 2px solid #e2e8f0; border-radius: 12px; transition: border-color 0.2s; outline: none; box-sizing: border-box;" 
                            />
                            <button 
                                type="button" 
                                id="toggle-code-visibility-btn" 
                                style="position: absolute; right: 10px; background: none; border: none; font-size: 1.15rem; cursor: pointer; color: #94a3b8; padding: 4px;"
                                title="Passwort einblenden / ausblenden"
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
                        ⚠️ Falsches Vorstands-Passwort! Nur für die Vorstandschaft.
                    </div>

                    <button 
                        type="submit" 
                        id="central-unlock-submit-btn" 
                        style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 800; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: transform 0.15s ease, box-shadow 0.15s ease;"
                    >
                        🔓 Zentrale freischalten
                    </button>

                    <div style="margin-top: 1.15rem; text-align: center;">
                        <button 
                            type="button" 
                            id="central-forgot-pw-btn" 
                            style="background: none; border: none; color: #64748b; font-size: 0.85rem; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 4px;"
                        >
                            Passwort vergessen?
                        </button>
                    </div>
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
        let failedAttempts = 0;
        let lockoutUntil = 0;

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

            // Rate Limit Lockout Check
            const now = Date.now();
            if (now < lockoutUntil) {
                const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
                errorEl.textContent = `⚠️ Zu viele Fehlversuche. Bitte warten Sie ${remainingSec} Sekunden.`;
                errorEl.style.display = 'block';
                return;
            }

            // Anti-Bot Protection: Honeypot & Timing Check
            if ((botTrapInput && botTrapInput.value) || (now - renderTime < 250)) {
                errorEl.textContent = '⚠️ Automatisierte Anfrage abgewiesen (Bot-Schutz).';
                errorEl.style.display = 'block';
                return;
            }

            const inputVal = (codeInput.value || '').trim();
            if (!inputVal) return;

            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Prüfe Code...';
            errorEl.style.display = 'none';

            // Progressive delay against brute force
            if (failedAttempts > 0) {
                await new Promise(r => setTimeout(r, Math.min(failedAttempts * 300, 2000)));
            }

            const isValid = await StorageEngine.verifyCentralAccessCode(inputVal);

            if (isValid) {
                failedAttempts = 0;
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
                failedAttempts++;
                submitBtn.disabled = false;
                submitBtn.textContent = '🔓 Zentrale freischalten';

                if (failedAttempts >= 5) {
                    const lockDuration = failedAttempts >= 8 ? 60000 : 30000;
                    lockoutUntil = Date.now() + lockDuration;
                    errorEl.textContent = `⚠️ Zu viele Fehlversuche! Zugang für ${lockDuration / 1000} Sekunden gesperrt.`;
                } else {
                    errorEl.textContent = `⚠️ Falscher Zugangscode! Nur für die Vorstandschaft. (Versuch ${failedAttempts}/5)`;
                }

                errorEl.style.display = 'block';
                codeInput.style.borderColor = '#ef4444';
                codeInput.focus();
                codeInput.select();
            }
        });

        // Forgot Password Button Handler
        lockRoot.querySelector('#central-forgot-pw-btn')?.addEventListener('click', () => {
            this.showForgotPasswordModal('central');
        });
    }

    /**
     * Dedicated "Passwort / PIN vergessen?" Modal for both Central Lock and Vault Lock
     */
    static showForgotPasswordModal(context = 'central') {
        const modalId = 'lj-forgot-password-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000000;
            background: rgba(15, 23, 42, 0.78);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            animation: fadeIn 0.2s ease-out;
            font-family: 'Plus Jakarta Sans', sans-serif;
            box-sizing: border-box;
        `;

        const isVault = context === 'vault';
        const title = isVault ? '🛡️ Tresor-PIN vergessen?' : '🔑 Vorstands-Passwort vergessen?';
        const desc = isVault
            ? 'Die Master-PIN für den geschützten Bereich (Kassenbuch, Finanzen, Verträge, Protokolle) wird von den vertretungsberechtigten Vorständen verwaltet.'
            : 'Das zentrale Vorstands-Passwort für die Vorstandszentrale und das Aufgaben-Dashboard wird von der Vorstandschaft verwaltet.';

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 24px; max-width: 480px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.35); overflow: hidden; border: 1px solid rgba(255,255,255,0.3); animation: fadeInScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, ${isVault ? '#d97706 0%, #b45309 100%' : '#059669 0%, #047857 100%'}); color: #ffffff; padding: 1.4rem 1.6rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.7rem;">${isVault ? '🛡️' : '🔑'}</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.01em;">${title}</h3>
                            <span style="font-size: 0.78rem; opacity: 0.9;">Landjugend Scheuring e.V.</span>
                        </div>
                    </div>
                    <button type="button" id="close-forgot-modal-btn" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; font-size: 1.2rem; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s;">✕</button>
                </div>

                <div style="padding: 1.6rem;">
                    <p style="color: #475569; font-size: 0.88rem; line-height: 1.5; margin: 0 0 1.25rem;">
                        ${desc}<br/><br/>
                        Bitte wende dich an eine der folgenden Ansprechpersonen der Vorstandschaft, um das aktuelle Passwort zu erhalten:
                    </p>

                    <!-- Contact Cards -->
                    <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.4rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.65rem 0.9rem;">
                            <div style="display: flex; align-items: center; gap: 0.65rem;">
                                <span style="font-size: 1.35rem;">👱‍♂️</span>
                                <div>
                                    <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b;">Valentin Müllner</div>
                                    <div style="font-size: 0.75rem; color: #059669; font-weight: 700;">1. Vorstand</div>
                                </div>
                            </div>
                            <span style="font-size: 0.78rem; font-weight: 700; color: #64748b;">Vorstandschaft</span>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.65rem 0.9rem;">
                            <div style="display: flex; align-items: center; gap: 0.65rem;">
                                <span style="font-size: 1.35rem;">👩‍💻</span>
                                <div>
                                    <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b;">Anja Löb</div>
                                    <div style="font-size: 0.75rem; color: #d97706; font-weight: 700;">1. Kassier</div>
                                </div>
                            </div>
                            <span style="font-size: 0.78rem; font-weight: 700; color: #64748b;">Kassenführung</span>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.65rem 0.9rem;">
                            <div style="display: flex; align-items: center; gap: 0.65rem;">
                                <span style="font-size: 1.35rem;">👨‍💻</span>
                                <div>
                                    <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b;">Moritz Kubik</div>
                                    <div style="font-size: 0.75rem; color: #16a34a; font-weight: 700;">2. Kassier / System</div>
                                </div>
                            </div>
                            <span style="font-size: 0.78rem; font-weight: 700; color: #64748b;">System & Kasse</span>
                        </div>
                    </div>

                    <!-- Master Recovery Accordion -->
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 1.15rem;">
                        <details style="cursor: pointer;">
                            <summary style="font-weight: 800; font-size: 0.82rem; color: #64748b; user-select: none;">
                                ⚡ Notfall-Wiederherstellung (Master-Code)
                            </summary>
                            <div style="margin-top: 0.75rem; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 0.85rem;">
                                <p style="font-size: 0.78rem; color: #92400e; margin: 0 0 0.6rem; line-height: 1.4;">
                                    Berechtigte Vorstände können mit dem Master-Wiederherstellungscode den Zugang sofort freischalten bzw. das Passwort auf den Standardwert zurücksetzen.
                                </p>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <input type="password" id="master-recovery-input" placeholder="Master-Code eingeben..." style="flex: 1; min-width: 150px; padding: 0.5rem 0.75rem; font-size: 0.88rem; font-weight: 700; border: 1.5px solid #fde68a; border-radius: 8px; outline: none;" />
                                    <button type="button" id="master-recovery-submit-btn" style="padding: 0.5rem 0.9rem; font-size: 0.82rem; font-weight: 800; background: #d97706; color: #ffffff; border: none; border-radius: 8px; cursor: pointer;">
                                        Freischalten
                                    </button>
                                </div>
                                <div id="master-recovery-feedback" style="display: none; font-size: 0.8rem; font-weight: 700; margin-top: 0.5rem;"></div>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-forgot-modal-btn')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Master Recovery Execution
        modal.querySelector('#master-recovery-submit-btn')?.addEventListener('click', async () => {
            const inputEl = modal.querySelector('#master-recovery-input');
            const feedbackEl = modal.querySelector('#master-recovery-feedback');
            const code = (inputEl?.value || '').trim();

            if (!code) return;

            if (code === '2026' || code === 'LJ-2026') {
                if (feedbackEl) {
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.color = '#059669';
                    feedbackEl.textContent = '✅ Master-Code bestätigt! Setze Standard-Passwort aktiv...';
                }

                if (isVault) {
                    sessionStorage.setItem('backend_vault_token', 'master_session_' + Date.now());
                    document.body.classList.add('vault-unlocked');
                    setTimeout(() => {
                        modal.remove();
                        window.location.reload();
                    }, 500);
                } else {
                    await StorageEngine.resetCentralAccessCodeToDefault();
                    sessionStorage.setItem(CENTRAL_AUTH_KEY, 'true');
                    setTimeout(() => {
                        modal.remove();
                        const lockScreen = document.getElementById('central-lock-screen-root');
                        if (lockScreen) lockScreen.remove();
                        const appLayout = document.querySelector('.app-layout');
                        if (appLayout) appLayout.style.display = 'flex';
                        window.location.reload();
                    }, 500);
                }
            } else {
                if (feedbackEl) {
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.color = '#dc2626';
                    feedbackEl.textContent = '⚠️ Ungültiger Master-Code!';
                }
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
            width: 100%;
            max-width: 100vw;
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
            overflow-x: hidden;
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
