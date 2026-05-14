let loadedVbeQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    populateSubjectDropdown();
    loadVbeQuestions();
});

// Užpildome dalyko dropdown iš DB
async function populateSubjectDropdown() {
    const { data, error } = await supabaseClient
        .from('vbe_questions')
        .select('subject');
    if (error || !data) return;

    const subjects = [...new Set(data.map(q => q.subject).filter(Boolean))];
    const select = document.getElementById('filter-subject');
    subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
    });
}

// Kai pasikeičia dalykas — atnaujiname temas
async function handleSubjectChange() {
    await updateTopicDropdown();
    await loadVbeQuestions();
}

// Dinamiškai atnaujina temų pasirinkimą
async function updateTopicDropdown() {
    const subject = document.getElementById('filter-subject').value;

    let query = supabaseClient.from('vbe_questions').select('topic');
    if (subject !== 'all') query = query.eq('subject', subject);

    const { data, error } = await query;
    if (error || !data) return;

    const uniqueTopics = [...new Set(data.map(q => q.topic).filter(Boolean))];

    const topicSelect = document.getElementById('filter-topic');
    topicSelect.innerHTML = '<option value="all">Visos temos</option>' +
        uniqueTopics.map(t => `<option value="${t}">${t}</option>`).join('');
}

// Pagrindinė klausimų užkrovimo funkcija
async function loadVbeQuestions() {
    const subject = document.getElementById('filter-subject').value;
    const topic = document.getElementById('filter-topic').value;
    const type = document.getElementById('filter-type').value;

    const startBtn = document.getElementById('start-vbe-btn');
    const noMsg = document.getElementById('no-vbe-msg');
    const qCountSpan = document.getElementById('vbe-q-count');
    const previewSection = document.getElementById('vbe-questions-preview');

    let query = supabaseClient.from('vbe_questions').select('*');
    if (subject !== 'all') query = query.eq('subject', subject);
    if (topic !== 'all') query = query.eq('topic', topic);
    if (type !== 'all') query = query.eq('question_type', type);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Klaida kraunant VBE klausimus:', error.message);
        return;
    }

    loadedVbeQuestions = data;
    qCountSpan.innerText = data.length;

    if (data.length > 0) {
        startBtn.style.display = 'block';
        noMsg.style.display = 'none';
        previewSection.style.display = 'block';
        renderPreview(data);
    } else {
        startBtn.style.display = 'none';
        noMsg.style.display = 'block';
        previewSection.style.display = 'none';
    }
}

// Trumpa klausimų peržiūra (pirmieji 5)
function renderPreview(questions) {
    const list = document.getElementById('vbe-preview-list');
    const preview = questions.slice(0, 5);

    list.innerHTML = preview.map((q, i) => `
        <div style="background: white; border-radius: 10px; padding: 15px 20px; margin-bottom: 10px; border-left: 4px solid ${q.question_type === 'open' ? '#f39c12' : '#5d5fef'}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <small style="color: #888; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${q.subject}${q.topic ? ' • ' + q.topic : ''}</small>
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${q.question_type === 'open' ? '#fff3cd' : '#ede9fe'}; color: ${q.question_type === 'open' ? '#856404' : '#5d5fef'}; font-weight: 600;">
                    ${q.question_type === 'open' ? 'Laisvas' : 'Testinis'}
                </span>
            </div>
            <p style="margin: 0; color: #333; font-size: 14px;">${i + 1}. ${q.question_text}</p>
        </div>
    `).join('');

    if (questions.length > 5) {
        list.innerHTML += `<p style="text-align:center; color:#999; font-size:14px; margin-top:10px;">... ir dar ${questions.length - 5} klausimų</p>`;
    }
}

// Nukreipia į praktikos puslapį
function openVbePractice() {
    const subject = document.getElementById('filter-subject').value;
    const topic = document.getElementById('filter-topic').value;
    const type = document.getElementById('filter-type').value;

    const url = `vbe-practice.html?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(type)}`;
    window.location.href = url;
}
