let loadedVbeQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;

// ─── MATEMATIKOS FORMATAVIMAS ─────────────────────────────────────────────────
// Konvertuoja ^ į HTML <sup> laipsnius, pvz. 25^x → 25<sup>x</sup>
function formatMath(text) {
    if (!text) return text;
    return text.replace(/\^([a-zA-Z0-9\+\-\(\)]+)/g, '<sup>$1</sup>');
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const topic = params.get('topic');
    const type = params.get('type');

    let query = supabaseClient.from('vbe_questions').select('*');
    if (subject && subject !== 'all') query = query.eq('subject', subject);
    if (topic && topic !== 'all') query = query.eq('topic', topic);
    if (type && type !== 'all') query = query.eq('question_type', type);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        document.getElementById('active-question-container').innerHTML = `
            <div style="text-align: center; margin-top: 80px;">
                <i class="fas fa-search" style="font-size: 40px; color: #ddd; margin-bottom: 15px; display: block;"></i>
                <h3 style="color: #666; margin-bottom: 10px;">Klausimų nerasta</h3>
                <p style="color: #999; margin-bottom: 20px;">Bandykite pasirinkti kitus filtrus.</p>
                <a href="vbe.html" style="display: inline-block; padding: 12px 25px; background: #5d5fef; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Atgal</a>
            </div>
        `;
        return;
    }

    loadedVbeQuestions = data.sort(() => Math.random() - 0.5);
    updateProgress();
    renderQuestion();
});

function updateProgress() {
    const total = loadedVbeQuestions.length;
    const done = currentIndex;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('progress-text').innerText = `${done} / ${total}`;
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('correct-count').innerText = correctCount;
    document.getElementById('wrong-count').innerText = wrongCount;
}

function renderQuestion() {
    if (currentIndex >= loadedVbeQuestions.length) {
        showSessionSummary();
        return;
    }

    const q = loadedVbeQuestions[currentIndex];
    const container = document.getElementById('active-question-container');

    // Rodome brėžinį jei yra
    const imageHtml = q.image_url
        ? `<img src="${q.image_url}" alt="Brėžinys" style="max-width: 100%; border-radius: 10px; margin-bottom: 20px; border: 1px solid #eee;">`
        : '';

    if (q.question_type === 'test') {
        renderTestQuestion(q, container, imageHtml);
    } else if (q.question_type === 'fill') {
        renderFillQuestion(q, container, imageHtml);
    } else {
        renderOpenQuestion(q, container, imageHtml);
    }
}

// ─── TESTINIS KLAUSIMAS (A/B/C/D) ────────────────────────────────────────────
function renderTestQuestion(q, container, imageHtml = '') {
    container.innerHTML = `
        <div class="q-meta">
            <span>${q.subject}${q.topic ? ' • ' + q.topic : ''}</span>
            <span class="q-badge-test">Testinis</span>
        </div>

        ${imageHtml}

        <h2 style="margin-bottom: 30px; color: #333; line-height: 1.5; font-size: 20px;">${formatMath(q.question_text)}</h2>

        <div class="options-list">
            ${q.options.map((opt, i) => `
                <div class="option-item" onclick="checkVbeAnswer(${i}, ${q.correct_option})"
                     style="padding: 18px 22px; border: 2px solid #eee; margin-bottom: 12px; border-radius: 14px; cursor: pointer; transition: 0.2s; font-size: 15px; color: #444; display: flex; align-items: center; gap: 12px;">
                    <span style="width: 28px; height: 28px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; color: #888;">${String.fromCharCode(65 + i)}</span>
                    ${formatMath(opt)}
                </div>
            `).join('')}
        </div>

        <div id="feedback-area" style="margin-top: 20px; min-height: 40px;"></div>

        <button id="next-vbe-btn" onclick="nextQuestion()" style="display: none; width: 100%; padding: 16px; background: linear-gradient(135deg, #5d5fef, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; margin-top: 10px; box-shadow: 0 4px 15px rgba(93,95,239,0.3);">
            Kitas klausimas <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
        </button>
    `;
}

function checkVbeAnswer(selected, correct) {
    const options = document.querySelectorAll('.option-item');
    const feedback = document.getElementById('feedback-area');
    const nextBtn = document.getElementById('next-vbe-btn');
    const q = loadedVbeQuestions[currentIndex];

    options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === correct) {
            opt.style.borderColor = '#27ae60';
            opt.style.background = '#eafaf1';
            opt.style.color = '#1e8449';
            opt.querySelector('span').style.background = '#27ae60';
            opt.querySelector('span').style.color = 'white';
        } else if (i === selected) {
            opt.style.borderColor = '#e74c3c';
            opt.style.background = '#fdedec';
            opt.style.color = '#a93226';
            opt.querySelector('span').style.background = '#e74c3c';
            opt.querySelector('span').style.color = 'white';
        }
    });

    const isCorrect = selected === correct;
    if (isCorrect) correctCount++;
    else wrongCount++;

    let explanationHtml = '';
    if (q.explanation) {
        explanationHtml = `<div style="margin-top: 10px; padding: 12px 16px; background: #fff8e6; border-left: 3px solid #f39c12; border-radius: 8px; font-size: 14px; color: #7d6608;">
            <strong>💡 Paaiškinimas:</strong> ${formatMath(q.explanation)}
        </div>`;
    }

    feedback.innerHTML = isCorrect
        ? `<div style="color: #27ae60; display: flex; align-items: center; gap: 10px; font-weight: 600;"><i class="fas fa-check-circle" style="font-size: 20px;"></i> Teisingai!</div>${explanationHtml}`
        : `<div style="color: #e74c3c; display: flex; align-items: center; gap: 10px; font-weight: 600;"><i class="fas fa-times-circle" style="font-size: 20px;"></i> Neteisingai. Teisingas atsakymas paryškintas.</div>${explanationHtml}`;

    nextBtn.style.display = 'block';
    updateProgress();
    saveVbeResult(isCorrect);
}

// ─── FILL KLAUSIMAS (trumpas įrašomas atsakymas) ──────────────────────────────

// Simbolių grupės simbolių lentelei
const SYMBOL_GROUPS = [
    {
        label: 'Skaičiai ir ženklai',
        symbols: [
            { display: '−', insert: '−' },
            { display: '±', insert: '±' },
            { display: '·', insert: '·' },
            { display: '×', insert: '×' },
            { display: '÷', insert: '÷' },
            { display: '≠', insert: '≠' },
            { display: '≈', insert: '≈' },
            { display: '≤', insert: '≤' },
            { display: '≥', insert: '≥' },
            { display: '∞', insert: '∞' },
            { display: '√', insert: '√' },
            { display: '∛', insert: '∛' },
        ]
    },
    {
        label: 'Laipsniai ir indeksai',
        symbols: [
            { display: '²', insert: '²' },
            { display: '³', insert: '³' },
            { display: '⁴', insert: '⁴' },
            { display: '⁵', insert: '⁵' },
            { display: 'ⁿ', insert: 'ⁿ' },
            { display: '½', insert: '½' },
            { display: '⅓', insert: '⅓' },
            { display: '¼', insert: '¼' },
            { display: '¾', insert: '¾' },
        ]
    },
    {
        label: 'Graikų raidės',
        symbols: [
            { display: 'α', insert: 'α' },
            { display: 'β', insert: 'β' },
            { display: 'γ', insert: 'γ' },
            { display: 'δ', insert: 'δ' },
            { display: 'ε', insert: 'ε' },
            { display: 'θ', insert: 'θ' },
            { display: 'λ', insert: 'λ' },
            { display: 'μ', insert: 'μ' },
            { display: 'π', insert: 'π' },
            { display: 'σ', insert: 'σ' },
            { display: 'φ', insert: 'φ' },
            { display: 'ω', insert: 'ω' },
        ]
    },
    {
        label: 'Aibės ir logika',
        symbols: [
            { display: '∈', insert: '∈' },
            { display: '∉', insert: '∉' },
            { display: '∩', insert: '∩' },
            { display: '∪', insert: '∪' },
            { display: '⊂', insert: '⊂' },
            { display: '⊃', insert: '⊃' },
            { display: '∅', insert: '∅' },
            { display: '∀', insert: '∀' },
            { display: '∃', insert: '∃' },
            { display: '⇒', insert: '⇒' },
            { display: '⇔', insert: '⇔' },
        ]
    },
    {
        label: 'Kampai ir geometrija',
        symbols: [
            { display: '°', insert: '°' },
            { display: '∠', insert: '∠' },
            { display: '△', insert: '△' },
            { display: '⊥', insert: '⊥' },
            { display: '∥', insert: '∥' },
            { display: '→', insert: '→' },
            { display: '↔', insert: '↔' },
            { display: '⃗', insert: '⃗' },
        ]
    }
];

function buildSymbolKeyboard() {
    let activeGroup = 0;

    const tabsHtml = SYMBOL_GROUPS.map((g, i) => `
        <button
            id="symtab-${i}"
            onclick="switchSymbolTab(${i})"
            style="padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: 0.15s;
                   background: ${i === 0 ? '#5d5fef' : '#f0f0f0'}; color: ${i === 0 ? 'white' : '#555'};">
            ${g.label}
        </button>
    `).join('');

    const groupsHtml = SYMBOL_GROUPS.map((g, i) => `
        <div id="symgroup-${i}" style="display: ${i === 0 ? 'flex' : 'none'}; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
            ${g.symbols.map(s => `
                <button
                    onclick="insertSymbol('${s.insert}')"
                    title="${s.insert}"
                    style="min-width: 38px; height: 38px; padding: 0 8px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; font-size: 18px; transition: 0.15s; color: #333;"
                    onmouseover="this.style.borderColor='#5d5fef'; this.style.background='#f0f0ff';"
                    onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='white';">
                    ${s.display}
                </button>
            `).join('')}
        </div>
    `).join('');

    return `
        <div id="symbol-keyboard" style="margin-top: 12px; padding: 14px 16px; background: #f8f9fe; border: 1.5px solid #e8e8f0; border-radius: 14px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap: wrap; gap: 6px;">
                <span style="font-size: 12px; color: #888; margin-right: 4px;"><i class="fas fa-keyboard"></i></span>
                ${tabsHtml}
            </div>
            ${groupsHtml}
        </div>
    `;
}

function switchSymbolTab(index) {
    SYMBOL_GROUPS.forEach((_, i) => {
        const tab = document.getElementById(`symtab-${i}`);
        const group = document.getElementById(`symgroup-${i}`);
        if (tab && group) {
            if (i === index) {
                tab.style.background = '#5d5fef';
                tab.style.color = 'white';
                group.style.display = 'flex';
            } else {
                tab.style.background = '#f0f0f0';
                tab.style.color = '#555';
                group.style.display = 'none';
            }
        }
    });
}

function insertSymbol(sym) {
    const input = document.getElementById('fill-answer');
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    input.value = val.slice(0, start) + sym + val.slice(end);
    // Grąžiname kursorių po įterpto simbolio
    const newPos = start + sym.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
}

function renderFillQuestion(q, container, imageHtml = '') {
    container.innerHTML = `
        <div class="q-meta">
            <span>${q.subject}${q.topic ? ' • ' + q.topic : ''}</span>
            <span class="q-badge-fill" style="background: #e8f4fd; color: #2980b9; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Įrašyti atsakymą</span>
        </div>

        ${imageHtml}

        <h2 style="margin-bottom: 25px; color: #333; line-height: 1.5; font-size: 20px;">${formatMath(q.question_text)}</h2>

        <input type="text" id="fill-answer"
            placeholder="Įrašykite atsakymą..."
            autocomplete="off"
            style="width: 100%; padding: 16px 18px; border: 2px solid #eee; border-radius: 12px; font-size: 17px; font-family: inherit; outline: none; transition: 0.2s; box-sizing: border-box;"
            onfocus="this.style.borderColor='#5d5fef'"
            onblur="this.style.borderColor='#eee'"
            onkeydown="if(event.key==='Enter') checkFillAnswer()" />

        ${buildSymbolKeyboard()}

        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button onclick="checkFillAnswer()" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #5d5fef, #7c3aed); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(93,95,239,0.3);">
                <i class="fas fa-check" style="margin-right: 8px;"></i> Tikrinti
            </button>
            <button onclick="skipFillQuestion()" style="padding: 14px 20px; background: #eee; color: #555; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                Praleisti <i class="fas fa-forward" style="margin-left: 6px;"></i>
            </button>
        </div>

        <div id="fill-feedback" style="margin-top: 20px;"></div>
    `;

    setTimeout(() => {
        const input = document.getElementById('fill-answer');
        if (input) input.focus();
    }, 100);
}

function normalizeFillAnswer(str) {
    return str
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        // Standartizuojame minuso ženklus
        .replace(/[−–—]/g, '-')
        // Pašaliname tarpus aplink =, ±
        .replace(/\s*=\s*/g, '=')
        .replace(/\s*±\s*/g, '±');
}

function checkFillAnswer() {
    const input = document.getElementById('fill-answer');
    const feedbackDiv = document.getElementById('fill-feedback');
    const q = loadedVbeQuestions[currentIndex];

    if (!input || !input.value.trim()) {
        input.style.borderColor = '#e74c3c';
        setTimeout(() => { input.style.borderColor = '#eee'; }, 800);
        return;
    }

    input.disabled = true;
    input.style.pointerEvents = 'none';

    const userVal = normalizeFillAnswer(input.value);
    const correctVal = normalizeFillAnswer(q.correct_answer || '');
    const isCorrect = userVal === correctVal;

    if (isCorrect) {
        input.style.borderColor = '#27ae60';
        input.style.background = '#eafaf1';
        correctCount++;
    } else {
        input.style.borderColor = '#e74c3c';
        input.style.background = '#fdedec';
        wrongCount++;
    }

    const explanationHtml = q.explanation
        ? `<div style="margin-top: 10px; padding: 12px 16px; background: #fff8e6; border-left: 3px solid #f39c12; border-radius: 8px; font-size: 14px; color: #7d6608;">
               <strong>💡 Paaiškinimas:</strong> ${formatMath(q.explanation)}
           </div>`
        : '';

    feedbackDiv.innerHTML = isCorrect
        ? `<div style="color: #27ae60; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
               <i class="fas fa-check-circle" style="font-size: 20px;"></i> Teisingai!
           </div>${explanationHtml}`
        : `<div style="color: #e74c3c; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
               <i class="fas fa-times-circle" style="font-size: 20px;"></i> Neteisingai.
           </div>
           <div style="padding: 12px 16px; background: #eafaf1; border: 2px solid #27ae60; border-radius: 10px; font-size: 15px; color: #1e8449; margin-bottom: 8px;">
               <strong>Teisingas atsakymas:</strong> ${formatMath(q.correct_answer)}
           </div>${explanationHtml}`;

    feedbackDiv.innerHTML += `
        <button onclick="nextQuestion()" style="width: 100%; margin-top: 12px; padding: 16px; background: linear-gradient(135deg, #5d5fef, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(93,95,239,0.3);">
            Kitas klausimas <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
        </button>
    `;

    updateProgress();
    saveVbeResult(isCorrect);
}

function skipFillQuestion() {
    wrongCount++;
    updateProgress();
    saveVbeResult(false);
    nextQuestion();
}

// ─── LAISVAS KLAUSIMAS (ilgas atsakymas) ─────────────────────────────────────
function renderOpenQuestion(q, container, imageHtml = '') {
    container.innerHTML = `
        <div class="q-meta">
            <span>${q.subject}${q.topic ? ' • ' + q.topic : ''}</span>
            <span class="q-badge-open">Laisvas atsakymas</span>
        </div>

        ${imageHtml}

        <h2 style="margin-bottom: 25px; color: #333; line-height: 1.5; font-size: 20px;">${formatMath(q.question_text)}</h2>

        ${q.max_points ? `<p style="color: #888; font-size: 13px; margin-bottom: 15px;"><i class="fas fa-star" style="color: #f39c12;"></i> Maks. taškai: <strong>${q.max_points}</strong></p>` : ''}

        <textarea id="open-answer" rows="6"
            placeholder="Rašykite savo atsakymą čia..."
            style="width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; font-size: 15px; font-family: inherit; resize: vertical; outline: none; transition: 0.2s; box-sizing: border-box;"
            onfocus="this.style.borderColor='#5d5fef'"
            onblur="this.style.borderColor='#eee'"></textarea>

        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button onclick="revealOpenAnswer()" style="flex: 1; padding: 14px; background: #f39c12; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 15px;">
                <i class="fas fa-eye" style="margin-right: 8px;"></i> Rodyti teisingą atsakymą
            </button>
            <button onclick="nextQuestion()" style="padding: 14px 20px; background: #eee; color: #555; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                Praleisti <i class="fas fa-forward" style="margin-left: 6px;"></i>
            </button>
        </div>

        <div id="open-answer-reveal" style="display: none; margin-top: 20px;"></div>
    `;
}

function revealOpenAnswer() {
    const q = loadedVbeQuestions[currentIndex];
    const revealDiv = document.getElementById('open-answer-reveal');

    revealDiv.style.display = 'block';
    revealDiv.innerHTML = `
        <div style="border: 2px solid #27ae60; border-radius: 12px; padding: 20px; background: #f0fff4;">
            <h4 style="color: #27ae60; margin-bottom: 10px;"><i class="fas fa-check-circle"></i> Pavyzdinis atsakymas:</h4>
            <p style="color: #333; line-height: 1.6;">${formatMath(q.correct_answer || '—')}</p>
            ${q.explanation ? `<hr style="margin: 12px 0; border: 0; border-top: 1px solid #c6f6d5;">
            <p style="color: #555; font-size: 14px;"><strong>💡 Paaiškinimas:</strong> ${formatMath(q.explanation)}</p>` : ''}
        </div>

        <div style="margin-top: 15px; padding: 15px; background: #f8f9fe; border-radius: 10px; border: 1px solid #eee;">
            <p style="color: #555; font-size: 14px; margin-bottom: 10px;"><strong>Ar jūsų atsakymas teisingas?</strong></p>
            <div style="display: flex; gap: 10px;">
                <button onclick="markOpenAnswer(true)" style="flex: 1; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-check"></i> Taip, teisingai
                </button>
                <button onclick="markOpenAnswer(false)" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> Ne, neteisingai
                </button>
            </div>
        </div>
    `;
}

function markOpenAnswer(isCorrect) {
    if (isCorrect) correctCount++;
    else wrongCount++;
    updateProgress();
    saveVbeResult(isCorrect);

    const revealDiv = document.getElementById('open-answer-reveal');
    revealDiv.innerHTML += `
        <button onclick="nextQuestion()" style="width: 100%; margin-top: 15px; padding: 16px; background: linear-gradient(135deg, #5d5fef, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(93,95,239,0.3);">
            Kitas klausimas <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
        </button>
    `;
}

function nextQuestion() {
    currentIndex++;
    updateProgress();
    renderQuestion();
}

// ─── SESIJOS SUVESTINĖ ────────────────────────────────────────────────────────
function showSessionSummary() {
    const total = loadedVbeQuestions.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let medalColor = '#e74c3c';
    let medalIcon = 'fa-times-circle';
    let medalText = 'Reikia daugiau praktikos';
    if (pct >= 80) { medalColor = '#27ae60'; medalIcon = 'fa-trophy'; medalText = 'Puikus rezultatas!'; }
    else if (pct >= 60) { medalColor = '#f39c12'; medalIcon = 'fa-star'; medalText = 'Neblogai!'; }

    document.getElementById('active-question-container').innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
            <i class="fas ${medalIcon}" style="font-size: 60px; color: ${medalColor}; margin-bottom: 20px; display: block;"></i>
            <h2 style="color: #333; margin-bottom: 10px;">${medalText}</h2>
            <p style="color: #666; font-size: 18px; margin-bottom: 5px;">Teisingai: <strong style="color: #27ae60;">${correctCount}</strong> iš <strong>${total}</strong></p>
            <p style="color: #666; margin-bottom: 25px;">Sėkmės procentas: <strong style="color: ${medalColor};">${pct}%</strong></p>

            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button onclick="restartSession()" style="padding: 12px 25px; background: #5d5fef; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-redo"></i> Pradėti iš naujo
                </button>
                <a href="vbe.html" style="padding: 12px 25px; background: #eee; color: #555; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block;">
                    Pasirinkti kitus filtrus
                </a>
            </div>
        </div>
    `;
}

function restartSession() {
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    loadedVbeQuestions.sort(() => Math.random() - 0.5);
    updateProgress();
    renderQuestion();
}

// ─── REZULTATŲ IŠSAUGOJIMAS (premium) ────────────────────────────────────────
async function saveVbeResult(isCorrect) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .single();

        if (profile?.is_premium === true) {
            const q = loadedVbeQuestions[currentIndex];
            await supabaseClient.from('vbe_results').insert([{
                user_id: user.id,
                question_id: q.id,
                is_correct: isCorrect
            }]);
        }
    } catch (err) {
        console.error('Klaida saugant VBE rezultatą:', err);
    }
}