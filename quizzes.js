let allLoadedQuizzes = [];
let currentQuizQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadQuizzes();
    setupSearch(); // Inicializuojame paiešką ir rūšiavimą
    if (typeof updateNavigation === 'function') updateNavigation(); // Jei naudoji bendrą nav
});

async function loadQuizzes() {
    const container = document.getElementById('quizzes-container');
    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';

    container.innerHTML = "<p>Kraunama...</p>";

    // Pradedame užklausą
    let query = supabaseClient.from('quizzes').select('*');

    // Filtruojame pagal kategoriją, jei ji pasirinkta
    if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
    }

    const { data: quizzes, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Klaida:", error.message);
        container.innerHTML = "<p>Nepavyko užkrauti testų.</p>";
        return;
    }

    allLoadedQuizzes = quizzes; // Išsaugojame duomenis filtravimui naršyklėje
    renderQuizzes(quizzes);
}

function renderQuizzes(quizzes) {
    const container = document.getElementById('quizzes-container');
    if (quizzes.length === 0) {
        container.innerHTML = "<p>Testų nerasta.</p>";
        return;
    }

    container.innerHTML = quizzes.map(quiz => `
        <div class="course-item" style="cursor: pointer; transition: 0.3s;" onclick="startQuiz('${quiz.title}')">
            <h3><i class="fas fa-pen-nib"></i> ${quiz.title}</h3>
            <p>${quiz.description || 'Pasitikrinkite žinias šiame teste.'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <small style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px; color: #666;">${quiz.category || 'bendra'}</small>
                <span style="color: var(--primary-color); font-size: 14px;">Pradėti testą →</span>
            </div>
        </div>
    `).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');

    const filterData = () => {
        const searchTerm = searchInput.value.toLowerCase();

        // Filtruojame jau parsiųstus duomenis (pagal kategoriją)
        let filtered = allLoadedQuizzes.filter(q => 
            q.title.toLowerCase().includes(searchTerm) || 
            (q.description && q.description.toLowerCase().includes(searchTerm))
        );

        // Rūšiavimas
        if (sortFilter.value === 'az') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortFilter.value === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        renderQuizzes(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterData);
    if (sortFilter) sortFilter.addEventListener('change', filterData);
}

// --- Testo vykdymo logika (lieka tavo originali, tik su klaidų pataisymu) ---

async function startQuiz(title) {
    const { data: quiz, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('title', title)
        .single();

    if (error || !quiz) return;

    currentQuizQuestions = quiz.questions; 
    
    document.getElementById('quizzes-container').style.display = 'none';
    // Paslepiame filtrus, kai vyksta testas
    const filterSec = document.querySelector('.search-sort-bar'); 
    if (filterSec) filterSec.style.display = 'none';

    document.getElementById('quiz-window').style.display = 'block';
    document.getElementById('active-quiz-title').innerText = quiz.title;
    document.getElementById('quiz-result').innerText = '';
    
    const questionsDiv = document.getElementById('quiz-questions');
    questionsDiv.innerHTML = currentQuizQuestions.map((q, index) => `
        <div class="question-block" style="margin-bottom: 25px; padding: 15px; border-bottom: 1px solid #eee;">
            <p><strong>${index + 1}. ${q.q}</strong></p>
            ${q.a.map((option, optIndex) => `
                <label style="display: block; margin: 10px 0; cursor: pointer; padding: 5px; border-radius: 5px; transition: 0.2s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
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
        <div style="padding: 20px; background: ${percentage >= 50 ? '#e6fffa' : '#fff5f5'}; border-radius: 10px; border: 1px solid ${percentage >= 50 ? '#38b2ac' : '#feb2b2'}; margin-top: 20px;">
            <h3 style="margin-top: 0;">Rezultatas: ${score} / ${currentQuizQuestions.length} (${percentage}%)</h3>
            <p>${percentage >= 50 ? '🎉 Puikiai padirbėta! Esate pasiruošę.' : '💡 Pabandykite dar kartą pasikartoję medžiagą.'}</p>
            <button onclick="closeQuiz()" style="margin-top: 10px; padding: 8px 15px; cursor: pointer;">Grįžti į sąrašą</button>
        </div>
    `;
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function closeQuiz() {
    document.getElementById('quizzes-container').style.display = 'grid';
    document.getElementById('quiz-window').style.display = 'none';
    // Grąžiname filtrus
    const filterSec = document.querySelector('.search-sort-bar');
    if (filterSec) filterSec.style.display = 'flex';
}