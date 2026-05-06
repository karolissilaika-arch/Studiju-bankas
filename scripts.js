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
