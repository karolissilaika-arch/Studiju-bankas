let loadedVbeQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const year = params.get('year');
    const topic = params.get('topic');
    const type = params.get('type');

    let query = supabaseClient.from('vbe_questions').select('*');
    if (subject && subject !== 'all') query = query.eq('subject', subject);
    if (year && year !== 'all') query = query.eq('year', parseInt(year));
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

    // Sumaišome klausimus
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
    // Begalinis ciklas
    if (currentIndex >= loadedVbeQuestions.length) {
        showSessionSummary();
        return;
    }

    const q = loadedVbeQuestions[currentIndex];
    const container = document.getElementById('active-question-container');

    if (q.question_type === 'open') {
        renderOpenQuestion(q, container);
    } else {
        renderTestQuestion(q, container);
    }
}

// --- TESTINIS KLAUSIMAS ---
function renderTestQuestion(q, container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
            <span>${q.subject}${q.topic ? ' • ' + q.topic : ''}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${q.year ? `<span>${q.year} m.</span>` : ''}
                <span style="background: #ede9fe; color: #5d5fef; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">Testinis</span>
            </div>
        </div>

        <h2 style="margin-bottom: 30px; color: #333; line-height: 1.5; font-size: 20px;">${q.question_text}</h2>

        <div class="options-list">
            ${q.options.map((opt, i) => `
                <div class="option-item" onclick="checkVbeAnswer(${i}, ${q.correct_option})"
                     style="padding: 18px 22px; border: 2px solid #eee; margin-bottom: 12px; border-radius: 14px; cursor: pointer; transition: 0.2s; font-size: 15px; color: #444; display: flex; align-items: center; gap: 12px;">
                    <span style="width: 28px; height: 28px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; color: #888;">${String.fromCharCode(65 + i)}</span>
                    ${opt}
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
    if (!isCorrect && q.explanation) {
        explanationHtml = `<div style="margin-top: 10px; padding: 12px 16px; background: #fff8e6; border-left: 3px solid #f39c12; border-radius: 8px; font-size: 14px; color: #7d6608;">
            <strong>💡 Paaiškinimas:</strong> ${q.explanation}
        </div>`;
    }

    feedback.innerHTML = isCorrect
        ? `<div style="color: #27ae60; display: flex; align-items: center; gap: 10px; font-weight: 600;"><i class="fas fa-check-circle" style="font-size: 20px;"></i> Teisingai!</div>`
        : `<div style="color: #e74c3c; display: flex; align-items: center; gap: 10px; font-weight: 600;"><i class="fas fa-times-circle" style="font-size: 20px;"></i> Neteisingai. Teisingas atsakymas paryškintas.</div>${explanationHtml}`;

    nextBtn.style.display = 'block';
    updateProgress();
    saveVbeResult(isCorrect);
}

// --- LAISVAS KLAUSIMAS ---
function renderOpenQuestion(q, container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
            <span>${q.subject}${q.topic ? ' • ' + q.topic : ''}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${q.year ? `<span>${q.year} m.</span>` : ''}
                <span style="background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">Laisvas atsakymas</span>
            </div>
        </div>

        <h2 style="margin-bottom: 25px; color: #333; line-height: 1.5; font-size: 20px;">${q.question_text}</h2>

        ${q.max_points ? `<p style="color: #888; font-size: 13px; margin-bottom: 15px;"><i class="fas fa-star" style="color: #f39c12;"></i> Maks. taškai: <strong>${q.max_points}</strong></p>` : ''}

        <textarea id="open-answer" rows="6"
            placeholder="Rašykite savo atsakymą čia..."
            style="width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; font-size: 15px; font-family: inherit; resize: vertical; outline: none; transition: 0.2s;"
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
    const userAnswer = document.getElementById('open-answer').value.trim();

    revealDiv.style.display = 'block';
    revealDiv.innerHTML = `
        <div style="border: 2px solid #27ae60; border-radius: 12px; padding: 20px; background: #f0fff4;">
            <h4 style="color: #27ae60; margin-bottom: 10px;"><i class="fas fa-check-circle"></i> Pavyzdinis atsakymas:</h4>
            <p style="color: #333; line-height: 1.6;">${q.correct_answer}</p>
            ${q.explanation ? `<hr style="margin: 12px 0; border: 0; border-top: 1px solid #c6f6d5;">
            <p style="color: #555; font-size: 14px;"><strong>💡 Paaiškinimas:</strong> ${q.explanation}</p>` : ''}
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

    // Pakeičiame mygtukus į "Tęsti"
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

// --- SESIJOS SUVESTINĖ ---
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

// --- REZULTATŲ IŠSAUGOJIMAS (premium) ---
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
