// Paleidžiame vartotojo patikrą kaskart užkrovus bet kurį puslapį
checkUserStatus();
let topicForm = document.getElementById('topicForm');
let editingTitle = null; 

// 2. Tikriname, ar forma išvis egzistuoja šiame puslapyje
if (topicForm) {
    topicForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = document.getElementById('topicTitle');
        const desc = document.getElementById('topicDesc').value;
        const content = document.getElementById('topicContent').value;
        const title = titleInput.value;
        
        const isUpdate = editingTitle !== null;

        let result;
        if (isUpdate) {
            // Atnaujinimas (UPDATE)
            result = await supabaseClient
                .from('topics')
                .update({ 
                    description: desc, 
                    content: content 
                })
                .eq('title', editingTitle);
        } else {
            // Kūrimas (INSERT)
            result = await supabaseClient
                .from('topics')
                .insert([{ title, description: desc, content }]);
        }

        if (result.error) {
            alert("Klaida: " + result.error.message);
        } else {
            alert(isUpdate ? "Atnaujinta sėkmingai!" : "Tema sukurta!");
            
            // Atstatome formą į pradinę būseną
            topicForm.reset();
            editingTitle = null; 
            
            const submitBtn = topicForm.querySelector('button');
            if (submitBtn) submitBtn.innerText = "Skelbti temą";
            
            if (titleInput) titleInput.disabled = false;
            
            // Atnaujiname sąrašą, jei tokia funkcija yra tame puslapyje
            if (typeof loadAdminTopics === "function") {
                loadAdminTopics();
            }
        }
    });
}
// Kai paspaudi "Redaguoti", nepamiršk nustatyti editingTitle
async function editTopic(title) {
    const { data: topic, error } = await supabaseClient
        .from('topics')
        .select('*')
        .eq('title', title)
        .single();

    if (topic) {
        document.getElementById('topicTitle').value = topic.title;
        document.getElementById('topicDesc').value = topic.description;
        document.getElementById('topicContent').value = topic.content;
        
        editingTitle = topic.title; // Įsimename pavadinimą redagavimui
        document.querySelector('#topicForm button').innerText = "Atnaujinti temą";
        document.getElementById('topicTitle').disabled = true;
    }
}
async function loadAdminTopics() {
    const container = document.getElementById('admin-topics-list');
    if (!container) return;

    const { data: topics, error } = await supabaseClient.from('topics').select('*');

    if (error) {
        container.innerHTML = "Klaida: " + error.message;
        return;
    }

    container.innerHTML = '';
    topics.forEach(topic => {
        const div = document.createElement('div');
        div.style = "border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
        div.innerHTML = `
            <div>
                <strong>${topic.title}</strong>
            </div>
            <div>
                <button onclick="editTopic('${topic.title.replace(/'/g, "\\'")}')" style="background: orange; color: white;">Redaguoti</button>
                <button onclick="deleteTopic('${topic.title.replace(/'/g, "\\'")}')" style="background: red; color: white;">Trinti</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Iškviečiame krovimą, jei esame admin puslapyje
if (document.getElementById('admin-topics-list')) {
    loadAdminTopics();
}
async function deleteTopic(title) {
    if (!confirm(`Ar tikrai norite ištrinti temą: ${title}?`)) return;

    const { error } = await supabaseClient
        .from('topics')
        .delete()
        .eq('title', title);

    if (error) {
        alert("Nepavyko ištrinti: " + error.message);
    } else {
        alert("Ištrinta sėkmingai!");
        loadAdminTopics(); // Atnaujiname sąrašą
    }
}
//TESTU LOGIKA
// Funkcija, kuri prideda naują klausimo bloką į formą
function addQuestion() {
    const container = document.getElementById('questions-container');
    
    // Sukuriame naują klausimo bloką, kuris atrodo kaip dashboard kortelė
    const qBlock = document.createElement('div');
    qBlock.className = 'course-item question-block'; 
    qBlock.style.display = 'block'; 
    qBlock.style.marginTop = '15px';

    qBlock.innerHTML = `
        <div class="input-group">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Klausimas</label>
            <input type="text" class="q-text" placeholder="Įrašykite klausimą" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Atsakymai (atskirti kableliais)</label>
            <input type="text" class="q-options" placeholder="pvz: 2, 4, 5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Teisingo atsakymo numeris (nuo 0)</label>
            <input type="number" class="q-correct" placeholder="0" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="btn-outline" style="margin-top:10px; color:red; border-color:red;">Pašalinti</button>
    `;
    
    container.appendChild(qBlock);
}

/// 1. Tik deklaruojame kintamąjį (neimame .value iškart!)
// --- ADMINO FUNKCIJOS ---

// 1. Funkcija, kuri prideda naują klausimo bloką į formą
function addQuestion() {
    const container = document.getElementById('questions-container');
    if (!container) return; // Saugiklis: jei konteinerio nėra, nieko nedarom

    const qBlock = document.createElement('div');
    qBlock.className = 'course-item question-block'; 
    qBlock.style.display = 'block'; 
    qBlock.style.marginTop = '15px';

    qBlock.innerHTML = `
        <div class="input-group">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Klausimas</label>
            <input type="text" class="q-text" placeholder="Įrašykite klausimą" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Atsakymai (atskirti kableliais)</label>
            <input type="text" class="q-options" placeholder="pvz: 2, 4, 5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <div class="input-group" style="margin-top:10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px;">Teisingo atsakymo numeris (nuo 0)</label>
            <input type="number" class="q-correct" placeholder="0" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="btn-outline" style="margin-top:10px; color:red; border-color:red;">Pašalinti</button>
    `;
    
    container.appendChild(qBlock);
}

// 2. Formos pateikimo klausytojas (Save/Insert logika)
document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quizForm');
    
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const titleEl = document.getElementById('quizTitle');
            const descEl = document.getElementById('quizDesc');
            const qContainer = document.getElementById('questions-container');

            // Jei nerandame pagrindinių laukų - stabdome
            if (!titleEl || !descEl) {
                console.error("Klaida: Nerasti formos laukai (quizTitle/quizDesc)!");
                return;
            }

            const title = titleEl.value;
            const desc = descEl.value;
            const questionBlocks = document.querySelectorAll('.question-block');
            const questionsArray = [];

            questionBlocks.forEach(block => {
                const qInput = block.querySelector('.q-text');
                const oInput = block.querySelector('.q-options');
                const cInput = block.querySelector('.q-correct');

                if (qInput && oInput && cInput) {
                    const q = qInput.value;
                    const options = oInput.value.split(',').map(s => s.trim());
                    const correct = parseInt(cInput.value) || 0;

                    if (q && options.length > 0) {
                        questionsArray.push({ q, a: options, c: correct });
                    }
                }
            });

            // Siuntimas į DB (Naudojame UPSERT, kad atnaujintų esamą arba sukurtų naują)
            const { error } = await supabaseClient
                .from('quizzes')
                .upsert([{ 
                    title: title, 
                    description: desc, 
                    questions: questionsArray 
                }], { onConflict: 'title' });

            if (error) {
                alert("Klaida saugant: " + error.message);
            } else {
                alert("Testas sėkmingai išsaugotas!");
                window.location.reload(); // Perkraunam, kad matytųsi pokyčiai
            }
        });
    }
})