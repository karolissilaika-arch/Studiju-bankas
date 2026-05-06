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
    
    // Naudojame await, kad funkcijos nekonkuruotų tarpusavyje
    await loadTopics();
    await loadQuizzes();
});

