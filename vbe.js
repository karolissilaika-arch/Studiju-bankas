let loadedVbeQuestions = [];

// Klausimų tipų pavadinimai lietuviškai
const TYPE_LABELS = {
    'test': 'Testinis',
    'fill': 'Įrašyti atsakymą',
    'open': 'Laisvas atsakymas'
};

document.addEventListener('DOMContentLoaded', () => {
    populateSubjectDropdown();
    populateTypeDropdown();
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

// Užpildome tipo dropdown iš DB
async function populateTypeDropdown() {
    const { data, error } = await supabaseClient
        .from('vbe_questions')
        .select('question_type');
    if (error || !data) return;

    const types = [...new Set(data.map(q => q.question_type).filter(Boolean))];
    const select = document.getElementById('filter-type');
    // Išvalome senus (išskyrus "Visi tipai")
    select.innerHTML = '<option value="all">Visi tipai</option>';
    types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = TYPE_LABELS[t] || t;
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

    const typeColor = {
        'open':  { bg: '#fff3cd', text: '#856404', border: '#f39c12' },
        'fill':  { bg: '#e8f4fd', text: '#2980b9', border: '#3498db' },
        'test':  { bg: '#ede9fe', text: '#5d5fef', border: '#5d5fef' },
    };

    list.innerHTML = preview.map((q, i) => {
        const c = typeColor[q.question_type] || typeColor['test'];
        return `
        <div style="background: white; border-radius: 10px; padding: 15px 20px; margin-bottom: 10px; border-left: 4px solid ${c.border}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <small style="color: #888; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${q.subject}${q.topic ? ' • ' + q.topic : ''}</small>
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${c.bg}; color: ${c.text}; font-weight: 600;">
                    ${TYPE_LABELS[q.question_type] || q.question_type}
                </span>
            </div>
            <p style="margin: 0; color: #333; font-size: 14px;">${i + 1}. ${q.question_text}</p>
        </div>
    `}).join('');

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