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
    if (!container) return;

    if (quizzes.length === 0) {
        container.innerHTML = "<p>Testų nerasta.</p>";
        return;
    }

    container.innerHTML = quizzes.map(quiz => `
        <div class="course-item" style="cursor: pointer; transition: 0.3s;" 
             onclick="window.location.href='quiz.html?id=${encodeURIComponent(quiz.title)}'">
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
