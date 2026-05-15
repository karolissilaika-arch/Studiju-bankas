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
    const loadingElement = document.getElementById('lesson-loading');
    const frame = document.getElementById('lesson-frame');

    if (!lessonId) {
        if (titleElement) titleElement.innerText = "Pamoka nerasta";
        return;
    }

    const { data: topic, error } = await supabaseClient
        .from('topics')
        .select('*')
        .eq('title', lessonId)
        .single();

    if (error || !topic) {
        console.error("Supabase klaida:", error);
        if (titleElement) titleElement.innerText = "Klaida užkraunant turinį";
        if (loadingElement) loadingElement.innerHTML = `
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
    if (titleElement) titleElement.innerText = topic.title;

    // Paslepiame loading indikatorių
    if (loadingElement) loadingElement.style.display = 'none';

    // Įrašome turinį į iframe – taip veiks ir MathJax, ir Chart.js
    const content = topic.content || '<p style="color:#888; padding:20px;">Ši pamoka dar neturi turinio.</p>';

    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();

    // Automatiškai pritaikome iframe aukštį pagal turinį
    function resizeFrame() {
        try {
            const newHeight = frame.contentWindow.document.documentElement.scrollHeight;
            if (newHeight > 100) {
                frame.style.height = newHeight + 'px';
            }
        } catch (e) {
            // Saugumas – jei iframe blokuoja prieigą
        }
    }

    // Tikriname kelis kartus, nes MathJax ir Chart.js užkraunami asinchroniškai
    frame.onload = () => {
        resizeFrame();
        setTimeout(resizeFrame, 500);
        setTimeout(resizeFrame, 1500);
        setTimeout(resizeFrame, 3000);
    };

    console.log("Pamoka sėkmingai užkrauta:", topic.title);
}
