/*
  OmniOS Enterprise Desktop Workstation - Unified Application Bundle
  Phase 4: Ticketing System, Random Pings, Reply Choices & Blocker Overlays
*/

// ==========================================================================
// 1. Global Utilities & Helpers
// ==========================================================================
window.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// ==========================================================================
// 2. Typing Indicator Component (For SyncTalk DMs only)
// ==========================================================================
function renderTypingBubble(indicator, avatarText) {
    if (!indicator || !indicator.isTyping) return '';
    return `
        <div class="chat-msg-row typing-indicator-row">
            <div class="msg-avatar">${escapeHtml(avatarText || '??')}</div>
            <div class="msg-content">
                <div class="msg-meta">
                    <span class="msg-sender">${escapeHtml(indicator.sender)}</span>
                </div>
                <div class="msg-bubble typing-bubble">
                    <div class="typing-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================================================
// 3. SyncTalk Component Renderer (Chat Desk)
// ==========================================================================
function renderSyncTalk(container) {
    const state = window.gameStore.getState();
    const chatState = state.synctalk;
    const activeConv = chatState.conversations[chatState.activeId];
    const isMeetingEnded = state.meetstream.status === 'ENDED';
    const typingInd = state.typingIndicators[chatState.activeId];

    let typingAvatar = '??';
    if (activeConv && typingInd) {
        typingAvatar = activeConv.avatar || '??';
    }

    // Generate quick reply chips
    let quickReplyChipsHTML = '';
    if (activeConv && activeConv.messages.length > 0) {
        const lastMsg = activeConv.messages[activeConv.messages.length - 1];
        if (!lastMsg.isPlayer && lastMsg.choices && lastMsg.choices.length > 0) {
            quickReplyChipsHTML = `
                <div class="quick-reply-chips">
                    ${lastMsg.choices.map(c => `
                        <button class="chip-btn" data-reply-text="${escapeHtml(c)}">
                            ${escapeHtml(c)}
                        </button>
                    `).join('')}
                </div>
            `;
        }
    }

    // Save mid-type text so a notify() doesn't erase what the user was writing
    const savedChatInput = container.querySelector('#chat-custom-input')?.value || '';
    const hadChatFocus = document.activeElement === container.querySelector('#chat-custom-input');

    container.innerHTML = `
        <div class="synctalk-container">
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
                                const isGone = c.id === 'dm-greg' && state.blockersTriggered && state.blockersTriggered.gregQuit;
                                const cooldowns = state._callCooldowns || {};
                                const cooldownTs = cooldowns[c.id];
                                const cooldownRemaining = cooldownTs ? Math.max(0, 60 - Math.floor((Date.now() - cooldownTs) / 1000)) : 0;
                                const callDisabled = isGone || cooldownRemaining > 0;
                                const callLabel = isGone ? '[✕]' : cooldownRemaining > 0 ? `[${cooldownRemaining}s]` : '[📞]';
                                return `
                                <li class="conv-item ${c.id === chatState.activeId ? 'active' : ''}" data-id="${c.id}">
                                    <div class="avatar-box">${c.avatar}</div>
                                    <div class="conv-info">
                                        <span class="conv-name">${escapeHtml(c.name)}</span>
                                        <span class="conv-role">${escapeHtml(c.role)}</span>
                                    </div>
                                    <button class="btn-call-sidebar btn-primary compact" data-peer-id="${c.id}" title="Quick Sync Call" ${callDisabled ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                                        ${callLabel}
                                    </button>
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
                                    <span class="conv-name">${escapeHtml(c.name)}</span>
                                    ${c.unread > 0 ? `<span class="badge-unread">${c.unread}</span>` : ''}
                                </li>
                            `).join('')}
                    </ul>
                </div>
            </aside>

            <section class="synctalk-main">
                <header class="chat-header">
                    <div class="chat-title-box">
                        <span class="chat-name">${activeConv ? escapeHtml(activeConv.name) : 'Select a Chat'}</span>
                        <span class="chat-sub">${activeConv ? escapeHtml(activeConv.role) : ''}</span>
                    </div>
                    <div class="chat-actions">
                        <button class="btn-secondary compact ${isMeetingEnded ? 'disabled' : ''}" id="btn-call-boss" ${isMeetingEnded ? 'disabled' : ''}>
                            ${isMeetingEnded ? 'Meeting Concluded' : 'Join MeetStream'}
                        </button>
                    </div>
                </header>

                <div class="chat-messages" id="chat-messages-stream">
                    ${activeConv ? activeConv.messages.map(msg => {
                        let textHTML = escapeHtml(msg.text);
                        if (textHTML.includes('[OmniCorp_Excel_Cell_Hotfix.exe](#virus)')) {
                            textHTML = textHTML.replace(
                                '[OmniCorp_Excel_Cell_Hotfix.exe](#virus)',
                                `<a href="#" class="virus-trigger-link font-mono" style="color: var(--accent-red); font-weight: bold; text-decoration: underline;">[OmniCorp_Excel_Cell_Hotfix.exe]</a>`
                            );
                        }
                        return `
                            <div class="chat-msg-row ${msg.isPlayer ? 'player-msg' : ''}">
                                <div class="msg-avatar">${msg.isPlayer ? 'JA' : (activeConv.avatar || '??')}</div>
                                <div class="msg-content">
                                    <div class="msg-meta">
                                        <span class="msg-sender">${escapeHtml(msg.sender)}</span>
                                        <span class="msg-time">${escapeHtml(msg.time)}</span>
                                    </div>
                                    <div class="msg-bubble">${textHTML}</div>
                                </div>
                            </div>
                        `;
                    }).join('') : '<div class="empty-state">No active conversation selected</div>'}
                    ${renderTypingBubble(typingInd, typingAvatar)}
                </div>

                <footer class="chat-input-area">
                    ${quickReplyChipsHTML}
                    <div class="standard-input-box" style="${chatState.activeId === 'dm-greg' ? 'display:none;' : ''}">
                        <input type="text" id="chat-custom-input" class="chat-input" placeholder="Type a professional message..." autocomplete="off">
                        <button class="btn-primary" id="btn-send-custom">Send</button>
                    </div>
                    ${chatState.activeId === 'dm-greg' ? `
                        <div style="font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono); text-align: center; padding: 4px; background: rgba(0,0,0,0.2); border: 1px dashed var(--border-color); border-radius: 2px;">
                            [SYSTEM NOTICE: Manual inputs disabled for junior sync compliance. Use button choice pings above.]
                        </div>
                    ` : ''}
                </footer>
            </section>
        </div>
    `;

    // Click DM row to chat (avoid call button clicks)
    container.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-call-sidebar')) return;
            const id = item.getAttribute('data-id');
            window.gameStore.setActiveChat(id);
        });
    });

    // Call sidebar buttons
    container.querySelectorAll('.btn-call-sidebar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const peerId = btn.getAttribute('data-peer-id');
            window.gameStore.startPrivateCall(peerId);
        });
    });

    const callBossBtn = container.querySelector('#btn-call-boss');
    if (callBossBtn && !isMeetingEnded) {
        callBossBtn.addEventListener('click', () => {
            window.gameStore.setActiveApp('meetstream');
        });
    }

    // Quick reply chips handlers
    container.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const txt = btn.getAttribute('data-reply-text');
            window.gameStore.sendChatMessage(chatState.activeId, txt);
        });
    });

    const customInput = container.querySelector('#chat-custom-input');
    const sendBtn = container.querySelector('#btn-send-custom');
    if (customInput && sendBtn) {
        const handleSend = () => {
            const val = customInput.value.trim();
            if (!val) return;



            // Clear BEFORE sendChatMessage — notify() destroys the DOM element mid-flight
            // so clearing after the call targets a detached (dead) element.
            customInput.value = '';
            window.gameStore.sendChatMessage(chatState.activeId, val);
        };
        sendBtn.addEventListener('click', handleSend);
        customInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    // Virus link handler
    container.querySelectorAll('.virus-trigger-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.gameStore.triggerVirusQuarantine();
        });
    });

    const stream = container.querySelector('#chat-messages-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;

    // Restore mid-type input value after rebuild
    const restoredInput = container.querySelector('#chat-custom-input');
    if (restoredInput && savedChatInput) {
        restoredInput.value = savedChatInput;
        if (hadChatFocus) restoredInput.focus();
    }
}

// ==========================================================================
// 4. MeetStream Component Renderer (Video Call Simulator)
// ==========================================================================
function renderMeetStream(container) {
    const state = window.gameStore.getState();
    const ms = state.meetstream;
    const isPrivate = ms.activeCall.type === "private";

    if (ms.status === 'ENDED') {
        container.innerHTML = `
            <div class="meetstream-container ended-container">
                <div class="ended-meeting-card">
                    <div class="ended-icon">[CALL DISCONNECTED]</div>
                    <h2 class="ended-title">${isPrivate ? 'Private Sync Concluded' : 'Meeting Adjourned'}</h2>
                    <p class="ended-subtitle">The operational sync call has finished.</p>
                    <button class="btn-primary" id="btn-return-synctalk">Return to SyncTalk Desktop</button>
                </div>
            </div>
        `;
        const retBtn = container.querySelector('#btn-return-synctalk');
        if (retBtn) {
            retBtn.addEventListener('click', () => {
                window.gameStore.setActiveApp('synctalk');
            });
        }
        return;
    }

    const currentCap = ms.captions[ms.currentCaptionIndex] || { speaker: "Presenter", text: "End of presentation.", slide: 12 };

    const activeSpk = ms.activeSpeaker || currentCap.speaker;
    const isBradSpeaking = activeSpk.includes("Brad");
    const isKarenSpeaking = activeSpk.includes("Karen");
    const isChadSpeaking = activeSpk.includes("Chad");
    const isPriyaSpeaking = activeSpk.includes("Priya");
    const isDerekSpeaking = activeSpk.includes("Derek");
    const isAnalystSpeaking = activeSpk.includes("Analyst") || activeSpk.includes("You");

    function attendeeTile(name, avatar, isSpeaking, isSelf = false) {
        let filterClass = '';
        let extraOverlay = '';
        if (isSelf) {
            if (ms.backgroundEffect === 'blur') filterClass = 'filter-blur';
            else if (ms.backgroundEffect === 'office') filterClass = 'filter-office';
            else if (ms.backgroundEffect === 'cat') {
                filterClass = 'filter-cat';
                extraOverlay = '<div class="cat-ears-emoji">🐱</div>';
            }
        }
        return `
            <div class="attendee-tile ${isSelf ? 'self-tile' : ''} ${isSpeaking ? 'speaking' : ''} ${filterClass}">
                <div class="tile-avatar-wrapper">
                    <div class="tile-avatar">${avatar}</div>
                    ${extraOverlay}
                </div>
                <span class="tile-name">${escapeHtml(name)}</span>
                ${isSelf && ms.backgroundEffect !== 'none' ? `<span class="active-filter-tag">${ms.backgroundEffect.toUpperCase()}</span>` : ''}
                ${isSpeaking ? `
                    <div class="audio-vu-meter">
                        <span class="vu-bar"></span>
                        <span class="vu-bar"></span>
                        <span class="vu-bar"></span>
                    </div>
                    <span class="mic-status speaking">[LIVE]</span>
                ` : `<span class="mic-status muted">[MUTED]</span>`}
            </div>
        `;
    }

    let centerPaneHTML = '';
    if (isPrivate) {
        const peer = state.synctalk.conversations[ms.activeCall.peerId];
        const peerName = peer ? peer.name : "Colleague";
        const peerAvatar = peer ? peer.avatar : "?";

        if (isAnalystSpeaking) {
            let effectStyle = '';
            let largeOverlay = '';
            if (ms.backgroundEffect === 'blur') effectStyle = 'filter: blur(3px);';
            else if (ms.backgroundEffect === 'office') effectStyle = 'background: linear-gradient(135deg, #1e3a8a, #0b0f19); border-color:#3b82f6;';
            else if (ms.backgroundEffect === 'cat') {
                effectStyle = 'background: linear-gradient(135deg, #581c87, #0f091c); border-color:#a855f7;';
                largeOverlay = '<div class="large-cat-ears">🐱🐱</div>';
            }
            centerPaneHTML = `
                <div class="private-video-focused">
                    <div class="large-video-box speaking" style="${effectStyle}">
                        <div class="large-avatar">JA</div>
                        ${largeOverlay}
                        ${currentCap && currentCap.speaker === activeSpk ? `
                            <div class="video-speech-bubble">
                                <p class="bubble-text">"${escapeHtml(currentCap.text)}"</p>
                            </div>
                        ` : ''}
                        <div class="video-overlay-info">
                            <h3>J. Analyst (You)</h3>
                            <span>Operational Division Connection &bull; ${ms.backgroundEffect.toUpperCase()} EFFECT</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            centerPaneHTML = `
                <div class="private-video-focused">
                    <div class="large-video-box speaking">
                        <div class="large-avatar">${peerAvatar}</div>
                        ${currentCap && currentCap.speaker === activeSpk ? `
                            <div class="video-speech-bubble">
                                <p class="bubble-text">"${escapeHtml(currentCap.text)}"</p>
                            </div>
                        ` : ''}
                        <div class="video-overlay-info">
                            <h3>${escapeHtml(peerName)}</h3>
                            <span>Operational Division Connection</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        centerPaneHTML = `
            <div class="slide-container" style="position:relative;">
                <header class="slide-header">
                    <span class="slide-counter">SLIDE ${ms.currentSlide} OF ${ms.totalSlides}</span>
                    <span class="presenter-tag">Presenting: ${escapeHtml(ms.activePresenter)}</span>
                </header>
                <div class="slide-content" id="slide-viewport">
                    ${renderSlideContent(ms.currentSlide)}
                </div>
                ${currentCap && activeSpk && activeSpk !== 'Presenter' && activeSpk !== 'System Bot' ? `
                    <div class="video-speech-bubble" style="bottom: 12px; top: auto; left: 50%; transform: translateX(-50%); width: 85%; max-width: none;">
                        <p class="bubble-text"><strong>${escapeHtml(activeSpk)}:</strong> "${escapeHtml(currentCap.text)}"</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="meetstream-container">
            <header class="meetstream-header">
                <div class="call-title-group">
                    <span class="live-dot">[REC]</span>
                    <span class="call-title">${escapeHtml(ms.callTitle)}</span>
                    <span class="badge-status live">${isPrivate ? 'PRIVATE SYNC' : 'GROUP CALL'}</span>
                </div>
                <div class="call-actions">
                    <button class="btn-danger compact" id="btn-leave-call">Disconnect Call</button>
                </div>
            </header>

            <div class="meetstream-body">
                <aside class="attendees-column">
                    ${isPrivate ? `
                        ${attendeeTile("J. Analyst (You)", "JA", isAnalystSpeaking, true)}
                        ${attendeeTile(state.synctalk.conversations[ms.activeCall.peerId].name, state.synctalk.conversations[ms.activeCall.peerId].avatar, !isAnalystSpeaking)}
                    ` : `
                        ${attendeeTile("Brad Sterling (Host)", "BS", isBradSpeaking)}
                        ${attendeeTile("Karen Vance", "KV", isKarenSpeaking)}
                        ${attendeeTile("Chad Miller", "CM", isChadSpeaking)}
                        ${attendeeTile("Priya Sharma", "PS", isPriyaSpeaking)}
                        ${attendeeTile("Derek Owens", "DO", isDerekSpeaking)}
                        ${attendeeTile("J. Analyst (You)", "JA", isAnalystSpeaking, true)}
                    `}
                </aside>

                <section class="presentation-screen">
                    ${centerPaneHTML}
                </section>
            </div>

            <section class="meeting-chat-section">
                <div class="meeting-chat-log" id="meet-chat-stream">
                    ${ms.chatHistory.map(msg => `
                        <div class="meet-msg-line ${msg.isPlayer ? 'player' : ''}">
                            <span class="meet-msg-sender">${escapeHtml(msg.sender)}:</span>
                            <span class="meet-msg-text">"${escapeHtml(msg.text)}"</span>
                            <span class="meet-msg-time">${escapeHtml(msg.time)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="call-console-bar">
                    <button class="btn-secondary compact ${ms.micMuted ? 'muted-btn' : ''}" id="btn-toggle-mic">
                        ${ms.micMuted ? '🎙️ Unmute Mic' : '🎙️ Mute Mic'}
                    </button>
                    <button class="btn-secondary compact" id="btn-cycle-bg">
                        📷 Visual Effects: ${ms.backgroundEffect.toUpperCase()}
                    </button>
                    <button class="btn-secondary compact" id="btn-share-screen">
                        🖥️ Share Screen
                    </button>
                </div>

                <div class="meeting-talk-bar">
                    <input type="text" id="meet-talk-input" class="meet-talk-input" placeholder="Type a comment or question to speak in the call..." autocomplete="off">
                    <button class="btn-primary compact" id="btn-meet-talk">Speak in Call</button>
                </div>
            </section>

            <footer class="captions-bar">
                <div class="caption-display">
                    <span class="speaker-label">${escapeHtml(activeSpk)}:</span>
                    <span class="caption-text">"${escapeHtml(currentCap.text)}"</span>
                </div>
                ${!isPrivate ? `
                    <div class="caption-controls">
                        <button class="btn-primary" id="btn-next-caption">
                            <span>Next Caption</span>
                            <span class="arrow-icon">&gt;</span>
                        </button>
                    </div>
                ` : ''}
            </footer>
        </div>
    `;

    const nextBtn = container.querySelector('#btn-next-caption');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            window.gameStore.nextMeetStreamCaption();
        });
    }

    const leaveBtn = container.querySelector('#btn-leave-call');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            window.gameStore.leaveCall();
        });
    }

    const micBtn = container.querySelector('#btn-toggle-mic');
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            window.gameStore.toggleMute();
        });
    }

    const bgBtn = container.querySelector('#btn-cycle-bg');
    if (bgBtn) {
        bgBtn.addEventListener('click', () => {
            window.gameStore.cycleBackground();
        });
    }

    const shareBtn = container.querySelector('#btn-share-screen');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            window.gameStore.requestScreenShare();
        });
    }

    const talkInput = container.querySelector('#meet-talk-input');
    const talkBtn = container.querySelector('#btn-meet-talk');
    if (talkInput && talkBtn) {
        const handleSpeak = () => {
            const txt = talkInput.value.trim();
            if (txt) {
                window.gameStore.speakInMeeting(txt);
                talkInput.value = "";
            }
        };
        talkBtn.addEventListener('click', handleSpeak);
        talkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSpeak();
        });
    }

    const stream = container.querySelector('#meet-chat-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
}

function renderSlideContent(slideNum) {
    switch(slideNum) {
        case 1:
            return `
                <h2 class="slide-title">Q3 OPERATIONAL SYNERGIES REVIEW</h2>
                <div class="slide-subtitle" style="font-size:11px; color:var(--text-secondary); margin-bottom:10px;">Welcome & Initial Objectives</div>
                <div class="slide-bullet-list">
                    <div>[+] Optimize cross-functional workflow bandwidth.</div>
                    <div>[+] Standardize spreadsheet cell indexing rules.</div>
                    <div>[+] Conduct comprehensive compliance audit.</div>
                </div>
            `;
        case 2:
            return `
                <h2 class="slide-title">REGIONAL DATA REPORTING VARIANCE</h2>
                <div class="slide-chart-box">
                    <div class="chart-bar-group">
                        <div class="chart-bar" style="height: 60%;"><span class="bar-val">$12.5M</span></div>
                        <span class="bar-label">Q1 Actual</span>
                    </div>
                    <div class="chart-bar-group">
                        <div class="chart-bar" style="height: 75%;"><span class="bar-val">$14.2M</span></div>
                        <span class="bar-label">Q2 Actual</span>
                    </div>
                    <div class="chart-bar-group">
                        <div class="chart-bar warning" style="height: 45%;"><span class="bar-val">4.2%</span></div>
                        <span class="bar-label">Variance</span>
                    </div>
                </div>
                <div class="alert-text text-center" style="margin-top:10px; font-size:10px; color:var(--accent-red);">[!] Trailing zeros must match OmniCorp Compliance standard.</div>
            `;
        case 3:
            return `
                <h2 class="slide-title">Q3 REVENUE PROJECTION TARGETS</h2>
                <div class="slide-chart-box" style="margin-top: 15px;">
                    <div class="chart-bar-group">
                        <div class="chart-bar" style="height: 80%; background:#3b82f6;"><span class="bar-val">US-East</span></div>
                        <span class="bar-label">US-East</span>
                    </div>
                    <div class="chart-bar-group">
                        <div class="chart-bar" style="height: 65%; background:#3b82f6;"><span class="bar-val">US-West</span></div>
                        <span class="bar-label">US-West</span>
                    </div>
                </div>
                <p style="font-size:10px; color:var(--text-secondary); text-align:center; margin-top:8px;">Lead core deliverables must align with historical bounds.</p>
            `;
        case 4:
            return `
                <h2 class="slide-title">FORMULA STANDARDIZATION DIRECTIVES</h2>
                <div style="background:#0b0d19; border:1px solid var(--border-color); padding:12px; margin-top:10px; font-family:var(--font-mono); font-size:11px; text-align:left;">
                    <div>Standard Equation format:</div>
                    <code style="color:#4ade80; display:block; padding:5px 0; font-size:12px;">=SUM(D2:D6)</code>
                    <div style="color:var(--text-muted); font-size:9px; margin-top:5px;">Note: White spaces or leading characters invalidate totals.</div>
                </div>
            `;
        case 5:
            return `
                <h2 class="slide-title">OPERATIONAL SLA RESPONSE TARGETS</h2>
                <table class="grid-table mini" style="font-size:9px; margin-top:10px; width:100%;">
                    <thead>
                        <tr><th>Channel</th><th>Target Response SLA</th><th>Required Tone</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>SyncTalk DMs</td><td>&lt; 60 seconds</td><td>100% Upbeat</td></tr>
                        <tr><td>IT Security</td><td>Standard Tier 2</td><td>Compliant</td></tr>
                        <tr><td>Ergonomic Check</td><td>OSHA Standard</td><td>Civility Focus</td></tr>
                    </tbody>
                </table>
            `;
        case 6:
            return `
                <h2 class="slide-title">APAC & LATAM REGIONAL METRICS</h2>
                <div style="display:flex; justify-content:space-around; align-items:center; height:100px; font-family:var(--font-mono); font-size:11px; text-align:center;">
                    <div style="border:1px solid var(--border-color); padding:10px; width:45%; background:#111827;">
                        <div style="color:#3b82f6; font-weight:bold;">APAC</div>
                        <div style="font-size:14px; margin-top:5px; color:#fff;">$9.8M</div>
                    </div>
                    <div style="border:1px solid var(--border-color); padding:10px; width:45%; background:#111827;">
                        <div style="color:#3b82f6; font-weight:bold;">LATAM</div>
                        <div style="font-size:14px; margin-top:5px; color:#fff;">$6.3M</div>
                    </div>
                </div>
            `;
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
            return `
                <h2 class="slide-title">CROSS-DEPARTMENT SYNERGY MATRIX</h2>
                <div style="text-align:center; font-family:var(--font-mono); font-size:11px; margin-top:15px;">
                    <div style="color:#3b82f6; font-weight:bold;">[SEC-AUDIT STATUS]</div>
                    <p style="margin-top:5px; color:var(--text-secondary);">Reconciliations must be signed in OmniDocs folder</p>
                    <div style="display:inline-block; border:1px solid #10b981; color:#4ade80; padding:2px 8px; margin-top:10px; font-size:10px;">
                        Ready for Auditor Review
                    </div>
                </div>
            `;
        default:
            return `
                <h2 class="slide-title">ACTION ITEMS & RECONCILIATION</h2>
                <div class="slide-bullet-list" style="margin-top:10px;">
                    <div>[1] Re-type cells in DataGrid to clear Trailing Space traps.</div>
                    <div>[2] Confirm 2FA validation triggers in system.</div>
                    <div>[3] Submit spreadsheet workbook for approval.</div>
                </div>
            `;
    }
}

// ==========================================================================
// 5. DataGrid Component Renderer (Smooth DOM spreadsheet - focus fix)
// ==========================================================================
function renderDataGrid(container) {
    const state = window.gameStore.getState();
    const dg = state.datagrid;
    const colHeaders = ["A", "B", "C", "D", "E"];

    container.innerHTML = `
        <div class="datagrid-container">
            <div class="task-instruction-banner">
                <div class="banner-title">
                    <span class="banner-badge">[AUDIT TASK]:</span>
                    <span>Q3 Regional Sales Report Reconciliation</span>
                </div>
                <div class="banner-steps">
                    <span>1. Inspect D2 cell (Row 2 Col D - US-East-01).</span>
                    <span>2. Remove trailing spaces / non-breaking space traps.</span>
                    <span>3. Click 'Validate & Submit'.</span>
                </div>
                <button class="btn-secondary compact" id="btn-audit-guide">Audit Checklist</button>
            </div>

            <header class="datagrid-toolbar">
                <div class="file-name-group">
                    <span class="excel-icon">[XLS]</span>
                    <span class="file-name">${escapeHtml(dg.sheetName)}</span>
                    <span class="save-status">UNSAVED CHANGES</span>
                </div>
                <div class="toolbar-actions">
                    <button class="btn-secondary compact" id="btn-recalc-sheet">Recalculate</button>
                    <button class="btn-primary compact" id="btn-validate-grid">Validate & Submit</button>
                </div>
            </header>

            <div class="formula-bar-container">
                <span class="cell-ref-box" id="grid-ref-box">${colHeaders[dg.selectedCell.col]}${dg.selectedCell.row + 1}</span>
                <span class="fx-label">fx</span>
                <input type="text" id="formula-input" class="formula-input" value="${escapeHtml(dg.formulaValue)}" autocomplete="off">
            </div>

            <div class="spreadsheet-viewport">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th class="row-hdr-col"></th>
                            ${colHeaders.map(col => `<th class="col-hdr">${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="grid-table-body">
                        ${dg.data.map((row, rIdx) => `
                            <tr>
                                <td class="row-hdr">${rIdx + 1}</td>
                                ${row.map((cellVal, cIdx) => {
                                    const isSelected = dg.selectedCell.row === rIdx && dg.selectedCell.col === cIdx;
                                    const hasSpaceBug = typeof cellVal === 'string' && cellVal.includes('\u00A0');
                                    return `
                                        <td class="cell ${isSelected ? 'selected' : ''} ${hasSpaceBug ? 'has-hidden-space' : ''}" 
                                            data-row="${rIdx}" data-col="${cIdx}" id="td-cell-${rIdx}-${cIdx}">
                                            <input type="text" class="cell-editor" value="${escapeHtml(cellVal)}" 
                                                   data-row="${rIdx}" data-col="${cIdx}">
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <footer class="datagrid-footer">
                <div class="sheet-tabs">
                    <button class="sheet-tab active">Q3_Regional_Metrics</button>
                    <button class="sheet-tab">Q2_Historical (Read Only)</button>
                </div>
                <div class="grid-status-info">
                    <span id="grid-bottom-status">READY | Selected Cell: ${colHeaders[dg.selectedCell.col]}${dg.selectedCell.row + 1}</span>
                </div>
            </footer>
        </div>
    `;

    const formulaInput = container.querySelector('#formula-input');
    const refBox = container.querySelector('#grid-ref-box');
    const bottomStatus = container.querySelector('#grid-bottom-status');
    const cells = container.querySelectorAll('.cell');

    let currentSelectedRow = dg.selectedCell.row;
    let currentSelectedCol = dg.selectedCell.col;

    cells.forEach(cellEl => {
        const r = parseInt(cellEl.getAttribute('data-row'), 10);
        const c = parseInt(cellEl.getAttribute('data-col'), 10);
        const inputEl = cellEl.querySelector('.cell-editor');

        cellEl.addEventListener('click', (e) => {
            if (e.target === inputEl) return;
            selectCell(r, c);
        });

        inputEl.addEventListener('focus', () => {
            selectCell(r, c);
        });

        inputEl.addEventListener('input', (e) => {
            const val = e.target.value;
            formulaInput.value = val;
            window.gameStore.updateCell(r, c, val);
        });

        inputEl.addEventListener('blur', () => {
            const hasSpaceBug = inputEl.value.includes('\u00A0');
            if (hasSpaceBug) {
                cellEl.classList.add('has-hidden-space');
            } else {
                cellEl.classList.remove('has-hidden-space');
            }
        });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                inputEl.blur();
                window.gameStore.notify();
            }
        });
    });

    function selectCell(r, c) {
        const oldCell = container.querySelector(`#td-cell-${currentSelectedRow}-${currentSelectedCol}`);
        if (oldCell) oldCell.classList.remove('selected');

        const newCell = container.querySelector(`#td-cell-${r}-${c}`);
        if (newCell) {
            newCell.classList.add('selected');
            const editor = newCell.querySelector('.cell-editor');
            if (editor && document.activeElement !== editor) {
                editor.focus();
            }
        }

        currentSelectedRow = r;
        currentSelectedCol = c;
        dg.selectedCell = { row: r, col: c };

        const colLetter = colHeaders[c];
        refBox.textContent = `${colLetter}${r + 1}`;
        bottomStatus.textContent = `READY | Selected Cell: ${colLetter}${r + 1}`;

        const cellVal = dg.data[r][c] || '';
        formulaInput.value = cellVal;
    }

    formulaInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const activeInput = container.querySelector(`#td-cell-${currentSelectedRow}-${currentSelectedCol} .cell-editor`);
        if (activeInput) {
            activeInput.value = val;
        }
        window.gameStore.updateCell(currentSelectedRow, currentSelectedCol, val);
    });

    formulaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            formulaInput.blur();
            window.gameStore.notify();
        }
    });

    const guideBtn = container.querySelector('#btn-audit-guide');
    if (guideBtn) {
        guideBtn.addEventListener('click', () => {
            alert(`=== Q3 REGIONAL SALES AUDIT CHECKLIST ===\n\n1. Target Sheet: Q3_Regional_Sales_v4_FINAL.xlsx\n2. Primary Issue: Cell D2 (US-East-01 Q3 Projected) has a hidden non-breaking space trap (\\u00A0).\n3. Fix: Click cell D2 and re-type 15800 cleanly.\n4. Formula: Verify row 7 TOTAL_SUM formulas =SUM(D2:D6).\n5. Final Step: Click 'Validate & Submit' button in top toolbar to send for Q3 audit approval.`);
        });
    }

    const recalcBtn = container.querySelector('#btn-recalc-sheet');
    if (recalcBtn) {
        recalcBtn.addEventListener('click', () => {
            window.gameStore.notify();
            window.gameStore.addToast("Calculation Complete", "Formula engine synchronized.");
        });
    }

    const valBtn = container.querySelector('#btn-validate-grid');
    if (valBtn) {
        valBtn.addEventListener('click', () => {
            window.gameStore.validateAndSubmitGrid();
        });
    }
}

// ==========================================================================
// 6. OmniTask Component Renderer (Guided Task Dashboard)
// ==========================================================================
function renderOmniTask(container) {
    const state = window.gameStore.getState();
    const allTasks = state.omnitask.tasks;
    const visibleTasks = allTasks.filter(t => t.status !== 'PENDING');

    container.innerHTML = `
        <div class="omnitask-container">
            <header class="omnitask-header">
                <div class="omnitask-title-group">
                    <span class="omnitask-icon">[TASK]</span>
                    <h2>OmniTask Workstation Assignment Dashboard</h2>
                </div>
                <div class="omnitask-meta">
                    <span>Task Cycle: Stage ${state.omnitask.taskCycle}</span> &bull;
                    <span>Active Tasks: ${allTasks.filter(t => t.status === 'IN_PROGRESS').length}</span> &bull; 
                    <span>Completed: ${allTasks.filter(t => t.status === 'COMPLETED').length}</span>
                </div>
            </header>

            <div class="task-list-viewport">
                ${visibleTasks.map(t => `
                    <div class="task-card ${t.status.toLowerCase()} ${t.isGlitched ? 'glitched-card' : ''}">
                        <header class="task-card-header">
                            <div class="task-title-box">
                                <span class="priority-badge ${t.priority.toLowerCase()}">${t.priority}</span>
                                <h3 class="task-title">${escapeHtml(t.title)}</h3>
                            </div>
                            <span class="status-pill ${t.status.toLowerCase()}">${t.status.replace('_', ' ')}</span>
                        </header>
                        
                        <div class="task-instructions-box">
                            <span class="instructions-label">EXPLICIT INSTRUCTIONS:</span>
                            <ul class="instruction-list">
                                ${t.instructions.map(inst => `<li>${escapeHtml(inst)}</li>`).join('')}
                            </ul>
                        </div>

                        ${t.id === 'task-clear-cache' && t.status !== 'COMPLETED' ? `
                            <div class="cache-clean-widget" style="margin-top: 10px; width: 100%; border: 1px dashed var(--border-color); padding: 8px; border-radius: 4px; background: rgba(0,0,0,0.2);">
                                <button class="btn-primary compact" id="btn-run-cache-cleaner" style="width: 100%;">
                                    ${state.cacheCleanProgress !== undefined ? `Purging Temp Files: ${state.cacheCleanProgress}%` : 'Run Local Temp Purge'}
                                </button>
                                ${state.cacheCleanProgress !== undefined ? `
                                    <div class="progress-container" style="margin-top: 5px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                        <div class="progress-bar" style="width: ${state.cacheCleanProgress}%; height: 100%; background: var(--accent-blue);"></div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        ${t.isGlitched && t.status !== 'COMPLETED' ? `
                            <div class="glitch-progress-widget" style="margin-top: 10px; width: 100%; border: 1px dashed var(--accent-red); padding: 8px; border-radius: 4px; background: rgba(220,38,38,0.05);">
                                <div style="font-size: 11px; color: var(--accent-red); margin-bottom: 4px;">Reconciliation Progress: ${state.gregTaskProgress && state.gregTaskProgress[t.id] !== undefined ? state.gregTaskProgress[t.id] : 0}%</div>
                                <div class="progress-container" style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                                    <div class="progress-bar" style="width: ${state.gregTaskProgress && state.gregTaskProgress[t.id] !== undefined ? state.gregTaskProgress[t.id] : 0}%; height: 100%; background: var(--accent-red);"></div>
                                </div>
                            </div>
                        ` : ''}

                        <footer class="task-card-footer" style="margin-top: 12px;">
                            ${t.isGlitched ? `
                                <button class="btn-primary compact btn-glitch-task" data-id="${t.id}" style="border-color: var(--accent-red); color: var(--accent-red); background: rgba(220, 38, 38, 0.1);" ${t.status === 'COMPLETED' ? 'disabled' : ''}>
                                    ${t.status === 'COMPLETED' ? 'Reconciled' : 'Execute Reconcile Deliverable &gt;'}
                                </button>
                            ` : `
                                <button class="btn-primary compact btn-jump-app" data-app="${t.appTarget}">
                                    ${t.status === 'COMPLETED' ? 'Review Application' : 'Go to Task App'} &gt;
                                </button>
                            `}
                        </footer>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.btn-jump-app').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetApp = btn.getAttribute('data-app');
            window.gameStore.setActiveApp(targetApp);
        });
    });

    container.querySelectorAll('.btn-glitch-task').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.getAttribute('data-id');
            window.gameStore.executeGlitchedTask(taskId);
        });
    });

    const cleanBtn = container.querySelector('#btn-run-cache-cleaner');
    if (cleanBtn) {
        cleanBtn.addEventListener('click', () => {
            window.gameStore.runCacheCleaner();
        });
    }
}

// ==========================================================================
// 7. OmniDocs Component Renderer (Document & Policy Portal)
// ==========================================================================
function renderOmniDocs(container) {
    const state = window.gameStore.getState();
    const od = state.omnidocs;
    const activeDoc = od.documents.find(d => d.id === od.activeDocId) || od.documents[0];

    container.innerHTML = `
        <div class="omnidocs-container">
            <aside class="omnidocs-sidebar">
                <div class="sidebar-header">
                    <span class="workspace-name">OmniDocs Portal</span>
                </div>
                <ul class="doc-list">
                    ${od.documents.filter(d => {
                        if (d.id === "doc-q3-brief") return true;
                        if (d.id === "doc-civility") return state.omnitask.taskCycle >= 1;
                        if (d.id === "doc-sec-audit") return state.omnitask.taskCycle >= 3;
                        if (d.id === "doc-desk-attest") return state.omnitask.taskCycle >= 3;
                        return false;
                    }).map(d => `
                        <li class="doc-item ${d.id === od.activeDocId ? 'active' : ''}" data-doc-id="${d.id}">
                            <span class="doc-category">${escapeHtml(d.category)}</span>
                            <span class="doc-title">${escapeHtml(d.title)}</span>
                            ${d.signed ? '<span class="signed-badge">[SIGNED]</span>' : '<span class="pending-badge">[PENDING]</span>'}
                        </li>
                    `).join('')}
                </ul>
            </aside>

            <section class="omnidocs-main">
                <header class="doc-header">
                    <h2>${escapeHtml(activeDoc.title)}</h2>
                    <span class="doc-category-pill">${escapeHtml(activeDoc.category)}</span>
                </header>
                <div class="doc-body">
                    <pre class="doc-text">${escapeHtml(activeDoc.content)}</pre>
                </div>
                <footer class="doc-footer">
                    ${activeDoc.signed ? `
                        <button class="btn-secondary disabled" disabled>[SIGNED] Attestation Completed</button>
                    ` : `
                        <button class="btn-primary" id="btn-sign-doc">Sign Attestation & Complete Task</button>
                    `}
                </footer>
            </section>
        </div>
    `;

    container.querySelectorAll('.doc-item').forEach(item => {
        item.addEventListener('click', () => {
            od.activeDocId = item.getAttribute('data-doc-id');
            window.gameStore.notify();
        });
    });

    const signBtn = container.querySelector('#btn-sign-doc');
    if (signBtn) {
        signBtn.addEventListener('click', () => {
            window.gameStore.signOmniDoc(activeDoc.id);
        });
    }
}

// ==========================================================================
// 8. OmniVault Component Renderer (Interactive Preview Split Pane)
// ==========================================================================
function renderOmniVault(container) {
    const state = window.gameStore.getState();
    const vault = state.omnivault;
    const activeFolder = vault.folders.find(f => f.id === vault.activeFolderId) || vault.folders[0];
    const isLocked = activeFolder.locked;
    const requestStatus = vault.accessRequests[activeFolder.id];

    const fileTypeIcons = {
        spreadsheet: '📊',
        pdf: '📄',
        presentation: '📽️',
        document: '📝',
        data: '📈',
        log: '📋'
    };

    container.innerHTML = `
        <div class="omnivault-container">
            <aside class="omnivault-sidebar">
                <div class="sidebar-header">
                    <span class="workspace-name">OmniVault Storage</span>
                    <span class="vault-badge">${vault.folders.filter(f => !f.locked).length}/${vault.folders.length} Folders</span>
                </div>
                <ul class="folder-list">
                    ${vault.folders.map(f => {
                        const req = vault.accessRequests[f.id];
                        let lockBadge = '<span class="open-badge">OPEN</span>';
                        if (f.locked) {
                            lockBadge = req === "pending" ? '<span class="lock-badge pending">PENDING</span>' : '<span class="lock-badge">LOCKED</span>';
                        }
                        return `
                            <li class="folder-item ${f.id === vault.activeFolderId ? 'active' : ''}" data-folder-id="${f.id}">
                                <span class="folder-icon">${f.icon}</span>
                                <div class="folder-info">
                                    <span class="folder-name">${escapeHtml(f.name)}</span>
                                    <span class="folder-count">${f.files.length} files</span>
                                </div>
                                ${lockBadge}
                            </li>
                        `;
                    }).join('')}
                </ul>
            </aside>

            <section class="omnivault-main">
                <header class="vault-header">
                    <div class="vault-title-box">
                        <span class="vault-folder-icon">${activeFolder.icon}</span>
                        <h2>${escapeHtml(activeFolder.name)}</h2>
                        ${isLocked ? '<span class="vault-lock-tag">🔒 RESTRICTED</span>' : '<span class="vault-open-tag">✅ ACCESSIBLE</span>'}
                    </div>
                    ${isLocked ? `
                        <button class="btn-primary compact" id="btn-request-access" ${requestStatus === 'pending' ? 'disabled' : ''}>
                            ${requestStatus === 'pending' ? 'Request In Queue...' : 'Request Access'}
                        </button>
                    ` : ''}
                </header>

                <div class="vault-split-viewport">
                    <div class="vault-file-pane">
                        ${isLocked ? `
                            <div class="vault-locked-overlay">
                                <div class="lock-icon-large">🔒</div>
                                <h3>Security Clearance Level 3 Required</h3>
                                <p>Access log audited under rule #402. Requests auto-route for processing.</p>
                                ${requestStatus === 'pending' ? `
                                    <div class="request-status animate-pulse">
                                        📨 Access Request: [PENDING]. Auto-approving...
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <table class="file-table">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Size</th>
                                        <th>Modified</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${activeFolder.files.map(f => `
                                        <tr class="file-row ${f.id === vault.selectedFileId ? 'selected-file' : ''}" data-file-id="${f.id}">
                                            <td class="file-name-cell">
                                                <span class="file-type-icon">${fileTypeIcons[f.type] || '📄'}</span>
                                                <span class="clickable-file-title">${escapeHtml(f.name)}</span>
                                            </td>
                                            <td class="file-size">${escapeHtml(f.size)}</td>
                                            <td class="file-modified">${escapeHtml(f.modified)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>

                    <div class="vault-preview-pane">
                        ${vault.selectedFileId && !isLocked ? renderFilePreview(vault.selectedFileId) : `
                            <div class="preview-empty-state">
                                <span>📄 Select a file in the directory to preview contents.</span>
                            </div>
                        `}
                    </div>
                </div>

                <footer class="vault-footer">
                    <span>Active Directory: ${escapeHtml(activeFolder.name)}</span>
                    <span>•</span>
                    <span>IT Security Node: ACTIVE</span>
                </footer>
            </section>
        </div>
    `;

    container.querySelectorAll('.folder-item').forEach(item => {
        item.addEventListener('click', () => {
            const folderId = item.getAttribute('data-folder-id');
            window.gameStore.setActiveVaultFolder(folderId);
        });
    });

    container.querySelectorAll('.file-row').forEach(row => {
        row.addEventListener('click', () => {
            const fileId = row.getAttribute('data-file-id');
            window.gameStore.selectVaultFile(fileId);
        });
    });

    const reqBtn = container.querySelector('#btn-request-access');
    if (reqBtn && requestStatus !== 'pending') {
        reqBtn.addEventListener('click', () => {
            window.gameStore.requestFileAccess(activeFolder.id);
        });
    }
}

function renderFilePreview(fileId) {
    if (fileId === "file-q3-sales") {
        return `
            <div class="file-preview-viewer">
                <header class="preview-header">
                    <h4>📊 DataGrid Sheet Snapshot</h4>
                </header>
                <div class="preview-doc-body font-mono">
                    <table class="grid-table mini">
                        <thead>
                            <tr><th>Region</th><th>Q1</th><th>Q2</th><th>Q3 Proj</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>US-East-01</td><td>12500</td><td>14200</td><td>15800</td></tr>
                            <tr><td>US-West-02</td><td>9800</td><td>10100</td><td>11500</td></tr>
                            <tr><td>EU-North-01</td><td>21000</td><td>19500</td><td>22400</td></tr>
                            <tr><td>APAC-S-04</td><td>8400</td><td>9200</td><td>9900</td></tr>
                        </tbody>
                    </table>
                    <p style="font-size: 10px; margin-top: 10px; color: var(--text-muted);">Source: Q3_Regional_Sales_v4_FINAL.xlsx</p>
                </div>
            </div>
        `;
    }
    if (fileId === "file-rev-sum") {
        return `
            <div class="file-preview-viewer">
                <header class="preview-header">
                    <h4>📄 Revenue_Summary.pdf</h4>
                </header>
                <div class="preview-doc-body">
                    <div class="pdf-logo">OMNICORP FINANCIAL DIVISION</div>
                    <h3 style="margin-top: 10px; font-size:13px;">Q3 Operational Cash Flow Attestation</h3>
                    <p style="font-size:11px; margin-top: 8px; line-height: 1.5; color: var(--text-secondary);">
                        Preliminary alignment diagnostics suggest that regional revenue variance is within standard 5% parameters. DataGrid audits must confirm row totals match historical APAC ledger balances.
                    </p>
                    <div style="border-top:1px dashed var(--border-color); margin-top: 15px; padding-top: 8px; font-size: 9px; font-family:var(--font-mono); color:var(--text-muted);">
                        Audit Attestation ID: ACC-30492-Q3
                    </div>
                </div>
            </div>
        `;
    }
    if (fileId === "file-reg-charts" || fileId === "file-board-deck") {
        return `
            <div class="file-preview-viewer">
                <header class="preview-header">
                    <h4>📽️ Corporate Slide Presentation Deck</h4>
                </header>
                <div class="preview-doc-body text-center">
                    <div style="background: #0f172a; border: 1px solid var(--border-color); padding: 20px; font-family: var(--font-mono);">
                        <h2 style="font-size: 14px; color: var(--accent-blue);">Q3 STRATEGY DELIVERABLES</h2>
                        <p style="font-size: 10px; color: var(--text-secondary); margin-top: 8px;">Presented by Brad Sterling, Operations Director</p>
                        <div style="display: flex; justify-content: space-around; margin-top: 15px;">
                            <span style="font-size: 9px; border:1px solid #3b82f6; padding: 2px 6px;">Synergy: 100%</span>
                            <span style="font-size: 9px; border:1px solid #10b981; padding: 2px 6px;">SLA: Met</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    if (fileId === "file-2fa-viol") {
        return `
            <div class="file-preview-viewer">
                <header class="preview-header">
                    <h4>📋 2FA_Violations_Report.log</h4>
                </header>
                <div class="preview-doc-body font-mono" style="font-size:11px; background:#000; padding: 10px; color: #f87171; line-height: 1.4;">
                    <div>[09:12:04] WARN: Token expiration for Node Analyst_JA.</div>
                    <div>[09:17:15] ERG-AUDIT: Triggering compliance notification monitor angle.</div>
                    <div>[09:30:12] AUTH-FAIL: Directory code SEC-LOGS access request deferred.</div>
                    <div>[09:35:44] SYS-INFO: Session validation bypass code detected in cell D2.</div>
                    <div style="color: #4ade80;">[AUDIT STATE]: ATTESTATION REQUIRED IN OMNIDOCS.</div>
                </div>
            </div>
        `;
    }
    if (fileId === "file-access-audit") {
        return `
            <div class="file-preview-viewer">
                <header class="preview-header">
                    <h4>📈 Access_Audit_2024.csv</h4>
                </header>
                <div class="preview-doc-body font-mono" style="font-size: 11px;">
                    <div>Date,User,Resource,Status</div>
                    <div>08-04,J.Analyst,folder-exec,PENDING</div>
                    <div>08-04,C.Miller,folder-exec,APPROVED</div>
                    <div>08-04,K.Vance,folder-it,APPROVED</div>
                </div>
            </div>
        `;
    }
    return `
        <div class="file-preview-viewer">
            <header class="preview-header">
                <h4>📝 Document Template</h4>
            </header>
            <div class="preview-doc-body text-center" style="color: var(--text-muted); padding: 40px 10px;">
                Standard templates are read-only.
            </div>
        </div>
    `;
}

// ==========================================================================
// 9. OmniTicket Component Renderer (ServiceNow/Jira Ticketing App)
// ==========================================================================
function renderOmniTicket(container) {
    const state = window.gameStore.getState();
    const ot = state.omniticket;
    const selectedTkt = ot.tickets.find(t => t.id === ot.selectedTicketId) || ot.tickets[0];

    container.innerHTML = `
        <div class="omniticket-container">
            <aside class="omniticket-sidebar">
                <div class="sidebar-header">
                    <span class="workspace-name">OmniTicket Backlog</span>
                    <span class="vault-badge">${ot.tickets.filter(t => t.status !== 'CLOSED').length} Active</span>
                </div>
                <ul class="ticket-list">
                    ${ot.tickets.map(t => `
                        <li class="ticket-item ${t.id === ot.selectedTicketId ? 'active' : ''} ${t.status.toLowerCase()}" data-ticket-id="${t.id}">
                            <div class="ticket-row-title">
                                <span class="priority-badge ${t.priority.toLowerCase()}">${t.priority}</span>
                                <span class="ticket-id">${escapeHtml(t.id)}</span>
                            </div>
                            <span class="ticket-name">${escapeHtml(t.title)}</span>
                            <span class="ticket-status-pill">${escapeHtml(t.status)}</span>
                        </li>
                    `).join('')}
                </ul>
            </aside>

            <section class="omniticket-main">
                <header class="ticket-header">
                    <div class="ticket-title-box">
                        <h2>${escapeHtml(selectedTkt.title)}</h2>
                        <span class="doc-category-pill">${escapeHtml(selectedTkt.category)}</span>
                    </div>
                    <span class="ticket-status-large">${escapeHtml(selectedTkt.status)}</span>
                </header>

                <div class="ticket-body">
                    <div class="ticket-section">
                        <h3>Description</h3>
                        <p class="ticket-desc-text">${escapeHtml(selectedTkt.description)}</p>
                    </div>

                    ${selectedTkt.status !== 'CLOSED' ? `
                        <div class="ticket-section verification-section">
                            <h3>Compliance Resolution Attestation</h3>
                            <p>Enter the security verification token code listed in description to archive this ticket:</p>
                            <div class="ticket-resolve-bar">
                                <input type="text" id="ticket-verification-code" class="ticket-code-input" placeholder="ENTER COMPLIANCE CODE" autocomplete="off">
                                <button class="btn-primary" id="btn-resolve-ticket" data-ticket-id="${selectedTkt.id}">
                                    De-escalate & Resolve Ticket
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="ticket-closed-splash">
                            <span class="closed-stamp">✓ TICKET ARCHIVED</span>
                            <p>This compliance action has been completed and verified by IT Security.</p>
                        </div>
                    `}
                </div>

                <footer class="ticket-footer">
                    <span>Active Audit Node: SEC-TKT-NODE</span>
                </footer>
            </section>
        </div>
    `;

    // Ticket selection
    container.querySelectorAll('.ticket-item').forEach(item => {
        item.addEventListener('click', () => {
            const ticketId = item.getAttribute('data-ticket-id');
            window.gameStore.setActiveTicket(ticketId);
        });
    });

    // Resolve ticket
    const resolveBtn = container.querySelector('#btn-resolve-ticket');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', () => {
            const tktId = resolveBtn.getAttribute('data-ticket-id');
            const inputEl = container.querySelector('#ticket-verification-code');
            if (inputEl) {
                window.gameStore.resolveTicket(tktId, inputEl.value);
            }
        });
    }
}

// ==========================================================================
// 10. Security 2FA Modal Renderer
// ==========================================================================
function show2FAModal() {
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
        } else {
            window.gameStore.adjustPatience(-5);
            window.gameStore.addToast("Authentication Failed", "Invalid code. Please try 849201.", true);
        }
    });

    cancelBtn.addEventListener('click', () => {
        modalLayer.classList.add('hidden');
        window.gameStore.defer2FA(5);
    });
}

window.show2FAModal = show2FAModal;

// ==========================================================================
// 10b. Security Inbound Call Request Modal Renderer
// ==========================================================================
function showInboundCallModal() {
    const modalLayer = document.getElementById('modal-layer');
    if (!modalLayer) return;

    const callState = window.gameStore.getState().inboundCall;
    if (!callState || !callState.active) return;

    modalLayer.classList.remove('hidden');
    modalLayer.innerHTML = `
        <div class="modal-box inbound-call-box">
            <header class="modal-header">
                <span class="modal-title">[SYNC] Inbound Sync Request</span>
                <span class="modal-tag urgent">INCOMING</span>
            </header>
            <div class="modal-body" style="padding: 15px;">
                <p><strong>Caller:</strong> ${escapeHtml(callState.callerName)}</p>
                <p style="margin-top: 8px;"><strong>Reason:</strong> "${escapeHtml(callState.reason)}"</p>
                <p style="margin-top: 12px; font-size:11px; color:var(--text-secondary);">An immediate voice sync is requested to align on operational deliverables.</p>
            </div>
            <footer class="modal-footer" style="display:flex; justify-content: space-between; padding: 10px;">
                <button class="btn-danger compact" id="btn-decline-inbound">Decline Call</button>
                <button class="btn-primary compact" id="btn-accept-inbound">Answer Call</button>
            </footer>
        </div>
    `;

    modalLayer.querySelector('#btn-accept-inbound').addEventListener('click', () => {
        window.gameStore.respondToInboundCall(true);
    });

    modalLayer.querySelector('#btn-decline-inbound').addEventListener('click', () => {
        window.gameStore.respondToInboundCall(false);
    });
}

window.showInboundCallModal = showInboundCallModal;


// ==========================================================================
// 11. Main Application Lifecycle & View Switcher
// ==========================================================================
function initApp() {
    const store = window.gameStore;
    const state = store.getState();

    // Inject Start Menu Styles dynamically
    const startStyle = document.createElement('style');
    startStyle.textContent = `
        .flat-menu-btn {
            transition: none !important;
        }
        .flat-menu-btn:hover {
            background: #ffffff !important;
            color: #000000 !important;
        }
        .flat-menu-btn:focus {
            outline: none;
        }
    `;
    document.head.appendChild(startStyle);

    // Inject Start Menu Overlay dynamically
    const startOverlay = document.createElement('div');
    startOverlay.id = 'game-start-menu';
    startOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #000000;
        color: #ffffff;
        z-index: 999999;
        font-family: 'JetBrains Mono', Courier, monospace;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 40px;
        box-sizing: border-box;
    `;
    startOverlay.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 54px; font-weight: 800; margin: 0; letter-spacing: 4px; font-family: inherit; color: #ffffff;">OVERWORKED</h1>
            <p style="font-size: 16px; margin: 10px 0 0 0; color: #888888; font-style: italic;">"a simulator"</p>
        </div>

        <div style="display: flex; width: 800px; height: 380px; border: 2px solid #ffffff; background: #000000;">
            <!-- Left side: Buttons -->
            <div style="width: 250px; border-right: 2px solid #ffffff; display: flex; flex-direction: column; padding: 20px; gap: 15px; justify-content: center;">
                <button id="menu-btn-settings" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:10px; font-family:inherit; font-size:12px; cursor:pointer; font-weight:bold; text-align:left;">[ SETTINGS ]</button>
                <button id="menu-btn-mode" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:10px; font-family:inherit; font-size:12px; cursor:pointer; font-weight:bold; text-align:left;">[ MODE: ${state.settings.mode.toUpperCase()} ]</button>
                <button id="menu-btn-instructions" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:10px; font-family:inherit; font-size:12px; cursor:pointer; font-weight:bold; text-align:left;">[ INSTRUCTIONS ]</button>
                <button id="menu-btn-devlog" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:10px; font-family:inherit; font-size:12px; cursor:pointer; font-weight:bold; text-align:left;">[ DEVELOPMENT LOG ]</button>
                <button id="menu-btn-credits" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:10px; font-family:inherit; font-size:12px; cursor:pointer; font-weight:bold; text-align:left;">[ CREDITS ]</button>
                <button id="menu-btn-start" class="flat-menu-btn" style="background:none; color:#fff; border:4px solid #fff; padding:18px 10px; font-family:inherit; font-size:16px; cursor:pointer; font-weight:bold; text-align:center; margin-top: 15px;">START WORKDAY</button>
            </div>
            <!-- Right side: Panel Display -->
            <div id="menu-content-panel" style="flex: 1; padding: 24px; font-size: 12px; line-height: 1.6; overflow-y: auto; font-family: inherit;">
                <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 6px;">OMNICORP SHIFT PROTOCOL</div>
                <p>Welcome, Junior Data Analyst. Please verify your compliance options on the left before initializing your regional workstation shift.</p>
                <p style="margin-top: 12px; color: #888888;">Select SETTINGS to customize call closed captions and workstation time parameters, or read the INSTRUCTIONS to understand controls, mechanics, and gameplay goals.</p>
            </div>
        </div>

        <div style="margin-top: 40px; font-size: 10px; color: #666666; font-family: inherit;">
            Version 7.0
        </div>
    `;
    document.body.appendChild(startOverlay);


    // Sub-content rendering functions
    function renderSettingsContent() {
        const state = store.getState();
        const panel = startOverlay.querySelector('#menu-content-panel');
        panel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #444; padding-bottom: 6px;">COMPLIANCE SETTINGS</div>            <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:12px;">WORKSTATION TIME MODE</div>
                    <div style="font-size:10px; color:#888;">System Time (Local clock) or Game Time (Starts 9:00 PM, 1 min = 35s).</div>
                </div>
                <button id="toggle-TimeMode" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:6px 16px; font-family:inherit; font-size:11px; cursor:pointer; font-weight:bold; width:130px;">
                    ${state.settings.timeMode === "game" ? 'GAME TIME' : 'SYSTEM TIME'}
                </button>
            </div>

            <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:12px;">HUD PATIENCE BAR</div>
                    <div style="font-size:10px; color:#888;">Toggles visibility of the patience meter bar in the top header.</div>
                </div>
                ${state.settings.mode === "hard" ? `
                    <button id="toggle-PatienceBar" class="flat-menu-btn" disabled style="background:#851414; color:#fff; border:2px solid #851414; padding:6px 16px; font-family:inherit; font-size:11px; cursor:not-allowed; font-weight:bold; width:200px;">
                        DISABLED DUE TO MODE
                    </button>
                ` : `
                    <button id="toggle-PatienceBar" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:6px 16px; font-family:inherit; font-size:11px; cursor:pointer; font-weight:bold; width:130px;">
                        ${state.settings.showPatienceBar ? 'VISIBLE' : 'HIDDEN'}
                    </button>
                `}
            </div>

            <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:12px;">IMMEDIATE CHAT REPLIES</div>
                    <div style="font-size:10px; color:#888;">Disable typing delays to receive instant coworker responses.</div>
                </div>
                <button id="toggle-Immediate" class="flat-menu-btn" style="background:none; color:#fff; border:2px solid #fff; padding:6px 16px; font-family:inherit; font-size:11px; cursor:pointer; font-weight:bold; width:130px;">
                    ${state.settings.immediateReplies ? 'ENABLED' : 'DISABLED'}
                </button>
            </div>
        `;

        panel.querySelector('#toggle-TimeMode').addEventListener('click', () => {
            const nextMode = store.getState().settings.timeMode === "game" ? "system" : "game";
            store.setTimeModeSetting(nextMode);
            renderSettingsContent();
        });

        const togglePat = panel.querySelector('#toggle-PatienceBar');
        if (togglePat && store.getState().settings.mode !== "hard") {
            togglePat.addEventListener('click', () => {
                store.togglePatienceBarSetting();
                renderSettingsContent();
            });
        }


        panel.querySelector('#toggle-Immediate').addEventListener('click', () => {
            store.toggleImmediateRepliesSetting();
            renderSettingsContent();
        });
    }


    function renderInstructionsContent() {
        const panel = startOverlay.querySelector('#menu-content-panel');
        panel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 6px;">COMPLIANCE MANUAL & PLOT GUIDE</div>
            <div style="display:flex; flex-direction:column; gap:12px; max-height:290px; overflow-y:auto; padding-right:10px; font-family:inherit; font-size:11px; line-height:1.5;">
                <div>
                    <strong style="color:#fff; text-transform:uppercase;">Overview:</strong><br>
                    You are a Junior Data Analyst at OmniCorp Global. You are assigned to audit spreadsheets and sign safety surveys. Your colleague Greg Jenkins reached his limit and walked out, meaning Brad (management) dumped all of his glitched worksheets onto your queue. You must survive the workday under constant IT audits, password rotations, defragmentation requests, and corporate micro-management.
                </div>
                <div>
                    <strong style="color:#fff; text-transform:uppercase;">Core Game Mechanics:</strong><br>
                    - <strong style="color:#fff;">Challenge Modes:</strong> Choose Beginner (standard gameplay), Medium (1.5x patience popup cost, sooner blockers), or Hard (hidden patience bar, unhelpful coworkers, immediate blockers).<br>
                    - <strong style="color:#fff;">Patience (Lifeline):</strong> Your patience is your primary lifeline. When compliance popups appear, your patience drains. If patience hits 0, you get terminated (Game Over). You can toggle the visibility of the patience meter bar in the SETTINGS panel (disabled in Hard mode).<br>
                    - <strong style="color:#fff;">Tasks Queue:</strong> The OmniTask tab shows your objectives. Complete them to progress through 3 distinct shift stages.<br>
                    - <strong style="color:#fff;">Data Audits:</strong> In Stage 2, row total cells in the DataGrid will reject numbers due to hidden non-breaking spaces. Inspect cell formulas carefully!
                </div>
                <div>
                    <strong style="color:#fff; text-transform:uppercase;">Controls & Communication:</strong><br>
                    - <strong style="color:#fff;">SyncTalk Chat:</strong> Click chat bubbles to respond to Brad, HR, and IT support. You can type manual messages or click suggested compliance options.<br>
                    - <strong style="color:#fff;">Inbound voice calls:</strong> Mentioning call syncs to colleagues with a valid reason will trigger call invites. Answer or decline them to align deliverables.<br>
                    - <strong style="color:#fff;">Folder approvals:</strong> If Derek Owens (IT Helpdesk) blocks folder access, request it in OmniVault and tell him "SEC-LOGS" in chat to prompt administrative overrides.
                </div>
            </div>
        `;
    }


    function renderDevLogContent() {
        const panel = startOverlay.querySelector('#menu-content-panel');
        panel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 6px;">DEVELOPMENT LOG & PATCH NOTES</div>
            <div style="display:flex; flex-direction:column; gap:14px; max-height:290px; overflow-y:auto; padding-right:10px; font-family:inherit; font-size:11px;">
                <div>
                    <strong style="color:#fff;">v7.5 (System Overhaul & Final Audit)</strong><br>
                    - Fixed critical progression blocker in DataGrid where the validation success failed to trigger game engine completion.<br>
                    - Completely removed the "Closed Captions" toggle; captions are now permanently enabled during MeetStream calls to ensure no dialogue is missed.<br>
                    - Repatched MeetStream LIVE badge glitch caused by the desktop return button.<br>
                    - Tuned Gemini AI personality prompts for strictly shorter, professional responses.<br>
                    - Verified entire game loop from Cycle 1 to Game Over is 100% playable.
                </div>
                <div>
                    <strong style="color:#fff;">v7.0 (Workstation Challenge Modes & Call Fixes)</strong><br>
                    - Added 3 game difficulty modes: Beginner, Medium, and Hard, each with customized pop-up rates and colleague helpfulness.<br>
                    - Fixed bug where MeetStream badge showed LIVE status after disconnecting from a private or group call.<br>
                    - Disabled HUD Patience Bar toggle in settings during Hard mode.
                </div>
                <div>
                    <strong style="color:#fff;">v6.5 (Patience & Chat Delay Toggles)</strong><br>
                    - Added Settings options to toggle patience bar HUD visibility and toggle immediate DM responses.<br>
                    - Completely removed the hidden backtick-activated Developer Console and level teleporter utilities.<br>
                    - Updated Instructions panel to correct patience descriptions.
                </div>
                <div>
                    <strong style="color:#fff;">v6.0 (Instructions Guide & Message Throttle)</strong><br>
                    - Added dynamic Instructions panel to the start screen containing controls and guides.<br>
                    - Implemented 500ms chat throttle to prevent double notifications.<br>
                    - Configured first-load IT blocker buffer to prevent instant popups on startup.
                </div>
                <div>
                    <strong style="color:#fff;">v5.5 (Settings Menu & Time Toggles)</strong><br>
                    - Added full Start Menu, closed captions settings, and fast game clock option (starts at 9:00 PM, runs 1.7x faster).
                </div>
                <div>
                    <strong style="color:#fff;">v5.0 (Folder Access Safety-net)</strong><br>
                    - Enabled folder unlock via direct SyncTalk DM requests containing "sec-logs" to prevent IT reboot loop deadlocks.
                </div>
                <div>
                    <strong style="color:#fff;">v4.5 (Developer Console)</strong><br>
                    - Created hidden backtick-activated developer console supporting Stage Teleportation (Stages 1-3) and manual blocker triggers.
                </div>
                <div>
                    <strong style="color:#fff;">v4.0 (UX & Motion)</strong><br>
                    - Added smooth transition collapse to toasts, cleared background intervals on Game Over, and centralized modal management.
                </div>
                <div>
                    <strong style="color:#fff;">v3.5 (Sync & Communications)</strong><br>
                    - Implemented professional call intent detection, triggering inbound Call Invites with decline/answer choices.
                </div>
                <div>
                    <strong style="color:#fff;">v3.0 (Workplace Text Realism)</strong><br>
                    - Refined coworker prompts to use casual lowercase styling, abbreviations, typos, and jargon.
                </div>
                <div>
                    <strong style="color:#fff;">v2.5 (Polish Phase 1)</strong><br>
                    - Implemented antispam grace periods, stabilized toast notification DOM, and resolved duplicate toast alerts.
                </div>
                <div>
                    <strong style="color:#fff;">v2.0 (OpenRouter Integration)</strong><br>
                    - Upgraded the chat backend from restricted Google APIs to OpenRouter to restore multi-sentence AI responses.
                </div>
                <div>
                    <strong style="color:#fff;">v1.5 (Compliance & Workflows)</strong><br>
                    - Implemented password rotations, mandatory system updates, cookie consents, standing desk calibration, and defragmentation.
                </div>
                <div>
                    <strong style="color:#fff;">v1.0 (Initial Prototype)</strong><br>
                    - Basic workstation layout with SyncTalk DMs, DataGrid spreadsheets, OmniDocs, OmniVault, and OmniTicket apps.
                </div>
            </div>
        `;
    }

    function renderCreditsContent() {
        const panel = startOverlay.querySelector('#menu-content-panel');
        panel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 6px;">CREDITS</div>
            <div style="font-size: 12px; line-height: 1.8;">
                <p><strong style="color:#fff;">OVERWORKED: A Simulator</strong></p>
                <p>Created by Antigravity & BlankCanvasStudios.</p>
                <p style="margin-top:12px;">Special thanks to Google Deepmind, OpenRouter, and the OmniCorp Compliance Team.</p>
                <p style="margin-top:24px; color:#666;">All rights reserved. Unauthorized workplace unionization is strictly prohibited.</p>
            </div>
        `;
    }

    function renderModeContent() {
        const state = store.getState();
        const panel = startOverlay.querySelector('#menu-content-panel');
        const modeBtn = startOverlay.querySelector('#menu-btn-mode');
        
        panel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #444; padding-bottom: 6px;">SELECT WORKSTATION CHALLENGE MODE</div>
            
            <div style="margin-bottom: 20px; padding: 10px; border: 1px solid ${state.settings.mode === 'beginner' ? '#fff' : '#444'}; cursor: pointer;" id="select-mode-beginner">
                <div style="font-weight: bold; display: flex; justify-content: space-between;">
                    <span>BEGINNER (RECOMMENDED)</span>
                    <span>${state.settings.mode === 'beginner' ? '[ SELECTED ]' : '[ SELECT ]'}</span>
                </div>
                <div style="font-size: 10px; color: #888; margin-top: 5px;">The standard corporate simulator shift. Helpful colleagues and normal compliance timers.</div>
            </div>

            <div style="margin-bottom: 20px; padding: 10px; border: 1px solid ${state.settings.mode === 'medium' ? '#fff' : '#444'}; cursor: pointer;" id="select-mode-medium">
                <div style="font-weight: bold; display: flex; justify-content: space-between;">
                    <span>MEDIUM</span>
                    <span>${state.settings.mode === 'medium' ? '[ SELECTED ]' : '[ SELECT ]'}</span>
                </div>
                <div style="font-size: 10px; color: #888; margin-top: 5px;">Workplace tension escalates. Blocker pop-ups take 1.5x patience. Compliance issues arrive sooner. Colleagues are slightly evasive/unhelpful.</div>
            </div>

            <div style="margin-bottom: 10px; padding: 10px; border: 1px solid ${state.settings.mode === 'hard' ? '#fff' : '#444'}; cursor: pointer;" id="select-mode-hard">
                <div style="font-weight: bold; display: flex; justify-content: space-between;">
                    <span>HARD</span>
                    <span>${state.settings.mode === 'hard' ? '[ SELECTED ]' : '[ SELECT ]'}</span>
                </div>
                <div style="font-size: 10px; color: #888; margin-top: 5px;">Maximum bureaucratic anxiety. Patience bar is hidden and disabled. Coworkers prioritize strict protocol adherence (waste typing time, type "nvm", "PC crashed", etc.). Complex blockers start almost immediately.</div>
            </div>
        `;

        panel.querySelector('#select-mode-beginner').addEventListener('click', () => {
            store.setModeSetting('beginner');
            modeBtn.textContent = '[ MODE: BEGINNER ]';
            renderModeContent();
        });

        panel.querySelector('#select-mode-medium').addEventListener('click', () => {
            store.setModeSetting('medium');
            modeBtn.textContent = '[ MODE: MEDIUM ]';
            renderModeContent();
        });

        panel.querySelector('#select-mode-hard').addEventListener('click', () => {
            store.setModeSetting('hard');
            modeBtn.textContent = '[ MODE: HARD ]';
            renderModeContent();
        });
    }

    // Attach Start Menu click bindings
    startOverlay.querySelector('#menu-btn-settings').addEventListener('click', renderSettingsContent);
    startOverlay.querySelector('#menu-btn-mode').addEventListener('click', renderModeContent);
    startOverlay.querySelector('#menu-btn-instructions').addEventListener('click', renderInstructionsContent);
    startOverlay.querySelector('#menu-btn-devlog').addEventListener('click', renderDevLogContent);
    startOverlay.querySelector('#menu-btn-credits').addEventListener('click', renderCreditsContent);
    startOverlay.querySelector('#menu-btn-start').addEventListener('click', () => {
        // Start the game tickers and fade out menu
        store.startTickerEvents();
        startOverlay.style.display = 'none';
        
        // Show main workstation UI
        document.getElementById('top-bar')?.classList.remove('hidden');
        document.getElementById('desktop-viewport')?.classList.remove('hidden');
    });








    const clockTimeEl = document.getElementById('sys-clock');
    const synctalkUnreadEl = document.getElementById('synctalk-unread');
    const meetStatusBadge = document.getElementById('meetstream-status');

    const appSyncTalk = document.getElementById('app-synctalk');
    const appMeetStream = document.getElementById('app-meetstream');
    const appDataGrid = document.getElementById('app-datagrid');
    const appOmniTask = document.getElementById('app-omnitask');
    const appOmniDocs = document.getElementById('app-omnidocs');
    const appOmniVault = document.getElementById('app-omnivault');
    const appOmniTicket = document.getElementById('app-omniticket');
    const toastContainer = document.getElementById('toast-container');

    const overlayUpdate = document.getElementById('overlay-sys-update');
    const overlayShutdown = document.getElementById('overlay-shutdown');
    const overlayVirus = document.getElementById('overlay-virus');
    const overlayPassword = document.getElementById('overlay-password');
    const overlayMeeting = document.getElementById('overlay-meeting');
    const overlayCookies = document.getElementById('overlay-cookies');
    const overlayCalibration = document.getElementById('overlay-calibration');

    const tabButtons = document.querySelectorAll('.app-tabs .tab-btn');

    // Real-Time / Game Clock Sync
    function updateLiveClock() {
        if (!clockTimeEl) return;
        const state = store.getState();

        if (state.settings && state.settings.timeMode === "game") {
            if (!state.gameTime) {
                state.gameTime = new Date();
                state.gameTime.setHours(21, 0, 0, 0);
            }
            state.gameTime = new Date(state.gameTime.getTime() + 1714);
            clockTimeEl.textContent = state.gameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
            const now = new Date();
            clockTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
    updateLiveClock();
    setInterval(updateLiveClock, 1000);


    function renderApp() {
        // Save cell-editor focus & selection parameters to prevent glitchy typing focus loss
        let focusedRow = null;
        let focusedCol = null;
        let selectionStart = null;
        let selectionEnd = null;
        const activeEl = document.activeElement;
        if (activeEl && activeEl.classList.contains('cell-editor')) {
            focusedRow = activeEl.getAttribute('data-row');
            focusedCol = activeEl.getAttribute('data-col');
            selectionStart = activeEl.selectionStart;
            selectionEnd = activeEl.selectionEnd;
        }

        const state = store.getState();

        // Update patience bar visibility and values
        const patContainer = document.getElementById('patience-bar-container');
        if (patContainer) {
            if (state.settings && state.settings.showPatienceBar) {
                patContainer.style.display = 'flex';
                const fillEl = document.getElementById('patience-fill');
                const textEl = document.getElementById('patience-text');
                if (fillEl && textEl) {
                    const pVal = state.patience;
                    fillEl.style.width = `${pVal}%`;
                    textEl.textContent = `${pVal}%`;

                    // Dynamic colors
                    if (pVal > 60) {
                        fillEl.style.backgroundColor = 'var(--accent-green)';
                    } else if (pVal > 30) {
                        fillEl.style.backgroundColor = '#fbbf24'; // Yellow
                    } else {
                        fillEl.style.backgroundColor = 'var(--accent-red)';
                    }
                }
            } else {
                patContainer.style.display = 'none';
            }
        }


        // Render Blocker Overlays
        // 1. Mandatory IT System Update Blocker
        if (overlayUpdate) {
            if (state.blockers.sysUpdateActive) {
                overlayUpdate.classList.remove('hidden');
                if (overlayUpdate.getAttribute('data-active') !== 'true') {
                    overlayUpdate.setAttribute('data-active', 'true');
                    overlayUpdate.innerHTML = `
                        <div class="blocker-box">
                            <div class="blocker-logo">[+] OMNICORP IT SYSTEM DEPLOYMENT</div>
                            <h2>Installing Critical Workstation Patch v9.4.2...</h2>
                            <p>This workstation has been locked by IT Security Admin directive. Please wait while the update packages install.</p>
                            <div class="progress-container">
                                <div id="update-progress-bar" class="progress-bar" style="width: ${state.blockers.sysUpdatePercent}%;"></div>
                            </div>
                            <div id="update-progress-percent" class="progress-percent">${state.blockers.sysUpdatePercent}% COMPLETE</div>
                        </div>
                    `;
                } else {
                    const bar = overlayUpdate.querySelector('#update-progress-bar');
                    const text = overlayUpdate.querySelector('#update-progress-percent');
                    if (bar) bar.style.width = state.blockers.sysUpdatePercent + '%';
                    if (text) text.textContent = state.blockers.sysUpdatePercent + '% COMPLETE';
                }
            } else {
                overlayUpdate.classList.add('hidden');
                overlayUpdate.removeAttribute('data-active');
            }
        }

        // 2. Audit Violation Security Shutdown Blocker (Moving Button Target & Bypass Code!)
        if (overlayShutdown) {
            if (state.blockers.shutdownAlertActive) {
                overlayShutdown.classList.remove('hidden');
                
                if (overlayShutdown.getAttribute('data-active') !== 'true') {
                    overlayShutdown.setAttribute('data-active', 'true');
                    overlayShutdown.innerHTML = `
                        <div class="blocker-box urgent">
                            <div class="blocker-logo warning-flash">⚠ IT SECURITY AUDIT EXCEPTION</div>
                            <h2>Workstation Lockdown Imminent: Security Override Warning</h2>
                            <p>Compliance systems flagged Node Analyst_JA. Session will terminate and lock profile in <strong style="color:var(--accent-red); font-size:18px;"><span id="shutdown-countdown-timer">${state.blockers.shutdownSeconds}</span></strong> seconds.</p>
                            
                            <!-- Snooze Override Section -->
                            <div class="shutdown-bypass-group" style="margin-top: 15px; border: 1px dashed var(--accent-red); padding: 10px; border-radius: 4px; background: rgba(224, 86, 86, 0.05); text-align: center;">
                                <p style="font-size:11px; color:var(--text-secondary); margin-bottom: 5px;">
                                    <strong>IT Override Hint:</strong> Total column E sum formula (e.g. =SUM(E2:E6))
                                </p>
                                <div style="display:flex; justify-content:center; gap:8px;">
                                    <input type="text" id="shutdown-bypass-code" class="chat-input font-mono" placeholder="Enter override formula..." style="width: 50%; text-align: center; border-color: var(--accent-red);" autocomplete="off">
                                    <button class="btn-primary" id="btn-bypass-shutdown" style="background: var(--accent-red); border-color: var(--accent-red);">[SNOOZE AUDIT]</button>
                                </div>
                            </div>
    
                            <p style="font-size:11px; margin-top:20px; color:var(--text-secondary); text-align: center;">Or de-escalate manually via compliance attestation target below:</p>
                            <button class="btn-primary compact deescalate-target-btn" 
                                    id="btn-deescalate-shutdown">
                                [DE-ESCALATE SYSTEM AUDIT]
                            </button>
                        </div>
                    `;
                    
                    const deescalateBtn = overlayShutdown.querySelector('#btn-deescalate-shutdown');
                    if (deescalateBtn) {
                        deescalateBtn.addEventListener('mouseover', () => {
                            window.gameStore.moveDeescalateButton();
                        });
                        deescalateBtn.addEventListener('click', () => {
                            window.gameStore.deescalateSecurity();
                        });
                    }
    
                    const bypassBtn = overlayShutdown.querySelector('#btn-bypass-shutdown');
                    const bypassInput = overlayShutdown.querySelector('#shutdown-bypass-code');
                    if (bypassBtn && bypassInput) {
                        bypassInput.addEventListener('keydown', (e) => {
                            e.stopPropagation();
                        });
                        bypassBtn.addEventListener('click', () => {
                            window.gameStore.snoozeShutdownWithCode(bypassInput.value);
                        });
                    }
                }
                
                // Update timer & position
                const timerEl = overlayShutdown.querySelector('#shutdown-countdown-timer');
                if (timerEl) timerEl.textContent = state.blockers.shutdownSeconds;
                
                const deescalateBtn = overlayShutdown.querySelector('#btn-deescalate-shutdown');
                if (deescalateBtn) {
                    deescalateBtn.style.position = 'absolute';
                    deescalateBtn.style.top = state.blockers.deescalateButtonPos.top + '%';
                    deescalateBtn.style.left = state.blockers.deescalateButtonPos.left + '%';
                }
            } else {
                overlayShutdown.classList.add('hidden');
                overlayShutdown.removeAttribute('data-active');
            }
        }

        // 3. CyberSecurity Quarantine Blocker (Virus reset progress)
        if (overlayVirus) {
            if (state.blockers.virusActive) {
                overlayVirus.classList.remove('hidden');
                if (overlayVirus.getAttribute('data-active') !== 'true') {
                    overlayVirus.setAttribute('data-active', 'true');
                    overlayVirus.innerHTML = `
                        <div class="blocker-box malware-box">
                            <div class="blocker-logo warning-flash">[☠] OMNICORP QUARANTINE DIRECTIVE 808</div>
                            <h2>CyberSecurity Threat Detected: Workstation Isolated</h2>
                            <p>IT Security has flagged potential registry anomalies. Local baseline synchronization is in progress. Filesystem is currently read-only.</p>
                            <div class="progress-container" style="margin-top: 15px;">
                                <div id="virus-progress-bar" class="progress-bar virus-bar" style="width: ${state.blockers.virusPercent}%;"></div>
                            </div>
                            <div id="virus-progress-percent" class="progress-percent" style="color:var(--accent-red); font-weight: bold; margin-top: 5px;">
                                ${state.blockers.virusPercent}% RESTORING ORIGINAL METRICS...
                            </div>
                        </div>
                    `;
                } else {
                    const bar = overlayVirus.querySelector('#virus-progress-bar');
                    const text = overlayVirus.querySelector('#virus-progress-percent');
                    if (bar) bar.style.width = state.blockers.virusPercent + '%';
                    if (text) text.textContent = state.blockers.virusPercent + '% RESTORING ORIGINAL METRICS...';
                }
            } else {
                overlayVirus.classList.add('hidden');
                overlayVirus.removeAttribute('data-active');
            }
        }

        // 4. Password Rotation Blocker
        if (overlayPassword) {
            if (state.blockers.passwordModalActive) {
                overlayPassword.classList.remove('hidden');
                if (overlayPassword.getAttribute('data-active') !== 'true') {
                    overlayPassword.setAttribute('data-active', 'true');
                    overlayPassword.innerHTML = `
                        <div class="modal-box" style="z-index: 10002;">
                            <header class="modal-header">
                                <span class="modal-title">[SEC] Corporate Credentials - Password Rotation Policy</span>
                                <span class="modal-tag">MANDATORY</span>
                            </header>
                            <div class="modal-body" style="padding: 15px;">
                                <p>According to security guidelines v4.8, you must rotate your workstation password immediately.</p>
                                <p style="font-size:10px; color:var(--text-secondary); line-height:1.3; margin-bottom:15px; margin-top: 5px;">
                                    Requirements: Minimum 12 characters, at least 1 uppercase letter, 1 number, and 1 special symbol.
                                </p>
                                <div class="code-input-group" style="display:flex; gap: 8px;">
                                    <input type="password" id="new-password-input" class="chat-input" placeholder="Enter new password..." style="width:65%;" autocomplete="off">
                                    <button class="btn-primary" id="btn-submit-password">Rotate Password</button>
                                </div>
                            </div>
                            <footer class="modal-footer" style="display:flex; justify-content: flex-end; padding: 10px;">
                                <button class="btn-secondary" id="btn-auto-password">Auto-Generate Passkey</button>
                            </footer>
                        </div>
                    `;
                    const passInput = overlayPassword.querySelector('#new-password-input');
                    const submitBtn = overlayPassword.querySelector('#btn-submit-password');
                    const autoBtn = overlayPassword.querySelector('#btn-auto-password');
    
                    if (submitBtn && passInput) {
                        passInput.addEventListener('keydown', (e) => {
                            e.stopPropagation();
                        });
                        submitBtn.addEventListener('click', () => {
                            window.gameStore.submitNewPassword(passInput.value);
                        });
                    }
                    if (autoBtn) {
                        autoBtn.addEventListener('click', (e) => {
                            e.target.disabled = true;
                            e.target.textContent = "Generating Passkey...";
                            window.gameStore.autoGeneratePasskey();
                        });
                    }
                }
            } else {
                overlayPassword.classList.add('hidden');
                overlayPassword.removeAttribute('data-active');
            }
        }

        // 5. Mandatory Meeting Invite Blocker (Connecting Spinner!)
        if (overlayMeeting) {
            if (state.blockers.meetingInviteActive) {
                overlayMeeting.classList.remove('hidden');
                const currentState = state.blockers.meetingConnecting ? 'connecting' : 'invite';
                const lastState = overlayMeeting.getAttribute('data-connecting-state');
                
                if (overlayMeeting.getAttribute('data-active') !== 'true' || lastState !== currentState) {
                    overlayMeeting.setAttribute('data-active', 'true');
                    overlayMeeting.setAttribute('data-connecting-state', currentState);
                    
                    if (state.blockers.meetingConnecting) {
                        overlayMeeting.innerHTML = `
                            <div class="modal-box connecting-box" style="z-index: 10003;">
                                <div class="connecting-spinner"></div>
                                <h2>Establishing Operational Alignment Stream...</h2>
                                <p style="color:var(--text-secondary); margin-top: 10px;">Routing regional synergy data blocks. Do not disconnect.</p>
                            </div>
                        `;
                    } else {
                        overlayMeeting.innerHTML = `
                            <div class="modal-box" style="z-index: 10003; width: 400px;">
                                <header class="modal-header">
                                    <span class="modal-title">📅 Urgent Meeting Invite: Brad Sterling</span>
                                    <span class="modal-tag urgent">URGENT</span>
                                </header>
                                <div class="modal-body" style="padding: 15px;">
                                    <p><strong>Subject:</strong> Q3 Operational Alignment & Synergies Review</p>
                                    <p style="margin-top: 10px; font-size:11px; color:var(--text-secondary);">This huddle is mandatory for all junior analysts. Attendance check-ins will register on compliance logs.</p>
                                </div>
                                <footer class="modal-footer" style="display:flex; justify-content: space-between; padding: 10px;">
                                    <button class="btn-danger" id="btn-decline-meeting">Decline Meeting</button>
                                    <button class="btn-primary" id="btn-accept-meeting">Accept Sync Invite</button>
                                </footer>
                            </div>
                        `;
                        overlayMeeting.querySelector('#btn-accept-meeting').addEventListener('click', () => {
                            window.gameStore.respondToMeetingInvite(true);
                        });
                        overlayMeeting.querySelector('#btn-decline-meeting').addEventListener('click', () => {
                            window.gameStore.respondToMeetingInvite(false);
                        });
                    }
                }
            } else {
                overlayMeeting.classList.add('hidden');
                overlayMeeting.removeAttribute('data-active');
                overlayMeeting.removeAttribute('data-connecting-state');
            }
        }

        // 6. Cookie Consent Blocker
        if (overlayCookies) {
            if (state.blockers.cookieConsentActive) {
                overlayCookies.classList.remove('hidden');
                const step = state.blockers.cookieConsentStep;
                if (overlayCookies.getAttribute('data-active') !== 'true' || overlayCookies.getAttribute('data-step') !== String(step)) {
                    overlayCookies.setAttribute('data-active', 'true');
                    overlayCookies.setAttribute('data-step', String(step));
                    
                    let stepHTML = '';
                    if (step === 1) {
                        stepHTML = `
                            <p>We value your privacy. We use standard tracking cookies to calibrate synergy metrics. Accept cookies to continue.</p>
                            <div style="display:flex; justify-content:space-between; margin-top:15px;">
                                <button class="btn-primary" id="btn-cookie-accept-all" onclick="window.gameStore.closeCookieConsent()">Accept All Cookies</button>
                                <button class="btn-secondary" id="btn-cookie-manage">Manage Preferences</button>
                            </div>
                        `;
                    } else if (step === 2) {
                        stepHTML = `
                            <p><strong>Step 2: Operational Data Tracking Consent</strong></p>
                            <div style="text-align:left; font-size:10px; margin-top: 10px;">
                                <label><input type="checkbox" checked disabled> Functional Performance Cookies</label><br>
                                <label><input type="checkbox" checked disabled> Stressed Keyboard Frequency Monitor</label><br>
                                <label><input type="checkbox" id="chk-cookie-synergy"> Lumbar Height Calibration Telemetry</label>
                            </div>
                            <div style="text-align:right; margin-top: 15px;">
                                <button class="btn-primary" id="btn-cookie-next">Proceed to Preferences &gt;</button>
                            </div>
                        `;
                    } else if (step === 3) {
                        stepHTML = `
                            <p><strong>Step 3: Verification of Consent Attestation</strong></p>
                            <p style="font-size:10px; color:var(--text-secondary); margin-top:5px;">Please confirm you align with Q3 Cookie Directive v4.02.</p>
                            <div style="text-align:right; margin-top:15px;">
                                <button class="btn-primary" id="btn-cookie-finish">Save & Close</button>
                            </div>
                        `;
                    }
    
                    overlayCookies.innerHTML = `
                        <div class="modal-box cookie-box" style="z-index: 10004; width: 420px;">
                            <header class="modal-header">
                                <span class="modal-title">🍪 Cookie Consent & Privacy Preferences</span>
                                <span class="modal-tag">COMPLIANCE</span>
                            </header>
                            <div class="modal-body" style="padding: 15px;">
                                ${stepHTML}
                            </div>
                        </div>
                    `;
    
                    if (step === 1) {
                        const manageBtn = overlayCookies.querySelector('#btn-cookie-manage');
                        if (manageBtn) manageBtn.addEventListener('click', () => { window.gameStore.setCookieStep(2); });
                    } else if (step === 2) {
                        const nextBtn = overlayCookies.querySelector('#btn-cookie-next');
                        if (nextBtn) nextBtn.addEventListener('click', () => { window.gameStore.setCookieStep(3); });
                    } else if (step === 3) {
                        const finishBtn = overlayCookies.querySelector('#btn-cookie-finish');
                        if (finishBtn) finishBtn.addEventListener('click', () => { window.gameStore.closeCookieConsent(); });
                    }
                }
            } else {
                overlayCookies.classList.add('hidden');
                overlayCookies.removeAttribute('data-active');
                overlayCookies.removeAttribute('data-step');
            }
        }

        // 7. Desk Height Calibration Blocker (Locked Inputs)
        if (overlayCalibration) {
            if (state.blockers.deskCalibrationActive) {
                overlayCalibration.classList.remove('hidden');
                if (overlayCalibration.getAttribute('data-active') !== 'true') {
                    overlayCalibration.setAttribute('data-active', 'true');
                    overlayCalibration.innerHTML = `
                        <div class="blocker-box standing-desk-box">
                            <div class="blocker-logo warning-flash">⚠ OSHA WORKPLACE ERGONOMIC DIRECTIVE</div>
                            <h2>Standing Desk Height Calibration In Progress...</h2>
                            <p>OSHA health standards require desk elevation alignment checks. Stand up immediately.</p>
                            <div class="desk-cal-graphic" style="margin: 20px 0; text-align: center; font-size: 20px; color: var(--accent-blue); animation: pulse 1s infinite alternate;">
                                <div style="margin-bottom:5px;">▲</div>
                                <div style="letter-spacing: 2px;">==========</div>
                                <div style="margin-top:5px;">▲</div>
                            </div>
                            <div style="font-size:24px; font-weight:bold; margin-top:15px; color:var(--accent-blue); text-align: center;">
                                CALIBRATING HEIGHT: <span id="desk-calibration-seconds">${state.blockers.deskCalibrationSeconds}</span>s REMAINING
                            </div>
                        </div>
                    `;
                } else {
                    const timerEl = overlayCalibration.querySelector('#desk-calibration-seconds');
                    if (timerEl) timerEl.textContent = state.blockers.deskCalibrationSeconds;
                }
            } else {
                overlayCalibration.classList.add('hidden');
                overlayCalibration.removeAttribute('data-active');
            }
        }

        // 8. Corporate Re-Attestation Survey Blocker
        const overlaySurvey = document.getElementById('overlay-survey');
        if (overlaySurvey) {
            if (state.blockers.surveyActive) {
                overlaySurvey.classList.remove('hidden');
                const step = state.blockers.surveyStep;
                const lastStep = overlaySurvey.getAttribute('data-step');
                
                if (overlaySurvey.getAttribute('data-active') !== 'true' || lastStep !== String(step)) {
                    overlaySurvey.setAttribute('data-active', 'true');
                    overlaySurvey.setAttribute('data-step', String(step));
                    
                    let stepHTML = '';
                    if (step === 1) {
                        stepHTML = `
                            <p><strong>Synergy Attestation Query:</strong> Are you feeling aligned with your team's synergy goals and corporate values today?</p>
                            <div style="display:flex; justify-content:space-around; margin-top:20px;">
                                <button class="btn-primary" id="btn-survey-yes" style="padding: 6px 20px;">Yes, Aligned</button>
                                <button class="btn-secondary" id="btn-survey-no" style="position:relative; padding: 6px 20px;">No, Blocked</button>
                            </div>
                        `;
                    } else if (step === 2) {
                        stepHTML = `
                            <p style="color:var(--accent-red); font-weight:bold;">[!] Validation Error: Response consistency check failed.</p>
                            <p>Operational synergy metrics require 100% agreement. Do you agree to comply with policy document 402-B to unlock?</p>
                            <div style="display:flex; justify-content:space-around; margin-top:15px;">
                                <button class="btn-primary" id="btn-survey-agree-yes">Yes, Comply</button>
                                <button class="btn-secondary" id="btn-survey-agree-no">No, Disagree</button>
                            </div>
                        `;
                    } else if (step === 3) {
                        stepHTML = `
                            <p><strong>OMNICORP POLICY BRIEFING 402-B</strong></p>
                            <div id="survey-policy-scroll" style="border: 1px solid var(--border-color); height: 100px; overflow-y: scroll; font-size: 10px; padding: 8px; background: rgba(0,0,0,0.2); text-align: left; line-height: 1.4; margin-top: 10px;">
                                <p>Compliance Rule 402-B governs digital workplace alignment audits. All J. Analysts must attestation sign that regional spreadsheet cells match historical ledgers without trailing spaces or non-breaking characters.</p>
                                <p>Lumbar support desk heights must be calibrated at least once per huddle. Security logs directory approvals must be obtained by derek.owens@omnicorp.com.</p>
                            </div>
                            <div id="survey-timer-container" style="margin-top: 15px; font-weight: bold; text-align: center;">
                                ${state.blockers.surveyTimer > 0 ? `
                                    <span style="color:var(--accent-blue);">Reading policy: <span id="survey-seconds-display">${state.blockers.surveyTimer}</span>s remaining...</span>
                                ` : `
                                    <button class="btn-primary" id="btn-survey-attest-submit">Attest Alignment & Close</button>
                                `}
                            </div>
                        `;
                    }
    
                    overlaySurvey.innerHTML = `
                        <div class="modal-box survey-box" style="z-index: 10005; width: 440px;">
                            <header class="modal-header" style="border-bottom-color: var(--accent-blue);">
                                <span class="modal-title">📅 Mandatory Attestation Survey</span>
                                <span class="modal-tag urgent">REQUIRED</span>
                            </header>
                            <div class="modal-body" style="padding: 15px;">
                                ${stepHTML}
                            </div>
                        </div>
                    `;
    
                    if (step === 1) {
                        overlaySurvey.querySelector('#btn-survey-yes').addEventListener('click', () => {
                            window.gameStore.setSurveyStep(2);
                        });
                        const noBtn = overlaySurvey.querySelector('#btn-survey-no');
                        noBtn.addEventListener('click', () => {
                            noBtn.style.position = 'absolute';
                            noBtn.style.top = Math.random() * 80 + '%';
                            noBtn.style.left = Math.random() * 80 + '%';
                            window.gameStore.adjustPatience(-1);
                            window.gameStore.addToast("Civility Alert", "Alignment survey requires positive attestation.", true);
                        });
                    } else if (step === 2) {
                        overlaySurvey.querySelector('#btn-survey-agree-yes').addEventListener('click', () => {
                            window.gameStore.startSurveyTimer();
                        });
                        overlaySurvey.querySelector('#btn-survey-agree-no').addEventListener('click', () => {
                            window.gameStore.setSurveyStep(1);
                        });
                    } else if (step === 3) {
                        const submitAttest = overlaySurvey.querySelector('#btn-survey-attest-submit');
                        if (submitAttest) {
                            submitAttest.addEventListener('click', () => {
                                window.gameStore.closeSurveyBlocker();
                            });
                        }
                    }
                } else if (step === 3) {
                    const timerContainer = overlaySurvey.querySelector('#survey-timer-container');
                    if (timerContainer) {
                        if (state.blockers.surveyTimer > 0) {
                            const timerEl = overlaySurvey.querySelector('#survey-seconds-display');
                            if (timerEl) {
                                timerEl.textContent = state.blockers.surveyTimer;
                            } else {
                                timerContainer.innerHTML = `<span style="color:var(--accent-blue);">Reading policy: <span id="survey-seconds-display">${state.blockers.surveyTimer}</span>s remaining...</span>`;
                            }
                        } else {
                            if (!overlaySurvey.querySelector('#btn-survey-attest-submit')) {
                                timerContainer.innerHTML = `<button class="btn-primary" id="btn-survey-attest-submit">Attest Alignment & Close</button>`;
                                overlaySurvey.querySelector('#btn-survey-attest-submit').addEventListener('click', () => {
                                    window.gameStore.closeSurveyBlocker();
                                });
                            }
                        }
                    }
                }
            } else {
                overlaySurvey.classList.add('hidden');
                overlaySurvey.removeAttribute('data-active');
                overlaySurvey.removeAttribute('data-step');
            }
        }

        // 9. Disk Space Defragmentation Blocker
        const overlayDefrag = document.getElementById('overlay-defrag');
        if (overlayDefrag) {
            if (state.blockers.defragActive) {
                overlayDefrag.classList.remove('hidden');
                const numFilled = Math.floor((state.blockers.defragPercent / 100) * 20);
                
                if (overlayDefrag.getAttribute('data-active') !== 'true') {
                    overlayDefrag.setAttribute('data-active', 'true');
                    
                    let blocksHTML = '';
                    for (let i = 0; i < 20; i++) {
                        let cls = 'defrag-block';
                        if (i < numFilled) cls += ' filled';
                        else if (i === numFilled) cls += ' reading';
                        blocksHTML += `<div class="${cls}"></div>`;
                    }
    
                    overlayDefrag.innerHTML = `
                        <div class="blocker-box defrag-box" style="z-index: 10006; width: 420px; text-align: center;">
                            <div class="blocker-logo">[SYSTEM PROTOCOL] DEFRAGMENTING DATA SECTORS</div>
                            <h2>Workstation Defragmentation In Progress</h2>
                            <p>Disk sectors indexing regional sales templates are defragmenting. Do not shut down.</p>
                            
                            <div class="defrag-blocks-grid">
                                ${blocksHTML}
                            </div>
                            
                            <div id="defrag-progress-text" style="font-size:18px; font-weight:bold; color:#3b82f6;">
                                PROGRESS: ${state.blockers.defragPercent}%
                            </div>
                            
                            <div id="defrag-bypass-container">
                                ${state.blockers.defragPercent >= 99 ? `
                                    <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                                        <p style="color:var(--accent-red); font-size:11px; margin-bottom:10px;">Warning: Defragmentation stalled at 99%. Disk write lock.</p>
                                        <button class="btn-danger" id="btn-defrag-bypass" style="width: 100%;">
                                            Force Bypass Defrag (Drains 15 Patience)
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
    
                    const defragBypassBtn = overlayDefrag.querySelector('#btn-defrag-bypass');
                    if (defragBypassBtn) {
                        defragBypassBtn.addEventListener('click', () => {
                            window.gameStore.bypassDefrag();
                        });
                    }
                } else {
                    const blocks = overlayDefrag.querySelectorAll('.defrag-block');
                    blocks.forEach((block, idx) => {
                        block.className = 'defrag-block';
                        if (idx < numFilled) block.classList.add('filled');
                        else if (idx === numFilled) block.classList.add('reading');
                    });
                    
                    const progressText = overlayDefrag.querySelector('#defrag-progress-text');
                    if (progressText) progressText.textContent = `PROGRESS: ${state.blockers.defragPercent}%`;
                    
                    const bypassContainer = overlayDefrag.querySelector('#defrag-bypass-container');
                    if (bypassContainer) {
                        if (state.blockers.defragPercent >= 99) {
                            if (!overlayDefrag.querySelector('#btn-defrag-bypass')) {
                                bypassContainer.innerHTML = `
                                    <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                                        <p style="color:var(--accent-red); font-size:11px; margin-bottom:10px;">Warning: Defragmentation stalled at 99%. Disk write lock.</p>
                                        <button class="btn-danger" id="btn-defrag-bypass" style="width: 100%;">
                                            Force Bypass Defrag (Drains 15 Patience)
                                        </button>
                                    </div>
                                `;
                                overlayDefrag.querySelector('#btn-defrag-bypass').addEventListener('click', () => {
                                    window.gameStore.bypassDefrag();
                                });
                            }
                        } else {
                            bypassContainer.innerHTML = '';
                        }
                    }
                }
            } else {
                overlayDefrag.classList.add('hidden');
                overlayDefrag.removeAttribute('data-active');
            }
        }

        // 10. Inner Monologue Overlay
        const overlayMonologue = document.getElementById('overlay-monologue');
        if (overlayMonologue) {
            if (state.monologueActive) {
                overlayMonologue.classList.remove('hidden');
                const lastText = overlayMonologue.getAttribute('data-last-text');
                const lastGameOver = overlayMonologue.getAttribute('data-last-gameover') === 'true';
                
                // Only rebuild DOM if text or game-over state actually changed
                if (lastText !== state.monologueText || lastGameOver !== state.gameOver) {
                    overlayMonologue.setAttribute('data-last-text', state.monologueText);
                    overlayMonologue.setAttribute('data-last-gameover', state.gameOver ? 'true' : 'false');
                    
                    overlayMonologue.innerHTML = `
                        <div class="monologue-banner" id="monologue-banner-content">
                            <p class="monologue-text">"${escapeHtml(state.monologueText)}"</p>
                            ${state.gameOver ? `
                                <div class="monologue-sub" style="color:var(--accent-red); font-weight:bold;">[WORKSTATION TERMINATED - ACCESS SUSPENDED]</div>
                            ` : `
                                <div class="monologue-sub">[CLICK MONOLOGUE TO REFLECT &amp; RESUME WORK]</div>
                            `}
                        </div>
                    `;
                    
                    const bannerContent = overlayMonologue.querySelector('#monologue-banner-content');
                    if (bannerContent && !state.gameOver) {
                        bannerContent.addEventListener('click', () => {
                            window.gameStore.dismissMonologueBanner();
                        });
                    }
                }
            } else {
                if (!overlayMonologue.classList.contains('hidden')) {
                    overlayMonologue.classList.add('hidden');
                    overlayMonologue.removeAttribute('data-last-text');
                    overlayMonologue.removeAttribute('data-last-gameover');
                }
            }
        }

        if (synctalkUnreadEl) {
            if (state.synctalk.unreadCount > 0) {
                synctalkUnreadEl.textContent = state.synctalk.unreadCount;
                synctalkUnreadEl.style.display = 'inline-block';
            } else {
                synctalkUnreadEl.style.display = 'none';
            }
        }

        // Update MeetStream tab badge
        if (meetStatusBadge) {
            const isPrivate = state.meetstream.activeCall.type === "private";
            if (state.meetstream.status === 'ENDED') {
                meetStatusBadge.textContent = 'ENDED';
                meetStatusBadge.classList.remove('live');
                meetStatusBadge.classList.add('ended');
            } else if (state.meetstream.connected) {
                meetStatusBadge.textContent = isPrivate ? 'SYNC' : 'LIVE';
                meetStatusBadge.classList.add('live');
                meetStatusBadge.classList.remove('ended');
            } else {
                meetStatusBadge.textContent = '';
                meetStatusBadge.classList.remove('live');
                meetStatusBadge.classList.remove('ended');
            }
        }

        const coreApps = ['synctalk', 'meetstream', 'omnitask'];
        const visibleApps = new Set(coreApps);
        state.omnitask.tasks.forEach(t => {
            if (t.status === 'IN_PROGRESS' || t.status === 'COMPLETED') {
                visibleApps.add(t.appTarget);
            }
        });

        if (!visibleApps.has(state.activeApp)) {
            state.activeApp = 'synctalk';
        }

        tabButtons.forEach(btn => {
            const app = btn.getAttribute('data-app');
            if (visibleApps.has(app)) {
                btn.style.display = 'inline-flex';
            } else {
                btn.style.display = 'none';
            }

            if (app === state.activeApp) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // App View Switching
        [appSyncTalk, appMeetStream, appDataGrid, appOmniTask, appOmniDocs, appOmniVault, appOmniTicket].forEach(el => {
            if (el) el.classList.add('hidden');
        });

        if (state.activeApp === 'synctalk') {
            appSyncTalk.classList.remove('hidden');
            renderSyncTalk(appSyncTalk);
        } else if (state.activeApp === 'meetstream') {
            appMeetStream.classList.remove('hidden');
            renderMeetStream(appMeetStream);
        } else if (state.activeApp === 'datagrid') {
            appDataGrid.classList.remove('hidden');
            renderDataGrid(appDataGrid);
        } else if (state.activeApp === 'omnitask') {
            appOmniTask.classList.remove('hidden');
            renderOmniTask(appOmniTask);
        } else if (state.activeApp === 'omnidocs') {
            appOmniDocs.classList.remove('hidden');
            renderOmniDocs(appOmniDocs);
        } else if (state.activeApp === 'omnivault') {
            appOmniVault.classList.remove('hidden');
            renderOmniVault(appOmniVault);
        } else if (state.activeApp === 'omniticket') {
            appOmniTicket.classList.remove('hidden');
            renderOmniTicket(appOmniTicket);
        }

        if (toastContainer) {
            // Stable toast DOM: add/remove individual toast elements instead of rebuilding innerHTML
            const existingToastIds = new Set(
                [...toastContainer.querySelectorAll('.toast-msg')].map(el => el.getAttribute('data-toast-id'))
            );
            const currentToastIds = new Set(state.toasts.map(t => String(t.id)));

            // Remove toasts that no longer exist in state
            toastContainer.querySelectorAll('.toast-msg').forEach(el => {
                const tid = el.getAttribute('data-toast-id');
                if (!currentToastIds.has(tid)) {
                    el.classList.add('toast-hiding');
                    setTimeout(() => el.remove(), 300);
                }
            });

            // Add new toasts that aren't already in the DOM
            state.toasts.forEach(t => {
                const tid = String(t.id);
                if (!existingToastIds.has(tid)) {
                    const el = document.createElement('div');
                    el.className = `toast-msg ${t.urgent ? 'urgent' : ''}`;
                    el.setAttribute('data-toast-id', tid);
                    el.innerHTML = `
                        <div class="toast-title">
                            <span>${escapeHtml(t.title)}</span>
                            <span class="toast-time">NOW</span>
                        </div>
                        <div class="toast-body">${escapeHtml(t.body)}</div>
                    `;
                    toastContainer.appendChild(el);
                }
            });
        }

        // Render Modals
        if (state.twoFactor.modalActive) {
            show2FAModal();
        } else if (state.inboundCall && state.inboundCall.active) {
            showInboundCallModal();
        } else {
            const modalLayer = document.getElementById('modal-layer');
            if (modalLayer && !modalLayer.classList.contains('hidden')) {
                modalLayer.classList.add('hidden');
            }
        }


        // Restore cell-editor focus
        if (focusedRow !== null && focusedCol !== null) {
            const inputToFocus = document.querySelector(`.cell-editor[data-row="${focusedRow}"][data-col="${focusedCol}"]`);
            if (inputToFocus) {
                inputToFocus.focus();
                try {
                    inputToFocus.setSelectionRange(selectionStart, selectionEnd);
                } catch(e) {}
            }
        }
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const app = btn.getAttribute('data-app');
            store.setActiveApp(app);
        });
    });

    store.subscribe(renderApp);
    renderApp();

    // Schedule transition to Escalation phase after 2 minutes
    setTimeout(() => {
        if (store.getState().phase === "honeymoon") {
            store.startEscalationPhase();
        }
    }, 120000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
