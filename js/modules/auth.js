/**
 * Level-1 App Entry Lock & User Re-Authentication Guard (Strict Firstname + Lastname Concatenated Username Matching)
 */
import { StorageEngine, escapeHTML } from '../storage.js';

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
     * Bulletproof Username Matcher with complete 13-member mapping
     */
    static findMemberByUsername(usernameInput, members) {
        if (!usernameInput) return null;
        const cleanInput = this.sanitizeUsername(usernameInput);
        const rawInput = usernameInput.trim().toLowerCase();
        if (!cleanInput && !rawInput) return null;

        const activeMembers = (members && members.length > 0) ? members : StorageEngine.getMembers();

        // 1. Exact sanitized username match (e.g. "valentinmuellner", "lindaschweiger")
        let found = activeMembers.find(m => this.sanitizeUsername(m.name) === cleanInput);
        if (found) return found;

        // 2. Raw display name match (e.g. "Valentin Müllner", "Linda Schweiger")
        found = activeMembers.find(m => (m.name || '').trim().toLowerCase() === rawInput);
        if (found) return found;

        return null;
    }

    /**
     * Authenticate user with password verification
     */
    static async authenticate(usernameInput, passwordInput) {
        const members = StorageEngine.getMembers();
        const matchedMember = this.findMemberByUsername(usernameInput, members);

        if (!matchedMember) {
            return { success: false, reason: 'user' };
        }

        let activeMemberPass = StorageEngine.getMemberPassword(matchedMember.id);
        const inputClean = (passwordInput || '').trim();

        if (!activeMemberPass) {
            await StorageEngine.setMemberPassword(matchedMember.id, inputClean);
            activeMemberPass = StorageEngine.getMemberPassword(matchedMember.id);
        }

        const hashedInput = await StorageEngine.hashPassword(inputClean);
        const isPassValid = (hashedInput === activeMemberPass);

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
        const headerEl = document.querySelector('.app-header');
        if (headerEl) headerEl.style.display = 'none';

        containerEl.innerHTML = `
            <div class="app-entry-lock-viewport d-flex align-items-center justify-content-center">
                <div class="card-glow entry-lock-card text-center">
                    
                    <!-- Logo Badge -->
                    <div class="brand-logo-wrapper mb-2 text-center">
                        <img src="assets/logo_white.png" alt="Landjugend Scheuring Logo" class="entry-lock-logo" />
                    </div>

                    <h2 class="entry-lock-title">Vorstands-Zentrale</h2>
                    <span class="entry-lock-sub">Landjugend Scheuring</span>

                    <form id="app-entry-pass-form" autocomplete="off" class="mt-3">
                        <div class="form-group mb-3 text-start">
                            <label class="form-label small font-bold text-muted mb-1">Benutzername</label>
                            <input type="text" id="entry-username-input" class="form-control" placeholder="z. B. Moritz Kubik" required autofocus autocomplete="off" />
                        </div>

                        <div class="form-group mb-3 text-start">
                            <label class="form-label small font-bold text-muted mb-1">Passwort</label>
                            <input type="password" id="entry-password-input" class="form-control" placeholder="Passwort eingeben..." required autocomplete="off" />
                        </div>

                        <div id="entry-pass-error" class="mb-3 hidden" style="color: #ef4444; font-size: 0.85rem; font-weight: 600;"></div>

                        <button type="submit" class="btn btn-emerald btn-glow w-100 entry-lock-btn">
                            🔒 Anmelden
                        </button>
                    </form>

                    <small class="text-muted d-block mt-3" style="font-size: 0.75rem;">
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

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uVal = userInput.value;
            const pVal = passInput.value;
            const res = await this.authenticate(uVal, pVal);

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
                            <strong style="color: #fff;">Wechsel zu: ${escapeHTML(targetMember.name)}</strong>
                            <small class="d-block text-muted">${escapeHTML(targetMember.role)}</small>
                        </div>
                    </div>

                    <p class="text-muted small mb-3">
                        Bitte gib das Passwort für <strong>${escapeHTML(targetMember.name)}</strong> ein:
                    </p>

                    <form id="reauth-switch-form" autocomplete="off">
                        <div class="form-group mb-2">
                            <label class="form-label small font-bold text-muted mb-1">Benutzername:</label>
                            <input type="text" id="reauth-user-input" class="form-control form-control-sm text-emerald font-bold" value="${escapeHTML(targetUsername)}" readonly required style="font-size: 0.95rem; background: rgba(0,0,0,0.4);" />
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

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uVal = userInput.value;
            const pVal = passInput.value;

            const res = await this.authenticate(uVal, pVal);
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

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uVal = userInput.value;
            const pVal = passInput.value;

            const res = await this.authenticate(uVal, pVal);
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
