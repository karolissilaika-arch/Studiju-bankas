// 1. DOM užkrovimas
document.addEventListener('DOMContentLoaded', () => {
    loadPublicTopics();
    setupSearch();
    updateSidebarAuth(); // Iškviečiame, bet su pataisyta logika
});

let allLoadedTopics = [];

async function loadPublicTopics() {
    const container = document.getElementById('topics-container');
    if (!container) return;

    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    container.innerHTML = "<div class='loader'>Kraunama...</div>";

    let query = supabaseClient.from('topics').select('*');

    if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory); 
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase klaida:", error.message);
        container.innerHTML = `<p>Klaida užkraunant duomenis.</p>`;
        return;
    }

    allLoadedTopics = data; 
    renderTopics(data);
}

function renderTopics(topics) {
    const container = document.getElementById('topics-container');
    if (!container) return;
    
    if (topics.length === 0) {
        container.innerHTML = "<p>Temų nerasta.</p>";
        return;
    }

    container.innerHTML = topics.map(topic => {
        const encodedTitle = encodeURIComponent(topic.title);

        return `
            <div class="course-item topic-card" style="margin-bottom: 20px; border-radius: 12px; padding: 20px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                    
                    <div style="cursor: pointer; flex: 1;" onclick="window.location.href='lesson.html?id=${encodedTitle}'">
                        <h3 style="margin: 0; color: #333; font-size: 1.2rem;">${topic.title}</h3>
                        <p style="margin: 8px 0 0; color: #666; font-size: 14px; line-height: 1.4;">${topic.description || ''}</p>
                        <small style="display: inline-block; margin-top: 10px; padding: 2px 8px; background: #f0f0f0; border-radius: 4px; color: #888;">${topic.category || 'bendra'}</small>
                    </div>

                    <div style="cursor: pointer; padding: 10px; margin-top: -5px;" onclick="toggleTopic(this)">
                        <i class="fas fa-chevron-down arrow-icon" style="transition: transform 0.3s ease; color: #aaa;"></i>
                    </div>
                </div>
                
                <div class="topic-content" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div class="rich-text-content" style="color: #444; font-size: 15px;">
                        ${topic.content ? (topic.content.length > 150 ? topic.content.substring(0, 150) + '...' : topic.content) : 'Nėra papildomo turinio.'}
                    </div>
                    <a href="lesson.html?id=${encodedTitle}" style="display: inline-block; margin-top: 12px; color: #5d5fef; font-weight: 600; text-decoration: none; font-size: 14px;">
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
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortFilter.value === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
        card.style.boxShadow = '0 5px 15px rgba(93, 95, 239, 0.1)';
        card.style.borderColor = '#5d5fef';
    } else {
        content.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
        card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        card.style.borderColor = '#eee';
    }
}

