// 1. DOM užkrovimas
document.addEventListener('DOMContentLoaded', () => {
    loadPublicTopics();
    setupSearch();
    updateSidebarAuth();
});

// Globalus kintamasis saugoti parsiųstoms temoms (kad nereikėtų kaskart kreiptis į DB rašant paieškoje)
let allLoadedTopics = [];

async function loadPublicTopics() {
    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    const container = document.getElementById('topics-container');
    
    container.innerHTML = "<p>Kraunama...</p>";

    let query = supabaseClient.from('topics').select('*');

    if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory); 
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase klaida:", error.message);
        container.innerHTML = `Klaida užkraunant duomenis.`;
        return;
    }

    allLoadedTopics = data; // Išsaugojame duomenis paieškai
    renderTopics(data);
}

// topics.js faile surask renderTopics funkciją
function renderTopics(topics) {
    const container = document.getElementById('topics-container');
    
    if (topics.length === 0) {
        container.innerHTML = "<p>Temų nerasta.</p>";
        return;
    }

    container.innerHTML = topics.map(topic => {
        // Saugiai koduojame title, kad URL veiktų su tarpais ir lietuviškomis raidėmis
        const encodedTitle = encodeURIComponent(topic.title);

        return `
            <div class="course-item topic-card" style="margin-bottom: 20px; border-radius: 12px; padding: 20px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                    
                    <!-- KAIRĖ DALIS: Tekstas (nuveda į pamoką) -->
                    <div style="cursor: pointer; flex: 1;" onclick="window.location.href='lesson.html?id=${encodedTitle}'">
                        <h3 style="margin: 0; color: #333; font-size: 1.2rem;">${topic.title}</h3>
                        <p style="margin: 8px 0 0; color: #666; font-size: 14px; line-height: 1.4;">${topic.description || ''}</p>
                        <small style="display: inline-block; margin-top: 10px; padding: 2px 8px; background: #f0f0f0; border-radius: 4px; color: #888;">${topic.category || 'bendra'}</small>
                    </div>

                    <!-- DEŠINĖ DALIS: Rodyklė (tik išskleidžia turinį) -->
                    <div style="cursor: pointer; padding: 10px; margin-top: -5px;" onclick="toggleTopic(this)">
                        <i class="fas fa-chevron-down arrow-icon" style="transition: transform 0.3s ease; color: #aaa;"></i>
                    </div>
                </div>
                
                <!-- IŠSKLEIDŽIAMAS TURINYS -->
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

    const filterData = () => {
        const searchTerm = searchInput.value.toLowerCase();

        // Filtruojame TIK tuos duomenis, kurie jau yra parsiųsti (pagal kategoriją)
        let filtered = allLoadedTopics.filter(t => 
            t.title.toLowerCase().includes(searchTerm) || 
            (t.description && t.description.toLowerCase().includes(searchTerm))
        );

        // Rūšiavimas
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

// Tavo toggleTopic funkcija lieka tokia pati
function toggleTopic(element) {
    const card = element.closest('.topic-card');
    const content = card.querySelector('.topic-content');
    const arrow = card.querySelector('.arrow-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
        card.style.borderColor = '#5d5fef';
    } else {
        content.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
        card.style.borderColor = 'transparent';
    }
}

        function updateSidebarAuth() {
            const authLinks = document.getElementById('auth-links');
            // Čia paprasta logika: patikriname localStorage ar Supabase session
            const user = JSON.parse(localStorage.getItem('sb-user-session')); // Pavyzdys
            
            if (user) {
                authLinks.innerHTML = `<a href="index.html" class="logout" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Atsijungti</a>`;
            } else {
                authLinks.innerHTML = `<a href="login.html"><i class="fas fa-sign-in-alt"></i> Prisijungti</a>`;
            }
        }