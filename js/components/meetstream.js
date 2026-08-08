/*
  MeetStream Component (Zoom / Webex Click-To-Progress Video Call Simulator)
  Pitch-Black Grid Interface with Closed Captions Ticker & Non-skippable Slide Presentation
*/

function renderMeetStream(container) {
    const state = window.gameStore.getState();
    const ms = state.meetstream;
    const currentCap = ms.captions[ms.currentCaptionIndex] || { speaker: "Presenter", text: "End of presentation.", slide: 12 };

    // Determine dynamic speaking status for each attendee
    const activeSpk = ms.activeSpeaker || currentCap.speaker;
    const isBradSpeaking = activeSpk.includes("Brad");
    const isKarenSpeaking = activeSpk.includes("Karen");
    const isChadSpeaking = activeSpk.includes("Chad");
    const isAnalystSpeaking = activeSpk.includes("Analyst") || activeSpk.includes("You");

    container.innerHTML = `
        <div class="meetstream-container">
            <!-- Top Call Header Bar -->
            <header class="meetstream-header">
                <div class="call-title-group">
                    <span class="live-dot">[REC]</span>
                    <span class="call-title">${escapeHtml(ms.callTitle)}</span>
                    <span class="badge-status ${ms.connected && ms.status === 'LIVE' ? 'live' : ''}">${ms.connected && ms.status === 'LIVE' ? 'LIVE' : (ms.connected ? ms.status : 'DISCONNECTED')}</span>
                </div>
                <div class="call-actions">
                    <button class="btn-secondary compact" id="btn-toggle-view">Grid View</button>
                    <button class="btn-danger compact" id="btn-leave-call">Leave Meeting</button>
                </div>
            </header>

            <!-- Main Call Viewport (Video Participants + Slide Presentation) -->
            ${!ms.connected ? `
            <div class="meetstream-disconnected" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); text-align: center; background: #000; border: 1px solid var(--border-color);">
                <h2 style="color: var(--accent-red); margin-bottom: 10px;">${ms.status === 'ENDED' ? 'Meeting Adjourned' : 'Call Disconnected'}</h2>
                <p>${ms.status === 'ENDED' ? 'This session has concluded.' : 'You are no longer connected to the active call.'}</p>
            </div>
            ` : `
            <div class="meetstream-body">
                <!-- Video Attendees Tiles Column -->
                <aside class="attendees-column">
                    <!-- Brad Sterling Tile -->
                    <div class="attendee-tile ${isBradSpeaking ? 'speaking' : ''}">
                        <div class="tile-avatar">BS</div>
                        <span class="tile-name">Brad Sterling (Host)</span>
                        ${isBradSpeaking ? `
                            <div class="audio-vu-meter">
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                            </div>
                            <span class="mic-status speaking">[LIVE]</span>
                        ` : `<span class="mic-status muted">[MUTED]</span>`}
                    </div>

                    <!-- Karen Vance Tile -->
                    <div class="attendee-tile ${isKarenSpeaking ? 'speaking' : ''}">
                        <div class="tile-avatar">KV</div>
                        <span class="tile-name">Karen Vance</span>
                        ${isKarenSpeaking ? `
                            <div class="audio-vu-meter">
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                            </div>
                            <span class="mic-status speaking">[LIVE]</span>
                        ` : `<span class="mic-status muted">[MUTED]</span>`}
                    </div>

                    <!-- Chad Miller Tile -->
                    <div class="attendee-tile ${isChadSpeaking ? 'speaking' : ''}">
                        <div class="tile-avatar">CM</div>
                        <span class="tile-name">Chad Miller</span>
                        ${isChadSpeaking ? `
                            <div class="audio-vu-meter">
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                            </div>
                            <span class="mic-status speaking">[LIVE]</span>
                        ` : `<span class="mic-status muted">[MUTED]</span>`}
                    </div>

                    <!-- J. Analyst (You) Tile -->
                    <div class="attendee-tile self-tile ${isAnalystSpeaking ? 'speaking' : ''}">
                        <div class="tile-avatar">JA</div>
                        <span class="tile-name">J. Analyst (You)</span>
                        ${isAnalystSpeaking ? `
                            <div class="audio-vu-meter">
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                                <span class="vu-bar"></span>
                            </div>
                            <span class="mic-status speaking">[LIVE]</span>
                        ` : `<span class="mic-status muted">[MUTED]</span>`}
                    </div>
                </aside>

                <!-- Center Presentation Screen Viewport -->
                <section class="presentation-screen">
                    <div class="slide-container">
                        <header class="slide-header">
                            <span class="slide-counter">SLIDE ${ms.currentSlide} OF ${ms.totalSlides}</span>
                            <span class="presenter-tag">Presenting: ${escapeHtml(ms.activePresenter)}</span>
                        </header>
                        <div class="slide-content">
                            <h2 class="slide-title">Q3 OPERATIONAL SYNERGIES & VARIANCE</h2>
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
                                    <div class="chart-bar warning" style="height: 45%;"><span class="bar-val">$9.8M</span></div>
                                    <span class="bar-label">Q3 Projected</span>
                                </div>
                            </div>
                            <div class="slide-bullet-list">
                                <div>[+] Cross-functional optimization required in DataGrid Workbench</div>
                                <div>[+] Mandatory attendance for Q3 Revenue Reconciliation</div>
                                <div class="alert-text">[!] Note: Trailing zeros must match OmniCorp Compliance standard</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Live Meeting Interactive Chat Feed -->
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
                <div class="meeting-talk-bar">
                    <input type="text" id="meet-talk-input" class="meet-talk-input" placeholder="Type a comment or ask a question in the meeting..." autocomplete="off">
                    <button class="btn-primary compact" id="btn-meet-talk">Speak in Meeting</button>
                </div>
            </section>
            ` }

            <!-- Bottom Click-To-Progress Captions Bar -->
            <footer class="captions-bar">
                <div class="caption-display">
                    <span class="speaker-label">${escapeHtml(currentCap.speaker)}:</span>
                    <span class="caption-text">"${escapeHtml(currentCap.text)}"</span>
                </div>
                <div class="caption-controls">
                    <button class="btn-primary" id="btn-next-caption">
                        <span>Next Caption</span>
                        <span class="arrow-icon">&gt;</span>
                    </button>
                </div>
            </footer>
        </div>
    `;

    // Event Listener for Click-to-Progress Captions
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

window.renderMeetStream = renderMeetStream;

