// 1. Patikriname vartotoją ir užkrauname pamoką, kai DOM paruoštas
document.addEventListener('DOMContentLoaded', () => {
    // Patikriname statusą (funkcija iš scripts.js)
    if (typeof checkUserStatus === 'function') {
        checkUserStatus();
    }
    
    // Užkrauname pamokos turinį
    loadLessonDetail();
});

async function loadLessonDetail() {
    // 1. Pasiimame ID iš URL (pvz., lesson.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id'); 

    const titleElement = document.getElementById('lesson-title');
    const contentElement = document.getElementById('lesson-content');

    if (!lessonId) {
        if (titleElement) titleElement.innerText = "Pamoka nerasta";
        return;
    }

    // Rodyti krovimo būseną (pasirinktinai)
    if (contentElement) contentElement.innerHTML = "<p>Kraunama pamoka...</p>";

    // 2. Traukiame duomenis naudodami 'id'
    // Jei tavo DB ID yra skaičius, Supabase jį atpažins automatiškai
    const { data: topic, error } = await supabaseClient
        .from('topics')
        .select('*')
        .eq('title', lessonId) 
        .single();

    if (error || !topic) {
        console.error("Supabase klaida:", error);
        if (titleElement) titleElement.innerText = "Klaida užkraunant turinį";
        if (contentElement) contentElement.innerHTML = `
            <div style="background: #fff5f5; padding: 20px; border-radius: 10px; border: 1px solid #feb2b2;">
                <p>Nepavyko rasti pamokos duomenų bazėje.</p>
                <small style="color: #666;">ID: ${lessonId}</small>
                <br><br>
                <a href="topics.html" style="color: #5d5fef; text-decoration: underline;">Grįžti į temas</a>
            </div>
        `;
        return;
    }

    // 3. Atvaizduojame gautą informaciją
    document.title = `${topic.title} | StudijųBankas`; 
    
    if (titleElement) {
        titleElement.innerText = topic.title;
    }
    
    if (contentElement) {
        // Naudojame innerHTML, nes pamokos turinys gali turėti HTML formatavimą (pvz. iš Editoriaus)
        contentElement.innerHTML = topic.content || '<p>Ši pamoka dar neturi turinio.</p>';
    }

    console.log("Pamoka sėkmingai užkrauta:", topic.title);
}