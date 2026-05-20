let allLoadedTopics = [];

// 1. DOM užkrovimas
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupSearch();
    updateSidebarAuth();
});

// Užkrauna unikalias kategorijas iš DB ir užpildo <select>
async function loadCategories() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    const { data, error } = await supabaseClient
        .from('topics')
        .select('category')
        .not('category', 'is', null);

    if (!error && data) {
        const unique = [...new Set(data.map(r => r.category).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'lt')
        );

        // Išsaugome dabartinę pasirinktą reikšmę (jei yra)
        const current = select.value;

        // Paliekame tik pirmąją "Visos kategorijos" opciją
        select.innerHTML = `<option value="all">Visos kategorijos</option>`;

        unique.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });

        // Atstatome pasirinkimą
        if (current && current !== 'all') select.value = current;
    }

    // Užkrauname temas po to, kai kategorijos paruoštos
    loadPublicTopics();
}

async function loadPublicTopics() {
    const container = document.getElementById('topics-container');
    if (!container) return;

    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';

    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Kraunama...</span>
        </div>
    `;

    let query = supabaseClient.from('topics').select('*');

    if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
    }

    // Rikiuojame pagal created_at, o jei vienodas – pagal title
    const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('title', { ascending: true });

    if (error) {
        console.error("Supabase klaida:", error.message);
        container.innerHTML = `<p style="color: var(--text-gray);">Klaida užkraunant duomenis.</p>`;
        return;
    }

    allLoadedTopics = data;
    renderTopics(data);
}

// Išvalo HTML žymes ir style/script blokus, kad preview būtų grynas tekstas
function stripHtml(html) {
    const clean = html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = clean;
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function renderTopics(topics) {
    const container = document.getElementById('topics-container');
    if (!container) return;

    if (topics.length === 0) {
        container.innerHTML = `<p style="color: var(--text-gray);">Temų nerasta.</p>`;
        return;
    }

    container.innerHTML = topics.map(topic => {
        const encodedTitle = encodeURIComponent(topic.title);

        // Valome HTML žymes iš content, kad preview būtų įskaitomas
        const rawText = topic.content ? stripHtml(topic.content) : '';
        const preview = rawText.length > 200
            ? rawText.substring(0, 200).trimEnd() + '...'
            : (rawText || 'Nėra papildomo turinio.');

        return `
            <div class="course-item topic-card" style="flex-direction: column; align-items: stretch; gap: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">

                    <div style="cursor: pointer; flex: 1;" onclick="window.location.href='lesson.html?id=${encodedTitle}'">
                        <h3 style="margin: 0; color: var(--text-dark); font-size: 1.1rem;">${topic.title}</h3>
                        <p style="margin: 6px 0 0; color: var(--text-gray); font-size: 14px; line-height: 1.5;">
                            ${topic.description || ''}
                        </p>
                        <span class="category-badge" style="display: inline-block; margin-top: 8px;">${topic.category || 'bendra'}</span>
                    </div>

                    <div style="cursor: pointer; padding: 8px; margin-top: -4px;" onclick="toggleTopic(this)">
                        <i class="fas fa-chevron-down arrow-icon" style="transition: transform 0.3s ease; color: var(--text-muted);"></i>
                    </div>
                </div>

                <div class="topic-content" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div class="rich-text-content" style="color: var(--text-gray); font-size: 15px; line-height: 1.6;">
                        ${preview}
                    </div>
                    <a href="lesson.html?id=${encodedTitle}" class="back-link" style="display: inline-block; margin-top: 12px; font-size: 14px;">
                        Skaityti visą pamoką →
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');

    if (!searchInput || !sortFilter) return;

    const filterData = () => {
        const searchTerm = searchInput.value.toLowerCase();

        let filtered = allLoadedTopics.filter(t =>
            t.title.toLowerCase().includes(searchTerm) ||
            (t.description && t.description.toLowerCase().includes(searchTerm))
        );

        if (sortFilter.value === 'az') {
            filtered.sort((a, b) => a.title.localeCompare(b.title, 'lt'));
        } else if (sortFilter.value === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.title.localeCompare(b.title, 'lt'));
        } else {
            // Naujausios – jei created_at vienodas, rikiuojame pagal title
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || a.title.localeCompare(b.title, 'lt'));
        }

        renderTopics(filtered);
    };

    searchInput.addEventListener('input', filterData);
    sortFilter.addEventListener('change', filterData);
}

function toggleTopic(element) {
    const card = element.closest('.topic-card');
    const content = card.querySelector('.topic-content');
    const arrow = card.querySelector('.arrow-icon');

    const isHidden = content.style.display === 'none' || content.style.display === '';

    content.style.display = isHidden ? 'block' : 'none';
    arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    card.style.boxShadow = isHidden ? '0 5px 15px rgba(93,95,239,0.1)' : '';
    card.style.borderColor = isHidden ? 'var(--primary)' : '#eee';
}