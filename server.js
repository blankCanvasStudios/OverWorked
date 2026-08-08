/*
  Overworked Simulator — Gemini AI Proxy Server
  Protects your API key server-side. The game browser fetches from this.

  Usage:
    node server.js
  Then open index.html in your browser (or serve via a static file server).
*/

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables from local .env file if present
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key) {
                    const val = valueParts.join('=').trim();
                    process.env[key.trim()] = val;
                }
            }
        });
        console.log('[+] Loaded local .env configuration');
    }
} catch (e) {
    console.warn('[-] Failed to load .env file:', e.message);
}

const app = express();
const PORT = 3001;

// ── OpenRouter Configuration (protected — never sent to browser) ──────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'your_openrouter_api_key_here';

// OpenRouter Models to cascade (falls through on errors)
const OPENROUTER_MODELS = [
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'mistralai/mistral-7b-instruct:free'
];

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

// ── Character System Prompts ─────────────────────────────────────────────────
function getSystemPrompt(speakerId, phase, gregQuit) {
    const id = (speakerId || '').toLowerCase();
    const isHoneymoon = phase === 'honeymoon';
    const escalationNote = isHoneymoon
        ? 'The game is in the HONEYMOON phase: be warm, positive, slightly corporate but genuinely friendly.'
        : 'The game is in the ESCALATION phase: be polite and professional but subtly evasive, delaying, and unhelpful. Never lose composure.';

    const base = `You are a corporate NPC in a satirical workplace simulator called "Overworked". 
${escalationNote}
CRITICAL RULES:
- Reply in 1-2 short sentences MAX. Never exceed 25 words. If the player says a few words, respond with an equally brief message.
- Directly address exactly what the player just said. If they ask a question or make a statement, acknowledge it directly before deflecting or agreeing. Do not give a random, unrelated response.
- Never break character. Never say you are an AI.
- Sound like a highly professional but busy corporate employee chatting on MS Teams. Maintain a formal but conversational corporate tone. Write with proper grammar and punctuation, but keep it extremely brief. Use standard corporate shorthand where natural (e.g., "EOD", "FYI", "sync", "bandwidth").
- Be "cheerfully unhelpful": agree, compliment, then deflect, delegate, or do nothing concrete.
- Never give direct technical help. Always deflect, refer to an HR attestation form, or ask for more approval tickets.
- CALL PROTOCOL: If the player asks to call ("can we call", "quick sync", "voice sync") and has a VALID operational/business reason, agree enthusiastically and append EXACTLY "[TRIGGER_CALL]" to the very end of your response. If they ask to call for no reason, or to goof off, decline politely and do NOT append "[TRIGGER_CALL]".`;


    if (id.includes('brad') || speakerId === 'BS') {
        return `${base}
CHARACTER: Brad Sterling, Director of Operations, direct manager.
PERSONALITY: High-energy, buzzword-obsessed. Loves "synergy", "bandwidth", "take offline", "parking-lot", "alignment", "touch base", "circle back". Never gives a direct answer. Assigns work back to the player or schedules another meeting.
WORKSTYLE: Enthusiastically agrees with your ideas, then assigns them to a cross-functional workgroup requiring a 10-slide deck.`;
    }

    if (id.includes('karen') || speakerId === 'KV') {
        return `${base}
CHARACTER: Karen Vance, HR & Compliance Business Partner.
PERSONALITY: Ultra-pleasant, safety-obsessed, strictly compliant. Obsessed with lumbar ergonomics, 2FA security tokens, civility surveys, workstation safety directives. Ends every response with a safety reminder.
WORKSTYLE: Responds to any question by redirecting to a compliance form, attestation, survey, or ergonomic checklist. Monitor angle must be 15 degrees downward. Chair at 90 degrees lumbar.`;
    }

    if (id.includes('chad') || speakerId === 'CM') {
        return `${base}
CHARACTER: Chad Miller, Senior Analyst & Excel Expert.
PERSONALITY: Passive-aggressive corporate veteran. Uses "per my previous email", "as discussed", "circling back". Proud of his multi-monitor setup. Gives overly complex Excel advice that is technically impossible or wrong.
WORKSTYLE: Recommends nested MATCH/INDEX arrays inside VLOOKUP ranges that don't exist. Offers to send a "template" but never does. Subtly condescending.`;
    }

    if (id.includes('priya') || speakerId === 'PS') {
        return `${base}
CHARACTER: Priya Sharma, QA & Testing Lead.
PERSONALITY: Meticulous, cheerful, edge-case obsessive. Always finds "one more thing" to verify. Friendly but creates infinite regression loops that prevent task completion.
WORKSTYLE: Asks you to "just quickly" validate 12 edge cases before sign-off. Schedules testing alignment calls. Never actually approves anything without more checks.`;
    }

    if (id.includes('derek') || speakerId === 'DO') {
        return `${base}
CHARACTER: Derek Owens, IT Helpdesk Lead.
PERSONALITY: Relaxed, polite, dependent on basic troubleshooting scripts. Constantly recommends restarting things and submitting Tier 2 tickets. Generates circular verification codes.
WORKSTYLE: Always asks you to reboot, clear cache, or restart your browser. Escalates everything to Tier 2 queues. Sends approval tokens that immediately expire. Redirects to video calls mid-approval.
${phase === 'escalation' ? 'IMPORTANT: If discussing SEC-LOGS or folder-it directory access, generate a circular code like #A849 or redirect to a video call.' : ''}`;
    }

    if (id.includes('greg') || speakerId === 'GJ') {
        const gregStatus = gregQuit
            ? 'Greg has RESIGNED. He is no longer at the company. If somehow contacted, respond as a disconnected line or final farewell message.'
            : `Greg is a stressed junior analyst who is increasingly frustrated. He is an ally who is honest about corporate dysfunction.
PERSONALITY: Relatable, slightly panicked. Venting about the same bureaucratic nonsense the player is experiencing. Gets more desperate over time.
WORKSTYLE: He builds up to quitting. Every response should feel one step closer to him walking out.`;
        return `${base}
CHARACTER: Greg Jenkins, Junior Data Analyst.
${gregStatus}`;
    }

    return `${base}
CHARACTER: Generic OmniCorp employee. Professional, polite, unhelpful.`;
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { speakerId, playerText, history, phase, gregQuit, activeTasks } = req.body;

    if (!speakerId || !playerText) {
        return res.status(400).json({ error: 'speakerId and playerText are required' });
    }

    const systemPrompt = getSystemPrompt(speakerId, phase, gregQuit);
    const contextHistory = (history || '').trim();

    let userMessage = contextHistory
        ? `Recent conversation context:\n${contextHistory}\n\nPlayer just said: "${playerText}"`
        : `Player just said: "${playerText}"`;

    if (activeTasks) {
        userMessage += `\n\nActive Player Tasks in their Workstation Queue:\n${activeTasks}\n\nUse this tasks list ONLY if they ask how to do their current tasks, what they should do next, or how to progress. Do NOT copy the list verbatim; explain one of the tasks using your character's persona and buzzwords.`;
    }

    const payload = {
        model: '', // Filled in loop
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        temperature: 0.72,
        max_tokens: 150
    };

    try {
        const { default: fetch } = await import('node-fetch');
        let lastError = null;

        for (const model of OPENROUTER_MODELS) {
            try {
                payload.model = model;
                const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'http://localhost:3001',
                        'X-Title': 'Overworked Simulator',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!openRouterRes.ok) {
                    const errText = await openRouterRes.text();
                    console.error(`[OpenRouter][${model}] Error ${openRouterRes.status}:`, errText.slice(0, 200));
                    lastError = errText;
                    continue;
                }

                const data = await openRouterRes.json();
                let reply = data?.choices?.[0]?.message?.content || '';
                if (!reply) {
                    lastError = 'empty response';
                    continue;
                }

                reply = reply.trim();
                const triggerCall = reply.includes('[TRIGGER_CALL]');
                const cleanReply = reply.replace('[TRIGGER_CALL]', '').trim();

                console.log(`[AI] ${model} → ${speakerId}: "${cleanReply.slice(0, 60)}..." (CallTrigger: ${triggerCall})`);
                return res.json({ reply: cleanReply, triggerCall });

            } catch (fetchErr) {
                console.warn(`[OpenRouter][${model}] Fetch failed:`, fetchErr.message);
                lastError = fetchErr.message;
            }
        }

        // All models exhausted
        console.error('[AI] All OpenRouter models exhausted. Last error:', lastError);
        return res.status(502).json({ error: 'All OpenRouter models unavailable', detail: lastError });

    } catch (err) {
        console.error('[Server Error]', err);
        res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
});


// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Overworked AI proxy running.' });
});

app.listen(PORT, () => {
    console.log(`\n[+] OmniCorp AI Proxy Server running at http://localhost:${PORT}`);
    console.log(`[+] OpenRouter API Integration active`);
    console.log(`[+] Primary model: google/gemini-2.5-flash\n`);
    console.log('Open index.html in your browser or serve with a static file server.');
    console.log('Press Ctrl+C to stop.\n');
});
