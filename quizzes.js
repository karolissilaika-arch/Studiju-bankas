let allLoadedQuizzes = [];
let currentQuizQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadQuizzes();
    setupSearch();
    if (typeof updateNavigation === 'function') updateNavigation();
});

async function loadCategories() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    const { data, error } = await supabaseClient
        .from('quizzes')
        .select('category')
        .not('category', 'is', null);

    if (error) {
        console.error('Kategorijų klaida:', error.message);
        return;
    }

    const unique = [...new Set(data.map(r => r.category).filter(Boolean))].sort();

    select.innerHTML = `<option value="all">Visos kategorijos</option>` +
        unique.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

async function loadQuizzes() {
    const container = document.getElementById('quizzes-container');
    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';

    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Kraunama...</span>
        </div>
    `;

    let query = supabaseClient.from('quizzes').select('*');

    if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
    }

    const { data: quizzes, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Klaida:", error.message);
        container.innerHTML = `<p style="color: var(--text-gray);">Nepavyko užkrauti testų.</p>`;
        return;
    }

    allLoadedQuizzes = quizzes;
    renderQuizzes(quizzes);
}

function renderQuizzes(quizzes) {
    const container = document.getElementById('quizzes-container');
    if (!container) return;

    if (quizzes.length === 0) {
        container.innerHTML = `<p style="color: var(--text-gray);">Testų nerasta.</p>`;
        return;
    }

    container.innerHTML = quizzes.map(quiz => `
        <div class="course-item" style="cursor: pointer; flex-direction: column; align-items: flex-start; gap: 8px; transition: box-shadow 0.2s, border-color 0.2s;"
             onclick="window.location.href='quiz.html?id=${encodeURIComponent(quiz.title)}'"
             onmouseenter="this.style.boxShadow='0 5px 15px rgba(93,95,239,0.1)'; this.style.borderColor='var(--primary)'"
             onmouseleave="this.style.boxShadow=''; this.style.borderColor='#eee'">
            <h3 style="margin: 0; color: var(--text-dark);">
                <i class="fas fa-pen-nib" style="color: var(--primary); margin-right: 8px;"></i>${quiz.title}
            </h3>
            <p style="margin: 0; color: var(--text-gray); font-size: 14px;">
                ${quiz.description || 'Pasitikrinkite žinias šiame teste.'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 4px;">
                <span class="category-badge">${quiz.category || 'bendra'}</span>
                <span style="color: var(--primary); font-size: 14px; font-weight: 600;">Pradėti testą →</span>
            </div>
        </div>
    `).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');

    const filterData = () => {
        const searchTerm = searchInput.value.toLowerCase();

        let filtered = allLoadedQuizzes.filter(q => 
            q.title.toLowerCase().includes(searchTerm) || 
            (q.description && q.description.toLowerCase().includes(searchTerm))
        );

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
