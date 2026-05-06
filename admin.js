// --- BENDRA BŪSENA ---
let editingTitle = null; 

document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus(); 
    loadAdminTopics();
    loadAdminQuizzes();
    
    // Pamokų formos klausytojas
    const topicForm = document.getElementById('topicForm');
    if (topicForm) {
        topicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('topicTitle');
            const desc = document.getElementById('topicDesc').value;
            const content = document.getElementById('topicContent').value;
            
            // NAUJA: Nuskaityti kategoriją
            const category = document.getElementById('topicCategory').value;
            
            const title = titleInput.value;
            const isUpdate = editingTitle !== null;

            let result;
            if (isUpdate) {
                // PRIDĖTA: category atnaujinimui
                result = await supabaseClient.from('topics').update({ 
                    description: desc, 
                    content: content,
                    category: category 
                }).eq('title', editingTitle);
            } else {
                // PRIDĖTA: category naujam įrašui
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
                resetTopicForm(); // Naudojame jūsų reset funkciją
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
            
            // NAUJA: Nuskaityti kategoriją
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

            // PRIDĖTA: category į upsert užklausą
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
                resetQuizForm(); // Naudojame jūsų reset funkciją
                loadAdminQuizzes();
            }
        });
    }
});

// --- TEMŲ (TOPICS) FUNKCIJOS ---
async function loadAdminTopics() {
    const container = document.getElementById('admin-topics-list');
    if (!container) return;
    const { data: topics, error } = await supabaseClient.from('topics').select('*');
    if (error) return;

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
        
        // PRIDĖTA: Nustatyti kategoriją redagavimo metu
        if (topic.category) {
            document.getElementById('topicCategory').value = topic.category;
        }

        editingTitle = topic.title;
        document.querySelector('#topicForm button').innerText = "Atnaujinti temą";
        document.getElementById('topicTitle').disabled = true;
        document.getElementById('topicForm').scrollIntoView();
    }
}

async function deleteTopic(title) {
    if (!confirm(`Trinti temą: ${title}?`)) return;
    await supabaseClient.from('topics').delete().eq('title', title);
    loadAdminTopics();
}

// --- TESTŲ (QUIZZES) FUNKCIJOS ---
async function loadAdminQuizzes() {
    const container = document.getElementById('admin-quizzes-list');
    if (!container) return;
    const { data: quizzes } = await supabaseClient.from('quizzes').select('*');
    
    container.innerHTML = quizzes.map(q => `
        <div style="border-bottom: 1px solid #eee; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span><strong>${q.title}</strong> <small style="color: gray;">(${q.category || 'bendra'})</small></span>
            <button onclick="editQuiz('${q.title.replace(/'/g, "\\'")}')" class="btn-outline" style="padding: 2px 10px; font-size: 12px; color: orange; border-color: orange;">Redaguoti</button>
        </div>
    `).join('');
}

async function editQuiz(title) {
    const { data: quiz } = await supabaseClient.from('quizzes').select('*').eq('title', title).single();
    if (quiz) {
        document.getElementById('quizTitle').value = quiz.title;
        document.getElementById('quizDesc').value = quiz.description || '';
        
        // PRIDĖTA: Nustatyti kategoriją redagavimo metu
        if (quiz.category) {
            document.getElementById('quizCategory').value = quiz.category;
        }

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
        document.getElementById('quizForm').scrollIntoView();
    }
}

function addQuestion(q = '', answers = ['', '', '', ''], correctIndex = 0) {
    const container = document.getElementById('questions-container');
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block-advanced';
    qBlock.style = 'background: #fff; border: 2px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 30px; position: relative;';

    qBlock.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label style="font-weight: bold; display: block; margin-bottom: 5px;">Klausimo tekstas:</label>
            <input type="text" class="q-text" placeholder="Įrašykite klausimą..." value="${q}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
        </div>
        
        <label style="font-weight: bold; display: block; margin-bottom: 10px;">Atsakymų variantai (pažymėkite teisingą):</label>
        <div class="options-container">
            ${answers.map((ans, i) => `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <input type="radio" name="correct_${Date.now()}_${Math.random()}" class="q-correct-radio" ${i === correctIndex ? 'checked' : ''}>
                    <input type="text" class="q-option-input" placeholder="Variantas ${i + 1}" value="${ans}" style="flex: 1; padding: 8px; border: 1px solid #eee; border-radius: 5px;">
                </div>
            `).join('')}
        </div>
        
        <button type="button" onclick="this.parentElement.remove()" style="margin-top: 10px; color: #ff4d4d; background: none; border: none; cursor: pointer; font-size: 14px;">
            <i class="fas fa-trash"></i> Pašalinti šią užduotį
        </button>
    `;
    container.appendChild(qBlock);
    // Persukame vaizdą į naujai pridėtą klausimą
    qBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Atnaujinta išsaugojimo funkcija, kuri surenka duomenis iš atskirų laukelių
async function saveQuiz() {
    const title = document.getElementById('quizTitle').value;
    const desc = document.getElementById('quizDesc').value;
    const blocks = document.querySelectorAll('.question-block-advanced');
    const questionsArray = [];

    blocks.forEach(block => {
        const questionText = block.querySelector('.q-text').value;
        const optionInputs = block.querySelectorAll('.q-option-input');
        const radioButtons = block.querySelectorAll('.q-correct-radio');
        
        const options = [];
        let correctIdx = 0;

        optionInputs.forEach((input, index) => {
            if (input.value.trim() !== "") {
                options.push(input.value.trim());
                if (radioButtons[index].checked) {
                    correctIdx = options.length - 1;
                }
            }
        });

        if (questionText && options.length > 0) {
            questionsArray.push({ q: questionText, a: options, c: correctIdx });
        }
    });

    if (!title || questionsArray.length === 0) {
        alert("Užpildykite testo pavadinimą ir pridėkite bent vieną klausimą!");
        return;
    }

    const { error } = await supabaseClient.from('quizzes').upsert([{ 
        title, description: desc, questions: questionsArray 
    }], { onConflict: 'title' });

    if (error) alert("Klaida: " + error.message);
    else {
        alert("Išsaugota!");
        resetQuizForm();
        loadAdminQuizzes();
    }
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
