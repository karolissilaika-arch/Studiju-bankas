// --- BENDRA BŪSENA ---
let editingTitle = null; 

document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus(); 
    loadAdminTopics();
    loadAdminQuizzes();
    loadAdminExamQuestions();
    loadAdminVbeQuestions();
    
    // Pamokų formos klausytojas
    const topicForm = document.getElementById('topicForm');
    if (topicForm) {
        topicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('topicTitle');
            const desc = document.getElementById('topicDesc').value;
            const content = document.getElementById('topicContent').value;
            const category = document.getElementById('topicCategory').value;
            const title = titleInput.value;
            const isUpdate = editingTitle !== null;

            let result;
            if (isUpdate) {
                result = await supabaseClient.from('topics').update({ 
                    description: desc, 
                    content: content,
                    category: category 
                }).eq('title', editingTitle);
            } else {
                result = await supabaseClient.from('topics').insert([{ 
                    title, 
                    description: desc, 
                    content,
                    category: category 
                }]);
            }

            if (result.error) {
                alert("Klaida: " + result.error.message);
            } else {
                alert(isUpdate ? "Atnaujinta sėkmingai!" : "Tema sukurta!");
                resetTopicForm();
                loadAdminTopics();
            }
        });
    }

    // Testų formos klausytojas
    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('quizTitle').value;
            const desc = document.getElementById('quizDesc').value;
            const category = document.getElementById('quizCategory').value;
            
            const questionBlocks = document.querySelectorAll('.question-block');
            const questionsArray = [];

            questionBlocks.forEach(block => {
                const q = block.querySelector('.q-text').value;
                const options = block.querySelector('.q-options').value.split(',').map(s => s.trim());
                const correct = parseInt(block.querySelector('.q-correct').value) || 0;
                if (q && options.length > 0) {
                    questionsArray.push({ q, a: options, c: correct });
                }
            });

            const { error } = await supabaseClient.from('quizzes').upsert([{ 
                title: title, 
                description: desc, 
                questions: questionsArray,
                category: category 
            }], { onConflict: 'title' });

            if (error) {
                alert("Klaida saugant testą: " + error.message);
            } else {
                alert("Testas sėkmingai išsaugotas!");
                resetQuizForm();
                loadAdminQuizzes();
            }
        });
    }

    // Paieškos klausytojai
    document.getElementById('search-topics')?.addEventListener('input', filterTopics);
    document.getElementById('search-quizzes')?.addEventListener('input', filterQuizzes);
    document.getElementById('search-exams')?.addEventListener('input', filterExamQuestions);
    document.getElementById('search-vbe')?.addEventListener('input', filterVbeQuestions);

    // Egzaminų formos klausytojas
    const examForm = document.getElementById('exam-question-form');
    if (examForm) {
        examForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const grade = document.getElementById('exam-grade').value;
            const category = document.getElementById('exam-category').value;
            const topic = document.getElementById('exam-topic').value;
            const question_text = document.getElementById('exam-q-text').value;
            const explanation = document.getElementById('exam-explanation').value;
            
            const optionsElements = document.querySelectorAll('.exam-opt');
            const options = Array.from(optionsElements).map(el => el.value);
            
            const selectedRadio = document.querySelector('input[name="correct-opt"]:checked');
            const correct_option = selectedRadio ? parseInt(selectedRadio.value) : 0;

            const questionData = { 
                grade: parseInt(grade), 
                category, 
                topic, 
                question_text, 
                options, 
                correct_option,
                explanation: explanation || null
            };

            try {
                if (editingQuestionId) {
                    const { error } = await supabaseClient
                        .from('exam_questions')
                        .update(questionData)
                        .eq('id', editingQuestionId);
                    if (error) throw error;
                    alert("Klausimas sėkmingai atnaujintas!");
                } else {
                    const { error } = await supabaseClient
                        .from('exam_questions')
                        .insert([questionData]);
                    if (error) throw error;
                    alert("Klausimas sėkmingai pridėtas!");
                }

                resetExamForm();
                loadAdminExamQuestions();
            } catch (err) {
                alert("Klaida: " + err.message);
            }
        });
    }
});

// --- TEMŲ (TOPICS) FUNKCIJOS ---
let allAdminTopics = [];

async function loadAdminTopics() {
    const container = document.getElementById('admin-topics-list');
    if (!container) return;
    const { data: topics, error } = await supabaseClient.from('topics').select('*');
    if (error) return;
    allAdminTopics = topics;
    renderAdminTopics(topics);
}

function filterTopics() {
    const term = document.getElementById('search-topics').value.toLowerCase();
    const filtered = allAdminTopics.filter(t => 
        t.title.toLowerCase().includes(term) || 
        (t.category || '').toLowerCase().includes(term)
    );
    renderAdminTopics(filtered);
}

function renderAdminTopics(topics) {
    const container = document.getElementById('admin-topics-list');
    if (!container) return;
    if (topics.length === 0) {
        container.innerHTML = '<p style="padding:10px; color:#999;">Nieko nerasta.</p>';
        return;
    }
    container.innerHTML = topics.map(topic => `
        <div style="border-bottom: 1px solid #eee; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span><strong>${topic.title}</strong> <small style="color: gray;">(${topic.category || 'bendra'})</small></span>
            <div>
                <button onclick="editTopic('${topic.title.replace(/'/g, "\\'")}')" class="btn-outline" style="padding: 2px 10px; font-size: 12px; color: orange; border-color: orange;">Redaguoti</button>
                <button onclick="deleteTopic('${topic.title.replace(/'/g, "\\'")}')" class="btn-outline" style="padding: 2px 10px; font-size: 12px; color: red; border-color: red;">Trinti</button>
            </div>
        </div>
    `).join('');
}

async function editTopic(title) {
    const { data: topic } = await supabaseClient.from('topics').select('*').eq('title', title).single();
    if (topic) {
        document.getElementById('topicTitle').value = topic.title;
        document.getElementById('topicDesc').value = topic.description || '';
        document.getElementById('topicContent').value = topic.content || '';
        if (topic.category) document.getElementById('topicCategory').value = topic.category;
        editingTitle = topic.title;
        document.querySelector('#topicForm button').innerText = "Atnaujinti temą";
        document.getElementById('topicTitle').disabled = true;
        document.getElementById('topicForm').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteTopic(title) {
    if (!confirm(`Trinti temą: ${title}?`)) return;
    await supabaseClient.from('topics').delete().eq('title', title);
    loadAdminTopics();
}

// --- TESTŲ (QUIZZES) FUNKCIJOS ---
let allAdminQuizzes = [];

async function loadAdminQuizzes() {
    const container = document.getElementById('admin-quizzes-list');
    if (!container) return;
    const { data: quizzes } = await supabaseClient.from('quizzes').select('*');
    allAdminQuizzes = quizzes || [];
    renderAdminQuizzes(quizzes || []);
}

function filterQuizzes() {
    const term = document.getElementById('search-quizzes').value.toLowerCase();
    const filtered = allAdminQuizzes.filter(q => 
        q.title.toLowerCase().includes(term) || 
        (q.category || '').toLowerCase().includes(term)
    );
    renderAdminQuizzes(filtered);
}

function renderAdminQuizzes(quizzes) {
    const container = document.getElementById('admin-quizzes-list');
    if (!container) return;
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="padding:10px; color:#999;">Nieko nerasta.</p>';
        return;
    }
    container.innerHTML = quizzes.map(q => `
        <div style="border-bottom: 1px solid #eee; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span><strong>${q.title}</strong> <small style="color: gray;">(${q.category || 'bendra'})</small></span>
            <div>
                <button onclick="editQuiz('${q.title.replace(/'/g, "\\'")}')" class="btn-outline" style="padding: 2px 10px; font-size: 12px; color: orange; border-color: orange;">Redaguoti</button>
                <button onclick="deleteQuiz('${q.title.replace(/'/g, "\\'")}')" class="btn-outline" style="padding: 2px 10px; font-size: 12px; color: red; border-color: red;">Trinti</button>
            </div>
        </div>
    `).join('');
}

async function deleteQuiz(title) {
    if (!confirm(`Trinti testą: ${title}?`)) return;
    await supabaseClient.from('quizzes').delete().eq('title', title);
    loadAdminQuizzes();
}

async function editQuiz(title) {
    const { data: quiz } = await supabaseClient.from('quizzes').select('*').eq('title', title).single();
    if (quiz) {
        document.getElementById('quizTitle').value = quiz.title;
        document.getElementById('quizDesc').value = quiz.description || '';
        if (quiz.category) document.getElementById('quizCategory').value = quiz.category;

        const container = document.getElementById('questions-container');
        container.innerHTML = ''; 
        
        quiz.questions.forEach(q => {
            addQuestion();
            const blocks = container.querySelectorAll('.question-block');
            const last = blocks[blocks.length - 1];
            last.querySelector('.q-text').value = q.q;
            last.querySelector('.q-options').value = q.a.join(', ');
            last.querySelector('.q-correct').value = q.c;
        });
        document.getElementById('quizForm').scrollIntoView({ behavior: 'smooth' });
    }
}

function addQuestion() {
    const container = document.getElementById('questions-container');
    const qBlock = document.createElement('div');
    qBlock.className = 'course-item question-block'; 
    qBlock.style = 'display: block; margin-top: 15px; padding: 15px; border: 1px solid #eee;';
    qBlock.innerHTML = `
        <input type="text" class="q-text" placeholder="Klausimas" style="width:100%; margin-bottom:5px; padding:8px; border-radius:5px; border:1px solid #ddd;">
        <input type="text" class="q-options" placeholder="Atsakymai, atskirti kableliais (pvz: Taip, Ne, Galbūt)" style="width:100%; margin-bottom:5px; padding:8px; border-radius:5px; border:1px solid #ddd;">
        <input type="number" class="q-correct" placeholder="Teisingo atsakymo indeksas (0, 1, 2...)" min="0" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ddd;">
    `;
    container.appendChild(qBlock);
}

function resetTopicForm() {
    const form = document.getElementById('topicForm');
    form.reset();
    editingTitle = null;
    document.getElementById('topicTitle').disabled = false;
    form.querySelector('button[type="submit"]').innerText = "Skelbti temą";
}

function resetQuizForm() {
    const form = document.getElementById('quizForm');
    form.reset();
    document.getElementById('questions-container').innerHTML = '';
}

function insertImageTag() {
    const url = prompt("Įklijuokite nuotraukos nuorodą (URL):");
    if (url) {
        const textArea = document.getElementById('topicContent');
        const imgTag = `<img src="${url}" alt="nuotrauka" style="max-width:100%; border-radius:10px; margin: 10px 0;">`;
        const start = textArea.selectionStart;
        const end = textArea.selectionEnd;
        textArea.value = textArea.value.substring(0, start) + imgTag + textArea.value.substring(end);
    }
}

// --- EGZAMINŲ KLAUSIMAI ---
let editingQuestionId = null;
let allAdminExamQuestions = [];

function filterExamQuestions() {
    const term = document.getElementById('search-exams').value.toLowerCase();
    const filtered = allAdminExamQuestions.filter(q => 
        q.question_text.toLowerCase().includes(term) ||
        (q.category || '').toLowerCase().includes(term) ||
        (q.topic || '').toLowerCase().includes(term)
    );
    renderAdminExamQuestions(filtered);
}

function renderAdminExamQuestions(data) {
    const listContainer = document.getElementById('admin-exam-list');
    if (!listContainer) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<p style="padding:10px; color:#999;">Nieko nerasta.</p>';
        return;
    }

    listContainer.innerHTML = data.map(q => `
        <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <small style="color: #5d5fef; font-weight: 600;">${q.grade} kl. | ${q.category} | ${q.topic}</small>
                <p style="margin: 5px 0; font-weight: 500;">${q.question_text}</p>
                ${q.explanation ? `<small style="color: #888;">💡 ${q.explanation.substring(0, 50)}...</small>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0; margin-left: 10px;">
                <button onclick='editQuestionInForm(${JSON.stringify(q).replace(/'/g, "&apos;")})' 
                        style="background: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-edit"></i> Redaguoti
                </button>
                <button onclick="deleteExamQuestion('${q.id}')" 
                        style="background: #ff4757; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function loadAdminExamQuestions() {
    const listContainer = document.getElementById('admin-exam-list');
    if (!listContainer) return;

    const { data, error } = await supabaseClient
        .from('exam_questions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        listContainer.innerHTML = "<p style='color:red;'>Klaida kraunant klausimus.</p>";
        return;
    }

    allAdminExamQuestions = data;
    renderAdminExamQuestions(data);
}

function editQuestionInForm(q) {
    editingQuestionId = q.id;
    document.getElementById('exam-grade').value = q.grade;
    document.getElementById('exam-category').value = q.category;
    document.getElementById('exam-topic').value = q.topic;
    document.getElementById('exam-q-text').value = q.question_text;
    document.getElementById('exam-explanation').value = q.explanation || "";
    
    const optionsInputs = document.querySelectorAll('.exam-opt');
    q.options.forEach((opt, i) => {
        if (optionsInputs[i]) optionsInputs[i].value = opt;
    });

    const radios = document.querySelectorAll('input[name="correct-opt"]');
    if (radios[q.correct_option]) radios[q.correct_option].checked = true;

    const submitBtn = document.querySelector('#exam-question-form button[type="submit"]');
    submitBtn.innerText = "Išsaugoti pakeitimus";
    submitBtn.style.background = "#f39c12"; 
    
    const formSection = document.getElementById('exam-question-form').closest('.admin-card');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function resetExamForm() {
    editingQuestionId = null;
    const form = document.getElementById('exam-question-form');
    if (form) {
        form.reset();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerText = "Išsaugoti klausimą į duomenų bazę";
            submitBtn.style.background = "#27ae60";
        }
    }
}

async function deleteExamQuestion(id) {
    if (!confirm("Ar tikrai norite ištrinti šį klausimą?")) return;

    const { error } = await supabaseClient
        .from('exam_questions')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Klaida trinant: " + error.message);
    } else {
        if (editingQuestionId === id) resetExamForm();
        loadAdminExamQuestions();
    }
}

// =============================================
// --- VBE KLAUSIMAI ---
// =============================================
let editingVbeQuestionId = null;
let allAdminVbeQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
    const vbeForm = document.getElementById('vbe-question-form');
    if (vbeForm) {
        vbeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const subject = document.getElementById('vbe-subject').value;
            const topic = document.getElementById('vbe-topic').value;
            const question_type = document.getElementById('vbe-type').value;
            const question_text = document.getElementById('vbe-q-text').value;
            const explanation = document.getElementById('vbe-explanation').value;

            let questionData = { subject, topic: topic || null, question_text, question_type, explanation: explanation || null };

            if (question_type === 'test') {
                const optEls = document.querySelectorAll('.vbe-opt');
                const options = Array.from(optEls).map(el => el.value).filter(v => v.trim() !== '');
                if (options.length < 2) { alert("Pridėkite bent 2 atsakymų variantus."); return; }
                const selectedRadio = document.querySelector('input[name="vbe-correct-opt"]:checked');
                const correct_option = selectedRadio ? parseInt(selectedRadio.value) : 0;
                questionData.options = options;
                questionData.correct_option = correct_option;
            } else {
                const correct_answer = document.getElementById('vbe-correct-answer').value;
                const max_points = document.getElementById('vbe-max-points').value;
                if (!correct_answer.trim()) { alert("Įveskite pavyzdinį atsakymą."); return; }
                questionData.correct_answer = correct_answer;
                if (max_points) questionData.max_points = parseInt(max_points);
            }

            try {
                if (editingVbeQuestionId) {
                    const { error } = await supabaseClient.from('vbe_questions').update(questionData).eq('id', editingVbeQuestionId);
                    if (error) throw error;
                    alert("VBE klausimas atnaujintas!");
                } else {
                    const { error } = await supabaseClient.from('vbe_questions').insert([questionData]);
                    if (error) throw error;
                    alert("VBE klausimas pridėtas!");
                }
                resetVbeForm();
                loadAdminVbeQuestions();
            } catch (err) {
                alert("Klaida: " + err.message);
            }
        });
    }
});

function toggleVbeAnswerFields() {
    const type = document.getElementById('vbe-type').value;
    document.getElementById('vbe-test-options').style.display = type === 'test' ? 'block' : 'none';
    document.getElementById('vbe-open-answer').style.display = type === 'open' ? 'block' : 'none';
}

async function loadAdminVbeQuestions() {
    const listContainer = document.getElementById('admin-vbe-list');
    if (!listContainer) return;

    const { data, error } = await supabaseClient
        .from('vbe_questions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        listContainer.innerHTML = "<p style='color:red;'>Klaida kraunant VBE klausimus.</p>";
        return;
    }

    allAdminVbeQuestions = data;
    renderAdminVbeQuestions(data);
}

function filterVbeQuestions() {
    const term = document.getElementById('search-vbe').value.toLowerCase();
    const filtered = allAdminVbeQuestions.filter(q =>
        q.question_text.toLowerCase().includes(term) ||
        (q.subject || '').toLowerCase().includes(term) ||
        (q.topic || '').toLowerCase().includes(term)
    );
    renderAdminVbeQuestions(filtered);
}

function renderAdminVbeQuestions(data) {
    const listContainer = document.getElementById('admin-vbe-list');
    if (!listContainer) return;

    if (data.length === 0) {
        listContainer.innerHTML = '<p style="padding:10px; color:#999;">Nieko nerasta.</p>';
        return;
    }

    listContainer.innerHTML = data.map(q => `
        <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <small style="color: #7c3aed; font-weight: 600;">
                    ${q.subject}${q.topic ? ' | ' + q.topic : ''}
                    <span style="background: ${q.question_type === 'open' ? '#fff3cd' : '#ede9fe'}; color: ${q.question_type === 'open' ? '#856404' : '#5d5fef'}; padding: 1px 6px; border-radius: 8px; margin-left: 5px; font-size: 10px;">${q.question_type === 'open' ? 'Laisvas' : 'Testinis'}</span>
                </small>
                <p style="margin: 5px 0; font-weight: 500;">${q.question_text}</p>
                ${q.explanation ? `<small style="color: #888;">💡 ${q.explanation.substring(0, 60)}...</small>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0; margin-left: 10px;">
                <button onclick='editVbeQuestionInForm(${JSON.stringify(q).replace(/'/g, "&apos;")})' class="btn-edit-item">
                    <i class="fas fa-edit"></i> Redaguoti
                </button>
                <button onclick="deleteVbeQuestion('${q.id}')" class="btn-delete-item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function editVbeQuestionInForm(q) {
    editingVbeQuestionId = q.id;
    document.getElementById('vbe-subject').value = q.subject || '';
    document.getElementById('vbe-topic').value = q.topic || '';
    document.getElementById('vbe-type').value = q.question_type || 'test';
    document.getElementById('vbe-q-text').value = q.question_text || '';
    document.getElementById('vbe-explanation').value = q.explanation || '';

    toggleVbeAnswerFields();

    if (q.question_type === 'test' && q.options) {
        const optInputs = document.querySelectorAll('.vbe-opt');
        q.options.forEach((opt, i) => { if (optInputs[i]) optInputs[i].value = opt; });
        const radios = document.querySelectorAll('input[name="vbe-correct-opt"]');
        if (radios[q.correct_option]) radios[q.correct_option].checked = true;
    } else if (q.question_type === 'open') {
        document.getElementById('vbe-correct-answer').value = q.correct_answer || '';
        document.getElementById('vbe-max-points').value = q.max_points || '';
    }

    const submitBtn = document.querySelector('#vbe-question-form button[type="submit"]');
    if (submitBtn) { submitBtn.innerText = "Išsaugoti pakeitimus"; submitBtn.style.background = "#f39c12"; }

    document.getElementById('vbe-question-form').closest('.admin-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetVbeForm() {
    editingVbeQuestionId = null;
    const form = document.getElementById('vbe-question-form');
    if (form) {
        form.reset();
        toggleVbeAnswerFields();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.innerText = "Išsaugoti VBE klausimą"; submitBtn.style.background = "#7c3aed"; }
    }
}

async function deleteVbeQuestion(id) {
    if (!confirm("Ar tikrai norite ištrinti šį VBE klausimą?")) return;
    const { error } = await supabaseClient.from('vbe_questions').delete().eq('id', id);
    if (error) { alert("Klaida trinant: " + error.message); }
    else {
        if (editingVbeQuestionId === id) resetVbeForm();
        loadAdminVbeQuestions();
    }
}
