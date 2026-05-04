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

// 3. APSAUGA IR DUOMENŲ ATRAZAVIMAS (Skirta dashboard.html)
async function checkUserStatus() {
    // Gauname šiuo metu prisijungusį vartotoją
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    // Jei esame dashboard puslapyje, bet vartotojas neprisijungęs - metam lauk
    if (window.location.pathname.includes("dashboard.html")) {
        if (!user) {
            window.location.href = "login.html";
        } else {
            // Pakeičiame vardą skydelyje į vartotojo el. paštą
            const userNameElem = document.querySelector('.user-name');
            if (userNameElem) {
                userNameElem.innerText = user.email.split('@')[0]; // Paima dalį prieš @
            }
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
async function loadTopics() {
    const topicsContainer = document.getElementById('topics-list');
    if (!topicsContainer) return;

    console.log("Bandoma krauti temas..."); // Diagnostika

    try {
        const { data: topics, error } = await supabaseClient
            .from('topics')
            .select('*');

        if (error) {
            console.error("Supabase klaida:", error.message);
            topicsContainer.innerHTML = `<p style="color:red">Klaida: ${error.message}</p>`;
            return;
        }

        console.log("Gauti duomenys iš DB:", topics); // Diagnostika

        if (!topics || topics.length === 0) {
            topicsContainer.innerHTML = "<p>Lentelė tuščia. Pridėkite eilutę Supabase puslapyje.</p>";
            return;
        }

        topicsContainer.innerHTML = '';
        topics.forEach(topic => {
            const topicCard = document.createElement('div');
            topicCard.className = 'course-item';
            topicCard.innerHTML = `
                <div class="course-info">
                    <h4>${topic.title}</h4>
                    <p>${topic.description}</p>
                </div>
                <button class="btn-primary">Pradėti</button>
            `;
            topicsContainer.appendChild(topicCard);
        });
    } catch (err) {
        console.error("Netikėta klaida:", err);
        topicsContainer.innerHTML = "<p>Sistemos klaida. Žiūrėti Console.</p>";
    }
}

// Funkcija, kurią iškviesime paspaudus "Pradėti" (vėliau sukursime lesson.html)
function openLesson(id) {
    alert("Atidarysime pamoką ID: " + id);
    // window.location.href = `lesson.html?id=${id}`;
}

// Iškviečiame krovimą, kai puslapis užsikrauna
if (window.location.pathname.includes("dashboard.html")) {
    loadTopics();
}