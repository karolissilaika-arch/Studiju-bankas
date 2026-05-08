let loadedQuestions = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadExamQuestions();
    updateTopicDropdown();
});

// Kai pasikeičia kategorija, turime atnaujinti temų sąrašą
async function handleCategoryChange() {
    await updateTopicDropdown();
    await loadExamQuestions();
}

// 1. Užkrauname klausimus iš DB pagal filtrus
async function loadExamQuestions() {
    const grade = document.getElementById('filter-grade').value;
    const category = document.getElementById('filter-category').value;
    const topic = document.getElementById('filter-topic').value;
    
    const startBtn = document.getElementById('start-practice-btn');
    const noMsg = document.getElementById('no-questions-msg');
    const qCountSpan = document.getElementById('q-count');

    let query = supabaseClient.from('exam_questions').select('*');

    if (grade !== 'all') query = query.eq('grade', parseInt(grade));
    if (category !== 'all') query = query.eq('category', category);
    if (topic !== 'all') query = query.eq('topic', topic);

    const { data, error } = await query;

    if (error) {
        console.error("Klaida siunčiant klausimus:", error.message);
        return;
    }

    loadedQuestions = data;
    qCountSpan.innerText = data.length;

    if (data.length > 0) {
        startBtn.style.display = 'block';
        noMsg.style.display = 'none';
    } else {
        startBtn.style.display = 'none';
        noMsg.style.display = 'block';
    }
}

// 2. Dinamiškai užpildome temų pasirinkimą iš DB esančių duomenų
async function updateTopicDropdown() {
    const category = document.getElementById('filter-category').value;
    const topicSelect = document.getElementById('filter-topic');
    
    let query = supabaseClient.from('exam_questions').select('topic');
    if (category !== 'all') query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error || !data) return;

    // Išrenkame unikalias temas
    const uniqueTopics = [...new Set(data.map(item => item.topic))];

    topicSelect.innerHTML = '<option value="all">Visos temos</option>' + 
        uniqueTopics.map(t => `<option value="${t}">${t}</option>`).join('');
}

// 3. Atidaro modalinį langą
// exam-prep.js
function openPracticeModal() {
    const grade = document.getElementById('filter-grade').value;
    const category = document.getElementById('filter-category').value;
    const topic = document.getElementById('filter-topic').value;

    // Vietoj modalo atidarymo, nukreipiame į naują puslapį su parametrais
    const url = `practice.html?grade=${grade}&category=${category}&topic=${topic}`;
    window.location.href = url;
}

// 4. Sugeneruoja dabartinį klausimą
function renderCurrentQuestion() {
    // Begalinis ciklas: jei klausimai baigėsi, pradedame iš naujo
    if (currentIndex >= loadedQuestions.length) {
        loadedQuestions.sort(() => Math.random() - 0.5);
        currentIndex = 0;
    }

    const q = loadedQuestions[currentIndex];
    const container = document.getElementById('active-question-container');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#aaa; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
            <span>${q.grade} klasė • ${q.category}</span>
            <span>Tema: ${q.topic}</span>
        </div>
        
        <h2 style="margin: 0 0 30px 0; color: #333; line-height: 1.4; font-size: 22px;">${q.question_text}</h2>
        
        <div class="options-list">
            ${q.options.map((option, i) => `
                <div class="option-item" onclick="checkExamAnswer(${i}, ${q.correct_option})" 
                     style="padding:18px; border:2px solid #eee; margin-bottom:12px; border-radius:15px; cursor:pointer; transition:0.2s; font-size:16px; color:#444;">
                    ${option}
                </div>
            `).join('')}
        </div>
        
        <div id="feedback-area" style="margin-top:20px; min-height:40px;"></div>
        
        <button id="next-exam-btn" onclick="nextQuestion()" style="display:none; width:100%; padding:16px; background:#5d5fef; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:600; font-size:16px; box-shadow: 0 4px 15px rgba(93, 95, 239, 0.3);">
            Kitas klausimas <i class="fas fa-arrow-right" style="margin-left: 10px;"></i>
        </button>
    `;
}

// 5. Patikrina atsakymą
function checkExamAnswer(selected, correct) {
    const options = document.querySelectorAll('.option-item');
    const feedback = document.getElementById('feedback-area');
    const nextBtn = document.getElementById('next-exam-btn');

    options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none'; // Neleidžiame keisti nuomonės
        if (i === correct) {
            opt.style.borderColor = "#27ae60";
            opt.style.background = "#eafaf1";
            opt.style.color = "#1e8449";
        } else if (i === selected) {
            opt.style.borderColor = "#e74c3c";
            opt.style.background = "#fdedec";
            opt.style.color = "#a93226";
        }
    });

    if (selected === correct) {
        feedback.innerHTML = `<div style="color: #27ae60; display:flex; align-items:center; gap:10px;"><i class="fas fa-check-circle"></i> Teisingai padirbėta!</div>`;
    } else {
        feedback.innerHTML = `<div style="color: #e74c3c; display:flex; align-items:center; gap:10px;"><i class="fas fa-times-circle"></i> Neteisingai. Teisingas atsakymas paryškintas žaliai.</div>`;
    }

    nextBtn.style.display = 'block';
}

function nextQuestion() {
    currentIndex++;
    renderCurrentQuestion();
}

function closeExam() {
    document.getElementById('exam-overlay').style.display = 'none';
    document.body.style.overflow = 'auto'; // Grąžiname skrolinimą
}