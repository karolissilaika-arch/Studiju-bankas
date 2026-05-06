let currentQuizQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadQuizzes();
});

async function loadQuizzes() {
    const container = document.getElementById('quizzes-container');
    const { data: quizzes, error } = await supabaseClient
        .from('quizzes')
        .select('*');

    if (error) {
        container.innerHTML = "<p>Nepavyko užkrauti testų.</p>";
        return;
    }

    container.innerHTML = quizzes.map(quiz => `
        <div class="course-item" style="cursor: pointer; transition: 0.3s;" onclick="startQuiz('${quiz.title}')">
            <h3><i class="fas fa-pen-nib"></i> ${quiz.title}</h3>
            <p>${quiz.description || 'Pasitikrinkite žinias šiame teste.'}</p>
            <span style="color: var(--primary-color); font-size: 14px;">Pradėti testą →</span>
        </div>
    `).join('');
}

async function startQuiz(title) {
    const { data: quiz, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('title', title)
        .single();

    if (error || !quiz) return;

    currentQuizQuestions = quiz.questions; // Klausimai iš Supabase JSONB lauko
    
    document.getElementById('quizzes-container').style.display = 'none';
    document.getElementById('quiz-window').style.display = 'block';
    document.getElementById('active-quiz-title').innerText = quiz.title;
    document.getElementById('quiz-result').innerText = '';
    
    const questionsDiv = document.getElementById('quiz-questions');
    questionsDiv.innerHTML = currentQuizQuestions.map((q, index) => `
        <div class="question-block" style="margin-bottom: 25px;">
            <p><strong>${index + 1}. ${q.q}</strong></p>
            ${q.a.map((option, optIndex) => `
                <label style="display: block; margin: 8px 0; cursor: pointer;">
                    <input type="radio" name="q${index}" value="${optIndex}"> ${option}
                </label>
            `).join('')}
        </div>
    `).join('');

    document.getElementById('submit-quiz-btn').onclick = () => calculateResults();
}

function calculateResults() {
    let score = 0;
    currentQuizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected && parseInt(selected.value) === q.c) {
            score++;
        }
    });

    const resultDiv = document.getElementById('quiz-result');
    const percentage = Math.round((score / currentQuizQuestions.length) * 100);
    
    resultDiv.innerHTML = `
        <div style="padding: 20px; background: #f0f7ff; border-radius: 10px;">
            Jūsų rezultatas: ${score} iš ${currentQuizQuestions.length} (${percentage}%)
            <br>
            ${percentage >= 50 ? '🎉 Puikiai padirbėta!' : '💡 Pabandykite dar kartą pasikartoję medžiagą.'}
        </div>
    `;
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function closeQuiz() {
    document.getElementById('quizzes-container').style.display = 'grid';
    document.getElementById('quiz-window').style.display = 'none';
}