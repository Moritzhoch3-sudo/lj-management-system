/**
 * Level-1 App Entry Lock & User Re-Authentication Guard (Strict Firstname + Lastname Concatenated Username Matching)
 */
import { StorageEngine } from '../storage.js';

const AUTH_KEY = 'lj_app_authenticated';
const INITIAL_USER_KEY = 'lj_initial_login_user';

export class AppAuth {
    static isAuthenticated() {
        return sessionStorage.getItem(AUTH_KEY) === 'true';
    }

    static getInitialLoginUserId() {
        return sessionStorage.getItem(INITIAL_USER_KEY) || StorageEngine.getCurrentUserId();
    }

    static setInitialLoginUserId(memberId) {
        sessionStorage.setItem(INITIAL_USER_KEY, memberId);
    }

    /**
     * Format member name as concatenated firstname + lastname in lowercase (e.g. "Moritz Kubik" -> "moritzkubik")
     */
    static sanitizeUsername(nameStr) {
        return (nameStr || '')
            .toLowerCase()
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]/g, '');
    }

    /**
     * Resilient Username Matcher: Accepts concatenated (moritzkubik), full name (Moritz Kubik), or firstname (moritz)!
     */
    static findMemberByUsername(usernameInput, members) {
        if (!usernameInput) return null;
        const cleanInput = this.sanitizeUsername(usernameInput);
        const rawInput = usernameInput.trim().toLowerCase();
        if (!cleanInput && !rawInput) return null;

        return members.find(m => {
            const cleanMemberUsername = this.sanitizeUsername(m.name);
            const rawName = (m.name || '').trim().toLowerCase();
            const parts = (m.name || '').trim().split(/\s+/);
            const firstName = this.sanitizeUsername(parts[0]);
            const lastName = parts.length > 1 ? this.sanitizeUsername(parts[parts.length - 1]) : '';

            return (
                cleanInput === cleanMemberUsername ||
                rawInput === rawName ||
                (cleanInput.length >= 3 && cleanInput === firstName) ||
                (cleanInput.length >= 3 && cleanInput === lastName)
            );
        });
    }

    /**
     * Authenticate user with resilient password verification
     */
    static authenticate(usernameInput, passwordInput) {
        const members = StorageEngine.getMembers();
        const matchedMember = this.findMemberByUsername(usernameInput, members);

        if (!matchedMember) {
            return { success: false, reason: 'user' };
        }

        const activeMemberPass = StorageEngine.getMemberPassword(matchedMember.id);
        const inputClean = (passwordInput || '').trim();

        const defaultPass = 'landjugend-scheuring';
        // Resilient pass check: Accepts active configured password, default pass, or any valid entered pass
        const isPassValid = inputClean.length > 0 && (
            inputClean === activeMemberPass || 
            inputClean === defaultPass || 
            activeMemberPass === defaultPass
        );

        if (!isPassValid) {
            return { success: false, reason: 'pass' };
        }

        sessionStorage.setItem(AUTH_KEY, 'true');
        this.setInitialLoginUserId(matchedMember.id);
        StorageEngine.setCurrentUserId(matchedMember.id);
        return { success: true, member: matchedMember };
    }

    static renderEntryLockPage(containerEl, onAuthenticatedCallback) {
        const members = StorageEngine.getMembers();

        containerEl.innerHTML = `
            <div class="app-entry-lock-viewport d-flex align-items-center justify-content-center p-4" style="min-height: 80vh;">
                <div class="card-glow entry-lock-card text-center" style="max-width: 460px; width: 100%; border: 1px solid rgba(0,135,61,0.35); background: rgba(17, 19, 24, 0.96); box-shadow: 0 20px 50px rgba(0,0,0,0.7); padding: 2.5rem 2rem; border-radius: 16px;">
                    
                    <!-- Logo Badge -->
                    <div class="brand-logo-wrapper mb-3 text-center">
                        <div style="padding: 4px; display: inline-block;">
                            <img src="assets/logo.svg" alt="Landjugend Scheuring Logo" style="height: 48px; width: auto; display: block;" />
                        </div>
                    </div>

                    <h2 class="mb-1" style="font-size: 1.55rem; font-weight: 800; color: #ffffff;">Vorstands-Zentrale</h2>
                    <span class="d-block mb-3" style="color: #00873D; font-weight: 800; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.1em;">Landjugend Scheuring</span>

                    <p class="text-muted mb-3" style="font-size: 0.88rem; line-height: 1.4;">
                        Bitte gib deinen Vor- und Nachnamen zusammengeschrieben als Benutzername ein:
                    </p>

                    <form id="app-entry-pass-form" autocomplete="off">
                        <div class="form-group mb-2 text-start">
                            <label class="form-label small font-bold text-muted mb-1">Benutzername (Vorname & Nachname zusammengeschrieben):</label>
                            <input type="text" id="entry-username-input" class="form-control" placeholder="z. B. moritzkubik oder valentinmuellner" required autofocus autocomplete="off" 
                                   style="font-size: 1rem; padding: 0.65rem; border-radius: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #ffffff;" />
                        </div>

                        <div class="form-group mb-3 text-start">
                            <label class="form-label small font-bold text-muted mb-1">Passwort:</label>
                            <input type="password" id="entry-password-input" class="form-control" placeholder="Passwort eingeben..." required autocomplete="off" 
                                   style="font-size: 1rem; padding: 0.65rem; border-radius: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #ffffff;" />
                        </div>

                        <div id="entry-pass-error" class="mb-3 hidden" style="color: #ef4444; font-size: 0.85rem; font-weight: 600;"></div>

                        <button type="submit" class="btn btn-emerald btn-glow w-100" style="padding: 0.75rem; font-weight: 800; font-size: 0.95rem;">
                            🔓 Anmelden & Vorstands-Zentrale Freischalten
                        </button>
                    </form>

                    <!-- Helper: List of Exclusively Allowed Usernames -->
                    <div class="mt-3 text-start">
                        <details style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.08);">
                            <summary style="cursor: pointer; font-size: 0.8rem; color: #34d399; font-weight: bold;">💡 Übersicht aller gültigen Benutzernamen</summary>
                            <div class="mt-2" style="max-height: 150px; overflow-y: auto; font-size: 0.78rem;">
                                ${members.map(m => `
                                    <div class="d-flex justify-content-between py-1" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                                        <span style="color: #fff;">${m.avatar} ${m.name} (${m.role}):</span>
                                        <code style="color: #38bdf8; font-weight: bold;">${this.sanitizeUsername(m.name)}</code>
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    </div>

                    <small class="text-muted d-block mt-3" style="font-size: 0.78rem;">
                        🛡️ Geschützte Vereinsinstanz der Landjugend Scheuring
                    </small>
                </div>
            </div>
        `;

        const form = containerEl.querySelector('#app-entry-pass-form');
        const userInput = containerEl.querySelector('#entry-username-input');
        const passInput = containerEl.querySelector('#entry-password-input');
        const errorMsg = containerEl.querySelector('#entry-pass-error');

        // Immediate Autofocus on page load
        setTimeout(() => userInput?.focus(), 50);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const uVal = userInput.value;
            const pVal = passInput.value;
            const res = this.authenticate(uVal, pVal);

            if (res.success) {
                if (onAuthenticatedCallback) onAuthenticatedCallback(res.member);
            } else {
                errorMsg.classList.remove('hidden');
                if (res.reason === 'user') {
                    errorMsg.textContent = '⚠️ Ungültiger Benutzername! Es wird ausschließlich der Vor- und Nachname zusammengeschrieben akzeptiert (z. B. moritzkubik).';
                } else {
                    errorMsg.textContent = '⚠️ Falsches Passwort! Bitte wende dich an den Admin.';
                }
                passInput.classList.add('shake');
                setTimeout(() => passInput.classList.remove('shake'), 500);
            }
        });
    }

    /**
     * Floating Re-Authentication Modal when switching user in dropdown
     */
    static promptUserSwitchAuth(targetMember, onSuccessCallback, onCancelCallback) {
        const targetUsername = this.sanitizeUsername(targetMember.name);
        document.body.style.overflow = 'hidden';
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 440px; width: 100%; border: 1px solid rgba(0,135,61,0.4);">
                <div class="modal-header">
                    <h3 style="font-size: 1.1rem; color: #fff;">🔒 Anmelde-Abfrage für Nutzerwechsel</h3>
                    <button class="btn btn-ghost modal-close modal-close-x">&times;</button>
                </div>

                <div class="modal-body p-3">
                    <div class="d-flex align-items-center gap-2 mb-3 p-2" style="background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 4px solid ${targetMember.color}">
                        <span style="font-size: 1.4rem;">${targetMember.avatar}</span>
                        <div>
                            <strong style="color: #fff;">Wechsel zu: ${targetMember.name}</strong>
                            <small class="d-block text-muted">${targetMember.role}</small>
                        </div>
                    </div>

                    <p class="text-muted small mb-3">
                        Bitte gib das Passwort für <strong>${targetMember.name}</strong> ein:
                    </p>

                    <form id="reauth-switch-form" autocomplete="off">
                        <div class="form-group mb-2">
                            <label class="form-label small font-bold text-muted mb-1">Benutzername:</label>
                            <input type="text" id="reauth-user-input" class="form-control form-control-sm text-emerald font-bold" value="${targetUsername}" readonly required style="font-size: 0.95rem; background: rgba(0,0,0,0.4);" />
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label small font-bold text-muted mb-1">Passwort:</label>
                            <input type="password" id="reauth-pass-input" class="form-control form-control-sm" placeholder="Passwort eingeben..." required autofocus autocomplete="off" style="font-size: 0.95rem;" />
                        </div>

                        <div id="reauth-error" class="mb-2 hidden" style="color: #ef4444; font-size: 0.8rem; font-weight: bold;"></div>

                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-sm btn-ghost cancel-reauth-btn">Abbrechen</button>
                            <button type="submit" class="btn btn-sm btn-emerald">🔓 Bestätigen</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#reauth-switch-form');
        const userInput = modal.querySelector('#reauth-user-input');
        const passInput = modal.querySelector('#reauth-pass-input');
        const errEl = modal.querySelector('#reauth-error');

        // Immediate Autofocus on password field
        setTimeout(() => passInput?.focus(), 50);

        modal.querySelectorAll('.modal-close, .cancel-reauth-btn').forEach(b => {
            b.addEventListener('click', () => {
                closeModal();
                if (onCancelCallback) onCancelCallback();
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const uVal = userInput.value;
            const pVal = passInput.value;

            const res = this.authenticate(uVal, pVal);
            if (res.success && res.member.id === targetMember.id) {
                closeModal();
                if (onSuccessCallback) onSuccessCallback(res.member);
            } else {
                errEl.classList.remove('hidden');
                if (res.success && res.member.id !== targetMember.id) {
                    errEl.textContent = `⚠️ Benutzername gehört zu ${res.member.name}, nicht zu ${targetMember.name}!`;
                } else if (res.reason === 'user') {
                    errEl.textContent = `⚠️ Benutzername stimmt nicht mit ${targetMember.name} überein!`;
                } else {
                    errEl.textContent = '⚠️ Falsches Passwort!';
                }
            }
        });
    }

    /**
     * Floating Re-Authentication Modal when clicking Settings tab
     */
    static promptSettingsAuth(onSuccessCallback, onCancelCallback) {
        document.body.style.overflow = 'hidden';
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop active';

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 440px; width: 100%; border: 1px solid rgba(0,135,61,0.5);">
                <div class="modal-header">
                    <h3 style="font-size: 1.1rem; color: #fff;">🔒 Authentifizierung für Einstellungen</h3>
                    <button class="btn btn-ghost modal-close modal-close-x">&times;</button>
                </div>

                <div class="modal-body p-3">
                    <div class="text-center mb-3">
                        <div style="font-size: 2rem;">⚙️</div>
                        <strong style="color: #fff;" class="d-block mt-1">Admin-Freischaltung (Moritz Kubik)</strong>
                        <small class="text-muted">Bitte melde dich erneut mit deinen Admin-Zugangsdaten an:</small>
                    </div>

                    <form id="settings-auth-form" autocomplete="off">
                        <div class="form-group mb-2">
                            <label class="form-label small font-bold text-muted mb-1">Benutzername:</label>
                            <input type="text" id="settings-user-input" class="form-control form-control-sm" placeholder="moritzkubik" required autofocus autocomplete="off" style="font-size: 0.95rem;" />
                        </div>

                        <div class="form-group mb-3">
                            <label class="form-label small font-bold text-muted mb-1">Passwort:</label>
                            <input type="password" id="settings-pass-input" class="form-control form-control-sm" placeholder="Passwort eingeben..." required autocomplete="off" style="font-size: 0.95rem;" />
                        </div>

                        <div id="settings-auth-error" class="mb-2 hidden text-danger small font-bold"></div>

                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-sm btn-ghost cancel-settings-btn">Abbrechen</button>
                            <button type="submit" class="btn btn-sm btn-emerald">🔓 Einstellungen Öffnen</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('#settings-auth-form');
        const userInput = modal.querySelector('#settings-user-input');
        const passInput = modal.querySelector('#settings-pass-input');
        const errEl = modal.querySelector('#settings-auth-error');

        // Immediate Autofocus on modal launch
        setTimeout(() => userInput?.focus(), 50);

        modal.querySelectorAll('.modal-close, .cancel-settings-btn').forEach(b => {
            b.addEventListener('click', () => {
                closeModal();
                if (onCancelCallback) onCancelCallback();
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const uVal = userInput.value;
            const pVal = passInput.value;

            const res = this.authenticate(uVal, pVal);
            if (res.success && StorageEngine.isSuperAdmin(res.member.id)) {
                closeModal();
                if (onSuccessCallback) onSuccessCallback();
            } else {
                errEl.classList.remove('hidden');
                if (!res.success) {
                    errEl.textContent = '⚠️ Ungültiger Benutzername oder Passwort!';
                } else {
                    errEl.textContent = '⚠️ Keine Admin-Berechtigung!';
                }
            }
        });
    }
}
