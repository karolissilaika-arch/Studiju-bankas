let loadedQuestions = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Gauname parametrus iš URL
    const params = new URLSearchParams(window.location.search);
    const grade = params.get('grade');
    const category = params.get('category');
    const topic = params.get('topic');

    // 2. Užkrauname klausimus
    let query = supabaseClient.from('exam_questions').select('*');
    if (grade && grade !== 'all') query = query.eq('grade', parseInt(grade));
    if (category && category !== 'all') query = query.eq('category', category);
    if (topic && topic !== 'all') query = query.eq('topic', topic);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        document.getElementById('active-question-container').innerHTML = `
            <h2>Klausimų nerasta</h2>
            <p>Bandykite pasirinkti kitus filtrus.</p>
            <a href="exam-prep.html" class="btn-start">Atgal</a>
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
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#aaa; margin-bottom: 20px; text-transform: uppercase;">
            <span>${q.grade} klasė • ${q.category}</span>
            <span>Tema: ${q.topic}</span>
        </div>
        
        <h2 style="margin-bottom: 30px; color: #333; line-height: 1.4;">${q.question_text}</h2>
        
        <div class="options-list">
            ${q.options.map((option, i) => `
                <div class="option-item" onclick="checkAnswer(${i}, ${q.correct_option})" 
                     style="padding:20px; border:2px solid #eee; margin-bottom:12px; border-radius:15px; cursor:pointer; transition:0.2s;">
                    ${option}
                </div>
            `).join('')}
        </div>
        
        <div id="feedback-area" style="margin-top:20px; min-height:40px; font-weight: 600;"></div>
        
        <button id="next-btn" onclick="nextQuestion()" style="display:none; width:100%; padding:16px; background:#5d5fef; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:600; margin-top: 20px;">
            Tęsti <i class="fas fa-arrow-right" style="margin-left:10px;"></i>
        </button>
    `;
}

async function checkAnswer(selected, correct) {
    const options = document.querySelectorAll('.option-item');
    const feedback = document.getElementById('feedback-area');
    const nextBtn = document.getElementById('next-btn');
    const currentQ = loadedQuestions[currentIndex]; // Gauname dabartinį klausimą

    // Sustabdome papildomus paspaudimus
    options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === correct) {
            opt.style.borderColor = "#27ae60";
            opt.style.background = "#eafaf1";
        } else if (i === selected) {
            opt.style.borderColor = "#e74c3c";
            opt.style.background = "#fdedec";
        }
    });

    const isCorrect = (selected === correct);

    // --- NAUJA DALIS: Įrašome į duomenų bazę ---
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            const { error } = await supabaseClient
                .from('exam_results')
                .insert([{
                    user_id: user.id,
                    question_id: currentQ.id, // Naudojame klausimo UUID
                    is_correct: isCorrect
                }]);

            if (error) console.error("Klaida saugant rezultatą:", error.message);
        }
    } catch (err) {
        console.error("Sistemos klaida:", err);
    }
    // --- PABAIGA ---

    feedback.innerHTML = isCorrect 
        ? "<span style='color: #27ae60;'><i class='fas fa-check'></i> Teisingai!</span>" 
        : "<span style='color: #e74c3c;'><i class='fas fa-times'></i> Neteisingai.</span>";
    
    nextBtn.style.display = 'block';
}

function nextQuestion() {
    currentIndex++;
    renderQuestion();
}