const supabaseUrl = 'https://spuweynlvomzqujwpmld.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwdXdleW5sdm9tenF1andwbWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDQwNDQsImV4cCI6MjA5MzQ4MDA0NH0.pArChw3WCkMw5UZU1vB2POSXbvC6PpcB3SdHTMYUokk'
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Paleidžiam viską
    await updateNavigation(); 
    await updateHeaderUserInfo();
    await checkUserStatus();

    // 2. Google mygtuko pririšimas
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.onclick = signInWithGoogle;
    }
});

async function signInWithGoogle() {
    await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
}

async function updateHeaderUserInfo() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // 1. Bandom gauti profilį (įtraukiame total_xp)
        let { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // 2. JEI ĮRAŠO NĖRA (Google login atvejis) - sukuriame jį automatiškai
        if (!profile && user.app_metadata.provider === 'google') {
            const newProfile = {
                id: user.id,
                username: user.user_metadata.full_name || user.email.split('@')[0],
                avatar_url: user.user_metadata.avatar_url,
                total_xp: 0
            };

            const { data: createdProfile, error: insertError } = await supabaseClient
                .from('profiles')
                .insert([newProfile])
                .select()
                .single();
            
            if (!insertError) profile = createdProfile;
        }

        // 3. Duomenų paruošimas
        const finalName = profile?.username || user.user_metadata.full_name || "Moksleivis";
        const finalAvatar = profile?.avatar_url || user.user_metadata.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=1';
        const finalXP = profile?.total_xp || 0; // Gauname XP iš profilio

        // 4. Atvaizdavimas elementuose
        const headerName = document.getElementById('nav-username') || document.getElementById('header-username');
        const headerAvatar = document.getElementById('nav-avatar') || document.getElementById('header-avatar');
        const headerXP = document.getElementById('header-xp') || document.getElementById('nav-xp');

        if (headerName) headerName.innerText = finalName;
        if (headerAvatar) headerAvatar.src = finalAvatar;
        
        // ŠI DALIS SUTVARKO TAVO PROBLEMĄ:
        if (headerXP) {
            headerXP.innerText = finalXP + " XP";
        }

        // Rodom prisijungusio vaizdą
        const loggedInView = document.getElementById('logged-in-view');
        const loggedOutView = document.getElementById('logged-out-view');
        if (loggedInView) loggedInView.style.display = 'flex';
        if (loggedOutView) loggedOutView.style.display = 'none';

    } catch (err) {
        console.error("Profilio krovimo klaida:", err);
    }
}

// LIKUSIOS FUNKCIJOS (updateNavigation, checkUserStatus, formos) lieka kaip buvusios...
// Tiesiog įsitikink, kad jos naudoja 'supabaseClient' pavadinimą.
async function updateNavigation() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    // Patikriname sesiją
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        // Jei prisijungęs - rodome "Atsijungti"
        authSection.innerHTML = `
            <a href="#" id="logout-btn-global" style="color: #e74c3c;">
                <i class="fas fa-sign-out-alt"></i> Atsijungti
            </a>
        `;
        
        document.getElementById('logout-btn-global')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        // Jei neprisijungęs - rodome "Prisijungti"
        authSection.innerHTML = `
            <a href="login.html" class="login-link">
                <i class="fas fa-sign-in-alt"></i> Prisijungti
            </a>
        `;
    }

    // PARYŠKINIMAS (Aktyvus langas)
    const currentPath = window.location.pathname.split("/").pop() || 'index.html';
    const navLinks = document.querySelectorAll('#main-nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}
// 5. SAUGUMO PATIKRA (Admin ir Dashboard apsauga)
async function checkUserStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const adminEmail = "kekse@gmail.com".toLowerCase();
    
    const isAdminPage = !!document.getElementById('topicForm');
    const isDashboardPage = window.location.pathname.includes('dashboard.html');

    if (isAdminPage && (!user || user.email.toLowerCase() !== adminEmail)) {
        window.location.replace("login.html");
    }

    if (isDashboardPage && !user) {
        window.location.replace("login.html");
    }
}

// 6. FORMŲ VALDYMAS (Login / Register)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("Klaida: " + error.message);
        else window.location.href = "dashboard.html";
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const { data, error } = await supabaseClient.auth.signUp({ email, password });

        if (error) {
            alert("Registracijos klaida: " + error.message);
        } else if (data.user) {
            await supabaseClient.from('profiles').insert([
                { id: data.user.id, username: name, total_xp: 0 }
            ]);
            alert("Registracija sėkminga!");
            window.location.href = "login.html";
        }
    });
}
async function checkAuthStatus() {
    // Tikriname ar elementai egzistuoja (kad nemestų klaidų kituose puslapiuose)
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    
    if (!loggedOutView || !loggedInView) return;

    // 1. Gauname sesiją iš Supabase
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        // Vartotojas PRISIJUNGĘS
        loggedOutView.style.display = 'none';
        loggedInView.style.display = 'flex';

        // 2. Traukiame username ir avatarą iš 'profiles' lentelės
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('nav-username').innerText = profile.username;
            if (profile.avatar_url) {
                document.getElementById('nav-avatar').src = profile.avatar_url;
            }
        }
    } else {
        // Vartotojas NEPRISIJUNGĘS
        loggedOutView.style.display = 'flex';
        loggedInView.style.display = 'none';
    }
}
async function changePassword() {
    const newPassword = document.getElementById('new-password').value;

    if (newPassword.length < 6) {
        alert("Slaptažodis turi būti bent 6 simbolių!");
        return;
    }

    const { data, error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        alert("Klaida: " + error.message);
    } else {
        alert("Slaptažodis sėkmingai pakeistas!");
        document.getElementById('new-password').value = '';
    }
}
async function resetPasswordRequest(event) {
    if (event) event.preventDefault(); // Neleidžia puslapiui persikrauti

    const email = prompt("Įveskite savo el. pašto adresą, kad gautumėte slaptažodžio atkūrimo nuorodą:");
    
    if (!email) return;

    // Tikriname, ar el. paštas panašus į tikrą
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Prašome įvesti galiojantį el. pašto adresą.");
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        // Čia nurodyk puslapį, į kurį vartotojas grįš paspaudęs nuorodą pašte
        redirectTo: window.location.origin + '/reset-password.html',
    });

    if (error) {
        alert("Klaida: " + error.message);
    } else {
        alert("Instrukcijos išsiųstos į jūsų el. paštą! Patikrinkite (taip pat ir Spam aplanką).");
    }
}


