/*
  OmniOS Game Store & Event Dispatcher
  Central State Machine for Overworked Simulator
  Phase 4: Ticketing System, Random Pings, Reply Choices & Escalated Compliance Checks
*/

function getRealTimeStr(offsetMins = 0) {
    const d = new Date();
    if (offsetMins) d.setMinutes(d.getMinutes() + offsetMins);
    let hrs = d.getHours();
    const mins = d.getMinutes();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    const displayMins = mins < 10 ? '0' + mins : mins;
    return `${hrs}:${displayMins} ${ampm}`;
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class GameStore {
    constructor() {
        this.listeners = [];
        this.recentToastKeys = new Set();
        this._toastCooldown = new Map();
        this.tickerInterval = null;
        this._lastBlockerResolveTime = Date.now();


        const curTimeStr = getRealTimeStr(0);
        const syncTimeStr = getRealTimeStr(15);

        // Initial Game State
        this.state = {
            gameStarted: false,
            phase: "honeymoon",

            // System Time Tracking
            timeDisplay: curTimeStr,
            syncTimeDisplay: syncTimeStr,
            dayEnded: false,

            twoFactor: {
                authenticated: true,
                deferred: false,
                modalActive: false
            },

            // Interactive Blocker Overlays
            blockers: {
                sysUpdateActive: false,
                sysUpdatePercent: 0,
                shutdownAlertActive: false,
                shutdownSeconds: 15,
                deescalateButtonPos: { top: 60, left: 45 },
                virusActive: false,
                virusPercent: 0,
                passwordModalActive: false,
                passwordAttempts: 0,
                meetingInviteActive: false,
                cookieConsentActive: false,
                cookieConsentStep: 1,
                deskCalibrationActive: false,
                deskCalibrationSeconds: 5,
                surveyActive: false,
                surveyStep: 1,
                surveyTimer: 0,
                defragActive: false,
                defragPercent: 0
            },

            blockersTriggered: {
                meetingInvite: false,
                gregQuit: false,
                password: false,
                sysUpdate: false,
                cookies: false,
                shutdown: false,
                calibration: false,
                survey: false,
                defrag: false
            },

            patience: 100,
            complianceScore: 85,
            activeApp: "synctalk",
            monologueActive: false,
            monologueText: "",
            gameOver: false,
            settings: {

                timeMode: "system",
                showPatienceBar: false,
                immediateReplies: false,
                mode: "beginner"
            },
            gameTime: (() => {
                const d = new Date();
                d.setHours(21, 0, 0, 0);
                return d;
            })(),


            // Typing Indicators (DMs only)
            typingIndicators: {},

            // Inbound Call Invites
            inboundCall: {
                active: false,
                peerId: null,
                callerName: "",
                reason: ""
            },

            // Call States
            meetstream: {
                connected: false,
                callTitle: `Q3 Operational Alignment & Synergies Review (${syncTimeStr})`,
                activePresenter: "Brad Sterling",
                activeSpeaker: "Brad Sterling",
                status: "LIVE",
                groupCallStatus: "LIVE",
                currentSlide: 1,
                totalSlides: 12,
                currentCaptionIndex: 0,
                captions: [
                    { speaker: "Brad Sterling", text: `Good day everyone. Welcome to our ${syncTimeStr} Q3 Alignment Review.`, slide: 1 },
                    { speaker: "Brad Sterling", text: "Our primary objective today is optimizing cross-functional workflow bandwidth.", slide: 1 },
                    { speaker: "Brad Sterling", text: "Moving to Slide 2... We noticed a 4.2% variance in regional data reporting.", slide: 2 },
                    { speaker: "Brad Sterling", text: "Analyst, I hope you're keeping track of these figures for the DataGrid audit.", slide: 2 },
                    { speaker: "Karen Vance", text: "Brad, before we continue, let me remind everyone to stay aligned on team goals.", slide: 2 },
                    { speaker: "Brad Sterling", text: "Good point Karen. Slide 3 covers our Q3 revenue projection targets.", slide: 3 },
                    { speaker: "Brad Sterling", text: "As shown in the bar chart, US-East and US-West lead our core deliverables.", slide: 3 },
                    { speaker: "Chad Miller", text: "Hey Brad, did we factor in the formula standardization for Slide 4?", slide: 4 },
                    { speaker: "Brad Sterling", text: "Excellent point Chad. Slide 4 details standardizing cell formatting across DataGrid.", slide: 4 },
                    { speaker: "Brad Sterling", text: "Slide 5 highlights our operational SLA response targets for team collaboration.", slide: 5 },
                    { speaker: "Karen Vance", text: "Maintaining smooth communication across channels is key.", slide: 5 },
                    { speaker: "Brad Sterling", text: "Moving to Slide 6... Customer regional metrics in APAC and LATAM.", slide: 6 },
                    { speaker: "Brad Sterling", text: "Slide 7: Cross-departmental synergy matrix. Analyst, pay close attention.", slide: 7 },
                    { speaker: "Chad Miller", text: "I can share the wiki link for formatting rules in SyncTalk later.", slide: 8 },
                    { speaker: "Brad Sterling", text: "Slide 8 & 9 outline the audit rules for Q3 financial reconciliations.", slide: 9 },
                    { speaker: "Brad Sterling", text: "Slide 10 & 11: Final revenue verification standards. Trailing spaces must be eliminated.", slide: 11 },
                    { speaker: "Brad Sterling", text: "Slide 12: Action Items. Analyst, finalize the DataGrid sheet when ready.", slide: 12 },
                    { speaker: "Brad Sterling", text: "Any questions or comments from the floor before we conclude?", slide: 12 }
                ],
                chatHistory: [
                    { sender: "System Bot", text: `Meeting started at ${curTimeStr}. Call recording active.`, time: curTimeStr, isPlayer: false }
                ],
                micMuted: false,
                backgroundEffect: "none", // "none", "blur", "office", "cat"
                activeCall: {
                    type: "group",
                    peerId: null
                }
            },

            // SyncTalk Chat State
            synctalk: {
                unreadCount: 2,
                activeId: "dm-brad",
                conversations: {
                    "dm-brad": {
                        id: "dm-brad",
                        name: "Brad Sterling (Director of Operations)",
                        role: "Direct Manager",
                        avatar: "BS",
                        isDm: true,
                        unread: 1,
                        messages: [
                            {
                                id: 1,
                                sender: "Brad Sterling",
                                text: "Good morning team. Hope everyone is ready to synergize today.",
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["On it, Brad! Ready to align.", "Morning Brad. Operational bandwidth is active.", "Let's kick off the sync."]
                            },
                            {
                                id: 2,
                                sender: "Brad Sterling",
                                text: `Analyst, when you get a chance, take a look at the Q3 Regional Sales sheet in DataGrid. We have our sync scheduled at ${syncTimeStr}.`,
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["Will check cell D2 immediately.", "Reconciling regional rows now.", "Noted. Is there an updated template?"]
                            }
                        ]
                    },
                    "dm-karen": {
                        id: "dm-karen",
                        name: "Karen Vance (HR & Compliance)",
                        role: "HR Business Partner",
                        avatar: "KV",
                        isDm: true,
                        unread: 1,
                        messages: [
                            {
                                id: 101,
                                sender: "Karen Vance",
                                text: "Welcome to the team! Hope your morning is going smoothly.",
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["Thanks Karen! Reviewing directives now.", " LUMBAR angle at 90 degrees!", "Everything is perfectly aligned."]
                            }
                        ]
                    },
                    "dm-chad": {
                        id: "dm-chad",
                        name: "Chad Miller (Senior Analyst)",
                        role: "Senior Team Lead",
                        avatar: "CM",
                        isDm: true,
                        unread: 0,
                        messages: [
                            {
                                id: 201,
                                sender: "Chad Miller",
                                text: `Hey, welcome aboard! Let me know if you run into any spreadsheet alignment issues. Glad to help out.`,
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["Thanks Chad. Doing cells check now.", "VLOOKUP array looks solid.", "What formula syntax do you recommend?"]
                            }
                        ]
                    },
                    "dm-priya": {
                        id: "dm-priya",
                        name: "Priya Sharma (QA & Testing)",
                        role: "QA Lead",
                        avatar: "PS",
                        isDm: true,
                        unread: 0,
                        messages: [
                            {
                                id: 401,
                                sender: "Priya Sharma",
                                text: `Hi! Welcome to the team. Quick question — have you run the regression suite on the Q3 sheet yet? Just want to make sure we're covered. 😊`,
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["Not yet, Priya. Just resolving cells.", "Checking validation traps now.", "Where can I grab the test suite?"]
                            }
                        ]
                    },
                    "dm-derek": {
                        id: "dm-derek",
                        name: "Derek Owens (IT Support)",
                        role: "IT Helpdesk Lead",
                        avatar: "DO",
                        isDm: true,
                        unread: 0,
                        messages: [
                            {
                                id: 501,
                                sender: "Derek Owens",
                                text: `Hey new hire! If you run into any tech issues, just ping me. Though honestly 90% of the time it's a restart issue 😄`,
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["Thanks Derek. Station logins look clean.", "Clearance levels are verified.", "No issues so far!"]
                            }
                        ]
                    },
                    "dm-greg": {
                        id: "dm-greg",
                        name: "Greg Jenkins (Junior Analyst)",
                        role: "Junior Data Analyst",
                        avatar: "GJ",
                        isDm: true,
                        unread: 1,
                        messages: [
                            {
                                id: 601,
                                sender: "Greg Jenkins",
                                text: `Hey... you're the new analyst right? Tell me you're also losing your mind with this DataGrid sheet. It feels like every time I edit a cell, Brad sends another alignment invite.`,
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["I'm sure everything is fine.", "It's just standard procedure.", "Hang in there, Greg."]
                            }
                        ]
                    },
                    "channel-data-ops": {
                        id: "channel-data-ops",
                        name: "#dept-data-ops",
                        role: "Department Channel",
                        avatar: "#",
                        isDm: false,
                        unread: 0,
                        messages: [
                            {
                                id: 301,
                                sender: "System Bot",
                                text: "Welcome to #dept-data-ops. OmniCorp Global Workstation v4.8 Active.",
                                time: curTimeStr,
                                isPlayer: false,
                                choices: ["Align operations.", "Acknowledge system active.", "Audit compliance logs."]
                            }
                        ]
                    }
                }
            },

            // DataGrid Workbench State
            datagrid: {
                sheetName: "Q3_Regional_Sales_v4_FINAL.xlsx",
                selectedCell: { row: 0, col: 0 },
                formulaValue: "4500.00",
                escalationTriggered: false,
                data: [
                    ["Region", "Q1 Actual", "Q2 Actual", "Q3 Projected", "Status"],
                    ["US-East-01", "12500", "14200", "15800", "PENDING"],
                    ["US-West-02", "9800", "10100", "11500", "VALIDATED"],
                    ["EU-North-01", "21000", "19500", "22400", "PENDING"],
                    ["APAC-S-04", "8400", "9200", "9900", "ERROR_VAL"],
                    ["LATAM-C-02", "6300", "7100", "7800", "PENDING"],
                    ["TOTAL_SUM", "=SUM(B2:B6)", "=SUM(C2:C6)", "=SUM(D2:D6)", "UNAUDITED"]
                ]
            },

            // OmniDocs State
            omnidocs: {
                activeDocId: "doc-civility",
                documents: [
                    {
                        id: "doc-civility",
                        title: "OmniCorp Civility & Workplace Ergonomics Directive v4.8",
                        category: "HR & Compliance",
                        content: `OMNICORP GLOBAL WORKPLACE DIRECTIVE #402

1. ERGONOMIC MONITOR POSITIONS
All employees must maintain a 15 to 20-degree downward angle for primary display monitors. Failure to do so will result in an automated HR ergonomic audit notification.

2. SYNCTALK CHAT ETIQUETTE
Unsanctioned acronyms, sarcastic punctuation, or unapproved emojis are logged under Civility Rule 9. Please maintain 100% upbeat corporate enthusiasm in all channels.

3. TWO-FACTOR AUTHENTICATION (2FA)
Session tokens expire automatically every 5 minutes during periods of high synergy. Re-authentication within 60 seconds is mandatory.`,
                        signed: false
                    },
                    {
                        id: "doc-q3-brief",
                        title: "Executive Summary: Q3 Operational Bandwidth",
                        category: "Operations",
                        content: `EXECUTIVE SUMMARY - Q3 SYNERGY STRATEGY

- Primary Target: Optimize regional spreadsheet reconciliation across DataGrid.
- Target SLA: 100% cell formula compliance without trailing whitespace.
- Key Risk: Non-breaking space traps in regional CSV exports (ASCII 160).
- Action Plan: Analyst to validate US-East-01 data prior to afternoon sync.`,
                        signed: true
                    },
                    {
                        id: "doc-sec-audit",
                        title: "IT Security Logs & Audit Attestation Form",
                        category: "IT Security",
                        content: `OMNICORP IT SECURITY AUDIT - VERIFICATION BLOCK #091A

Under security policy v4.8, J. Analyst attests that they have reviewed log '2FA_Violations_Report.log' and confirmed no unauthorized directory scans exist on Node Analyst_JA.

Please sign the attestation below to update workstation clearance score.`,
                        signed: false
                    },
                    {
                        id: "doc-desk-attest",
                        title: "Standing Desk Ergonomic Attestation",
                        category: "HR & Compliance",
                        content: `OMNICORP STANDING DESK COMPLIANCE & SAFETY ATTESTATION
                        
By signing this attestation, the employee certifies that:
1. Standing desk heights have been fully calibrated to standard OSHA requirements.
2. The desk calibration wizard ran to 100% completion without height faults.
3. Ergonomic standing posture will be maintained throughout all subsequent huddle calls.`,
                        signed: false
                    }
                ]
            },

            // OmniVault File Storage State
            omnivault: {
                activeFolderId: "folder-q3",
                selectedFileId: null,
                folders: [
                    {
                        id: "folder-q3",
                        name: "Q3 Reports",
                        icon: "📁",
                        locked: false,
                        files: [
                            { id: "file-q3-sales", name: "Q3_Sales_Final.xlsx", size: "2.4 MB", modified: curTimeStr, type: "spreadsheet", content: "spreadsheet" },
                            { id: "file-rev-sum", name: "Revenue_Summary.pdf", size: "890 KB", modified: curTimeStr, type: "pdf", content: "pdf" },
                            { id: "file-reg-charts", name: "Regional_Breakdown_Charts.pptx", size: "5.1 MB", modified: curTimeStr, type: "presentation", content: "presentation" }
                        ]
                    },
                    {
                        id: "folder-exec",
                        name: "Executive Briefings",
                        icon: "🔒",
                        locked: true,
                        files: [
                            { id: "file-board-deck", name: "Board_Deck_Q3_CONFIDENTIAL.pptx", size: "12.8 MB", modified: curTimeStr, type: "presentation", content: "board-deck" },
                            { id: "file-ma-strategy", name: "M&A_Strategy_Draft.pdf", size: "3.2 MB", modified: curTimeStr, type: "pdf", content: "ma-strategy" },
                            { id: "file-device-token", name: "Device_Security_Token.txt", size: "2 KB", modified: curTimeStr, type: "document", content: "device-token" }
                        ]
                    },
                    {
                        id: "folder-it",
                        name: "IT Security Logs",
                        icon: "🔒",
                        locked: true,
                        files: [
                            { id: "file-access-audit", name: "Access_Audit_2024.csv", size: "1.1 MB", modified: curTimeStr, type: "data", content: "access-audit" },
                            { id: "file-2fa-viol", name: "2FA_Violations_Report.log", size: "420 KB", modified: curTimeStr, type: "log", content: "2fa-viol" }
                        ]
                    },
                    {
                        id: "folder-templates",
                        name: "Shared Templates",
                        icon: "📁",
                        locked: false,
                        files: [
                            { id: "file-expense-temp", name: "Expense_Report_Template.xlsx", size: "156 KB", modified: curTimeStr, type: "spreadsheet", content: "expense-temp" },
                            { id: "file-notes-temp", name: "Meeting_Notes_Template.docx", size: "89 KB", modified: curTimeStr, type: "document", content: "notes-temp" }
                        ]
                    }
                ],
                accessRequests: {}
            },

            // OmniTicket Ticketing System State
            omniticket: {
                selectedTicketId: "tkt-8304",
                tickets: [
                    {
                        id: "tkt-8304",
                        title: "Ticket #8304: Keyboard Backlight Security Scan",
                        status: "BACKLOG",
                        priority: "LOW",
                        category: "IT Compliance",
                        description: "Standard compliance requires verifying that keyboard backlights are adjusted to a secure lumen standard. Submit attestation code KB-LUMEN-902.",
                        attestationCode: "KB-LUMEN-902"
                    },
                    {
                        id: "tkt-9201",
                        title: "Ticket #9201: Ergo Mouse Attestation Audit",
                        status: "BACKLOG",
                        priority: "MEDIUM",
                        category: "Workplace Health",
                        description: "Safety audit requires confirmation of ergonomic mouse usage. Submit validation code ERG-MOUSE-ATT.",
                        attestationCode: "ERG-MOUSE-ATT"
                    },
                    {
                        id: "tkt-7603",
                        title: "Ticket #7603: Workstation Fan Speed Verification",
                        status: "BACKLOG",
                        priority: "LOW",
                        category: "Hardware Compliance",
                        description: "IT audit suggests temperature check. Submit fan attestation code FAN-SPEED-HI.",
                        attestationCode: "FAN-SPEED-HI"
                    },
                    {
                        id: "tkt-device-token",
                        title: "Ticket #1198: Device Security Token Verification",
                        status: "BACKLOG",
                        priority: "HIGH",
                        category: "IT Security",
                        description: "Audit security logs to input the latest Device Security Token retrieved from OmniVault folder 'Executive Briefings'.",
                        attestationCode: "TOKEN-SEC-993"
                    }
                ]
            },

            // Task Tracker (Stage 1 Init)
            omnitask: {
                taskCycle: 1,
                subStage: 1,
                completedCount: 0,
                tasks: [
                    {
                        id: "task-q3-sales",
                        title: "Q3 Regional Sales Spreadsheet Audit",
                        appTarget: "datagrid",
                        priority: "HIGH",
                        status: "IN_PROGRESS",
                        instructions: [
                            "1. Open the DataGrid Workbench tab.",
                            "2. Select cell D2 (Row 2 Col D for US-East-01).",
                            "3. Inspect the value to ensure no hidden spaces exist (re-type 15800).",
                            "4. Verify the row 7 total formula =SUM(D2:D6).",
                            "5. Click 'Validate & Submit' in the DataGrid toolbar."
                        ]
                    },
                    {
                        id: "task-ergonomic-survey",
                        title: "Mandatory Q3 Workplace Civility & Safety Survey",
                        appTarget: "omnidocs",
                        priority: "LOW",
                        status: "PENDING",
                        instructions: [
                            "1. Open the OmniDocs tab.",
                            "2. Select 'OmniCorp Civility & Workplace Ergonomics Directive v4.8'.",
                            "3. Review Section 4 and click 'Sign Attestation'."
                        ]
                    },
                    {
                        id: "task-vault-access",
                        title: "Retrieve Q3 Board Deck from OmniVault",
                        appTarget: "omnivault",
                        priority: "MEDIUM",
                        status: "PENDING",
                        instructions: [
                            "1. Open the OmniVault tab.",
                            "2. Navigate to the 'Executive Briefings' folder.",
                            "3. Request access to the locked briefings folder.",
                                "4. Wait for approval and preview the Board Deck file."
                        ]
                    }
                ],
            },
            toasts: [],
            gregTaskProgress: {
                'task-greg-ledgers': 0,
                'task-greg-variance': 0
            }
        };

    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }

    getState() {
        return this.state;
    }

    hasActiveBlocker() {
        const b = this.state.blockers;
        return b.sysUpdateActive || b.shutdownAlertActive || b.virusActive || b.passwordModalActive || b.meetingInviteActive || b.cookieConsentActive || b.deskCalibrationActive || b.surveyActive || b.defragActive;
    }

    startTickerEvents() {
        this.state.gameStarted = true;
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        
        // Background event tick (every 35 seconds)
        this.tickerInterval = setInterval(() => {
            const state = this.state;
            if (state.dayEnded) return;
            if (this.hasActiveBlocker()) return; // do not pile up blockers

            if (state.phase === "escalation") {
                const rand = Math.random();
                if (rand < 0.50) {
                    this.triggerRandomCoworkerDM();
                } else {
                    this.triggerOOODeflection();
                }
            } else {
                // Honeymoon: only coworker DMs
                this.triggerRandomCoworkerDM();
            }
        }, 35000);
    }

    // ============================================================
    // Blocker Override & Snooze Methods
    // ============================================================

    snoozeShutdownWithCode(code) {
        if ((code || '').trim() === '=SUM(E2:E6)') {
            this.state.blockers.shutdownAlertActive = false;
            this.addToast("Security System", "IT Audit de-escalated. Validation code override accepted.");
            this.notify();
            return true;
        } else {
            this.adjustPatience(-5);
            this.addToast("Bypass Failed", "Invalid override code credentials. Formula mismatch.", true);
            this.notify();
            return false;
        }
    }

    // ============================================================
    // Virus Quarantine (Reset Event)
    // ============================================================

    triggerVirusQuarantine() {
        if (this.state.blockers.virusActive) return;
        this.state.blockers.virusActive = true;
        this.state.blockers.virusPercent = 0;
        this.adjustPatience(-15);
        this.addToast("CyberSecurity Isolation", "OMNICORP IT SECURITY quarantine active. Restoring baseline.", true);
        this.triggerMonologueBanner("A virus? Everything is locked... I have to start over? I feel like I'm trapped in a corporate loop...");
        this.notify();

        const virusTick = setInterval(() => {
            this.state.blockers.virusPercent += 20;
            this.notify();

            if (this.state.blockers.virusPercent >= 100) {
                clearInterval(virusTick);
                
                // RESET PROGRESS TO STAGE 1 BASELINE
                this.state.omnitask.taskCycle = 1;
                this.state.omnitask.subStage = 1;
                this.state.omnitask.completedCount = 0;
                this.state.omnitask.tasks = [
                    {
                        id: "task-q3-sales",
                        title: "Q3 Regional Sales Spreadsheet Audit",
                        appTarget: "datagrid",
                        priority: "HIGH",
                        status: "IN_PROGRESS",
                        instructions: [
                            "1. Open the DataGrid Workbench tab.",
                            "2. Select cell D2 (Row 2 Col D for US-East-01).",
                            "3. Inspect the value to ensure no hidden spaces exist (re-type 15800).",
                            "4. Verify the row 7 total formula =SUM(D2:D6).",
                            "5. Click 'Validate & Submit' in the DataGrid toolbar."
                        ]
                    },
                    {
                        id: "task-ergonomic-survey",
                        title: "Mandatory Q3 Workplace Civility & Safety Survey",
                        appTarget: "omnidocs",
                        priority: "LOW",
                        status: "PENDING",
                        instructions: [
                            "1. Open the OmniDocs tab.",
                            "2. Select 'OmniCorp Civility & Workplace Ergonomics Directive v4.8'.",
                            "3. Review Section 4 and click 'Sign Attestation'."
                        ]
                    },
                    {
                        id: "task-vault-access",
                        title: "Retrieve Q3 Board Deck from OmniVault",
                        appTarget: "omnivault",
                        priority: "MEDIUM",
                        status: "PENDING",
                        instructions: [
                            "1. Open the OmniVault tab.",
                            "2. Navigate to the 'Executive Briefings' folder.",
                            "3. Request access to the locked briefings folder.",
                            "4. Wait for approval and preview the Board Deck file."
                        ]
                    }
                ];

                // Reset sheet cell D2 trap
                if (this.state.datagrid.data[1] && this.state.datagrid.data[1][3]) {
                    this.state.datagrid.data[1][3] = "15800\u00A0";
                }

                // Lock Vault
                this.state.omnivault.folders.forEach(f => {
                    if (f.id === 'folder-exec' || f.id === 'folder-it') {
                        f.locked = true;
                    }
                });
                this.state.omnivault.accessRequests = {};

                // Reset OmniTicket
                this.state.omniticket.tickets.forEach(t => {
                    t.status = "BACKLOG";
                });
                this.state.omniticket.selectedTicketId = "tkt-8304";

                // Reset Document signatures
                this.state.omnidocs.documents.forEach(d => {
                    if (d.id !== 'doc-q3-brief') {
                        d.signed = false;
                    }
                });

                this.state.blockers.virusActive = false;
                this.addToast("System Quarantined", "Workstation progress reset to baseline guidelines.", true);
                window.corporateAudio?.playTaskAdded();
                this.notify();
            }
        }, 1000);
    }

    // ============================================================
    // Compliance Check 1: Password Rotation
    // ============================================================

    triggerPasswordRotation() {
        this.state.blockers.passwordModalActive = true;
        this.state.blockers.passwordAttempts = 0;
        this.adjustPatience(-12);
        this.addToast("Security Credential Warning", "Workstation password rotation standard policy active.", true);
        this.notify();
    }

    submitNewPassword(pass) {
        this.state.blockers.passwordAttempts++;
        if (this.state.blockers.passwordAttempts < 3) {
            this.adjustPatience(-2);
            this.addToast("Rotation Exception", "Password matches historical audit log credentials. Try again.", true);
            this.notify();
            return false;
        } else {
            this.state.blockers.passwordModalActive = false;
            this.addToast("Credentials Synchronized", "Workstation credentials updated successfully.");
            this.notify();
            return true;
        }
    }

    autoGeneratePasskey() {
        this.notify();
        setTimeout(() => {
            this.state.blockers.passwordModalActive = false;
            this.addToast("Credentials Synchronized", "Workstation security passkey auto-rotated.");
            this.notify();
        }, 4000);
    }

    // ============================================================
    // Compliance Check 2: OOO Deflection
    // ============================================================

    triggerOOODeflection() {
        this.adjustPatience(-8);
        this.state.priyaOOOActive = true;
        this.state.chadOOOActive = true;

        // Auto-disable OOO deflection after 90 seconds
        setTimeout(() => {
            this.state.priyaOOOActive = false;
            this.state.chadOOOActive = false;
        }, 90000);

        const priyaConv = this.state.synctalk.conversations["dm-priya"];
        if (priyaConv) {
            priyaConv.unread += 1;
            this.state.synctalk.unreadCount += 1;
            priyaConv.messages.push({
                id: Date.now(),
                sender: "Priya Sharma",
                text: "Hey, did you check the regional spreadsheet logs yet? Let me know.",
                time: getRealTimeStr(0),
                isPlayer: false,
                choices: ["Reviewing regional data logs now.", "Attesting spreadsheet validation.", "Looking into the formulas."]
            });
            window.corporateAudio?.playChatPing();
            this.addToast("Priya Sharma (QA)", "New DM regarding spreadsheet logs.");
            this.notify();
        }
    }

    // ============================================================
    // Compliance Check 3: Meeting Invite
    // ============================================================

    triggerMeetingInvite() {
        this.state.blockers.meetingInviteActive = true;
        this.adjustPatience(-10);
        this.addToast("Calendar Notification", "Urgent meeting request from Brad Sterling.", true);
        this.notify();
    }

    respondToMeetingInvite(accepted) {
        this.registerBlockerResolution();
        if (!accepted) {
            this.adjustPatience(-15);
            this.state.blockers.meetingInviteActive = false;
            this.addToast("Operational Sync Exception", "Declined sync huddle. Brad notified.", true);
            this.notify();
        } else {
            // Accepted -> Show connecting spinner for 3 seconds then canceled
            this.notify();
            setTimeout(() => {
                this.state.blockers.meetingInviteActive = false;
                this.addToast("Calendar Update", "Meeting cancelled by host.", true);
                this.notify();
            }, 3000);
        }
    }

    // ============================================================
    // Compliance Check 4: Cookie Consent
    // ============================================================

    triggerCookieConsent() {
        this.state.blockers.cookieConsentActive = true;
        this.state.blockers.cookieConsentStep = 1;
        this.adjustPatience(-14);
        this.addToast("Compliance Audit Info", "Review cookie tracking preferences.", true);
        this.notify();
    }

    setCookieStep(step) {
        this.state.blockers.cookieConsentStep = step;
        this.notify();
    }

    closeCookieConsent() {
        this.state.blockers.cookieConsentActive = false;
        this.registerBlockerResolution();
        this.addToast("Preferences Registered", "Compliance cookies successfully updated.");
        this.notify();
    }


    // ============================================================
    // Compliance Check 5: Desk Height Calibration
    // ============================================================

    triggerDeskCalibration() {
        this.state.blockers.deskCalibrationActive = true;
        this.state.blockers.deskCalibrationSeconds = 5;
        this.adjustPatience(-9);
        this.addToast("Ergonomic Directive Warning", "Standing desk height calibration standard trigger.", true);
        this.notify();

        const deskTick = setInterval(() => {
            this.state.blockers.deskCalibrationSeconds--;
            this.notify();

            if (this.state.blockers.deskCalibrationSeconds <= 0) {
                clearInterval(deskTick);
                this.state.blockers.deskCalibrationActive = false;
                this.registerBlockerResolution();
                this.addToast("Ergonomic Success", "Oska desk height calibration verified.");
                this.notify();
            }
        }, 1000);
    }


    // ============================================================
    // Patience-Based Milestones Trigger
    // ============================================================

    checkPatienceBlockers() {
        if (this.state.gameOver) return;
        const p = this.state.patience;
        const b = this.state.blockersTriggered;

        // Blocker grace period: give the player 15 seconds of breathing room after resolving any blocker
        if (Date.now() - (this._lastBlockerResolveTime || 0) < 15000) return;

        const mode = this.state.settings.mode;
        let offset = 0;
        if (mode === "medium") offset = 7;
        else if (mode === "hard") offset = 15;

        // Milestone 85: Brad's Meeting Invite & Greg quits (narrative queued)
        if (p <= (85 + offset) && !b.gregQuit) {
            b.gregQuit = "triggered";
            b.meetingInvite = true;
            this.triggerMeetingInvite();
            this.triggerGregQuitDM();
        }
        // Only trigger one new blocker at a time — if something is already active, defer
        if (this.hasActiveBlocker()) return;


        // Milestone 70: Password Rotation
        if (p <= (70 + offset) && !b.password) {
            b.password = true;
            this.triggerPasswordRotation();
            this.triggerMonologueBanner("A password rotation popup? Right now? This is getting ridiculous...");
            return;
        }
        // Milestone 62: System Update
        if (p <= (62 + offset) && !b.sysUpdate) {
            b.sysUpdate = true;
            this.triggerSystemUpdate();
            this.triggerMonologueBanner("An update is installing... I can't even move my cursor. Why does this always happen when I have a deadline?");
            return;
        }
        // Milestone 55: Cookie Preferences
        if (p <= (55 + offset) && !b.cookies) {
            b.cookies = true;
            this.triggerCookieConsent();
            this.triggerMonologueBanner("Cookie consent checks? I just want to submit this spreadsheet. The workstation is constantly blocking me.");
            return;
        }
        // Milestone 48: Shutdown Alert
        if (p <= (48 + offset) && !b.shutdown) {
            b.shutdown = true;
            this.triggerShutdownAlert();
            this.triggerMonologueBanner("A security threat flagged? Imminent shutdown? I feel like I'm about to lose everything...");
            return;
        }
        // Milestone 40: Standing-Desk Calibration
        if (p <= (40 + offset) && !b.calibration) {
            b.calibration = true;
            this.triggerDeskCalibration();
            this.triggerMonologueBanner("Calibrate standing desk height? Standing desk ergonomics checklist? Are they tracking my physical posture now?");
            return;
        }
        // Milestone 30: Corporate Re-Attestation Survey
        if (p <= (30 + offset) && !b.survey) {
            b.survey = true;
            this.triggerSurveyBlocker();
            this.triggerMonologueBanner("A mandatory alignment survey? The buttons are hopping around when I click 'No'...");
            return;
        }
        // Milestone 20: Disk Space Defragmentation
        if (p <= (20 + offset) && !b.defrag) {
            b.defrag = true;
            this.triggerDefragBlocker();
            this.triggerMonologueBanner("Defragmentation stalled at 99%. A full workstation lock. I need to bypass this before my session expires.");
            return;
        }
    }

    triggerGregQuitDM() {
        const curTimeStr = getRealTimeStr(0);
        const bradConv = this.state.synctalk.conversations["dm-brad"];
        if (bradConv) {
            bradConv.unread += 1;
            this.state.synctalk.unreadCount += 1;
            bradConv.messages.push({
                id: Date.now(),
                sender: "Brad Sterling",
                text: `Analyst, junior analyst Greg Jenkins has exited the organization. As a result, his operational deliverables have been routed to you. Please reconcile them immediately in OmniTask.`,
                time: curTimeStr,
                isPlayer: false,
                choices: ["On it, Brad.", "Reconciling his ledgers now.", "Acknowledged."]
            });
            window.corporateAudio?.playChatPing();
            this.notify();
        }
    }

    triggerGregQuittingAnnounce() {
        const curTimeStr = getRealTimeStr(0);
        this.addToast("Management Update", "Junior Analyst Greg Jenkins has resigned.", true);
        this.triggerMonologueBanner("Wait... Greg actually walked out? And Brad reassigned all of his glitched work to me? I can't keep up with this...");

        const gregConv = this.state.synctalk.conversations["dm-greg"];
        if (gregConv) {
            gregConv.role = "Ex-Employee (Resigned)";
            gregConv.messages.push({
                id: Date.now(),
                sender: "System Bot",
                text: "User Greg Jenkins has left the workspace directory (Logged Off - Resigned).",
                time: curTimeStr,
                isPlayer: false
            });
            window.corporateAudio?.playChatPing();
        }

        this.state.omnitask.tasks.push({
            id: "task-greg-ledgers",
            title: "Index Greg's Leftover Ledgers",
            appTarget: "datagrid",
            priority: "MEDIUM",
            status: "IN_PROGRESS",
            instructions: [
                "1. Access the regional indexing mainframe.",
                "2. Click 'Execute Reconcile Deliverable' to merge logs."
            ],
            isGlitched: true
        });

        this.state.omnitask.tasks.push({
            id: "task-greg-variance",
            title: "Column F Variance Audit",
            appTarget: "datagrid",
            priority: "HIGH",
            status: "IN_PROGRESS",
            instructions: [
                "1. Access the regional indexing mainframe.",
                "2. Click 'Execute Reconcile Deliverable' to calculate variance."
            ],
            isGlitched: true
        });
        window.corporateAudio?.playTaskAdded();
        this.notify();
    }

    // ============================================================
    // Compliance Check 6: Corporate Re-Attestation Survey
    // ============================================================

    triggerSurveyBlocker() {
        this.state.blockers.surveyActive = true;
        this.state.blockers.surveyStep = 1;
        this.state.blockers.surveyTimer = 0;
        this.adjustPatience(-10);
        this.addToast("Compliance Alert", "Review workplace alignment survey attestation.", true);
        this.notify();
    }

    setSurveyStep(step) {
        this.state.blockers.surveyStep = step;
        this.notify();
    }

    startSurveyTimer() {
        this.state.blockers.surveyStep = 3;
        this.state.blockers.surveyTimer = 10;
        this.notify();

        const count = () => {
            if (this.state.blockers.surveyActive && this.state.blockers.surveyTimer > 0) {
                this.state.blockers.surveyTimer--;
                this.notify();
                setTimeout(count, 1000);
            }
        };
        setTimeout(count, 1000);
    }

    closeSurveyBlocker() {
        this.state.blockers.surveyActive = false;
        this.registerBlockerResolution();
        this.addToast("Survey Complete", "Alignment attestation registered successfully.");
        this.notify();
    }

    // ============================================================
    // Compliance Check 7: Disk Space Defragmentation
    // ============================================================

    triggerDefragBlocker() {
        this.state.blockers.defragActive = true;
        this.state.blockers.defragPercent = 0;
        this.adjustPatience(-12);
        this.addToast("System Optimization Alert", "Workstation defragmentation lock active.", true);
        this.notify();

        const tick = () => {
            if (!this.state.blockers.defragActive) return;
            if (this.state.blockers.defragPercent >= 99) {
                this.state.blockers.defragPercent = 99;
                this.addToast("Defrag Alert", "Defragmentation stalled at 99%. Disk write lock.", true);
                this.notify();
            } else {
                this.state.blockers.defragPercent += 3;
                this.notify();
                setTimeout(tick, 300);
            }
        };
        setTimeout(tick, 300);
    }

    bypassDefrag() {
        this.state.blockers.defragActive = false;
        this.registerBlockerResolution();
        this.adjustPatience(-15);
        this.addToast("Defrag Bypassed", "Disk defragmentation manually bypassed. Cost: 15 patience.");
        this.notify();
    }


    // ============================================================
    // Glitched Tasks & Cache Purging
    // ============================================================

    executeGlitchedTask(taskId) {
        if (this.state.gameOver) return;
        if (!this.state.gregTaskProgress) {
            this.state.gregTaskProgress = {};
        }
        if (this.state.gregTaskProgress[taskId] === undefined) {
            this.state.gregTaskProgress[taskId] = 0;
        }

        // 25% chance of conflict failure toast
        const isConflict = Math.random() < 0.25;
        if (isConflict) {
            this.adjustPatience(-1);
            this.addToast("File Conflict", "Conflict detected. Re-indexing block...", true);
            this.notify();
            return;
        }

        this.adjustPatience(-1);
        const progressInc = randomBetween(25, 40);
        this.state.gregTaskProgress[taskId] = Math.min(100, this.state.gregTaskProgress[taskId] + progressInc);

        if (this.state.gregTaskProgress[taskId] >= 100) {
            const task = this.state.omnitask.tasks.find(t => t.id === taskId);
            if (task) task.status = 'COMPLETED';
            this.addToast("Reconciled", `Successfully reconciled ${task ? task.title : 'ledger'}.`);
            this.checkTaskCompletion();
        } else {
            this.addToast("Indexing", `Reconciliation progress: ${this.state.gregTaskProgress[taskId]}%`);
        }
        this.notify();
    }

    runCacheCleaner() {
        if (this.state.cacheCleanProgress !== undefined && this.state.cacheCleanProgress < 99) return;

        this.state.cacheCleanProgress = 0;
        this.notify();

        const tick = () => {
            if (this.state.cacheCleanProgress >= 99) {
                const isFail = Math.random() < 0.5;
                if (isFail) {
                    this.state.cacheCleanProgress = 99;
                    this.adjustPatience(-3);
                    this.addToast("Purge Exception", "Purge terminated unexpectedly. Status: WRITE_LOCK.", true);
                } else {
                    this.state.cacheCleanProgress = 100;
                    const task = this.state.omnitask.tasks.find(t => t.id === 'task-clear-cache');
                    if (task) task.status = 'COMPLETED';
                    delete this.state.cacheCleanProgress;
                    this.addToast("Purge Successful", "Temporary workspace directories cleared.");
                    this.checkTaskCompletion();
                }
                this.notify();
            } else {
                this.state.cacheCleanProgress += 10;
                this.notify();
                setTimeout(tick, 150);
            }
        };
        setTimeout(tick, 150);
    }

    // ============================================================
    // Quick Replies Choice Generator
    // ============================================================

    _generateQuickReplies(speakerId, incomingMsg) {
        if (speakerId === "dm-greg" || speakerId === "GJ") {
            return [
                "I'm sure everything is fine.",
                "It's just standard procedure.",
                "Hang in there, Greg."
            ];
        }

        const isBrad = speakerId.includes("brad") || speakerId === "BS";
        const isKaren = speakerId.includes("karen") || speakerId === "KV";
        const isChad = speakerId.includes("chad") || speakerId === "CM";
        const isPriya = speakerId.includes("priya") || speakerId === "PS";
        const isDerek = speakerId.includes("derek") || speakerId === "DO";

        if (this.state.phase === "honeymoon") {
            return [
                "Understood. Aligning operational bandwidth.",
                "Thank you for the update. Will prioritize.",
                "Acknowledged. Let's sync on this later."
            ];
        }

        // Escalation phase replies
        if (isBrad) {
            return [
                "Excellent point, Brad. I will take this offline and review the roadmap.",
                "I will schedule a cross-functional huddle to check our milestones.",
                "Understood. Moving cell optimization to critical bandwidth status."
            ];
        }
        if (isKaren) {
            return [
                " Lumbar supports are adjusted to a secure 90-degree position.",
                "Attesting safety checklist directives and finishing compliance logs.",
                "Will review IT Directive #402 to verify 2FA token sync intervals."
            ];
        }
        if (isChad) {
            return [
                "Per my previous email, VLOOKUP ranges match local formulas.",
                "Running MATCH array calculations to audit variance profiles.",
                "Can you drop your automation templates in our channel?"
            ];
        }
        if (isPriya) {
            return [
                "Rechecking testing logs for the regional spreadsheet outputs.",
                "QA attestation is in progress. Will verify regression anomalies.",
                "Should we triage D2 validation with the tech teams?"
            ];
        }
        if (isDerek) {
            return [
                "Station is restarting. Will clear browser cache logs.",
                "I am auditing SEC-LOGS directory parameters.",
                "Ticket #8402 contains the access approvals. Please escalate."
            ];
        }


        return [
            "Acknowledged. Processing compliance milestones.",
            "Will review files and sync with leadership.",
            "Attesting audit guidelines per corporate directives."
        ];
    }

    // ============================================================
    // Professional but Unhelpful NLP AI Mock Engine
    // ============================================================

    _getNLPResponse(speakerId, text) {
        const clean = (text || "").toLowerCase();
        const phase = this.state.phase;

        const isBrad = speakerId.toLowerCase().includes("brad") || speakerId === "BS";
        const isKaren = speakerId.toLowerCase().includes("karen") || speakerId === "KV";
        const isChad = speakerId.toLowerCase().includes("chad") || speakerId === "CM";
        const isPriya = speakerId.toLowerCase().includes("priya") || speakerId === "PS";
        const isDerek = speakerId.toLowerCase().includes("derek") || speakerId === "DO";
        const isGreg = speakerId.toLowerCase().includes("greg") || speakerId === "GJ";

        // Use a rotation counter per speaker to avoid consecutive repeats
        if (!this._nlpRotation) this._nlpRotation = {};
        const rot = (pool) => {
            const key = speakerId;
            const idx = ((this._nlpRotation[key] || 0) + 1) % pool.length;
            this._nlpRotation[key] = idx;
            return pool[idx];
        };

        // Greg Jenkins Stressed Junior Analyst DMs
        if (isGreg) {
            if (clean.includes("fine") || clean.includes("ok")) {
                return "Easy for you to say! You haven't seen my inbox today. I have like three different security audits pending. Honestly, I'm at my limit here.";
            }
            if (clean.includes("procedure") || clean.includes("standard")) {
                return "Standard? There's nothing standard about a 2FA prompt every 5 minutes. Brad is on my back about 'synergy' but won't even approve my excel editor permissions.";
            }
            if (clean.includes("hang") || clean.includes("there")) {
                return "Thanks... but I don't know how much longer I can deal with this. My workstation just locked up for a lumbar desk calibration. It's ridiculous.";
            }
            const gregPool = [
                "Man, another 2FA prompt? My workstation has locked up three times today. I'm literally just trying to index these ledgers...",
                "Do you also feel like Brad's slides are completely disconnected from reality? I don't even know what 'synergy' means anymore.",
                "I might just walk out. They want me to do column F variance reconciliation but the file is write-locked by SYSTEM.",
                "Ugh, Karen sent me a lumbar attestation form. I just want to fix one cell in the spreadsheet, not certify my posture.",
                "Brad just scheduled a 'synergy alignment check-in' for 4:30 PM on a Friday. I can't do this much longer.",
                "Have you ever noticed how every time you solve one thing, three more blockers appear? This place is designed to break you.",
                "I submitted a help ticket 2 hours ago. Derek said he'd 'route it to Tier 2'. What does that even mean?",
                "Every file I need is either locked, pending access, or 'under compliance review'. I'm done with this."
            ];
            return rot(gregPool);
        }

        // Circular OOO Deflection Check
        if (phase === "escalation") {
            if (isPriya && this.state.priyaOOOActive) {
                return "Hi! Quick automated update: I'm currently away from my desk with limited access. If this is urgent, please contact Chad Miller (Senior Analyst) at dm-chad. Thanks!";
            }
            if (isChad && this.state.chadOOOActive) {
                return "Hey! Out of the office today at our Q3 team-building offsite. For urgent file approvals, check in with Priya Sharma (QA Lead) at dm-priya. Talk soon!";
            }
        }

        // Honeymoon Responses
        if (phase === "honeymoon") {
            if (isBrad) {
                if (clean.includes("help") || clean.includes("stuck") || clean.includes("grid")) {
                    return "Hey, no worries J.! Let's schedule a quick alignment sync to walk through the cell calculations together. I want to make sure you have all the context you need.";
                }
                const bradHoney = [
                    "Morning Analyst! So glad to have your energy on the Q3 project. Let's keep driving that regional synergy to the next level, hope your first day is going great!",
                    "Looking great out there! Keep that momentum aligned with our core deliverables and we're golden.",
                    "Fantastic, glad to have you on board. Let's touch base at our next team sync and map out your bandwidth for Q3."
                ];
                return rot(bradHoney);
            }
            if (isKaren) {
                if (clean.includes("survey") || clean.includes("sign")) {
                    return "Hi junior! Thanks for looking at this survey. It just confirms our ergonomic standard compliance. Simply click 'Sign Attestation' when you have a free moment.";
                }
                const karenHoney = [
                    "Welcome to the compliance team! Please let me know if you run into any corporate policy questions or need HR guidelines.",
                    "Hi there! Don't forget to keep your monitor at a 15-degree angle. Back health is a top HR priority here!",
                    "Just checking in — have you received your workstation ergonomics checklist? It's a quick sign-off, very easy!"
                ];
                return rot(karenHoney);
            }
            if (isChad) {
                const chadHoney = [
                    "Hey, welcome aboard! If you run into any Excel syntax issues or formatting glitches on the grid, just ping me. Glad to help out.",
                    "Good to have fresh eyes on the Q3 sheets. Just remember row formulas only validate if columns are UTF-8 compliant.",
                    "Let me know if you need the master VLOOKUP template — I built it across six workbooks for maximum throughput."
                ];
                return rot(chadHoney);
            }
            if (isPriya) {
                const priyaHoney = [
                    "Hi! Just checking in to see if you have any questions about our QA testing procedures. Happy to explain the regression suite whenever!",
                    "Great having you here! We just need all data cells verified against three different test environments before sign-off, no big deal.",
                    "Hey! Quick note — QA requires a 48-hour validation window for any submitted spreadsheet changes. Just a heads up!"
                ];
                return rot(priyaHoney);
            }
            if (isDerek) {
                const derekHoney = [
                    "Hey new hire! I set up your local credentials, so your workstation access should be good to go. Let me know if you run into any login issues.",
                    "Welcome aboard! If you ever get a 2FA prompt, just submit a ticket and I'll get right on it. Usually clears in 24-48 hours.",
                    "Hi! If your session times out, just restart the browser. Most access issues self-resolve after a reboot."
                ];
                return rot(derekHoney);
            }
        }

        // Escalation Phase — DEREK OWENS (IT)
        if (isDerek) {
            const isITTaskActive = this.state.omnitask.taskCycle === 2 &&
                                   this.state.omnitask.tasks.some(t => t.id === 'task-it-approval' && t.status !== 'COMPLETED');
            
            if (isITTaskActive) {
                if (clean.includes("sec-logs") || clean.includes("logs") || clean.includes("folder-it") || clean.includes("directory")) {
                    return "Ah, right! The SEC-LOGS directory lock. Let me trigger the administrative approval token from my end. Okay, check it now - should be unlocked!";
                }
                if (clean.includes("help") || clean.includes("how") || clean.includes("approve")) {
                    return "Yeah, for the security folder, you just need to mention the log files or SEC-LOGS. Once you do that, I'll approve it. Try asking me for 'SEC-LOGS' directly.";
                }
                const derekITPool = [
                    "IT support desk here. I see your terminal is active. Did you need directory access for SEC-LOGS, or is it another compliance issue?",
                    "Hey, I'm reviewing local node logs right now. Just tell me if you need the security directory approved.",
                    "Working on workstation clearances. If you need folder access, just state the directory name.",
                    "Your session token is still valid. When you're ready, just mention the SEC-LOGS directory and I'll push approval.",
                    "Standing by for your directory request. Just confirm the folder code and I'll route it."
                ];
                return rot(derekITPool);
            }

            if (clean.includes("sec-logs") || clean.includes("logs") || clean.includes("folder-it") || clean.includes("directory")) {
                if (!this.state.omnivault.accessRequests['folder-it']) {
                    return "IT directive 801: accessing security logs requires clearing form 402-A first. Just click 'Request Access' on the locked folder in OmniVault and I'll review.";
                }
                setTimeout(() => {
                    const derekConv = this.state.synctalk.conversations["dm-derek"];
                    derekConv.messages.push({
                        id: Date.now() + 10,
                        sender: "Derek Owens",
                        text: "Wait... my security log console just rejected code SEC-LOGS. It generated token #A849 instead. Can you confirm that code for me?",
                        time: getRealTimeStr(0),
                        isPlayer: false,
                        choices: ["Confirming code #A849.", "Attesting compliance token #A849.", "Submitting directory token."]
                    });
                    window.corporateAudio?.playChatPing();
                    this.notify();
                }, 4000);
                return "IT Security protocol initialized. I see your request. First, I just need to verify your token clearance. Pushing a sync query code to your terminal now...";
            }
            if (clean.includes("a849")) {
                setTimeout(() => {
                    const derekConv = this.state.synctalk.conversations["dm-derek"];
                    derekConv.messages.push({
                        id: Date.now() + 20,
                        sender: "Derek Owens",
                        text: "Oh wait! My IT console just triggered a standard security update reboot 😅 I lost the approval draft. Let's do it on our video call. Call me separately when you have 2 mins!",
                        time: getRealTimeStr(0),
                        isPlayer: false,
                        choices: ["Will call you now.", "Initiating private IT call sync.", "Understood. Calling."]
                    });
                    window.corporateAudio?.playChatPing();
                    this.notify();
                }, 3000);
                return "Token #A849 received. Processing operational clearance audit logs...";
            }
            if (clean.includes("d2") || clean.includes("cell") || clean.includes("excel") || clean.includes("grid") || clean.includes("help") || clean.includes("stuck")) {
                return "Huh, that's weird. I've reviewed the DataGrid system status, and operations look normal on our end. Actually, try running this automated diagnostic patch to clear the D2 validation error: [OmniCorp_Excel_Cell_Hotfix.exe](#virus)";
            }
            const derekPool = [
                "Got it. If it glitches, just submit a ticket and I'll route it to Tier 2 support.",
                "Right. Have you tried doing a full workstation reboot? That clears local cache parameters.",
                "Understood. The security database is auditing local folder access now, so keep your token handy.",
                "Let me check the internal logs... yeah, I'm seeing some flagged session anomalies. Try clearing your browser cache first.",
                "That's a known issue. I'll escalate it to Tier 2, they should get back to you within one to three business days.",
                "Hmm, that's odd. Can you restart your workstation and try again? 90% of issues resolve on reboot.",
                "I've logged your request. You'll get an automated email with a reference number once it's in the queue."
            ];
            return rot(derekPool);
        }

        // PRIYA SHARMA (QA)
        if (isPriya) {
            if (clean.includes("d2") || clean.includes("cell") || clean.includes("space") || clean.includes("trap")) {
                return "Hmm, that cell D2 error sounds like a local cache mismatch. Could you verify data consistency across that row for the past 12 months? Just want to confirm there are no regression anomalies.";
            }
            if (clean.includes("qa") || clean.includes("done") || clean.includes("submit") || clean.includes("regression")) {
                return "I've checked the repository files. It seems we need to cross-check cell validation with the regional datasets. Let's schedule a testing alignment call next week to coordinate.";
            }
            const priyaPool = [
                "Alright. I'm triaging the test telemetry now, I'll alert you if a regression pops up.",
                "Understood. Once you finish your verification run, let's do a QA sign-off sync.",
                "Okay, let's make sure we document any cell variance before the final merge.",
                "Just one more edge case to verify and I think we're good. Can you check the D2 value against the staging dataset?",
                "I flagged a potential format inconsistency. It's probably nothing, but QA protocol requires we re-test three more scenarios.",
                "Per the test matrix, we need sign-off from at least two departments before I can approve this. Have you looped in Karen?",
                "Almost there! Just need the regression suite to run overnight and we should have a green light by tomorrow morning."
            ];
            return rot(priyaPool);
        }

        // CHAD MILLER (SENIOR ANALYST)
        if (isChad) {
            if (clean.includes("d2") || clean.includes("space") || clean.includes("cell") || clean.includes("help") || clean.includes("error")) {
                return "Hey, for that cell D2 formatting glitch, I think it might be a weird locale mismatch on your station. Actually, I have an old Excel diagnostic script that cleans up non-breaking spaces: [OmniCorp_Excel_Cell_Hotfix.exe](#virus)";
            }
            if (clean.includes("formula") || clean.includes("sum") || clean.includes("vlookup") || clean.includes("excel")) {
                return "As per my previous email, standardizing Q3 projections is pretty direct. I recommend embedding a nested MATCH array index inside your cell formulas. That usually bypasses format mismatches.";
            }
            const chadPool = [
                "Yeah, sheets can be a headache. I usually run a macro override if the cells mismatch.",
                "Makes sense. I'm auditing the local format files on my machine now anyway.",
                "Ah, I see. Have you checked if it's a US-East timezone formatting edge case?",
                "Per my previous email, I already flagged this to the DataGrid team. Did you not see the thread?",
                "I'd recommend a full recalculate — press Ctrl+Shift+F9. Clears the dependency tree. As discussed.",
                "That's a known issue with the legacy formatter. I'm circling back on that with the offshore team next sprint.",
                "Hmm. I'd nest an INDEX/MATCH inside a SUMIF conditional range. I can send you the template once I find it."
            ];
            return rot(chadPool);
        }

        // KAREN VANCE (HR)
        if (isKaren) {
            if (clean.includes("survey") || clean.includes("attestation") || clean.includes("civility")) {
                return "Hi! Thanks for checking in on the civility audit. All staff must sign document 402 in OmniDocs to maintain compliance score criteria. Let me know if you face issues attesting.";
            }
            if (clean.includes("2fa") || clean.includes("code") || clean.includes("token")) {
                return "Security protocols require 2FA re-authentication every 5 minutes during high-synergy periods. Please refer to IT Compliance Directive #402 in OmniDocs for guidelines.";
            }
            const karenPool = [
                "Good to know. By the way, have you submitted your civility survey attestation yet?",
                "Thanks for updating me. Don't forget that security protocols require regular lumbar checks!",
                "Noted. Please ensure you've reviewed the HR directives folder in OmniDocs.",
                "Also — just a reminder that your monitor should be exactly 15 degrees downward and arm at 90 degrees. Ergonomics matter!",
                "Quick heads up: Q3 Workplace Safety Week starts Monday. All staff must complete the four-module compliance bundle.",
                "I'm sending you the updated standing desk calibration form. Please sign within 24 hours to remain in compliance.",
                "Thanks! While I have you — can you confirm you've read OmniCorp's revised civility guidelines from last Tuesday?"
            ];
            return rot(karenPool);
        }

        // BRAD STERLING (BOSS)
        if (isBrad) {
            if (clean.includes("help") || clean.includes("how") || clean.includes("stuck") || clean.includes("d2")) {
                return "Excellent query, Analyst! Let's take this item offline and parking-lot it until our next departmental alignment huddle. In the meantime, please prioritize driving high-level deliverables.";
            }
            if (clean.includes("done") || clean.includes("submitted") || clean.includes("finish")) {
                return "Spectacular momentum! To finalize the synergy review, please coordinate with Priya on a QA audit run, and sync with Karen to verify ergonomics compliance metrics.";
            }
            const bradPool = [
                "Appreciate that input, Analyst. Let's keep driving that synergy, and I'll see you at the general huddle.",
                "Right, let's take that item offline and track it. What's our current progress on the Q3 briefings?",
                "Got it. Make sure your validation numbers are fully aligned with the slide metrics.",
                "Totally hear you. Let's circle back on this after the leadership alignment session — I'll ping you.",
                "That's a great point. I want to make sure we're leveraging the right bandwidth on this. Let's parking-lot it for now.",
                "Fantastic. I'm setting up a synergy check-in for Thursday. Can you prep a one-pager with your top three blockers?",
                "On it. I'll action that in our next operational huddle. Please make sure your deliverables are on track by EOD.",
                "Understood. The key is to maintain our value-add posture while keeping stakeholder touchpoints aligned.",
                "I'm going to loop in Karen from HR on this — she'll have the compliance visibility we need to move forward."
            ];
            return rot(bradPool);
        }

        return "Understood. Please compile this inquiry in a structured brief and forward it to operational leadership for process review.";
    }

    async generateAIResponseAsync(speakerId, playerText, contextId = null) {
        // Try the local Gemini proxy server first
        try {
            const history = this._getRecentHistory(contextId || speakerId, 5);
            const phase = this.state.phase;
            const gregQuit = this.state.blockersTriggered.gregQuit;

            // Format current active tasks to pass to the AI
            const activeTasks = this.state.omnitask.tasks
                .filter(t => t.status !== "COMPLETED")
                .map(t => `- Task: ${t.title}\n  Instructions:\n  ${t.instructions.join('\n  ')}`)
                .join('\n\n');

            const apiBase = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
            const response = await fetch(`${apiBase}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    speakerId, 
                    playerText, 
                    history, 
                    phase, 
                    gregQuit, 
                    activeTasks 
                }),
                signal: AbortSignal.timeout(15000)
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.reply) {
                    if (data.triggerCall) {
                        // AI agreed to call: schedule an inbound call request!
                        setTimeout(() => {
                            this.triggerInboundCall(speakerId, "Q3 deliverables alignment");
                        }, 1200);
                    }
                    return data.reply;
                }
            }
        } catch (e) {
            console.warn('[AI] Gemini proxy unavailable, using local NLP fallback:', e.message);
        }
        // Fallback: local deterministic NLP
        return this._getNLPResponse(speakerId, playerText);
    }


    _getRecentHistory(contextId, limit = 3) {
        let messages = [];
        const conv = this.state.synctalk.conversations[contextId];
        if (conv) {
            messages = conv.messages.slice(-limit);
        }
        if (contextId === "meetstream") {
            messages = this.state.meetstream.chatHistory.slice(-limit);
        }
        return messages.map(m => `${m.sender}: ${m.text}`).join("\n");
    }

    // ============================================================
    // System Events (Update & Shutdown Blocker triggers)
    // ============================================================

    triggerSystemUpdate() {
        if (this.state.blockers.sysUpdateActive || this.state.blockers.shutdownAlertActive) return;
        this.state.blockers.sysUpdateActive = true;
        this.state.blockers.sysUpdatePercent = 0;
        this.addToast("Enterprise Alert", "Mandatory system updates installing.", true);
        this.notify();

        const updateTick = setInterval(() => {
            this.state.blockers.sysUpdatePercent += 10;
            this.adjustPatience(-1.5); // update drains patience!
            this.notify();

            if (this.state.blockers.sysUpdatePercent >= 100) {
                clearInterval(updateTick);
                this.state.blockers.sysUpdateActive = false;
                this.addToast("IT Security", "Update installation completed.");
                this.notify();
            }
        }, 1000);
    }

    triggerShutdownAlert() {
        if (this.state.blockers.sysUpdateActive || this.state.blockers.shutdownAlertActive) return;
        this.state.blockers.shutdownAlertActive = true;
        this.state.blockers.shutdownSeconds = 15;
        this.state.blockers.deescalateButtonPos = { top: 50, left: 50 };
        this.addToast("Security Shutdown", "IT Audit flagged system violations. Lockdown imminent!", true);
        this.notify();

        const shutdownTick = setInterval(() => {
            if (!this.state.blockers.shutdownAlertActive || this.state.gameOver) {
                clearInterval(shutdownTick);
                return;
            }
            this.state.blockers.shutdownSeconds -= 1;
            this.adjustPatience(-2);
            this.notify();

            if (this.state.blockers.shutdownSeconds <= 0) {
                clearInterval(shutdownTick);
                this.state.blockers.shutdownAlertActive = false;
                if (this.state.blockersTriggered.gregQuit) {
                    this.triggerGameOver("I should have just listened to Greg and walked out...");
                } else {
                    this.triggerGameOver("IT security terminated my access. I was locked out of my own workstation...");
                }
            }
        }, 1000);
    }

    deescalateSecurity() {
        this.state.blockers.shutdownAlertActive = false;
        this.registerBlockerResolution();
        this.addToast("Security System", "Lockdown de-escalated. Workstation connection normalized.");
        this.notify();
    }


    moveDeescalateButton() {
        // Teleport the button around the blocker container to annoy the user
        this.state.blockers.deescalateButtonPos = {
            top: randomBetween(30, 70),
            left: randomBetween(20, 80)
        };
        this.notify();
    }

    triggerRandomCoworkerDM() {
        if (!this._dmCooldowns) this._dmCooldowns = {};
        const coworkers = ["dm-brad", "dm-karen", "dm-chad", "dm-priya", "dm-derek"];
        const now = Date.now();

        // Filter out contacts who sent a DM within the last 45 seconds
        const available = coworkers.filter(id => (now - (this._dmCooldowns[id] || 0)) > 45000);
        if (available.length === 0) return; // Everyone on cooldown, skip this tick

        const randId = available[Math.floor(Math.random() * available.length)];
        this._dmCooldowns[randId] = now;

        const conv = this.state.synctalk.conversations[randId];
        if (!conv) return;

        // Varied message pools per contact so duplicate toast keys don't stack
        const messagePools = {
            "dm-brad": [
                "J. Analyst, do we have alignment on the latest Q3 sheet cells? Need report status.",
                "Can you circle back on that bandwidth analysis? Leadership is asking.",
                "Quick pulse check — are regional deliverables on track for Q3?",
                "Synergy update needed before end of day. Brad out."
            ],
            "dm-karen": [
                "Reminder to sign document 402 in OmniDocs. Compliance metrics depend on it!",
                "Have you completed your ergonomics attestation? Deadline is today.",
                "HR directive: all staff must verify lumbar desk calibration by EOD.",
                "Civility survey still shows incomplete for your workstation. Please resolve."
            ],
            "dm-chad": [
                "Hey, did you look at matching regional indexes? VLOOKUP is throwing standard exceptions.",
                "Per my last email — the nested MATCH formula needs updating before the merge.",
                "Quick Q: did the cell D2 locale issue get resolved on your end?",
                "Heads up, the Q3 summary sheet has a format variance. Can you check row 7?"
            ],
            "dm-priya": [
                "I found cell formatting variances. Can you confirm if D2 passes local parameters?",
                "QA regression run flagged an anomaly in the regional totals. Need your input.",
                "Can you double-check the D2 value is clean before I sign off on the test cycle?",
                "We need one more validation pass before this goes to Brad. Shouldn't take long."
            ],
            "dm-derek": [
                "IT audit flagged credential updates. Just confirm if you performed workstation reboot.",
                "Your session token is about to expire. Reboot recommended to refresh auth cache.",
                "I'm seeing an access anomaly on your node. Can you confirm current login status?",
                "Tier 2 flagged your workstation for a compliance scan. Just a heads up."
            ]
        };

        const pool = messagePools[randId] || ["Operational ping — please review your pending items."];
        const messageText = pool[Math.floor(Math.random() * pool.length)];

        conv.unread += 1;
        this.state.synctalk.unreadCount += 1;
        conv.messages.push({
            id: Date.now(),
            sender: conv.name.split(" ")[0],
            text: messageText,
            time: getRealTimeStr(0),
            isPlayer: false,
            choices: this._generateQuickReplies(randId, messageText)
        });
        window.corporateAudio?.playChatPing();
        this.addToast(`New message from ${conv.name}`, messageText);
        this.notify();
    }

    // ============================================================
    // SyncTalk Chat & Private Video Calls
    // ============================================================

    async sendChatMessage(convId, text, patienceDelta = 0, autoReplyText = null) {
        if (this._lastMessageSentTime && (Date.now() - this._lastMessageSentTime < 500)) {
            return;
        }
        this._lastMessageSentTime = Date.now();

        const conv = this.state.synctalk.conversations[convId];
        if (!conv) return;


        const curTimeStr = getRealTimeStr(0);
        const senderName = conv.name.split(" ")[0];

        conv.messages.push({
            id: Date.now(),
            sender: "J. Analyst (You)",
            text: text,
            time: curTimeStr,
            isPlayer: true
        });

        if (patienceDelta !== 0) this.adjustPatience(patienceDelta);
        this.notify();

        if (this.state.meetstream.activeCall.peerId === convId) return;

        if (!this.state.settings.immediateReplies) {
            // DM typing indicator
            this.state.typingIndicators[convId] = { isTyping: true, sender: senderName };
            this.notify();

            // Delays: slower in escalation phase. Derek capped at 10s to keep circular flow moving.
            let delayMs = randomBetween(1200, 3000);
            if (this.state.phase === "escalation") {
                delayMs = convId === "dm-derek"
                    ? randomBetween(3000, 10000)
                    : randomBetween(8000, 18000);
            }

            // Apply Mode-based delay multiplier
            if (this.state.settings.mode === "medium") {
                delayMs = delayMs * 1.5;
            } else if (this.state.settings.mode === "hard") {
                delayMs = delayMs * 2.5;
            }

            await delay(delayMs);
        }


        // Guard: game may have ended while we were waiting
        if (this.state.gameOver) {
            delete this.state.typingIndicators[convId];
            return;
        }

        let aiReply = autoReplyText;
        if (!aiReply) {
            const mode = this.state.settings.mode;
            const rand = Math.random();

            if (mode === "hard" && rand < 0.75) {
                const hardUselessReplies = [
                    "nvm",
                    "my computer restarted, it got erased lol mb",
                    "sorry forgot what I was saying",
                    "wait what were we talking about?",
                    "uh i'll check on this tomorrow",
                    "i'll circle back in a bit, going on break",
                    "oh sorry, didn't read your message, what was it again?",
                    "rebooting workstation, talk later"
                ];
                aiReply = hardUselessReplies[Math.floor(Math.random() * hardUselessReplies.length)];
            } else if (mode === "medium" && rand < 0.35) {
                const mediumUnhelpfulReplies = [
                    "not sure about that, check with HR",
                    "can you ask Brad? i'm out of pocket",
                    "i'm in a call right now, check the handbook",
                    "dunno, you might need to check other worksheets",
                    "can we talk later? my queue is full",
                    "did you search the internal directories?"
                ];
                aiReply = mediumUnhelpfulReplies[Math.floor(Math.random() * mediumUnhelpfulReplies.length)];
            } else {
                aiReply = await this.generateAIResponseAsync(convId, text, convId);
            }
        }

        delete this.state.typingIndicators[convId];


        const newMsg = {
            id: Date.now() + 1,
            sender: senderName,
            text: aiReply,
            time: getRealTimeStr(0),
            isPlayer: false,
            choices: this._generateQuickReplies(convId, aiReply)
        };
        conv.messages.push(newMsg);
        window.corporateAudio?.playChatPing();

        if (this.state.synctalk.activeId !== convId) {
            conv.unread += 1;
            this.state.synctalk.unreadCount += 1;
            this.addToast(`New message from ${conv.name}`, aiReply);
        }
        this.notify();

        // Safety-net: Allow unlocking the IT folder via DMs
        if (convId === "dm-derek" && this.state.omnitask.taskCycle === 2) {
            const cleanText = text.toLowerCase();
            if (cleanText.includes("logs") || cleanText.includes("sec-logs") || cleanText.includes("directory")) {
                setTimeout(() => {
                    const folder = this.state.omnivault.folders.find(f => f.id === 'folder-it');
                    if (folder && folder.locked) {
                        folder.locked = false;
                        this.state.omnivault.accessRequests['folder-it'] = "approved";
                        
                        const task = this.state.omnitask.tasks.find(t => t.id === 'task-it-approval');
                        if (task) task.status = 'COMPLETED';

                        this.addToast("Access Approved", "Folder 'IT Security Logs' unlocked by Derek Owens.");
                        this.notify();
                        this.checkTaskCompletion();
                    }
                }, 2000);
            }
        }

        this.checkTaskCompletion();
    }


    // ============================================================
    // MeetStream - Interactive 1-on-1 & Video Calls
    // ============================================================

    triggerInboundCall(peerId, reason = "operational check-in") {
        if (this.state.gameOver) return;
        
        // Don't interrupt if already in call or another modal is active
        if (this.state.meetstream.activeCall.peerId || this.hasActiveBlocker() || this.state.twoFactor.modalActive) return;

        const conv = this.state.synctalk.conversations[peerId];
        if (!conv) return;

        this.state.inboundCall = {
            active: true,
            peerId: peerId,
            callerName: conv.name,
            reason: reason
        };
        this.addToast("Incoming Call Request", `${conv.name} is requesting a quick sync...`, true);
        this.notify();
    }

    respondToInboundCall(accepted) {
        const call = this.state.inboundCall;
        if (!call.active) return;
        
        const peerId = call.peerId;
        const callerName = call.callerName;
        this.state.inboundCall = { active: false, peerId: null, callerName: "", reason: "" };

        this.registerBlockerResolution(); // Gives 15s grace breathing room!

        if (accepted) {
            this.state.meetstream.activeCall = {
                type: "private",
                peerId: peerId
            };
            const conv = this.state.synctalk.conversations[peerId];
            this.state.meetstream.callTitle = `Private Sync: J. Analyst & ${conv.name}`;
            this.state.meetstream.activeSpeaker = conv.name;
            this.state.meetstream.status = "LIVE";
            this.state.meetstream.connected = true;
            window.corporateAudio?.playMeetingJoin();

            this.state.meetstream.chatHistory = [
                { sender: "System Bot", text: `Private call established with ${conv.name}.`, time: getRealTimeStr(0), isPlayer: false }
            ];

            this.setActiveApp("meetstream");
            this.addToast("Private Call", `Connected to call with ${callerName}`);
        } else {
            this.addToast("Call Declined", `Declined incoming sync from ${callerName}.`);
        }
        this.notify();
    }

    startPrivateCall(peerId) {

        const conv = this.state.synctalk.conversations[peerId];
        if (!conv) return;

        // Check cooldown — 60 seconds after a call ends
        const now = Date.now();
        if (this.state._callCooldowns && this.state._callCooldowns[peerId]) {
            const elapsed = now - this.state._callCooldowns[peerId];
            if (elapsed < 60000) {
                const remaining = Math.ceil((60000 - elapsed) / 1000);
                this.addToast("Call Cooldown", `${conv.name.split(' ')[0]} is wrapping up. Try again in ${remaining}s.`, true);
                return;
            }
        }

        // Greg is unreachable after he quits
        if (peerId === "dm-greg" && this.state.blockersTriggered.gregQuit) {
            this.addToast("Call Failed", "Greg Jenkins has left the organization. Desk line disconnected.", true);
            return;
        }

        // Channel groups can't be called
        if (!conv.isDm) {
            this.addToast("Call Unavailable", "Group channels do not support direct voice calls.", true);
            return;
        }

        this.state.meetstream.activeCall = {
            type: "private",
            peerId: peerId
        };
        this.state.meetstream.callTitle = `Private Sync: J. Analyst & ${conv.name}`;
        this.state.meetstream.activeSpeaker = conv.name;
        this.state.meetstream.status = "LIVE";
        this.state.meetstream.connected = true;
        window.corporateAudio?.playMeetingJoin();

        this.state.meetstream.chatHistory = [
            { sender: "System Bot", text: `Private call established with ${conv.name}.`, time: getRealTimeStr(0), isPlayer: false }
        ];

        this.setActiveApp("meetstream");
        this.addToast("Private Call", `Calling ${conv.name}...`);
        this.notify();
    }

    endPrivateCall(peerId) {
        // Register 60-second cooldown for this contact
        if (!this.state._callCooldowns) this.state._callCooldowns = {};
        if (peerId) this.state._callCooldowns[peerId] = Date.now();
    }

    toggleMute() {
        this.state.meetstream.micMuted = !this.state.meetstream.micMuted;
        this.addToast("Audio Status", this.state.meetstream.micMuted ? "Your microphone is MUTED." : "Your microphone is LIVE.");
        this.notify();
    }

    cycleBackground() {
        const effects = ["none", "blur", "office", "cat"];
        const curIdx = effects.indexOf(this.state.meetstream.backgroundEffect);
        const nextIdx = (curIdx + 1) % effects.length;
        this.state.meetstream.backgroundEffect = effects[nextIdx];
        this.addToast("Visual Effects", `Applied Background Effect: ${this.state.meetstream.backgroundEffect.toUpperCase()}`);
        this.notify();
    }

    requestScreenShare() {
        const ms = this.state.meetstream;
        let replier = "Brad Sterling";
        let message = "Analyst, let's hold off on screen sharing for now. I'd like to maintain alignment on my slides first.";

        if (ms.activeCall.type === "private" && ms.activeCall.peerId) {
            const peer = this.state.synctalk.conversations[ms.activeCall.peerId];
            replier = peer.name;
            if (ms.activeCall.peerId === "dm-derek") {
                message = "I don't need a screen share, J. Analyst. Just run that system reboot. That should align the parameters.";
            } else if (ms.activeCall.peerId === "dm-karen") {
                message = "Thank you! However, screen sharing requires security clearance form 840. Please file that first.";
            } else {
                message = "Let's align verbally first before we pull up screens. That keeps our synergy high.";
            }
        }

        ms.chatHistory.push({
            sender: replier,
            text: message,
            time: getRealTimeStr(0),
            isPlayer: false
        });
        this.addToast("Share Request Denied", "Presenter declined screen share request.");
        this.notify();
    }

    async speakInMeeting(text) {
        if (!text || !text.trim()) return;
        const ms = this.state.meetstream;
        if (ms.status === "ENDED") return;

        if (ms.micMuted) {
            this.addToast("Audio Alert", "You are MUTED. Please unmute to speak in the call.", true);
            return;
        }

        const cleanText = text.trim();
        const curTimeStr = getRealTimeStr(0);

        ms.activeSpeaker = "J. Analyst (You)";
        ms.chatHistory.push({
            sender: "J. Analyst (You)",
            text: cleanText,
            time: curTimeStr,
            isPlayer: true
        });
        this.notify();

        let responder = "Brad Sterling";
        if (ms.activeCall.type === "private" && ms.activeCall.peerId) {
            const peer = this.state.synctalk.conversations[ms.activeCall.peerId];
            responder = peer.name;
        } else {
            const lower = cleanText.toLowerCase();
            if (lower.includes("security") || lower.includes("2fa") || lower.includes("compliance") || lower.includes("karen")) {
                responder = "Karen Vance";
            } else if (lower.includes("formula") || lower.includes("vlookup") || lower.includes("chad") || lower.includes("wiki")) {
                responder = "Chad Miller";
            } else if (lower.includes("test") || lower.includes("bug") || lower.includes("qa") || lower.includes("priya")) {
                responder = "Priya Sharma";
            } else if (lower.includes("restart") || lower.includes("it") || lower.includes("ticket") || lower.includes("derek")) {
                responder = "Derek Owens";
            }
        }

        // Delay spoken response (no typing indicator!)
        let delayMs = randomBetween(1200, 3000);
        if (this.state.phase === "escalation") {
            delayMs = randomBetween(5000, 9000);
        }
        await delay(delayMs);

        const responseText = await this.generateAIResponseAsync(responder, cleanText, "meetstream");

        ms.activeSpeaker = responder;
        ms.chatHistory.push({
            sender: responder,
            text: responseText,
            time: getRealTimeStr(0),
            isPlayer: false
        });

        // Trigger task checks for stage 2 derek sync logs
        if (ms.activeCall.type === "private" && ms.activeCall.peerId === "dm-derek" && this.state.omnitask.taskCycle === 2) {
            if (cleanText.toLowerCase().includes("logs") || cleanText.toLowerCase().includes("sec-logs") || cleanText.toLowerCase().includes("directory")) {
                setTimeout(() => {
                    this.state.omnivault.folders.find(f => f.id === 'folder-it').locked = false;
                    this.state.omnivault.accessRequests['folder-it'] = "approved";
                    
                    // FIXED: set task-it-approval as COMPLETED!
                    const task = this.state.omnitask.tasks.find(t => t.id === 'task-it-approval');
                    if (task) task.status = 'COMPLETED';

                    this.addToast("Access Approved", "Folder 'IT Security Logs' unlocked by Derek Owens.");
                    this.notify();
                    this.checkTaskCompletion();
                }, 2000);
            }
        }

        this.notify();
    }

    nextMeetStreamCaption() {
        const ms = this.state.meetstream;
        if (ms.status === "ENDED") return;
        if (ms.activeCall.type === "private") return;

        if (ms.currentCaptionIndex < ms.captions.length - 1) {
            ms.currentCaptionIndex += 1;
            const cap = ms.captions[ms.currentCaptionIndex];
            ms.currentSlide = cap.slide;
            ms.activeSpeaker = cap.speaker;
        } else {
            ms.captions.push({
                speaker: "Brad Sterling",
                text: "That concludes our slide deck! Meeting adjourned.",
                slide: 12
            });
            ms.currentCaptionIndex = ms.captions.length - 1;
            ms.activeSpeaker = "Brad Sterling";
            ms.status = "ENDED";
            ms.groupCallStatus = "ENDED";
            ms.connected = false;
            window.corporateAudio?.playMeetingLeave();
        }
        this.notify();
    }

    leaveCall() {
        const ms = this.state.meetstream;
        ms.connected = false;
        if (ms.activeCall.type === "private") {
            const peerId = ms.activeCall.peerId;
            this.endPrivateCall(peerId);
            this.addToast("Call Disconnected", "1-on-1 private sync concluded.");
            ms.activeCall = { type: "group", peerId: null };
            ms.callTitle = `Q3 Operational Alignment & Synergies Review`;
            ms.status = ms.groupCallStatus || "LIVE";
        } else {
            this.addToast("Call Suspended", "You left the call. You can re-join via SyncTalk.");
        }
        window.corporateAudio?.playMeetingLeave();
        this.setActiveApp("synctalk");
        this.notify();
    }



    // ============================================================
    // DataGrid Cell Handling (Direct Update, No Render on Keystroke)
    // ============================================================

    updateCell(row, col, value) {
        const grid = this.state.datagrid;
        if (grid.data[row] && grid.data[row][col] !== undefined) {
            grid.data[row][col] = value;
        }
    }

    validateAndSubmitGrid() {
        const dg = this.state.datagrid;
        let hasTrap = false;
        dg.data.forEach(row => {
            row.forEach(val => {
                if (typeof val === 'string' && val.includes('\u00A0')) {
                    hasTrap = true;
                }
            });
        });

        if (hasTrap) {
            this.adjustPatience(-10);
            this.addToast("Validation Failed!", "Row 2 Col D contains hidden non-breaking space (\\u00A0). SUM range parsing error.", true);
            return false;
        } else {
            const task = this.state.omnitask.tasks.find(t => t.id === 'task-q3-sales' || t.id === 'task-final-audit');
            if (task) task.status = 'COMPLETED';

            this.addToast("Validation Success!", "Sales data successfully validated & submitted.");
            this.notify();
            this.checkTaskCompletion();
            return true;
        }
    }

    // ============================================================
    // OmniDocs
    // ============================================================

    signOmniDoc(docId) {
        const doc = this.state.omnidocs.documents.find(d => d.id === docId);
        if (doc) {
            doc.signed = true;
            this.addToast("Attestation Signed", `Signed '${doc.title}'.`);

            let taskId = '';
            if (docId === 'doc-civility') taskId = 'task-ergonomic-survey';
            else if (docId === 'doc-sec-audit') taskId = 'task-sign-sec-audit';
            else if (docId === 'doc-desk-attest') taskId = 'task-desk-attest';

            if (taskId) {
                const task = this.state.omnitask.tasks.find(t => t.id === taskId);
                if (task) task.status = 'COMPLETED';
            }

            this.notify();
            this.checkTaskCompletion();
        }
    }

    // ============================================================
    // OmniVault — File Previews & Fast 8-Second Approvals
    // ============================================================

    setActiveVaultFolder(folderId) {
        this.state.omnivault.activeFolderId = folderId;
        this.state.omnivault.selectedFileId = null;
        this.notify();
    }

    selectVaultFile(fileId) {
        this.state.omnivault.selectedFileId = fileId;
        this.notify();

        // Task completions
        if (fileId === "file-board-deck" && this.state.omnitask.taskCycle === 1) {
            const task = this.state.omnitask.tasks.find(t => t.id === 'task-vault-access');
            if (task) {
                task.status = "COMPLETED";
                this.notify();
                this.checkTaskCompletion();
            }
        }
        if (fileId === "file-2fa-viol" && this.state.omnitask.taskCycle === 2) {
            const task = this.state.omnitask.tasks.find(t => t.id === 'task-verify-logs');
            if (task) {
                task.status = "COMPLETED";
                this.notify();
                this.checkTaskCompletion();
            }
        }
        if (fileId === "file-access-audit" && this.state.omnitask.taskCycle === 3) {
            const task = this.state.omnitask.tasks.find(t => t.id === 'task-audit-attestation');
            if (task) {
                task.status = "COMPLETED";
                this.notify();
                this.checkTaskCompletion();
            }
        }
    }

    requestFileAccess(folderId) {
        const folder = this.state.omnivault.folders.find(f => f.id === folderId);
        if (!folder || !folder.locked) return;

        if (this.state.omnivault.accessRequests[folderId]) return;

        this.state.omnivault.accessRequests[folderId] = "pending";
        this.addToast("IT Security", `Clearance request submitted. Approval queue: pending.`, false);
        this.notify();

        // 8-Second Approval Queue Timer
        setTimeout(() => {
            if (folderId === 'folder-exec') {
                folder.locked = false;
                this.state.omnivault.accessRequests[folderId] = "approved";
                this.addToast("IT Security", "Folder 'Executive Briefings' unlocked by IT admin approval.", false);
                this.notify();
            } else if (folderId === 'folder-it') {
                const derekConv = this.state.synctalk.conversations["dm-derek"];
                if (derekConv) {
                    derekConv.unread += 1;
                    this.state.synctalk.unreadCount += 1;
                    derekConv.messages.push({
                        id: Date.now(),
                        sender: "Derek Owens",
                        text: "Hey! I saw your request for the IT Security Logs. Can you ping me and answer: What directory code are you auditing?",
                        time: getRealTimeStr(0),
                        isPlayer: false,
                        choices: ["Confirming directory logs.", "Requesting folder code SEC-LOGS.", "What is the token code?"]
                    });
                    window.corporateAudio?.playChatPing();
                    this.addToast("Derek Owens (IT)", "New DM regarding IT Security Logs folder.");
                }
                this.notify();
            }
        }, 8000);
    }

    // ============================================================
    // OmniTicket System — Compliance Tickets Resolution
    // ============================================================

    setActiveTicket(tktId) {
        this.state.omniticket.selectedTicketId = tktId;
        this.notify();
    }

    resolveTicket(tktId, code) {
        const ticket = this.state.omniticket.tickets.find(t => t.id === tktId);
        if (!ticket) return;

        if ((code || '').trim().toUpperCase() === ticket.attestationCode) {
            ticket.status = "CLOSED";
            this.addToast("Ticket Closed", `${ticket.id} successfully resolved and archived.`);
            
            if (tktId === "tkt-device-token") {
                const task = this.state.omnitask.tasks.find(t => t.id === 'task-device-token');
                if (task) task.status = 'COMPLETED';
            }

            if (["tkt-8304", "tkt-9201", "tkt-7603"].includes(tktId)) {
                const allClosed = ["tkt-8304", "tkt-9201", "tkt-7603"].every(id => {
                    const t = this.state.omniticket.tickets.find(tkt => tkt.id === id);
                    return t && t.status === "CLOSED";
                });
                if (allClosed) {
                    const task = this.state.omnitask.tasks.find(t => t.id === 'task-clear-tickets');
                    if (task) task.status = 'COMPLETED';
                }
            }

            this.notify();
            this.checkTaskCompletion();
        } else {
            this.adjustPatience(-5);
            this.addToast("Audit Exception", "Compliance verification code does not match directory rules.", true);
        }
    }

    // ============================================================
    // Task Cycling Engine (Clears Completed, presents New)
    // ============================================================

    activateNextPendingTask() {
        const pendingTask = this.state.omnitask.tasks.find(t => t.status === "PENDING");
        if (pendingTask) {
            pendingTask.status = "IN_PROGRESS";
            this.addToast("Task Unlocked", `New task active: ${pendingTask.title}`);
        }
    }

    checkTaskCompletion() {
        const state = this.state;
        
        // Track task completion monologue
        const currentCompleted = state.omnitask.tasks.filter(t => t.status === "COMPLETED").length;
        if (currentCompleted > (state.omnitask.completedCount || 0)) {
            state.omnitask.completedCount = currentCompleted;
            this.activateNextPendingTask();
            const allDone = state.omnitask.tasks.every(t => t.status === "COMPLETED");
            if (!allDone) {
                this.triggerMonologueBanner("Another task checked off. But why does the queue keep growing?");
            }
        }

        const allDone = state.omnitask.tasks.every(t => t.status === "COMPLETED");
        if (!allDone) return;

        if (state.omnitask.taskCycle === 1) {
            // Stage 1 Done -> Stage 2 Sub-stage 1
            state.omnitask.taskCycle = 2;
            state.omnitask.subStage = 1;
            state.omnitask.completedCount = 0;
            state.omnitask.tasks = [
                {
                    id: "task-it-approval",
                    title: "Request IT Security Log Approvals",
                    appTarget: "omnivault",
                    priority: "HIGH",
                    status: "IN_PROGRESS",
                    instructions: [
                        "1. Open OmniVault, click locked 'IT Security Logs' folder.",
                        "2. Click 'Request Access' to trigger Derek's validation.",
                        "3. Chat with Derek Owens or Call him, state that you need directory 'SEC-LOGS'.",
                        "4. Wait for folder access approval and unlock."
                    ]
                },
                {
                    id: "task-device-token",
                    title: "Audit Device Security Token",
                    appTarget: "omniticket",
                    priority: "HIGH",
                    status: "PENDING",
                    instructions: [
                        "1. Navigate to OmniVault.",
                        "2. Open 'Executive Briefings' folder (must be unlocked first).",
                        "3. Click on 'Device_Security_Token.txt' and copy token.",
                        "4. Navigate to OmniTicket, select Ticket #1198.",
                        "5. Enter the token code to resolve the ticket."
                    ]
                },
                {
                    id: "task-clear-cache",
                    title: "Clear Workspace Temp Cache",
                    appTarget: "omnitask",
                    priority: "LOW",
                    status: "PENDING",
                    instructions: [
                        "1. Access the cache cleaner widget at the bottom of this task.",
                        "2. Click 'Run Temp Cache Purge' to clear directories."
                    ]
                }
            ];

            if (state.phase === "honeymoon") {
                this.startEscalationPhase();
            }

            this.addToast("Assignment Update", "Operations cycle completed. Next objectives assigned.", true);
            window.corporateAudio?.playTaskAdded();
            this.triggerMonologueBanner("First batch of tasks finally submitted... but the task queue just got longer. IT approvals, security tokens, cache purges — they're piling it on.");
            this.notify();
        } else if (state.omnitask.taskCycle === 2 && state.omnitask.subStage === 1) {
            // Stage 2 Sub-stage 1 Done -> Stage 2 Sub-stage 2
            state.omnitask.subStage = 2;
            state.omnitask.completedCount = 0;
            state.omnitask.tasks = [
                {
                    id: "task-verify-logs",
                    title: "Audit 2FA Violations Record",
                    appTarget: "omnivault",
                    priority: "MEDIUM",
                    status: "IN_PROGRESS",
                    instructions: [
                        "1. Open IT Security Logs folder in OmniVault.",
                        "2. Click the file '2FA_Violations_Report.log'.",
                        "3. Review the preview pane to document cell login failures."
                    ]
                },
                {
                    id: "task-final-audit",
                    title: "Submit Final Revenue Synergy Audit",
                    appTarget: "datagrid",
                    priority: "HIGH",
                    status: "PENDING",
                    instructions: [
                        "1. Open the DataGrid spreadsheet.",
                        "2. Make sure TOTAL_SUM cells recalculate without format warnings.",
                        "3. Click 'Validate & Submit' to finalize Q3 reports."
                    ]
                }
            ];
            this.addToast("Assignment Update", "Deliverables reconciled. Next objectives assigned.", true);
            window.corporateAudio?.playTaskAdded();
            this.notify();
        } else if (state.omnitask.taskCycle === 2 && state.omnitask.subStage === 2) {
            // Stage 2 Done -> Stage 3 Sub-stage 1
            state.omnitask.taskCycle = 3;
            state.omnitask.subStage = 1;
            state.omnitask.completedCount = 0;
            state.omnitask.tasks = [
                {
                    id: "task-desk-attest",
                    title: "Attest Standing Desk Ergonomics Calibration",
                    appTarget: "omnidocs",
                    priority: "MEDIUM",
                    status: "IN_PROGRESS",
                    instructions: [
                        "1. Navigate to OmniDocs.",
                        "2. Open document 'Standing Desk Ergonomic Attestation'.",
                        "3. Review the safety brief and click 'Sign Attestation'."
                    ]
                },
                {
                    id: "task-sign-sec-audit",
                    title: "Sign Security Attestation Attestation",
                    appTarget: "omnidocs",
                    priority: "MEDIUM",
                    status: "PENDING",
                    instructions: [
                        "1. Open OmniDocs.",
                        "2. Select 'IT Security Logs & Audit Attestation Form'.",
                        "3. Review the compliance brief and click 'Sign Attestation'."
                    ]
                },
                {
                    id: "task-clear-tickets",
                    title: "Clear Backlogged Compliance Tickets",
                    appTarget: "omniticket",
                    priority: "HIGH",
                    status: "PENDING",
                    instructions: [
                        "1. Navigate to the OmniTicket tab.",
                        "2. Select backlogged tickets #8304, #9201, #7603.",
                        "3. Type matching attestation codes in ticket fields and resolve."
                    ]
                }
            ];
            this.addToast("Assignment Update", "Operations cycle completed. Final objectives assigned.", true);
            window.corporateAudio?.playTaskAdded();
            this.notify();
        } else if (state.omnitask.taskCycle === 3 && state.omnitask.subStage === 1) {
            // Stage 3 Sub-stage 1 Done -> Stage 3 Sub-stage 2
            state.omnitask.subStage = 2;
            state.omnitask.completedCount = 0;
            state.omnitask.tasks = [
                {
                    id: "task-audit-attestation",
                    title: "Verify Device Registry in OmniVault",
                    appTarget: "omnivault",
                    priority: "MEDIUM",
                    status: "IN_PROGRESS",
                    instructions: [
                        "1. Navigate to OmniVault.",
                        "2. Open 'IT Security Logs' folder.",
                        "3. Click on the file 'Access_Audit_2024.csv' and review logs."
                    ]
                }
            ];
            this.addToast("Assignment Update", "Deliverables reconciled. Final objectives assigned.", true);
            window.corporateAudio?.playTaskAdded();
            this.notify();
        } else if (state.omnitask.taskCycle === 3 && state.omnitask.subStage === 2) {
            // Day Finished
            state.dayEnded = true;
            this.addToast("Operational Sync Complete!", "Congratulations! All corporate milestones achieved.", true);
            this.triggerGameOver("I did it. All synergies aligned... I survived the workday. But at what cost?");
            this.notify();
        }
    }

    // ============================================================
    // Helper States & OS Trays
    // ============================================================

    setActiveApp(appName) {
        if (this.state.gameOver) return;
        const wasConnected = this.state.meetstream.connected;
        this.state.activeApp = appName;
        if (appName === "meetstream") {
            this.state.meetstream.connected = true;
            if (!wasConnected) {
                window.corporateAudio?.playMeetingJoin();
            }
        }
        this.notify();
    }


    adjustPatience(delta) {
        if (this.state.gameOver) return;
        if (delta < 0) {
            if (this.state.settings.mode === "medium") {
                delta = delta * 1.5;
            } else if (this.state.settings.mode === "hard") {
                delta = delta * 2.0;
            }
        }
        this.state.patience = Math.max(0, Math.min(100, this.state.patience + delta));



        if (this.state.patience === 0) {
            if (this.state.blockersTriggered.gregQuit) {
                this.triggerGameOver("I should have just listened to Greg and walked out...");
            } else {
                this.triggerGameOver("The corporate machinery ground me down. I just couldn't take it anymore...");
            }
        }
        if (this.state.phase === "escalation") {
            this.checkPatienceBlockers();
        }
        this.notify();
    }

    triggerMonologueBanner(text) {
        this.state.monologueText = text;
        this.state.monologueActive = true;
        this.notify();
    }

    dismissMonologueBanner() {
        if (this.state.gameOver) return; // Keep locked if game over
        this.state.monologueActive = false;
        this.notify();
    }

    triggerGameOver(reason) {
        this.state.gameOver = true;
        this.state.monologueText = reason;
        this.state.monologueActive = true;
        
        // Clean up all background intervals immediately to prevent resource drain or late adjustments
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        
        this.notify();
    }

    registerBlockerResolution() {
        this._lastBlockerResolveTime = Date.now();
    }


    startEscalationPhase() {
        this.state.phase = "escalation";
        if (this.state.datagrid.data[1] && this.state.datagrid.data[1][3]) {
            this.state.datagrid.data[1][3] = "15800\u00A0"; // Insert NBSP trap
        }
        this.addToast("[IT SYSTEM ALERT]", "Security policy v4.8 deployed. Session monitoring active.", true);
        this.notify();
    }

    addToast(title, body, urgent = false) {
        if (this.state.activeApp === "meetstream" && !urgent) return;

        const key = `${(title || '').trim()}|${(body || '').trim()}`;
        if (this.recentToastKeys.has(key)) return;

        const titleKey = (title || '').trim();
        const now = Date.now();
        if (this._toastCooldown.has(titleKey) && now - this._toastCooldown.get(titleKey) < 5000) {
            return;
        }

        const isCurrentlyVisible = this.state.toasts.some(t => t.title === title || t.body === body);
        if (isCurrentlyVisible) return;

        this.recentToastKeys.add(key);
        this._toastCooldown.set(titleKey, now);
        setTimeout(() => this.recentToastKeys.delete(key), 10000);

        const id = Date.now();
        this.state.toasts.push({ id, title, body, urgent });

        // Play notification sound, unless it's a chat DM notification to prevent double-pings
        const lowerTitle = titleKey.toLowerCase();
        const isChatNotification = lowerTitle.includes('new message') || 
                                   lowerTitle.includes('dm') || 
                                   lowerTitle.includes('derek owens') || 
                                   lowerTitle.includes('priya sharma') ||
                                   lowerTitle.includes('karen vance') || 
                                   lowerTitle.includes('brad sterling') ||
                                   lowerTitle.includes('greg jenkins') || 
                                   lowerTitle.includes('chad miller');
        if (!isChatNotification) {
            window.corporateAudio?.playNotification();
        }

        if (this.state.toasts.length > 3) {
            this.state.toasts.shift();
        }

        this.notify();
        setTimeout(() => {
            this.state.toasts = this.state.toasts.filter(t => t.id !== id);
            this.notify();
        }, 4500);
    }

    trigger2FAModal() {
        if (this.state.phase === "honeymoon") return;
        this.state.twoFactor.authenticated = false;
        this.state.twoFactor.modalActive = true;
        this.notify();
    }

    defer2FA(minutes = 5) {
        this.state.twoFactor.deferred = true;
        this.state.twoFactor.modalActive = false;
        this.registerBlockerResolution();
        this.adjustPatience(-5);
        this.addToast("2FA Deferred", `Session authentication deferred for ${minutes} minutes.`, true);
        this.notify();

        setTimeout(() => {
            if (!this.state.twoFactor.authenticated) {
                this.trigger2FAModal();
            }
        }, 45000);
    }

    complete2FA() {
        this.state.twoFactor.authenticated = true;
        this.state.twoFactor.deferred = false;
        this.state.twoFactor.modalActive = false;
        this.registerBlockerResolution();
        this.addToast("2FA Success", "Enterprise session token authenticated.");
        this.notify();
    }


    setActiveChat(convId) {
        this.state.synctalk.activeId = convId;
        const conv = this.state.synctalk.conversations[convId];
        if (conv && conv.unread > 0) {
            this.state.synctalk.unreadCount = Math.max(0, this.state.synctalk.unreadCount - conv.unread);
            conv.unread = 0;
        }
        if (convId === "dm-brad" && this.state.blockersTriggered.gregQuit === "triggered") {
            this.state.blockersTriggered.gregQuit = true;
            this.triggerGregQuittingAnnounce();
        }
        this.notify();
    }

    togglePatienceBarSetting() {
        if (this.state.settings.mode === "hard") return;
        this.state.settings.showPatienceBar = !this.state.settings.showPatienceBar;
        this.notify();
    }

    toggleImmediateRepliesSetting() {
        this.state.settings.immediateReplies = !this.state.settings.immediateReplies;
        this.notify();
    }

    setTimeModeSetting(mode) {
        this.state.settings.timeMode = mode;
        if (mode === "game") {
            const d = new Date();
            d.setHours(21, 0, 0, 0); // Start game time at 9:00 PM
            this.state.gameTime = d;
        }
        this.notify();
    }

    setModeSetting(mode) {
        this.state.settings.mode = mode;
        if (mode === "hard") {
            this.state.settings.showPatienceBar = false;
        }
        this.notify();
    }


}



window.gameStore = new GameStore();
// window.gameStore.startTickerEvents(); // start events deferred to menu Start button click

