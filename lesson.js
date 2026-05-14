// 1. Patikriname vartotoją ir užkrauname pamoką, kai DOM paruoštas
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkUserStatus === 'function') {
        checkUserStatus();
    }
    loadLessonDetail();
});

async function loadLessonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    const titleElement = document.getElementById('lesson-title');
    const contentElement = document.getElementById('lesson-content');

    if (!lessonId) {
        if (titleElement) titleElement.innerText = "Pamoka nerasta";
        return;
    }

    if (contentElement) contentElement.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Kraunama pamoka...</span>
        </div>
    `;

    const { data: topic, error } = await supabaseClient
        .from('topics')
        .select('*')
        .eq('title', lessonId)
        .single();

    if (error || !topic) {
        console.error("Supabase klaida:", error);
        if (titleElement) titleElement.innerText = "Klaida užkraunant turinį";
        if (contentElement) contentElement.innerHTML = `
            <div style="background: #fff5f5; padding: 25px; border-radius: var(--radius-md); border: 1px solid #feb2b2;">
                <p style="color: var(--text-dark); margin-bottom: 8px;">Nepavyko rasti pamokos duomenų bazėje.</p>
                <small style="color: var(--text-gray);">ID: ${lessonId}</small>
                <br><br>
                <a href="topics.html" class="back-link">← Grįžti į temas</a>
            </div>
        `;
        return;
    }

    document.title = `${topic.title} | StudijųBankas`;

    if (titleElement) {
        titleElement.innerText = topic.title;
    }

    if (contentElement) {
        contentElement.innerHTML = topic.content || '<p style="color: var(--text-gray);">Ši pamoka dar neturi turinio.</p>';
    }

    console.log("Pamoka sėkmingai užkrauta:", topic.title);
}
