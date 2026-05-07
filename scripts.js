// 1. KONFIGŪRACIJA
const SUPABASE_URL = 'https://spuweynlvomzqujwpmld.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aFw6NSq9T-7uYPB3scpskA_lMO7oK7x';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. PAGRINDINIS UŽKROVIMAS
document.addEventListener('DOMContentLoaded', () => {
    // Vykdome funkcijas, kurios sutvarko UI
    updateNavigation(); 
    updateHeaderUserInfo();
    checkUserStatus();

    // Jei esame login ar register puslapiuose, formų klausymas jau aktyvuotas žemiau
});

// 3. NAVIGACIJOS IR AUTORIZACIJOS RODYMAS (Atsijungti mygtukas)
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

// 4. VARTOTOJO INFO (Vardas, XP, Avataras)
async function updateHeaderUserInfo() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const headerName = document.getElementById('header-username');
        const headerAvatar = document.getElementById('header-avatar');
        const headerXP = document.getElementById('header-xp');

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('username, avatar_url, total_xp')
            .eq('id', user.id)
            .single();

        if (profile) {
            if (headerName) headerName.innerText = profile.username || "Moksleivis";
            if (headerXP) headerXP.innerText = `${profile.total_xp || 0} XP`;
            if (headerAvatar && profile.avatar_url) headerAvatar.src = profile.avatar_url;
        }
    } catch (err) {
        console.error("Klaida atnaujinant header'į:", err);
    }
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