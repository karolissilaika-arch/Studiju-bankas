let loadedQuestions = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await updateCategoryDropdown();
    await updateTopicDropdown();
    await loadExamQuestions();
});

// Kai pasikeičia klasė, atnaujiname kategorijas ir temas
async function handleGradeChange() {
    await updateCategoryDropdown();
    await updateTopicDropdown();
    await loadExamQuestions();
}

// Kai pasikeičia kategorija, atnaujiname temų sąrašą
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

// 2. Dinamiškai užpildome kategorijų pasirinkimą iš DB
async function updateCategoryDropdown() {
    const grade = document.getElementById('filter-grade').value;
    const categorySelect = document.getElementById('filter-category');

    let query = supabaseClient.from('exam_questions').select('category');
    if (grade !== 'all') query = query.eq('grade', parseInt(grade));

    const { data, error } = await query;
    if (error || !data) return;

    const uniqueCategories = [...new Set(data.map(item => item.category))].sort();

    categorySelect.innerHTML = '<option value="all">Visi dalykai</option>' +
        uniqueCategories.map(c => `<option value="${c}">${c}</option>`).join('');
}

// 3. Dinamiškai užpildome temų pasirinkimą iš DB
async function updateTopicDropdown() {
    const grade = document.getElementById('filter-grade').value;
    const category = document.getElementById('filter-category').value;
    const topicSelect = document.getElementById('filter-topic');
    
    let query = supabaseClient.from('exam_questions').select('topic');
    if (grade !== 'all') query = query.eq('grade', parseInt(grade));
    if (category !== 'all') query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error || !data) return;

    const uniqueTopics = [...new Set(data.map(item => item.topic))].sort();

    topicSelect.innerHTML = '<option value="all">Visos temos</option>' + 
        uniqueTopics.map(t => `<option value="${t}">${t}</option>`).join('');
}

// 4. Nukreipia į praktikos puslapį su filtrais
function openPracticeModal() {
    const grade = document.getElementById('filter-grade').value;
    const category = document.getElementById('filter-category').value;
    const topic = document.getElementById('filter-topic').value;

    const url = `practice.html?grade=${grade}&category=${category}&topic=${topic}`;
    window.location.href = url;
}

// 5. Sugeneruoja dabartinį klausimą
function renderCurrentQuestion() {
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
                <div class="option-item" onclick="checkExamAnswer(${i}, ${q.correct_option})">
                    ${option}
                </div>
            `).join('')}
        </div>
        
        <div id="feedback-area" class="feedback-area"></div>
        
        <button id="next-exam-btn" class="btn-next-q" onclick="nextQuestion()">
            Kitas klausimas <i class="fas fa-arrow-right"></i>
        </button>
    `;
}

// 6. Patikrina atsakymą
function checkExamAnswer(selected, correct) {
    const options = document.querySelectorAll('.option-item');
    const feedback = document.getElementById('feedback-area');
    const nextBtn = document.getElementById('next-exam-btn');

    options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === correct) {
            opt.classList.add('option-correct');
        } else if (i === selected) {
            opt.classList.add('option-wrong');
        }
    });

    if (selected === correct) {
        feedback.innerHTML = `<div class="feedback-correct"><i class="fas fa-check-circle"></i> Teisingai padirbėta!</div>`;
    } else {
        feedback.innerHTML = `<div class="feedback-wrong"><i class="fas fa-times-circle"></i> Neteisingai. Teisingas atsakymas paryškintas žaliai.</div>`;
    }

    nextBtn.style.display = 'block';
}

function nextQuestion() {
    currentIndex++;
    renderCurrentQuestion();
}

function closeExam() {
    document.getElementById('exam-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}
