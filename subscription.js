// ============================================================
// subscription.js — Premium apsauga ir valdymas
// ============================================================

window.userIsPremium = false;

document.addEventListener('DOMContentLoaded', async () => {
    await initPremiumStatus();
    applyPremiumFeatures();
    showPremiumSuccessIfRedirected();
});

// --- 1. UŽKRAUNAME PREMIUM STATUSĄ ---
async function initPremiumStatus() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .single();

        window.userIsPremium = profile?.is_premium === true;
    } catch (err) {
        console.warn("Premium patikra nepavyko:", err);
    }
}

// --- 2. TAIKOME PREMIUM FUNKCIJAS PAGAL STATUSĄ ---
function applyPremiumFeatures() {
    const page = window.location.pathname.split('/').pop();

    if (window.userIsPremium) {
        document.querySelectorAll('.dash-ad, .ad-banner, [data-ad]').forEach(el => {
            el.style.display = 'none';
        });
    }

    if (page === 'analytics.html' && !window.userIsPremium) {
        blockPage(
            'Analitika — tik Premium',
            'Stebėk savo pažangą, silpnas vietas ir XP augimą su detaliais grafikai.',
            'analytics'
        );
    }
}

// --- 3. BLOKUOJAME PUSLAPĮ (ne premium vartotojams) ---
function blockPage(title, description, feature) {
    const main = document.querySelector('.dashboard-main');
    if (!main) return;

    const header = main.querySelector('header');
    const headerHTML = header ? header.outerHTML : '';

    main.innerHTML = `
        ${headerHTML}
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            padding: 40px 20px;
        ">
            <div style="
                background: white;
                border-radius: 24px;
                padding: 50px 40px;
                max-width: 480px;
                box-shadow: 0 10px 40px rgba(93,95,239,0.12);
                border: 1px solid #ede9fe;
            ">
                <div style="
                    width: 72px; height: 72px;
                    background: linear-gradient(135deg, #5d5fef, #7c3aed);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 28px; color: white;
                ">
                    <i class="fas fa-crown"></i>
                </div>

                <h2 style="margin: 0 0 12px; color: #1f2937; font-size: 1.6rem;">${title}</h2>
                <p style="color: #6b7280; margin-bottom: 30px; line-height: 1.6;">${description}</p>

                <div style="background: #f8f7ff; border-radius: 14px; padding: 20px; margin-bottom: 28px; text-align: left;">
                    <p style="font-weight: 700; margin: 0 0 12px; color: #5d5fef;">Premium apima:</p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${[
                            '📊 Pilna analitika ir pažangos grafikai',
                            '🤖 Neribota AI mokytojo pagalba',
                            '🚫 Jokių reklamų',
                        ].map(item => `
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #374151;">
                                ${item}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <span style="font-size: 2rem; font-weight: 800; color: #5d5fef;">5€</span>
                    <span style="color: #9ca3af; font-size: 14px;"> / mėnesį</span>
                </div>

                <button id="checkout-btn-block" onclick="startCheckout(this)" style="
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #5d5fef, #7c3aed);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    margin-bottom: 12px;
                " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(93,95,239,0.35)'"
                   onmouseout="this.style.transform='';this.style.boxShadow=''">
                    <i class="fas fa-crown" style="margin-right: 8px;"></i>
                    Gauti Premium — 5€/mėn
                </button>

                <a href="dashboard.html" style="color: #9ca3af; font-size: 13px; text-decoration: none;">
                    Grįžti į pradžią
                </a>
            </div>
        </div>
    `;
}

// --- 4. STRIPE CHECKOUT PALEIDIMAS ---
async function startCheckout(btnElement) {
    const btn = btnElement instanceof Element
        ? btnElement
        : document.getElementById('profile-checkout-btn') || null;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Kraunama...';
    }

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error("Supabase klientas nepasiekiamas.");
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        if (typeof supabaseUrl === 'undefined' || typeof supabaseKey === 'undefined') {
            throw new Error("supabaseUrl arba supabaseKey neapibrėžti.");
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': supabaseKey,
            },
            body: JSON.stringify({ origin: 'https://studijubankas.lt' }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Serverio klaida (${res.status}): ${errorText}`);
        }

        const data = await res.json();

        if (data.url) {
            window.location.href = data.url;
        } else if (data.error === 'ALREADY_PREMIUM') {
            alert('Jūs jau turite Premium! Perkraukite puslapį.');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-crown" style="margin-right:8px;"></i>Gauti Premium — 5€/mėn';
            }
        } else {
            throw new Error(data.error || 'Nežinoma klaida iš serverio');
        }

    } catch (err) {
        console.error("Checkout klaida:", err.message);
        alert("Klaida kuriant mokėjimą: " + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-crown" style="margin-right:8px;"></i>Gauti Premium — 5€/mėn';
        }
    }
}

// --- 5. ATŠAUKIMO FUNKCIJA ---
async function cancelSubscription() {
    if (!confirm("Ar tikrai norite atšaukti Premium prenumeratą?\n\nGalėsite naudotis Premium iki šio mėnesio pabaigos.")) return;

    const btn = document.getElementById('cancel-sub-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Atšaukiama...'; }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        const res = await fetch(`${supabaseUrl}/functions/v1/cancel-subsciption`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();

        if (data.success) {
            // Nuskaitome premium_expires datą iš Supabase
            const { data: { user } } = await supabaseClient.auth.getUser();
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('premium_expires')
                .eq('id', user.id)
                .single();

            const cancelDate = profile?.premium_expires
                ? new Date(profile.premium_expires).toLocaleDateString('lt-LT')
                : 'mėnesio pabaigoje';

            const premiumSection = document.getElementById('premium-section');
            if (premiumSection) {
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
            }
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        alert("Klaida: " + err.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Atšaukti prenumeratą'; }
    }
}

// --- 6. SĖKMINGO MOKĖJIMO PRANEŠIMAS ---
function showPremiumSuccessIfRedirected() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('premium') === 'success') {
        window.history.replaceState({}, '', window.location.pathname);

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #5d5fef, #7c3aed);
            color: white; padding: 16px 28px; border-radius: 14px;
            box-shadow: 0 8px 30px rgba(93,95,239,0.4);
            font-weight: 700; font-size: 15px; z-index: 99999;
            display: flex; align-items: center; gap: 10px;
            animation: slideDown 0.4s ease;
        `;
        toast.innerHTML = `<i class="fas fa-crown"></i> Sveikiname! Premium aktyvuotas 🎉`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }
}