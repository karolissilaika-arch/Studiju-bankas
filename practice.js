let loadedQuestions = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const grade = params.get('grade');
    const category = params.get('category');
    const topic = params.get('topic');

    let query = supabaseClient.from('exam_questions').select('*');
    if (grade && grade !== 'all') query = query.eq('grade', parseInt(grade));
    if (category && category !== 'all') query = query.eq('category', category);
    if (topic && topic !== 'all') query = query.eq('topic', topic);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        document.getElementById('active-question-container').innerHTML = `
            <h2 class="question-text">Klausimų nerasta</h2>
            <p style="color: var(--text-gray); margin-bottom: 20px;">Bandykite pasirinkti kitus filtrus.</p>
            <a href="exam-prep.html" class="btn-back">Atgal</a>
        `;
        return;
    }

    loadedQuestions = data.sort(() => Math.random() - 0.5);
    renderQuestion();
});

function renderQuestion() {
    if (currentIndex >= loadedQuestions.length) {
        loadedQuestions.sort(() => Math.random() - 0.5);
        currentIndex = 0;
    }

    const q = loadedQuestions[currentIndex];
    const container = document.getElementById('active-question-container');

    container.innerHTML = `
        <div class="question-meta">
            <span>${q.grade} klasė • ${q.category}</span>
            <span>Tema: ${q.topic}</span>
        </div>
        
        <h2 class="question-text">${q.question_text}</h2>
        
        <div class="options-list">
            ${q.options.map((option, i) => `
                <div class="option-item" onclick="checkAnswer(${i}, ${q.correct_option})">
                    ${option}
                </div>
            `).join('')}
        </div>
        
        <div id="feedback-area" class="feedback-area"></div>
        
        <button id="next-btn" class="btn-next-q" onclick="nextQuestion()">
            Tęsti <i class="fas fa-arrow-right"></i>
        </button>
    `;
}

async function checkAnswer(selected, correct) {
    const options = document.querySelectorAll('.option-item');
    const feedback = document.getElementById('feedback-area');
    const nextBtn = document.getElementById('next-btn');
    const currentQ = loadedQuestions[currentIndex];

    options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === correct) {
            opt.classList.add('option-correct');
        } else if (i === selected) {
            opt.classList.add('option-wrong');
        }
    });

    const isCorrect = (selected === correct);

    // Išsaugome rezultatą TIK premium vartotojams
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('is_premium')
                .eq('id', user.id)
                .single();

            if (profile?.is_premium === true) {
                const { error } = await supabaseClient
                    .from('exam_results')
                    .insert([{
                        user_id: user.id,
                        question_id: currentQ.id,
                        is_correct: isCorrect
                    }]);

                if (error) console.error("Klaida saugant rezultatą:", error.message);
                else console.log("Rezultatas išsaugotas (Premium vartotojas).");
            }
        }
    } catch (err) {
        console.error("Sistemos klaida:", err);
    }

    const explanationHtml = currentQ.explanation
        ? `<div style="margin-top: 10px; padding: 12px 16px; background: #fff8e6; border-left: 3px solid #f39c12; border-radius: 8px; font-size: 14px; color: #7d6608;">
            <strong>💡 Paaiškinimas:</strong> ${currentQ.explanation}
           </div>`
        : '';

    feedback.innerHTML = isCorrect
        ? `<div style="color: #27ae60; display: flex; align-items: center; gap: 10px; font-weight: 600;"><i class="fas fa-check-circle" style="font-size: 20px;"></i> Teisingai!</div>${explanationHtml}`
        : `<div style="color: #e74c3c; display: flex; align-items: center; gap: 10px; font-weight: 600;"><i class="fas fa-times-circle" style="font-size: 20px;"></i> Neteisingai. Teisingas atsakymas paryškintas.</div>${explanationHtml}`;

    nextBtn.style.display = 'block';
}

function nextQuestion() {
    currentIndex++;
    renderQuestion();
}
