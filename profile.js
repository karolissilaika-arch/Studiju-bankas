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

        document.getElementById('profile-name').innerText = profile.username || 'Moksleivis';
        document.getElementById('profile-email').innerText = user.email || '';
        document.getElementById('xp-count').innerText = profile.total_xp || 0;
        document.getElementById('quizzes-count').innerText = profile.quizzes_completed || 0;

        const defaultAvatar = availableAvatars[0].url;
        const currentXP = profile.total_xp || 0;

        const currentAvatar = profile.avatar_url && profile.avatar_url.trim() !== ''
            ? profile.avatar_url
            : defaultAvatar;

        const avatarImg = document.getElementById('user-avatar');
        if (avatarImg) {
            avatarImg.src = currentAvatar;
            avatarImg.onerror = function() {
                this.src = defaultAvatar;
            };
        }

        if (typeof renderGallery === 'function') {
            renderGallery(currentXP, currentAvatar);
        }

        // Premium sekcija
        const premiumSection = document.getElementById('premium-section');
        if (premiumSection) {
            if (profile.is_premium && profile.subscription_cancel_at) {
                // Prenumerata atšaukta, bet dar aktyvi
                const cancelDate = new Date(profile.subscription_cancel_at).toLocaleDateString('lt-LT');
                premiumSection.innerHTML = `
                    <div style="
                        background: #f8f7ff;
                        border: 1px solid #ede9fe;
                        padding: 20px;
                        border-radius: 12px;
                        text-align: center;
                    ">
                        <div style="font-size: 28px; margin-bottom: 10px;">👑</div>
                        <strong style="color: #5d5fef; font-size: 15px;">Premium aktyvus iki ${cancelDate}</strong>
                        <p style="margin: 8px 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                            Prenumerata atšaukta — galite naudotis visomis Premium funkcijomis iki nurodytos datos.
                        </p>
                    </div>
                `;
            } else if (profile.is_premium) {
                // Aktyvi prenumerata
                premiumSection.innerHTML = `
                    <div style="background: linear-gradient(135deg, #5d5fef, #7c3aed); color: white; padding: 16px; border-radius: 12px; text-align: center;">
                        <i class="fas fa-crown" style="margin-right: 8px;"></i>
                        <strong>Premium narys</strong>
                        <p style="margin: 8px 0 12px; opacity: 0.9; font-size: 13px;">
                            Naudojatės nuo ${new Date(profile.premium_since).toLocaleDateString('lt-LT')}
                        </p>
                        <button id="cancel-sub-btn" onclick="cancelSubscription()"
                                style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;">
                            Atšaukti prenumeratą
                        </button>
                    </div>
                `;
            } else {
                // Ne premium
                premiumSection.innerHTML = `
                    <button id="profile-checkout-btn" onclick="startCheckout(this)" style="
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, #5d5fef, #7c3aed);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 700;
                        cursor: pointer;
                        font-size: 15px;
                    ">
                        <i class="fas fa-crown" style="margin-right: 8px;"></i>
                        Gauti Premium — 4.99€/mėn
                    </button>
                `;
            }
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
                ${isLocked
                    ? `<div style="font-size: 9px; color: #666; margin-top: 3px;">🔒 ${avatar.price} XP</div>`
                    : `<div style="font-size: 9px; color: #48bb78; margin-top: 3px;">Atrakinta</div>`
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
        document.getElementById('user-avatar').src = url;
        loadProfile(user);
    }
}