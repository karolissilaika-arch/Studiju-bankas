// --- BENDRA BŪSENA IR INICIALIZACIJA ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Užkrauname kategorijas į pasirinkimus
    await loadDynamicCategories();
    
    // 2. Užkrauname bendrą profilio statistiką ir grafiką
    await loadAnalyticsData();
    
    // 3. Iškart parodome bendrą statistiką (nieko nepasirinkus)
    showFilteredResult();
});

// --- 1. DINAMINIS KATEGORIJŲ UŽKROVIMAS ---
async function loadDynamicCategories() {
    const categorySelect = document.getElementById('filter-category');
    if (!categorySelect) return;

    try {
        // Traukiame kategorijas iš abiejų lentelių, kad matytųsi viskas
        const { data: examData } = await supabaseClient.from('exam_questions').select('category');
        const { data: quizData } = await supabaseClient.from('quizzes').select('category');

        const allEntries = [...(examData || []), ...(quizData || [])];
        const uniqueCategories = [...new Set(allEntries.map(item => item.category).filter(Boolean))];

        categorySelect.innerHTML = '<option value="">Visos kategorijos</option>';
        uniqueCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Klaida kraunant kategorijas:", err);
    }
}

// --- 2. DINAMINIS TEMŲ UŽKROVIMAS ---
async function loadDynamicTopics() {
    const category = document.getElementById('filter-category').value;
    const topicSelect = document.getElementById('filter-topic');
    if (!topicSelect) return;

    // Jei kategorija nepasirinkta, išvalome temas ir atnaujiname bendrą vaizdą
    if (!category) {
        topicSelect.innerHTML = '<option value="">Visos temos</option>';
        showFilteredResult();
        return;
    }

    topicSelect.innerHTML = '<option value="">Kraunama...</option>';

    try {
        // Ieškome temų abiejose lentelėse pagal pasirinktą kategoriją
        const { data: examTopics } = await supabaseClient.from('exam_questions').select('topic').eq('category', category);
        const { data: quizTopics } = await supabaseClient.from('quizzes').select('topic').eq('category', category);

        const allTopics = [...(examTopics || []), ...(quizTopics || [])];
        const uniqueTopics = [...new Set(allTopics.map(item => item.topic).filter(Boolean))];

        topicSelect.innerHTML = '<option value="">Visos temos</option>';
        uniqueTopics.forEach(top => {
            const opt = document.createElement('option');
            opt.value = top;
            opt.textContent = top;
            topicSelect.appendChild(opt);
        });
        
        // Atnaujiname rezultatą pasikeitus kategorijai
        showFilteredResult();
    } catch (err) {
        console.error("Klaida kraunant temas:", err);
    }
}

// --- 3. PROFILIO DUOMENYS IR GRAFIKAS ---
async function loadAnalyticsData() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Užkrauname XP iš profilio
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('total_xp')
            .eq('id', user.id)
            .single();
        
        if (profile && document.getElementById('total-xp')) {
            document.getElementById('total-xp').innerText = profile.total_xp || 0;
        }

        // Užkrauname išspręstų testų kiekį
        const { count } = await supabaseClient
            .from('quiz_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        
        if (document.getElementById('quizzes-completed')) {
            document.getElementById('quizzes-completed').innerText = count || 0;
        }

        // --- GRAFIKO BRAIŽYMAS ---
        const canvas = document.getElementById('xpChart');
        if (!canvas) return;

        // PATIKRA: Ar Chart.js biblioteka įkelta?
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js neįkelta. Įsitikinkite, kad analytics.html turi <script src='...'></script>");
            return;
        }

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Še', 'Se'],
                datasets: [{
                    label: 'Savaitės XP',
                    data: [10, 25, 45, 45, 80, 100, 120], // Čia vėliau galėsi prijungti realią user_activity lentelę
                    borderColor: '#5d5fef',
                    backgroundColor: 'rgba(93, 95, 239, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (err) {
        console.error("loadAnalyticsData klaida:", err);
    }
}

// --- 4. FILTRUOJAMŲ REZULTATŲ RODYMAS ---
async function showFilteredResult() {
    const category = document.getElementById('filter-category').value;
    const topic = document.getElementById('filter-topic').value;
    const source = document.getElementById('filter-source').value;
    const display = document.getElementById('result-display');

    if (!display) return;
    display.innerHTML = "<div class='loader'>Skaičiuojama...</div>";

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            display.innerHTML = "Prisijunkite";
            return;
        }

        let totalCorrect = 0;
        let totalAsked = 0;

        if (source === 'egzaminai') {
            let query = supabaseClient
                .from('exam_results')
                .select('is_correct, exam_questions!inner(category, topic)')
                .eq('user_id', user.id);

            if (category) query = query.eq('exam_questions.category', category);
            if (topic) query = query.eq('exam_questions.topic', topic);

            const { data } = await query;
            if (data) {
                totalAsked = data.length;
                totalCorrect = data.filter(r => r.is_correct === true).length;
            }
        } else {
            // Testų statistika
            let query = supabaseClient
                .from('quiz_results')
                .select('score, total_questions, quizzes!inner(category, topic)')
                .eq('user_id', user.id);

            if (category) query = query.eq('quizzes.category', category);
            if (topic) query = query.eq('quizzes.topic', topic);

            const { data } = await query;
            if (data) {
                data.forEach(r => {
                    totalCorrect += r.score;
                    totalAsked += r.total_questions;
                });
            }
        }

        if (totalAsked === 0) {
            display.innerHTML = `<p style="color: #666; margin-top: 20px;">Duomenų dar nėra.</p>`;
            return;
        }

        const percent = Math.round((totalCorrect / totalAsked) * 100);
        let scopeText = "Bendra statistika";
        if (category && !topic) scopeText = `Kategorija: ${category}`;
        if (category && topic) scopeText = `Tema: ${topic}`;

        display.innerHTML = `
            <div class="percent-circle" style="--p:${percent}">
                <span>${percent}%</span>
            </div>
            <p><strong>${scopeText}</strong></p>
            <small>${source === 'egzaminai' ? 'Egzaminų klausimai' : 'Temos testai'} (${totalCorrect}/${totalAsked} tšk.)</small>
        `;
    } catch (err) {
        display.innerHTML = "Klaida skaičiuojant rezultatus.";
        console.error(err);
    }
}