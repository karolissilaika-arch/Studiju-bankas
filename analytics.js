// --- INICIALIZACIJA ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadDynamicCategories();
    await loadAnalyticsData();
    showFilteredResult();
});

// --- ŠALTINIO PAKEITIMAS ---
async function onSourceChange() {
    await loadDynamicCategories();
    document.getElementById('filter-topic').innerHTML = '<option value="">Visos temos</option>';
    showFilteredResult();
}

// --- 1. KATEGORIJŲ UŽKROVIMAS ---
async function loadDynamicCategories() {
    const categorySelect = document.getElementById('filter-category');
    if (!categorySelect) return;
    const source = document.getElementById('filter-source').value;

    try {
        let uniqueCategories = [];
        if (source === 'vbe') {
            const { data } = await supabaseClient.from('vbe_questions').select('subject');
            uniqueCategories = [...new Set((data || []).map(i => i.subject).filter(Boolean))];
        } else {
            const { data: examData } = await supabaseClient.from('exam_questions').select('category');
            const { data: quizData } = await supabaseClient.from('quizzes').select('category');
            uniqueCategories = [...new Set([...(examData||[]),...(quizData||[])].map(i => i.category).filter(Boolean))];
        }
        categorySelect.innerHTML = '<option value="">Visos kategorijos</option>';
        uniqueCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat; opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
    } catch (err) { console.error("Klaida kraunant kategorijas:", err); }
}

// --- 2. TEMŲ UŽKROVIMAS ---
async function loadDynamicTopics() {
    const category = document.getElementById('filter-category').value;
    const source = document.getElementById('filter-source').value;
    const topicSelect = document.getElementById('filter-topic');
    if (!topicSelect) return;
    if (!category) {
        topicSelect.innerHTML = '<option value="">Visos temos</option>';
        showFilteredResult();
        return;
    }
    topicSelect.innerHTML = '<option value="">Kraunama...</option>';
    try {
        let uniqueTopics = [];
        if (source === 'vbe') {
            const { data } = await supabaseClient.from('vbe_questions').select('topic').eq('subject', category);
            uniqueTopics = [...new Set((data||[]).map(i => i.topic).filter(Boolean))];
        } else {
            const { data: e } = await supabaseClient.from('exam_questions').select('topic').eq('category', category);
            const { data: q } = await supabaseClient.from('quizzes').select('topic').eq('category', category);
            uniqueTopics = [...new Set([...(e||[]),...(q||[])].map(i => i.topic).filter(Boolean))];
        }
        topicSelect.innerHTML = '<option value="">Visos temos</option>';
        uniqueTopics.forEach(top => {
            const opt = document.createElement('option');
            opt.value = top; opt.textContent = top;
            topicSelect.appendChild(opt);
        });
        showFilteredResult();
    } catch (err) { console.error("Klaida kraunant temas:", err); }
}

// --- 3. PROFILIO DUOMENYS + STIPRIAUSIA TEMA + GRAFIKAS ---
async function loadAnalyticsData() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabaseClient.from('profiles').select('total_xp').eq('id', user.id).single();
        if (profile) document.getElementById('total-xp').innerText = profile.total_xp || 0;

        const { count } = await supabaseClient.from('quiz_results').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        document.getElementById('quizzes-completed').innerText = count || 0;

        await loadBestTopic(user.id);
        await loadXpChart(user.id);
    } catch (err) { console.error("loadAnalyticsData klaida:", err); }
}

// --- STIPRIAUSIA TEMA ---
async function loadBestTopic(userId) {
    const el = document.getElementById('best-topic-name');
    if (!el) return;
    try {
        const topicStats = {};

        const { data: examRes } = await supabaseClient.from('exam_results').select('is_correct, exam_questions!inner(topic)').eq('user_id', userId);
        (examRes || []).forEach(r => {
            const t = r.exam_questions?.topic; if (!t) return;
            if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
            topicStats[t].total++; if (r.is_correct) topicStats[t].correct++;
        });

        const { data: vbeRes } = await supabaseClient.from('vbe_results').select('is_correct, vbe_questions!inner(topic)').eq('user_id', userId);
        (vbeRes || []).forEach(r => {
            const t = r.vbe_questions?.topic; if (!t) return;
            if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
            topicStats[t].total++; if (r.is_correct) topicStats[t].correct++;
        });

        const { data: quizRes } = await supabaseClient.from('quiz_results').select('score, total_questions, quizzes!inner(topic)').eq('user_id', userId);
        (quizRes || []).forEach(r => {
            const t = r.quizzes?.topic; if (!t) return;
            if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
            topicStats[t].total += r.total_questions; topicStats[t].correct += r.score;
        });

        let bestTopic = null, bestPct = 0;
        Object.entries(topicStats).forEach(([topic, stats]) => {
            if (stats.total < 3) return;
            const pct = (stats.correct / stats.total) * 100;
            if (pct > bestPct) { bestPct = pct; bestTopic = topic; }
        });
        el.innerText = bestTopic ? `${bestTopic} (${Math.round(bestPct)}%)` : '-';
    } catch (err) { console.error("Klaida kraunant stipriausią temą:", err); el.innerText = '-'; }
}

// --- REALUS XP GRAFIKAS ---
async function loadXpChart(userId) {
    const canvas = document.getElementById('xpChart');
    if (!canvas || typeof Chart === 'undefined') return;
    try {
        const days = [], dayXp = Array(7).fill(0);
        const today = new Date();
        const weekdays = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Še', 'Se'];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today); d.setDate(today.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
            labels.push(weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]);
        }

        const { data: quizData } = await supabaseClient.from('quiz_results').select('score, created_at').eq('user_id', userId).gte('created_at', days[0]);
        (quizData || []).forEach(r => {
            const idx = days.indexOf(r.created_at?.split('T')[0]);
            if (idx !== -1) dayXp[idx] += (r.score || 0) * 10;
        });

        const cumulative = []; let running = 0;
        dayXp.forEach(xp => { running += xp; cumulative.push(running); });
        const hasData = cumulative.some(v => v > 0);

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'XP',
                    data: cumulative,
                    borderColor: '#5d5fef',
                    backgroundColor: 'rgba(93,95,239,0.08)',
                    fill: true, tension: 0.4,
                    pointBackgroundColor: '#5d5fef', pointRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.y} XP` } } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#999' }, grid: { color: '#f0f0f0' } },
                    x: { ticks: { color: '#999' }, grid: { display: false } }
                }
            }
        });

        if (!hasData) {
            const note = document.createElement('p');
            note.style.cssText = 'text-align:center;color:#bbb;font-size:13px;margin-top:8px;';
            note.textContent = 'Šią savaitę dar nėra aktyvumo – atlik testą!';
            canvas.parentElement.appendChild(note);
        }
    } catch (err) { console.error("Klaida kraunant XP grafiką:", err); }
}

// --- 4. FILTRUOJAMI REZULTATAI ---
async function showFilteredResult() {
    const category = document.getElementById('filter-category').value;
    const topic = document.getElementById('filter-topic').value;
    const source = document.getElementById('filter-source').value;
    const display = document.getElementById('result-display');
    if (!display) return;

    display.innerHTML = `<div style="color:#aaa;font-size:13px;text-align:center;padding:20px 0;"><i class="fas fa-spinner fa-spin"></i> Skaičiuojama...</div>`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { display.innerHTML = `<p style="color:#e74c3c;">Prisijunkite.</p>`; return; }

        let totalCorrect = 0, totalAsked = 0;

        if (source === 'vbe') {
            let query = supabaseClient.from('vbe_results').select('is_correct, vbe_questions!inner(subject, topic)').eq('user_id', user.id);
            if (category) query = query.eq('vbe_questions.subject', category);
            if (topic) query = query.eq('vbe_questions.topic', topic);
            const { data } = await query;
            if (data) { totalAsked = data.length; totalCorrect = data.filter(r => r.is_correct).length; }
        } else if (source === 'egzaminai') {
            let query = supabaseClient.from('exam_results').select('is_correct, exam_questions!inner(category, topic)').eq('user_id', user.id);
            if (category) query = query.eq('exam_questions.category', category);
            if (topic) query = query.eq('exam_questions.topic', topic);
            const { data } = await query;
            if (data) { totalAsked = data.length; totalCorrect = data.filter(r => r.is_correct).length; }
        } else {
            let query = supabaseClient.from('quiz_results').select('score, total_questions, quizzes!inner(category, topic)').eq('user_id', user.id);
            if (category) query = query.eq('quizzes.category', category);
            if (topic) query = query.eq('quizzes.topic', topic);
            const { data } = await query;
            if (data) { data.forEach(r => { totalCorrect += r.score; totalAsked += r.total_questions; }); }
        }

        if (totalAsked === 0) {
            display.innerHTML = `<div style="text-align:center;padding:20px 0;color:#aaa;"><i class="fas fa-inbox" style="font-size:28px;margin-bottom:8px;display:block;"></i><p style="font-size:14px;">Duomenų dar nėra.<br>Atlik keletą klausimų ir grįžk!</p></div>`;
            return;
        }

        const percent = Math.round((totalCorrect / totalAsked) * 100);
        const wrong = totalAsked - totalCorrect;
        const scopeText = (category && topic) ? topic : category ? category : 'Bendra statistika:';
        const sourceLabel = source === 'vbe' ? 'VBE klausimai' : source === 'egzaminai' ? 'Egzaminų klausimai' : 'Temos testai';
        const barColor = percent >= 70 ? '#27ae60' : percent >= 45 ? '#f39c12' : '#e74c3c';
        const verdict = percent >= 80
            ? `<span style="color:#27ae60;font-weight:600;"><i class="fas fa-trophy"></i> Puikiai!</span>`
            : percent >= 60
            ? `<span style="color:#f39c12;font-weight:600;"><i class="fas fa-star"></i> Neblogai</span>`
            : `<span style="color:#e74c3c;font-weight:600;"><i class="fas fa-redo"></i> Reikia praktikos</span>`;

        display.innerHTML = `
            <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
                    <strong style="font-size:15px;color:#333;">${scopeText}</strong>
                    <span style="font-size:22px;font-weight:800;color:${barColor};">${percent}%</span>
                </div>
                <div style="background:#f0f0f0;border-radius:8px;height:10px;overflow:hidden;">
                    <div style="width:${percent}%;height:100%;background:${barColor};border-radius:8px;transition:width 0.6s;"></div>
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-bottom:12px;">
                <div style="flex:1;background:#eafaf1;border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-size:20px;font-weight:800;color:#27ae60;">${totalCorrect}</div>
                    <div style="font-size:11px;color:#888;text-transform:uppercase;">Teisingai</div>
                </div>
                <div style="flex:1;background:#fdedec;border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-size:20px;font-weight:800;color:#e74c3c;">${wrong}</div>
                    <div style="font-size:11px;color:#888;text-transform:uppercase;">Neteisingai</div>
                </div>
                <div style="flex:1;background:#f8f9ff;border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-size:20px;font-weight:800;color:#5d5fef;">${totalAsked}</div>
                    <div style="font-size:11px;color:#888;text-transform:uppercase;">Iš viso</div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#999;border-top:1px solid #f0f0f0;padding-top:10px;">
                <span>${sourceLabel}</span>${verdict}
            </div>`;
    } catch (err) {
        display.innerHTML = `<p style="color:#e74c3c;font-size:13px;">Klaida gaunant duomenis.</p>`;
        console.error(err);
    }
}
