const supabaseUrl = 'https://spuweynlvomzqujwpmld.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwdXdleW5sdm9tenF1andwbWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDQwNDQsImV4cCI6MjA5MzQ4MDA0NH0.pArChw3WCkMw5UZU1vB2POSXbvC6PpcB3SdHTMYUokk'
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=1';

document.addEventListener('DOMContentLoaded', async () => {
    await updateNavigation(); 
    await updateHeaderUserInfo();
    await checkUserStatus();

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.onclick = signInWithGoogle;
    }
});

async function signInWithGoogle() {
    await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { 
            redirectTo: 'https://karolissilaika-arch.github.io/Studiju-bankas/dashboard.html'
        }
    });
}

async function updateHeaderUserInfo() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        let { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Jei profilio nėra — sukuriame su numatytu avataru
        if (!profile) {
            const newProfile = {
                id: user.id,
                username: user.user_metadata?.full_name || user.email.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || DEFAULT_AVATAR,
                total_xp: 0
            };

            const { data: createdProfile } = await supabaseClient
                .from('profiles')
                .insert([newProfile])
                .select()
                .single();
            
            if (createdProfile) profile = createdProfile;
        }

        // Jei profilis yra bet avatar_url tuščias — nustatome numatytąjį
        if (profile && (!profile.avatar_url || profile.avatar_url.trim() === '')) {
            await supabaseClient
                .from('profiles')
                .update({ avatar_url: DEFAULT_AVATAR })
                .eq('id', user.id);
            profile.avatar_url = DEFAULT_AVATAR;
        }

        const finalName = profile?.username || user.user_metadata?.full_name || "Moksleivis";
        const finalAvatar = profile?.avatar_url || DEFAULT_AVATAR;
        const finalXP = profile?.total_xp || 0;

        const headerName = document.getElementById('nav-username') || document.getElementById('header-username');
        const headerAvatar = document.getElementById('nav-avatar') || document.getElementById('header-avatar');
        const headerXP = document.getElementById('header-xp') || document.getElementById('nav-xp');

        if (headerName) headerName.innerText = finalName;
        if (headerAvatar) {
            headerAvatar.src = finalAvatar;
            headerAvatar.onerror = function() { this.src = DEFAULT_AVATAR; };
        }
        if (headerXP) headerXP.innerText = finalXP + " XP";

        const loggedInView = document.getElementById('logged-in-view');
        const loggedOutView = document.getElementById('logged-out-view');
        if (loggedInView) loggedInView.style.display = 'flex';
        if (loggedOutView) loggedOutView.style.display = 'none';

    } catch (err) {
        console.error("Profilio krovimo klaida:", err);
    }
}

async function updateNavigation() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
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
        authSection.innerHTML = `
            <a href="login.html" class="login-link">
                <i class="fas fa-sign-in-alt"></i> Prisijungti
            </a>
        `;
    }

    const currentPath = window.location.pathname.split("/").pop() || 'index.html';
    const navLinks = document.querySelectorAll('#main-nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

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
            // Sukuriame profilį su numatytu avataru iš karto
            await supabaseClient.from('profiles').insert([{
                id: data.user.id,
                username: name,
                total_xp: 0,
                avatar_url: DEFAULT_AVATAR
            }]);
            alert("Registracija sėkminga!");
            window.location.href = "login.html";
        }
    });
}

async function changePassword() {
    const newPassword = document.getElementById('new-password').value;

    if (newPassword.length < 6) {
        alert("Slaptažodis turi būti bent 6 simbolių!");
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
        alert("Klaida: " + error.message);
    } else {
        alert("Slaptažodis sėkmingai pakeistas!");
        document.getElementById('new-password').value = '';
    }
}

async function resetPasswordRequest(event) {
    if (event) event.preventDefault();

    const email = prompt("Įveskite savo el. pašto adresą, kad gautumėte slaptažodžio atkūrimo nuorodą:");
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Prašome įvesti galiojantį el. pašto adresą.");
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
    });

    if (error) {
        alert("Klaida: " + error.message);
    } else {
        alert("Instrukcijos išsiųstos į jūsų el. paštą! Patikrinkite (taip pat ir Spam aplanką).");
    }
}
