// Paleidžiame vartotojo patikrą kaskart užkrovus bet kurį puslapį
checkUserStatus();
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

 async function loadLessonDetail() {
        // 1. Pasiimame pavadinimą iš adreso juostos (pvz., ?id=Ganjos%20mokslai)
        const urlParams = new URLSearchParams(window.location.search);
        const lessonId = urlParams.get('id'); 

        if (!lessonId) {
            document.getElementById('lesson-title').innerText = "Pamoka nerasta";
            return;
        }

        // 2. Traukiame duomenis naudodami 'title', nes tavo DB tai yra Primary Key
        const { data: topic, error } = await supabaseClient
            .from('topics')
            .select('*')
            .eq('title', lessonId) // Ieškome sutapimo 'title' stulpelyje
            .single();

        if (error || !topic) {
            console.error("Supabase klaida:", error);
            document.getElementById('lesson-title').innerText = "Klaida užkraunant turinį";
            document.getElementById('lesson-content').innerHTML = "<p>Nepavyko rasti pamokos duomenų bazėje.</p>";
            return;
        }

        // 3. Atvaizduojame gautą informaciją
        document.title = `${topic.title} | MokykisPro`; // Pakeičia naršyklės tab'o pavadinimą
        document.getElementById('lesson-title').innerText = topic.title;
        document.getElementById('lesson-content').innerHTML = topic.content;
    }

    // Paleidžiame funkciją, kai puslapis užsikrauna
    window.onload = loadLessonDetail;