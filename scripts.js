// 1. KONFIGŪRACIJA
// Pakeisk šias reikšmes savo duomenimis iš Supabase Settings -> API
const SUPABASE_URL = 'https://spuweynlvomzqujwpmld.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aFw6NSq9T-7uYPB3scpskA_lMO7oK7x';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. PRISIJUNGIMO LOGIKA (Skirta login.html)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Bandome prisijungti
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert("Klaida: " + error.message);
        } else {
            console.log("Prisijungta sėkmingai:", data);
            window.location.href = "dashboard.html";
        }
    });
}

async function checkUserStatus() {
    // 1. Gauname vartotoją
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    const adminEmail = "kekse@gmail.com".toLowerCase(); // ĮRAŠYK SAVO PAŠTĄ

    // 2. Tikriname, ar esame ADMIN puslapyje pagal formos egzistavimą
    const isAdminPage = document.getElementById('topicForm') !== null;
    
    // 3. Tikriname, ar esame DASHBOARD puslapyje pagal temų sąrašo egzistavimą
    const isDashboardPage = document.getElementById('topics-list') !== null;

    // --- LOGIKA ---

    // A. Jei vartotojas bando būti ADMIN puslapyje
    if (isAdminPage) {
        if (!user || user.email.toLowerCase() !== adminEmail) {
            alert("STOP! Prieiga tik administratoriui.");
            window.location.replace("login.html"); // .replace geriau nei .href, nes neleidžia grįžti atgal
            return;
        }
        console.log("Sveikas, Adminai!");
    }

    // B. Jei vartotojas bando būti DASHBOARD puslapyje, bet nėra prisijungęs
    if (isDashboardPage && !user) {
        window.location.replace("login.html");
        return;
    }

    // C. Jei vartotojas prisijungęs, užpildome vardą (jei yra elementas)
    if (user) {
        const userNameElem = document.querySelector('.user-name');
        if (userNameElem) {
            userNameElem.innerText = user.email.split('@')[0];
        }
    }
}


// 4. ATSIJUNGIMAS
const logoutBtn = document.querySelector('.logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabaseClient.auth.signOut();
        if (!error) {
            window.location.href = "index.html";
        } else {
            alert("Klaida atsijungiant: " + error.message);
        }
    });
}

// Paleidžiame vartotojo patikrą kaskart užkrovus bet kurį puslapį
checkUserStatus();
// REGISTRACIJOS VALDYMAS
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        // 1. Registruojame vartotoją Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    display_name: name, // Išsaugome papildomą info
                }
            }
        });

        if (error) {
            alert("Registracijos klaida: " + error.message);
        } else {
            alert("Registracija sėkminga! Patikrinkite el. paštą patvirtinimo nuorodai (jei įjungta Supabase nustatymuose).");
            window.location.href = "login.html";
        }
    });
}
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

// --- ADMIN: NAUJOS TEMOS ĮKĖLIMAS ---
// 1. Saugi deklaracija: kintamąjį aprašome viršuje
let topicForm = document.getElementById('topicForm');
let editingTitle = null; 

// 2. Tikriname, ar forma išvis egzistuoja šiame puslapyje
if (topicForm) {
    topicForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = document.getElementById('topicTitle');
        const desc = document.getElementById('topicDesc').value;
        const content = document.getElementById('topicContent').value;
        const title = titleInput.value;
        
        const isUpdate = editingTitle !== null;

        let result;
        if (isUpdate) {
            // Atnaujinimas (UPDATE)
            result = await supabaseClient
                .from('topics')
                .update({ 
                    description: desc, 
                    content: content 
                })
                .eq('title', editingTitle);
        } else {
            // Kūrimas (INSERT)
            result = await supabaseClient
                .from('topics')
                .insert([{ title, description: desc, content }]);
        }

        if (result.error) {
            alert("Klaida: " + result.error.message);
        } else {
            alert(isUpdate ? "Atnaujinta sėkmingai!" : "Tema sukurta!");
            
            // Atstatome formą į pradinę būseną
            topicForm.reset();
            editingTitle = null; 
            
            const submitBtn = topicForm.querySelector('button');
            if (submitBtn) submitBtn.innerText = "Skelbti temą";
            
            if (titleInput) titleInput.disabled = false;
            
            // Atnaujiname sąrašą, jei tokia funkcija yra tame puslapyje
            if (typeof loadAdminTopics === "function") {
                loadAdminTopics();
            }
        }
    });
}
// Kai paspaudi "Redaguoti", nepamiršk nustatyti editingTitle
async function editTopic(title) {
    const { data: topic, error } = await supabaseClient
        .from('topics')
        .select('*')
        .eq('title', title)
        .single();

    if (topic) {
        document.getElementById('topicTitle').value = topic.title;
        document.getElementById('topicDesc').value = topic.description;
        document.getElementById('topicContent').value = topic.content;
        
        editingTitle = topic.title; // Įsimename pavadinimą redagavimui
        document.querySelector('#topicForm button').innerText = "Atnaujinti temą";
        document.getElementById('topicTitle').disabled = true;
    }
}
async function loadAdminTopics() {
    const container = document.getElementById('admin-topics-list');
    if (!container) return;

    const { data: topics, error } = await supabaseClient.from('topics').select('*');

    if (error) {
        container.innerHTML = "Klaida: " + error.message;
        return;
    }

    container.innerHTML = '';
    topics.forEach(topic => {
        const div = document.createElement('div');
        div.style = "border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
        div.innerHTML = `
            <div>
                <strong>${topic.title}</strong>
            </div>
            <div>
                <button onclick="editTopic('${topic.title.replace(/'/g, "\\'")}')" style="background: orange; color: white;">Redaguoti</button>
                <button onclick="deleteTopic('${topic.title.replace(/'/g, "\\'")}')" style="background: red; color: white;">Trinti</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Iškviečiame krovimą, jei esame admin puslapyje
if (document.getElementById('admin-topics-list')) {
    loadAdminTopics();
}
async function deleteTopic(title) {
    if (!confirm(`Ar tikrai norite ištrinti temą: ${title}?`)) return;

    const { error } = await supabaseClient
        .from('topics')
        .delete()
        .eq('title', title);

    if (error) {
        alert("Nepavyko ištrinti: " + error.message);
    } else {
        alert("Ištrinta sėkmingai!");
        loadAdminTopics(); // Atnaujiname sąrašą
    }
}
//TESTU LOGIKA
// Funkcija, kuri prideda naują klausimo bloką į formą
function addQuestion() {
    const container = document.getElementById('questions-container');
    
    // Sukuriame naują klausimo bloką, kuris atrodo kaip dashboard kortelė
    const qBlock = document.createElement('div');
    qBlock.className = 'course-item question-block'; 
    qBlock.style.display = 'block'; 
    qBlock.style.marginTop = '15px';

    qBlock.innerHTML = `
        <div class="input-group">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Klausimas</label>
            <input type="text" class="q-text" placeholder="Įrašykite klausimą" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Atsakymai (atskirti kableliais)</label>
            <input type="text" class="q-options" placeholder="pvz: 2, 4, 5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Teisingo atsakymo numeris (nuo 0)</label>
            <input type="number" class="q-correct" placeholder="0" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="btn-outline" style="margin-top:10px; color:red; border-color:red;">Pašalinti</button>
    `;
    
    container.appendChild(qBlock);
}

/// 1. Tik deklaruojame kintamąjį (neimame .value iškart!)
// --- ADMINO FUNKCIJOS ---

// 1. Funkcija, kuri prideda naują klausimo bloką į formą
function addQuestion() {
    const container = document.getElementById('questions-container');
    if (!container) return; // Saugiklis: jei konteinerio nėra, nieko nedarom

    const qBlock = document.createElement('div');
    qBlock.className = 'course-item question-block'; 
    qBlock.style.display = 'block'; 
    qBlock.style.marginTop = '15px';

    qBlock.innerHTML = `
        <div class="input-group">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Klausimas</label>
            <input type="text" class="q-text" placeholder="Įrašykite klausimą" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Atsakymai (atskirti kableliais)</label>
            <input type="text" class="q-options" placeholder="pvz: 2, 4, 5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Teisingo atsakymo numeris (nuo 0)</label>
            <input type="number" class="q-correct" placeholder="0" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="btn-outline" style="margin-top:10px; color:red; border-color:red;">Pašalinti</button>
    `;
    
    container.appendChild(qBlock);
}

// 2. Formos pateikimo klausytojas (Save/Insert logika)
document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quizForm');
    
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const titleEl = document.getElementById('quizTitle');
            const descEl = document.getElementById('quizDesc');
            const qContainer = document.getElementById('questions-container');

            // Jei nerandame pagrindinių laukų - stabdome
            if (!titleEl || !descEl) {
                console.error("Klaida: Nerasti formos laukai (quizTitle/quizDesc)!");
                return;
            }

            const title = titleEl.value;
            const desc = descEl.value;
            const questionBlocks = document.querySelectorAll('.question-block');
            const questionsArray = [];

            questionBlocks.forEach(block => {
                const qInput = block.querySelector('.q-text');
                const oInput = block.querySelector('.q-options');
                const cInput = block.querySelector('.q-correct');

                if (qInput && oInput && cInput) {
                    const q = qInput.value;
                    const options = oInput.value.split(',').map(s => s.trim());
                    const correct = parseInt(cInput.value) || 0;

                    if (q && options.length > 0) {
                        questionsArray.push({ q, a: options, c: correct });
                    }
                }
            });

            // Siuntimas į DB (Naudojame UPSERT, kad atnaujintų esamą arba sukurtų naują)
            const { error } = await supabaseClient
                .from('quizzes')
                .upsert([{ 
                    title: title, 
                    description: desc, 
                    questions: questionsArray 
                }], { onConflict: 'title' });

            if (error) {
                alert("Klaida saugant: " + error.message);
            } else {
                alert("Testas sėkmingai išsaugotas!");
                window.location.reload(); // Perkraunam, kad matytųsi pokyčiai
            }
        });
    }
})
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

// Paleidžiame saugumo patikrą (kurią aptarėme anksčiau)
checkUserStatus();