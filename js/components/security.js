/*
  Security & Compliance Popup Module (IT 2FA & Policy Reminders)
  Popups that interrupt the player's workflow to enforce corporate IT security standards.
*/

function show2FAModal(onComplete) {
    const modalLayer = document.getElementById('modal-layer');
    if (!modalLayer) return;

    modalLayer.classList.remove('hidden');
    modalLayer.innerHTML = `
        <div class="modal-box">
            <header class="modal-header">
                <span class="modal-title">[SEC] OmniCorp IT Security - 2FA Re-Authentication</span>
                <span class="modal-tag">MANDATORY</span>
            </header>
            <div class="modal-body">
                <p>Your enterprise session token has expired. Enter the 6-digit SMS code sent to your registered corporate device.</p>
                <div class="code-input-group">
                    <input type="text" id="2fa-code-input" class="code-input" placeholder="000-000" maxlength="7" autocomplete="off">
                    <button class="btn-primary" id="btn-verify-2fa">Authenticate</button>
                </div>
                <div class="hint-text">Hint: Check your corporate phone (Code: 849201)</div>
            </div>
            <footer class="modal-footer">
                <button class="btn-secondary" id="btn-cancel-2fa">Remind Me in 5 Mins</button>
            </footer>
        </div>
    `;

    const verifyBtn = modalLayer.querySelector('#btn-verify-2fa');
    const inputEl = modalLayer.querySelector('#2fa-code-input');
    const cancelBtn = modalLayer.querySelector('#btn-cancel-2fa');

    verifyBtn.addEventListener('click', () => {
        const val = inputEl.value.replace('-', '').trim();
        if (val === '849201') {
            modalLayer.classList.add('hidden');
            window.gameStore.complete2FA();
            if (onComplete) onComplete(true);
        } else {
            window.gameStore.adjustPatience(-5);
            window.gameStore.addToast("Authentication Failed", "Invalid code. Please try 849201.", true);
        }
    });

    cancelBtn.addEventListener('click', () => {
        modalLayer.classList.add('hidden');
        window.gameStore.defer2FA(5);
        if (onComplete) onComplete(false);
    });
}

// Global helper
window.show2FAModal = show2FAModal;
