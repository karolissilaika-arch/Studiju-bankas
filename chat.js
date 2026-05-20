// ============================================================
// StudijųBankas — AI Chatbot
// API raktas saugomas Supabase Edge Function — čia jo nėra!
// ============================================================

let chatHistory = [];

// --- INICIALIZACIJA ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_premium, total_xp')
            .eq('id', user.id)
            .single();

        const isPremium = profile?.is_premium === true || (profile?.total_xp || 0) >= 500;
        if (!isPremium) return;

        renderChatBubble();
    } catch (err) {
        console.error("Chat init klaida:", err);
    }
});

// --- BURBULO IR LANGO SUKŪRIMAS ---
function renderChatBubble() {
    document.getElementById('sb-chat-bubble')?.remove();
    document.getElementById('sb-chat-window')?.remove();

    const bubble = document.createElement('div');
    bubble.id = 'sb-chat-bubble';
    bubble.innerHTML = `<i class="fas fa-robot"></i>`;
    bubble.onclick = toggleChatWindow;
    document.body.appendChild(bubble);

    const win = document.createElement('div');
    win.id = 'sb-chat-window';
    win.className = 'sb-hidden';
    win.innerHTML = `
        <div class="sb-chat-header">
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="sb-avatar"><i class="fas fa-robot"></i></div>
                <div>
                    <div style="font-weight:700; font-size:15px;">StudijųBankas AI</div>
                    <div style="font-size:11px; opacity:0.8;">Tavo asmeninis mokytojas</div>
                </div>
            </div>
            <button onclick="toggleChatWindow()" class="sb-close-btn">&times;</button>
        </div>

        <div id="sb-messages"></div>

        <div id="sb-paywall" style="display:none;">
            <div class="sb-paywall-inner">
                <i class="fas fa-lock" style="font-size:28px; margin-bottom:10px; color:#5d5fef;"></i>
                <p style="font-weight:700; margin-bottom:5px;">Tik Premium nariams</p>
                <small style="color:#888; display:block; margin-bottom:15px;">AI mokytojas prieinamas tik Premium vartotojams (200 žinučių per dieną). Įsigykite Premium ir mokykitės be ribų!</small>
                <a href="index.html#kainos" class="sb-premium-btn">Gauti Premium →</a>
            </div>
        </div>

        <div class="sb-input-row" id="sb-input-row">
            <input type="text" id="sb-input" placeholder="Klausk bet ko..." onkeydown="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()" id="sb-send-btn">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    document.body.appendChild(win);

    addBotMessage("Labas! 👋 Esu tavo StudijųBankas AI mokytojas. Klausk apie bet kurią temą — matematikos uždavinius, istorijos datas, fizikos formules ar egzaminų paruošimą!");
}

function toggleChatWindow() {
    const win = document.getElementById('sb-chat-window');
    const bubble = document.getElementById('sb-chat-bubble');
    win.classList.toggle('sb-hidden');
    bubble.classList.toggle('sb-active');
}

async function sendMessage() {
    const input = document.getElementById('sb-input');
    const text = input.value.trim();
    if (!text) return;

    // Tikriname ar prisijungęs
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        addBotMessage("⚠️ Prisijunkite, kad galėtumėte naudotis AI mokytoju.");
        return;
    }

    input.value = '';
    setSendingState(true);
    addUserMessage(text);
    const typingId = addTypingIndicator();

    chatHistory.push({ role: 'user', content: text });

    try {
        // Kviečiame Supabase Edge Function — raktas saugomas ten, ne čia
        const res = await fetch(
            `${supabaseUrl}/functions/v1/chat`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabaseKey,
                },
                body: JSON.stringify({ messages: chatHistory }),
            }
        );

        removeTypingIndicator(typingId);

        if (res.status === 403) {
            document.getElementById('sb-paywall').style.display = 'flex';
            document.getElementById('sb-input-row').style.display = 'none';
            return;
        }

        if (res.status === 429) {
            document.getElementById('sb-paywall').style.display = 'flex';
            document.getElementById('sb-input-row').style.display = 'none';
            return;
        }

        if (res.status === 401) {
            addBotMessage("⚠️ Prisijunkite, kad galėtumėte naudotis AI mokytoju.");
            return;
        }

        const data = await res.json();

        if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content;
            chatHistory.push({ role: 'assistant', content: reply });
            addBotMessage(reply);
        } else {
            addBotMessage("Atsiprašau, šiuo metu negaliu atsakyti. Bandykite vėliau.");
            console.error("Edge Function atsakymas:", data);
        }

    } catch (err) {
        removeTypingIndicator(typingId);
        addBotMessage("Ryšio klaida. Patikrinkite interneto ryšį.");
        console.error(err);
    } finally {
        setSendingState(false);
    }
}

function addUserMessage(text) {
    const msgs = document.getElementById('sb-messages');
    const div = document.createElement('div');
    div.className = 'sb-msg sb-user';
    div.textContent = text;
    msgs.appendChild(div);
    scrollToBottom();
}

function addBotMessage(text) {
    const msgs = document.getElementById('sb-messages');
    const div = document.createElement('div');
    div.className = 'sb-msg sb-bot';
    div.innerHTML = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    msgs.appendChild(div);
    scrollToBottom();
}

function addTypingIndicator() {
    const msgs = document.getElementById('sb-messages');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'sb-msg sb-bot sb-typing';
    div.id = id;
    div.innerHTML = `<span></span><span></span><span></span>`;
    msgs.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    document.getElementById(id)?.remove();
}

function setSendingState(sending) {
    const btn = document.getElementById('sb-send-btn');
    const input = document.getElementById('sb-input');
    if (btn) btn.disabled = sending;
    if (input) input.disabled = sending;
}

function scrollToBottom() {
    const msgs = document.getElementById('sb-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}