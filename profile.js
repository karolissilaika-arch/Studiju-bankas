// 1. Apibrėžiame galimus avatarus ir jų kainas
const availableAvatars = [
    { id: '1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=1', price: 0 },
    { id: '2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=2', price: 50 },
    { id: '3', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=3', price: 150 },
    { id: '4', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=4', price: 300 },
    { id: '5', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix', price: 500 },
    { id: '6', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka', price: 800 },
    { id: '7', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Milo', price: 1200 },
    { id: '8', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Toby', price: 2000 }
];

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    loadProfile(user);
});

async function loadProfile(user) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            console.error("Nepavyko užkrauti profilio:", error);
            return;
        }

        // 1. Užpildome tekstinę informaciją
        document.getElementById('profile-name').innerText = profile.username || 'Moksleivis';
        document.getElementById('profile-email').innerText = user.email || '';
        document.getElementById('xp-count').innerText = profile.total_xp || 0;
        document.getElementById('quizzes-count').innerText = profile.quizzes_completed || 0;
        
        // 2. Saugus avataro nustatymas
        const defaultAvatar = availableAvatars[0].url; // Pirmas robotukas iš tavo sąrašo
        const currentXP = profile.total_xp || 0;
        
        // Prioritetas: DB reikšmė -> Jei nėra, default reikšmė
        const currentAvatar = profile.avatar_url && profile.avatar_url.trim() !== "" 
            ? profile.avatar_url 
            : defaultAvatar;
        
        const avatarImg = document.getElementById('user-avatar');
        if (avatarImg) {
            avatarImg.src = currentAvatar;
            
            // APSAUGA: Jei paveikslėlis vis tiek nesikrauna (pvz. blogas URL DB), grąžiname default
            avatarImg.onerror = function() {
                this.src = defaultAvatar;
                console.warn("DB esantis avatar_url neveikia, panaudotas standartinis.");
            };
        }

        // 3. Generuojame galeriją
        if (typeof renderGallery === 'function') {
            renderGallery(currentXP, currentAvatar);
        }

    } catch (err) {
        console.error("Kritinė klaida loadProfile funkcijoje:", err);
    }
}
function renderGallery(xp, currentUrl) {
    const gallery = document.getElementById('avatar-gallery');
    if (!gallery) return;

    gallery.innerHTML = availableAvatars.map(avatar => {
        const isLocked = xp < avatar.price;
        const isActive = currentUrl === avatar.url;
        
        return `
            <div onclick="${isLocked ? '' : `selectAvatar('${avatar.url}')`}" 
                 style="cursor: ${isLocked ? 'not-allowed' : 'pointer'}; 
                        position: relative; 
                        padding: 5px; 
                        border-radius: 12px; 
                        transition: 0.2s;
                        border: 2px solid ${isActive ? '#5d5fef' : 'transparent'};
                        background: ${isActive ? '#f0f0ff' : 'transparent'};
                        opacity: ${isLocked ? '0.4' : '1'};">
                
                <img src="${avatar.url}" style="width: 100%; border-radius: 10px; background: #eee;">
                
                ${isLocked ? 
                    `<div style="font-size: 9px; color: #666; margin-top: 3px;">🔒 ${avatar.price} XP</div>` : 
                    `<div style="font-size: 9px; color: #48bb78; margin-top: 3px;">Atrakinta</div>`
                }
            </div>
        `;
    }).join('');
}

async function selectAvatar(url) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { error } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

    if (error) {
        alert("Klaida keičiant avatarą.");
    } else {
        // Atnaujiname nuotrauką viršuje ir perbraižome galeriją
        document.getElementById('user-avatar').src = url;
        // Perkaitome duomenis, kad atsinaujintų rėmeliai galerijoje
        loadProfile(user);
    }
}
// profile.js viduje
const xp = profile.total_xp || 0;
const level = Math.floor(xp / 100) + 1; // Kas 100 taškų naujas lygis
document.getElementById('profile-level-display').innerText = `Lygis: ${level}`;