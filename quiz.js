<<<<<<< HEAD
// --- BENDRA BŪSENA ---
let currentQuizQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    // Patikriname, ar esame testo sprendimo puslapyje (ar egzistuoja klausimų konteineris)
    if (document.getElementById('quiz-questions')) {
        // Duodame šiek tiek laiko užsikrauti scripts.js (Supabase inicializacijai)
        setTimeout(() => loadActiveQuiz(), 300);
    }
});

// --- 1. TESTO UŽKROVIMAS ---
async function loadActiveQuiz() {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('id');
    const questionsDiv = document.getElementById('quiz-questions');
    const titleDisplay = document.getElementById('active-quiz-title');
    
    if (!title) {
        alert("Nenurodytas testo pavadinimas!");
        window.location.href = 'quizzes.html';
        return;
    }

    if (questionsDiv) questionsDiv.innerHTML = "<p>Kraunamas testas...</p>";

    try {
        // Traukiame testo duomenis iš Supabase pagal pavadinimą
        const { data: quiz, error } = await supabaseClient
            .from('quizzes')
            .select('*')
            .eq('title', title)
            .maybeSingle();

        if (error) throw error;

        if (!quiz) {
            questionsDiv.innerHTML = `<p style="color: red;">Klaida: Testas "${title}" nerastas.</p>`;
            return;
        }

        // Išsaugome klausimus į globalų kintamąjį
        currentQuizQuestions = quiz.questions;
        
        // Atvaizduojame pavadinimą
        if (titleDisplay) titleDisplay.innerText = quiz.title;
        
        // Generuojame klausimų HTML
        questionsDiv.innerHTML = currentQuizQuestions.map((q, index) => `
            <div class="course-item question-block" style="display: block; margin-bottom: 25px; padding: 20px; border: 1px solid #eee; border-radius: 15px; background: white;">
                <h4 style="margin-bottom: 15px; color: #333;">${index + 1}. ${q.q}</h4>
                <div class="options-group">
                    ${q.a.map((option, optIndex) => `
                        <label style="display: flex; align-items: center; margin: 10px 0; cursor: pointer; padding: 12px; border: 1px solid #f0f0f0; border-radius: 10px; transition: 0.2s;" class="option-label">
                            <input type="radio" name="q${index}" value="${optIndex}" style="margin-right: 15px; transform: scale(1.2);">
                            <span>${option}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Prijungiame pateikimo mygtuko funkciją
        const submitBtn = document.getElementById('submit-quiz-btn');
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.onclick = calculateResults;
        }

    } catch (err) {
        console.error("Klaida užkraunant testą:", err.message);
        if (questionsDiv) questionsDiv.innerHTML = "<p>Sistemos klaida kraunant testą.</p>";
    }
}

// --- 2. REZULTATŲ SKAIČIAVIMAS ---
async function calculateResults() {
    let score = 0;
    let answeredCount = 0;

    currentQuizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected) {
            answeredCount++;
            if (parseInt(selected.value) === q.c) {
                score++;
            }
        }
    });

    // Patikriname, ar atsakyta į visus klausimus
    if (answeredCount < currentQuizQuestions.length) {
        if (!confirm("Atsakėte ne į visus klausimus. Ar tikrai norite baigti?")) return;
    }

    // Paslepiame pateikimo mygtuką
    const submitBtn = document.getElementById('submit-quiz-btn');
    if (submitBtn) submitBtn.style.display = 'none';

    // Parodome rezultatą ekrane
    showResultUI(score, currentQuizQuestions.length);

    // --- IŠSAUGOME XP Į DUOMENŲ BAZĘ ---
    await saveXP(score);
}

// --- 3. REZULTATŲ ATVAZDAVIMAS (UI) ---
function showResultUI(score, total) {
    const resultDiv = document.getElementById('quiz-result');
    if (!resultDiv) return;

    const percentage = Math.round((score / total) * 100);
    const pointsEarned = score * 10; // 10 XP už kiekvieną teisingą

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="padding: 30px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; margin-top: 20px;">
            <h2 style="color: #5d5fef; margin-bottom: 10px;">Testas baigtas!</h2>
            <p style="font-size: 1.5rem; margin-bottom: 5px;">Tavo rezultatas: <strong>${score} / ${total}</strong></p>
            <p style="font-size: 1.1rem; color: #666;">Sėkmės procentas: ${percentage}%</p>
            <div style="margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 10px; border: 1px dashed #5d5fef;">
                <p style="margin: 0; font-weight: bold; color: #5d5fef;">✨ Uždirbai: +${pointsEarned} XP taškų!</p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.location.href='quizzes.html'" class="btn-outline">Grįžti į sąrašą</button>
                <button onclick="window.location.href='profile.html'" class="btn-primary">Žiūrėti profilį</button>
            </div>
        </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 4. XP ĮRAŠYMAS Į DUOMENŲ BAZĘ ---
async function saveXP(score) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            console.warn("Vartotojas neprisijungęs, XP nebus išsaugotas.");
            return;
        }

        // 1. Gauname esamą profilį
        const { data: profile, error: fetchError } = await supabaseClient
            .from('profiles')
            .select('total_xp, quizzes_completed')
            .eq('id', user.id)
            .single();

        if (fetchError) throw fetchError;

        // 2. Apskaičiuojame naujas reikšmes
        const pointsToAdd = score * 10;
        const newXP = (profile.total_xp || 0) + pointsToAdd;
        const newCount = (profile.quizzes_completed || 0) + 1;

        // 3. Atnaujiname profilio lentelę
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ 
                total_xp: newXP, 
                quizzes_completed: newCount 
            })
            .eq('id', user.id);

        if (updateError) throw updateError;
        
        console.log(`Sėkmingai pridėta ${pointsToAdd} XP. Viso: ${newXP} XP.`);

    } catch (err) {
        console.error("Klaida saugant XP:", err.message);
    }
}
=======
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
>>>>>>> 931a4b5c8c01a3b79707f71745ffba8ffd640e8a
