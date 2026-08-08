/*
  OmniOS Enterprise Audio System
  Programmatic sound synthesis using browser Web Audio API.
  Zero external assets required.
*/

class CorporateAudio {
    constructor() {
        this.ctx = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.initialized = true;
                console.log("[Audio] Web Audio API context initialized successfully.");
            }
        } catch (e) {
            console.warn("[Audio] Failed to initialize AudioContext:", e);
        }
    }

    resumeContext() {
        this.init();
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().then(() => {
                console.log("[Audio] AudioContext resumed successfully.");
            }).catch(err => {
                console.warn("[Audio] Failed to resume AudioContext:", err);
            });
        }
    }

    playTone(freq, type, duration, startTime, maxGain) {
        // Prevent playing sounds before the game starts
        if (window.gameStore && !window.gameStore.getState()?.gameStarted) {
            return;
        }

        if (!this.ctx) {
            this.init();
        }
        if (!this.ctx) return;

        // Force resume in case autoplay restriction is still active
        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // Simple ADSR envelope with quick attack and smooth decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(maxGain, startTime + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // Play a standard double-tone system alert/toast chime
    playNotification() {
        this.resumeContext();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Crisp double sine wave chime (F#5 -> A#5 style)
        this.playTone(739.99, 'sine', 0.12, now, 0.08); // F#5
        this.playTone(932.33, 'sine', 0.18, now + 0.05, 0.08); // A#5
    }

    // Play a gentle, soft triangle wave double-chirp for chat messages
    playChatPing() {
        this.resumeContext();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Softer bubble-like chat double ping
        this.playTone(587.33, 'triangle', 0.08, now, 0.10); // D5
        this.playTone(783.99, 'triangle', 0.12, now + 0.04, 0.10); // G5
    }

    // Play an ascending major arpeggio triplet for task list updates
    playTaskAdded() {
        this.resumeContext();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Ascending major arpeggio (C5 -> E5 -> G5)
        this.playTone(523.25, 'sine', 0.08, now, 0.06); // C5
        this.playTone(659.25, 'sine', 0.08, now + 0.06, 0.06); // E5
        this.playTone(783.99, 'sine', 0.20, now + 0.12, 0.06); // G5
    }

    // Play an elegant, slow ascending arpeggio for joining meeting calls (Webex-style)
    playMeetingJoin() {
        this.resumeContext();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // A major arpeggio (A4 -> C#5 -> E5 -> A5)
        this.playTone(440.00, 'sine', 0.15, now, 0.06); // A4
        this.playTone(554.37, 'sine', 0.15, now + 0.09, 0.06); // C#5
        this.playTone(659.25, 'sine', 0.15, now + 0.18, 0.06); // E5
        this.playTone(880.00, 'sine', 0.30, now + 0.27, 0.06); // A5
    }

    // Play an elegant, slow descending arpeggio for exiting meeting calls
    playMeetingLeave() {
        this.resumeContext();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // A major arpeggio descending (A5 -> E5 -> C#5 -> A4)
        this.playTone(880.00, 'sine', 0.15, now, 0.06); // A5
        this.playTone(659.25, 'sine', 0.15, now + 0.09, 0.06); // E5
        this.playTone(554.37, 'sine', 0.15, now + 0.18, 0.06); // C#5
        this.playTone(440.00, 'sine', 0.30, now + 0.27, 0.06); // A4
    }
}

// Instantiate globally
window.corporateAudio = new CorporateAudio();

// Global user gesture triggers to initialize and resume audio context
window.addEventListener('click', () => {
    window.corporateAudio?.resumeContext();
}, { once: true });

window.addEventListener('keydown', () => {
    window.corporateAudio?.resumeContext();
}, { once: true });
