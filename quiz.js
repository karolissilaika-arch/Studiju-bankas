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

let currentQuestions = [];

    // Pagrindinė krovimo funkcija
    async function loadQuiz() {
        const params = new URLSearchParams(window.location.search);
        const identifier = params.get('id');
        const container = document.getElementById('quiz-container');

        if (!identifier) {
            console.error("URL trūksta testo ID!");
            if (container) container.innerHTML = '<p style="color: red;">Klaida: Nepasirinktas joks testas.</p>';
            return;
        }

        try {
            console.log("Bandoma krauti testą:", identifier);
            
            // Užklausa į Supabase (pagal title)
            const { data: quiz, error } = await supabaseClient
                .from('quizzes')
                .select('*')
                .eq('title', identifier)
                .maybeSingle();

            if (error) throw error;

            if (!quiz) {
                container.innerHTML = `<p style="color: red;">Nepavyko rasti testo pavadinimu: "${identifier}"</p>`;
                return;
            }

            // Duomenų priskyrimas
            currentQuestions = quiz.questions;
            document.getElementById('quiz-title').innerText = quiz.title;
            document.getElementById('quiz-status').innerText = `Klausimų kiekis: ${currentQuestions.length}`;
            
            container.innerHTML = ''; // Išvalome "Kraunama..."

            // Klausimų generavimas
            currentQuestions.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'course-item';
                div.style.display = 'block';
                div.style.marginBottom = '20px';
                
                const options = item.a.map((opt, i) => `
                    <label style="display: block; padding: 12px; border: 1px solid #eee; border-radius: 10px; margin-top: 8px; cursor: pointer;">
                        <input type="radio" name="question${index}" value="${i}" style="margin-right: 10px;">
                        <span>${opt}</span>
                    </label>
                `).join('');

                div.innerHTML = `
                    <h4 style="margin-bottom: 10px;">${index + 1}. ${item.q}</h4>
                    <div class="options-group">${options}</div>
                `;
                container.appendChild(div);
            });

            console.log("Testas sėkmingai užkrautas.");

        } catch (err) {
            console.error("Krovimo klaida:", err);
            if (container) container.innerHTML = '<p style="color: red;">Sistemos klaida jungiantis prie duomenų bazės. Patikrinkite interneto ryšį.</p>';
        }
    }

    // SAUGUS PALEIDIMAS (Tik vieną kartą)
    document.addEventListener('DOMContentLoaded', () => {
        // Maža pauzė užtikrinti, kad scripts.js (Supabase) jau užsikrovė
        setTimeout(() => {
            if (typeof supabaseClient !== 'undefined') {
                loadQuiz();
            } else {
                console.error("Klaida: Nerastas supabaseClient! Patikrinkite ar scripts.js įkeltas.");
            }
        }, 500);
    });

    // ATSAKYMŲ PATEIKIMAS
    document.getElementById('submit-quiz').addEventListener('click', (e) => {
        e.preventDefault();
        
        let score = 0;
        let answered = 0;

        currentQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="question${index}"]:checked`);
            if (selected) {
                answered++;
                if (parseInt(selected.value) === q.c) {
                    score++;
                }
            }
        });

        if (answered < currentQuestions.length) {
            if (!confirm("Atsakėte ne į visus klausimus. Ar tikrai norite baigti?")) return;
        }

        const resultDiv = document.getElementById('quiz-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `Jūsų rezultatas: ${score} iš ${currentQuestions.length}`;
        
        document.getElementById('submit-quiz').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });