/*
  SyncTalk Component (Slack / MS Teams Clone)
  Corporate Chat Interface with Annoying Coworkers & Interactive Dialogue Choices
  Updated: Gemini AI, universal call button, call-intent detection
*/

function renderSyncTalk(container) {
    const state = window.gameStore.getState();
    const chatState = state.synctalk;
    const activeConv = chatState.conversations[chatState.activeId];
    const callCooldowns = state._callCooldowns || {};

    // Determine call button state for active conversation
    let callBtnDisabled = false;
    let callBtnLabel = 'Quick Sync';
    let callBtnTitle = 'Start a private voice call';

    if (activeConv && activeConv.isDm) {
        const isGregGone = activeConv.id === 'dm-greg' && state.blockersTriggered.gregQuit;
        const isChannel = !activeConv.isDm;
        const cooldownTs = callCooldowns[activeConv.id];
        const cooldownRemaining = cooldownTs ? Math.max(0, 60 - Math.floor((Date.now() - cooldownTs) / 1000)) : 0;

        if (isGregGone) {
            callBtnDisabled = true;
            callBtnLabel = 'Line Disconnected';
            callBtnTitle = 'Greg has left the organization';
        } else if (cooldownRemaining > 0) {
            callBtnDisabled = true;
            callBtnLabel = `Wrapping up... (${cooldownRemaining}s)`;
            callBtnTitle = `Call cooldown active`;
        } else if (isChannel) {
            callBtnDisabled = true;
            callBtnLabel = 'Voice N/A';
            callBtnTitle = 'Channels do not support direct calls';
        }
    } else {
        callBtnDisabled = true;
        callBtnLabel = 'Voice N/A';
    }

    container.innerHTML = `
        <div class="synctalk-container">
            <!-- Sidebar: Channels & Direct Messages -->
            <aside class="synctalk-sidebar">
                <div class="sidebar-header">
                    <span class="workspace-name">OmniCorp SyncTalk</span>
                    <span class="status-indicator online"></span>
                </div>

                <div class="sidebar-section">
                    <div class="section-title">DIRECT MESSAGES</div>
                    <ul class="conv-list">
                        ${Object.values(chatState.conversations)
                            .filter(c => c.isDm)
                            .map(c => {
                                const isGone = c.id === 'dm-greg' && state.blockersTriggered.gregQuit;
                                return `
                                <li class="conv-item ${c.id === chatState.activeId ? 'active' : ''} ${isGone ? 'conv-item--gone' : ''}" data-id="${c.id}">
                                    <div class="avatar-box">${c.avatar}</div>
                                    <div class="conv-info">
                                        <span class="conv-name">${c.name}</span>
                                        <span class="conv-role">${c.role}</span>
                                    </div>
                                    ${c.unread > 0 ? `<span class="badge-unread">${c.unread}</span>` : ''}
                                </li>
                            `}).join('')}
                    </ul>
                </div>

                <div class="sidebar-section">
                    <div class="section-title">CHANNELS</div>
                    <ul class="conv-list">
                        ${Object.values(chatState.conversations)
                            .filter(c => !c.isDm)
                            .map(c => `
                                <li class="conv-item ${c.id === chatState.activeId ? 'active' : ''}" data-id="${c.id}">
                                    <span class="channel-hash">#</span>
                                    <span class="conv-name">${c.name}</span>
                                    ${c.unread > 0 ? `<span class="badge-unread">${c.unread}</span>` : ''}
                                </li>
                            `).join('')}
                    </ul>
                </div>
            </aside>

            <!-- Main Chat Conversation Panel -->
            <section class="synctalk-main">
                <header class="chat-header">
                    <div class="chat-title-box">
                        <span class="chat-name">${activeConv ? activeConv.name : 'Select a Chat'}</span>
                        <span class="chat-sub">${activeConv ? activeConv.role : ''}</span>
                    </div>
                    <div class="chat-actions">
                        ${activeConv && activeConv.isDm ? `
                        <button class="btn-secondary compact ${callBtnDisabled ? 'btn-disabled' : ''}"
                                id="btn-call-contact"
                                title="${callBtnTitle}"
                                ${callBtnDisabled ? 'disabled' : ''}
                                data-peer="${activeConv.id}">
                            📞 ${callBtnLabel}
                        </button>
                        ` : ''}
                    </div>
                </header>

                <!-- Typing Indicator -->
                ${state.typingIndicators && state.typingIndicators[chatState.activeId]
                    ? `<div class="typing-indicator-bar">
                        <span class="typing-dots"><span></span><span></span><span></span></span>
                        <span class="typing-name">${state.typingIndicators[chatState.activeId].sender} is typing...</span>
                       </div>`
                    : ''}

                <div class="chat-messages" id="chat-messages-stream">
                    ${activeConv ? activeConv.messages.map(msg => `
                        <div class="chat-msg-row ${msg.isPlayer ? 'player-msg' : ''}">
                            <div class="msg-avatar">${msg.isPlayer ? 'JA' : (activeConv.avatar || '??')}</div>
                            <div class="msg-content">
                                <div class="msg-meta">
                                    <span class="msg-sender">${msg.sender}</span>
                                    <span class="msg-time">${msg.time}</span>
                                </div>
                                <div class="msg-bubble">${escapeHtml(msg.text)}</div>
                            </div>
                        </div>
                    `).join('') : '<div class="empty-state">No active conversation selected</div>'}
                </div>

                <!-- Interactive Player Dialogue Matrix -->
                <footer class="chat-input-area">
                    ${renderChoiceBox(activeConv)}
                </footer>
            </section>
        </div>
    `;

    // Sidebar: switch conversation
    container.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            window.gameStore.setActiveChat(id);
        });
    });

    // Quick-reply chips
    container.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-text');
            const delta = parseInt(btn.getAttribute('data-delta') || '0', 10);
            const reply = btn.getAttribute('data-reply');
            window.gameStore.sendChatMessage(chatState.activeId, text, delta, reply);
        });
    });

    // Custom free-text send
    const sendBtn = container.querySelector('#btn-send-custom');
    const chatInput = container.querySelector('#chat-custom-input');
    if (sendBtn && chatInput) {
        const handleSend = () => {
            const txt = chatInput.value.trim();
            if (!txt) return;

            // Detect call intent in free-text
            if (detectsCallIntent(txt) && activeConv && activeConv.isDm && !callBtnDisabled) {
                window.gameStore.startPrivateCall(chatState.activeId);
                return;
            }

            window.gameStore.sendChatMessage(chatState.activeId, txt);
            chatInput.value = '';
        };
        sendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleSend();
        });
    }

    // Call button
    const callBtn = container.querySelector('#btn-call-contact');
    if (callBtn) {
        callBtn.addEventListener('click', () => {
            const peer = callBtn.getAttribute('data-peer');
            if (peer) window.gameStore.startPrivateCall(peer);
        });
    }

    // Auto-scroll message stream to bottom
    const stream = container.querySelector('#chat-messages-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
}

function detectsCallIntent(text) {
    const lower = (text || '').toLowerCase();
    return lower.includes('can we call') ||
           lower.includes('quick sync') ||
           lower.includes('voice call') ||
           lower.includes('hop on a call') ||
           lower.includes('jump on a call') ||
           lower.includes('let\'s call') ||
           lower.includes('lets call') ||
           lower.includes('call me') ||
           lower.includes('give me a call') ||
           lower.includes('schedule a call') ||
           (lower.includes('call') && lower.includes('now'));
}

function renderChoiceBox(conv) {
    if (!conv || !conv.messages.length) return '';
    const lastMsg = conv.messages[conv.messages.length - 1];

    if (!lastMsg.isPlayer && lastMsg.choices && lastMsg.choices.length > 0) {
        // choices can be strings (legacy) or objects {text, patienceDelta, nextMsg}
        const chips = lastMsg.choices.map(c => {
            const text = typeof c === 'string' ? c : (c.text || '');
            const delta = typeof c === 'object' ? (c.patienceDelta || 0) : 0;
            const reply = typeof c === 'object' ? (c.nextMsg || '') : '';
            return `
                <button class="choice-btn" data-text="${escapeHtml(text)}" data-delta="${delta}" data-reply="${escapeHtml(reply)}">
                    <span class="choice-icon">&gt;</span> ${escapeHtml(text)}
                </button>
            `;
        });

        return `
            <div class="choice-matrix">
                <span class="matrix-label">SELECT CORPORATE RESPONSE:</span>
                <div class="choice-buttons">
                    ${chips.join('')}
                </div>
            </div>
            <div class="standard-input-box" style="margin-top:6px;">
                <input type="text" id="chat-custom-input" class="chat-input" placeholder="Or type a custom message..." autocomplete="off">
                <button class="btn-primary" id="btn-send-custom">Send</button>
            </div>
        `;
    }

    return `
        <div class="standard-input-box">
            <input type="text" id="chat-custom-input" class="chat-input" placeholder="Type a professional message..." autocomplete="off">
            <button class="btn-primary" id="btn-send-custom">Send</button>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

window.renderSyncTalk = renderSyncTalk;
