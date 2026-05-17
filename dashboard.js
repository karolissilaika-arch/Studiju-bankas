async function loadTopics() {
    const topicsContainer = document.getElementById('dashboard-topics');
    
    if (!topicsContainer) {
        console.error("KLAIDA: Nerastas HTML elementas temoms (id: dashboard-topics)");
        return;
    }

    topicsContainer.innerHTML = "<p>Kraunama...</p>";

    try {
        // 1. Pakeitimas: Išimame .order(), kad eliminuotume klaidos galimybę dėl stulpelio pavadinimo
        const { data: topics, error } = await supabaseClient
            .from('topics')
            .select('*');

        if (error) {
            console.error("Supabase klaida:", error.message, error.details);
            topicsContainer.innerHTML = `<p style="color:red">Supabase klaida: ${error.message}</p>`;
            return;
        }

        console.log("Gauti duomenys:", topics);

        if (!topics || topics.length === 0) {
            topicsContainer.innerHTML = "<p>Lentelė tuščia. Pridėkite temą per Admin panelę.</p>";
            return;
        }

        // 2. Jei nori rūšiuoti pagal datą saugiai per JavaScript (ne per DB užklausą):
        // topics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        topicsContainer.innerHTML = '';
        topics.slice(0, 3).forEach(topic => { // Rodyti tik pirmas 3
            const topicCard = document.createElement('div');
            topicCard.className = 'course-item';
    topicCard.style.marginBottom = "15px"; // Sukuria tarpą tarp kortelių
    topicCard.style.display = "flex";      // Išlygiuoja turinį ir mygtuką
    topicCard.style.justifyContent = "space-between";
    topicCard.style.alignItems = "center";
    topicCard.style.padding = "20px";
    topicCard.style.background = "white";
    topicCard.style.borderRadius = "12px";
    topicCard.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
            topicCard.innerHTML = `
                <div class="course-info">
                    <h4>${topic.title}</h4>
                    <p>${topic.description || ''}</p>
                </div>
                <button class="btn-primary" onclick="window.location.href='topics.html'">Pradėti</button>
            `;
            topicsContainer.appendChild(topicCard);
        });

    } catch (err) {
        console.error("Netikėta JS klaida:", err);
        topicsContainer.innerHTML = "<p>Netikėta klaida kodo vykdyme.</p>";
    }
}
// --- TESTŲ KROVIMAS ---
async function loadQuizzes() {
    console.log("loadQuizzes funkcija paleista...");
    const quizContainer = document.getElementById('quiz-list');
    
    if (!quizContainer) return;

    const { data: quizzes, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .limit(3);

    if (error) {
        console.error("Supabase klaida:", error.message);
        return;
    }

    if (!quizzes || quizzes.length === 0) {
        quizContainer.innerHTML = '<p>Testų bazėje nerasta.</p>';
        return;
    }

    quizContainer.innerHTML = ''; 
    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'course-item'; 
    card.style.marginBottom = "15px"; // Sukuria tarpą tarp kortelių
    card.style.display = "flex";      // Išlygiuoja turinį ir mygtuką
    card.style.justifyContent = "space-between";
    card.style.alignItems = "center";
    card.style.padding = "20px";
    card.style.background = "white";
    card.style.borderRadius = "12px";
    card.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
        card.innerHTML = `
            <div class="course-info">
                <h4>📝 ${quiz.title}</h4>
                <p>${quiz.description || ''}</p>
            </div>
            <button class="btn-primary" onclick="window.location.href='quizzes.html'">Spręsti</button>
        `;
        quizContainer.appendChild(card);
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Puslapis užkrautas, pradedamas duomenų krovimas...");
    await loadTopics();
    await loadQuizzes();
    await loadPremiumStats();
});

// --- PREMIUM STATISTIKA (temos + serija) ---
async function loadPremiumStats() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_premium, quizzes_completed')
            .eq('id', user.id)
            .single();

        if (!profile?.is_premium) return; // Ne-premium: lieka užrakto nuoroda

        // --- Išmoktos temos ---
        const { count: totalTopics } = await supabaseClient
            .from('topics')
            .select('*', { count: 'exact', head: true });

        const { count: doneQuizzes } = await supabaseClient
            .from('quiz_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Laikome "išmokta tema" = bent vienas testas atliktas
        const learned = Math.min(doneQuizzes || 0, totalTopics || 0);
        document.getElementById('learned-topics-count').innerHTML =
            `${learned} / ${totalTopics || 0}`;

        // --- Mokymosi serija ---
        const { data: results } = await supabaseClient
            .from('quiz_results')
            .select('created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        const streak = calcStreak(results || []);
        document.getElementById('streak-count').innerHTML =
            `${streak} ${streak === 1 ? 'diena' : streak < 10 ? 'dienos' : 'dienų'}`;

    } catch (err) {
        console.error("Klaida kraunant premium statistiką:", err);
    }
}

// Apskaičiuoja kiek dienų iš eilės buvo aktyvumas
function calcStreak(results) {
    if (!results.length) return 0;

    const uniqueDays = [...new Set(results.map(r => r.created_at?.split('T')[0]))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Jei paskutinė diena nei šiandien, nei vakar — serija nutrūkusi
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diff = (prev - curr) / 86400000;
        if (diff === 1) streak++;
        else break;
    }
    return streak;
}

