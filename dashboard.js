// 5. TEMŲ KROVIMAS IŠ DUOMENŲ BAZĖS
// --- 5. TEMŲ KROVIMAS IŠ DUOMENŲ BAZĖS ---
async function loadTopics() {
    const topicsContainer = document.getElementById('topics-list');
    if (!topicsContainer) return;

    console.log("Bandoma krauti temas..."); 

    try {
        const { data: topics, error } = await supabaseClient
            .from('topics')
            .select('*');

        if (error) {
            console.error("Supabase klaida:", error.message);
            topicsContainer.innerHTML = `<p style="color:red">Klaida: ${error.message}</p>`;
            return;
        }

        console.log("Gauti duomenys iš DB:", topics); 

        if (!topics || topics.length === 0) {
            topicsContainer.innerHTML = "<p>Lentelė tuščia. Pridėkite temą per Admin panelę.</p>";
            return;
        }

        topicsContainer.innerHTML = '';
     topics.forEach(topic => {
            const topicCard = document.createElement('div');
            topicCard.className = 'course-item';
            
            // Kadangi tavo Primary Key yra 'title', naudojame jį vietoj 'id'
            const lessonId = topic.title; 

            topicCard.innerHTML = `
                <div class="course-info">
                    <h4>${topic.title}</h4>
                    <p>${topic.description}</p>
                </div>
                <button class="btn-primary" onclick="openLesson('${lessonId}')">Pradėti</button>
            `;
            topicsContainer.appendChild(topicCard);
        });
    } catch (err) {
        console.error("Netikėta klaida:", err);
        topicsContainer.innerHTML = "<p>Sistemos klaida. Žiūrėti Console.</p>";
    }
}

// Funkcija, kurią iškviečiame paspaudus "Pradėti"
function openLesson(id) {
    // Nukreipiame vartotoją į universalų pamokos puslapį su konkrečiu ID
    window.location.href = `lesson.html?id=${id}`;
}

// Iškviečiame krovimą, kai puslapis užsikrauna
if (window.location.pathname.includes("dashboard.html")) {
    loadTopics();
}
// 1. Funkcija, kuri paima testus iš DB ir sukuria korteles
async function loadQuizzes() {
    console.log("1. loadQuizzes funkcija paleista...");
    const quizContainer = document.getElementById('quiz-list');
    
    if (!quizContainer) {
        console.error("2. Klaida: Nerastas elementas su id 'quiz-list'!");
        return;
    }

    const { data: quizzes, error } = await supabaseClient
        .from('quizzes')
        .select('*');

    if (error) {
        console.error("3. Supabase klaida:", error.message);
        return;
    }

    console.log("4. Gauti duomenys iš DB:", quizzes);

    if (!quizzes || quizzes.length === 0) {
        quizContainer.innerHTML = '<p>Testų bazėje nerasta.</p>';
        return;
    }

    quizContainer.innerHTML = ''; 
    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'course-item'; 
        // PAKEITIMAS: Siunčiame quiz.id vietoj quiz.title, kad būtų lengviau rasti DB
        card.innerHTML = `
            <div class="course-info">
        <h4>📝 ${quiz.title}</h4>
        <p>${quiz.description || ''}</p>
    </div>
    <button class="btn-primary" onclick="window.location.href='quiz.html?id=${encodeURIComponent(quiz.title)}'">Spręsti</button>
        `;
        quizContainer.appendChild(card);
    });
    console.log("5. Testai sėkmingai sudėti į puslapį.");
}
// 2. Paleidžiame abi funkcijas (temų ir testų)
// Surask savo dabartinį window.onload arba DOMContentLoaded ir papildyk jį:
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('topics-container')) {
        loadTopics();
    }
    if (document.getElementById('quiz-list')) {
        loadQuizzes();
    }
});