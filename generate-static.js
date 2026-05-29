/**
 * StudijųBankas – statinių pamokų puslapių generatorius
 * 
 * Naudojimas:
 *   1. npm install @supabase/supabase-js
 *   2. Užpildykite SUPABASE_URL ir SUPABASE_ANON_KEY žemiau
 *   3. node generate-static.js
 * 
 * Sugeneruoja:
 *   - /lessions/[tema-pavadinimas].html  (kiekviena pamoka)
 *   - /sitemap.xml                        (SEO)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============================================================
// KONFIGŪRACIJA – užpildykite savo duomenimis
// ============================================================
const SUPABASE_URL = 'https://spuweynlvomzqujwpmld.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aFw6NSq9T-7uYPB3scpskA_lMO7oK7x';
const SITE_URL = 'https://www.studijubankas.lt';
const OUTPUT_DIR = path.join(__dirname, 'lessons'); // kur rašyti failus
// ============================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Paverčia pavadinimą į URL-draugišką stringą
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/č/g, 'c').replace(/ę/g, 'e')
    .replace(/ė/g, 'e').replace(/į/g, 'i').replace(/š/g, 's')
    .replace(/ų/g, 'u').replace(/ū/g, 'u').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateLessonHTML(topic) {
  const slug = slugify(topic.title);
  const responsiveCSS = `
    * { box-sizing: border-box; }
    body { max-width: 100%; overflow-x: hidden; word-break: break-word; }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { word-break: break-word; overflow-wrap: break-word; }
    pre, code { white-space: pre-wrap; word-break: break-all; overflow-x: auto; }
    .code-block { white-space: pre !important; overflow-x: auto; }
  `;

  const content = topic.content || '<p>Ši pamoka dar neturi turinio.</p>';

  return `<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topic.title} | StudijųBankas</title>
  <meta name="description" content="${(topic.description || topic.title).replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${topic.title} | StudijųBankas">
  <meta property="og:description" content="${(topic.description || '').replace(/"/g, '&quot;')}">
  <meta property="og:url" content="${SITE_URL}/lessons/${slug}.html">
  <link rel="canonical" href="${SITE_URL}/lessons/${slug}.html">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5404880047208445" crossorigin="anonymous"></script>
  <style>${responsiveCSS}</style>
</head>
<body class="dashboard-bg">
<div class="dashboard-layout">

  <aside class="sidebar-nav" id="sidebar">
    <a href="/index.html" class="logo-link">
      <div class="logo">Studijų<span>Bankas</span></div>
    </a>
    <nav>
      <a href="/dashboard.html"><i class="fas fa-home"></i> Pradžia</a>
      <a href="/topics.html" class="active"><i class="fas fa-book"></i> Temos</a>
      <a href="/quizzes.html"><i class="fas fa-vial"></i> Testai</a>
      <a href="/exam-prep.html"><i class="fas fa-graduation-cap"></i> Egzaminai</a>
      <a href="/vbe.html"><i class="fas fa-star"></i> VBE Pasiruošimas</a>
      <a href="/analytics.html"><i class="fas fa-chart-bar"></i> Analitika</a>
      <a href="/profile.html"><i class="fas fa-user"></i> Profilis</a>
    </nav>
  </aside>

  <main class="dashboard-main">
    <header class="page-header">
      <div>
        <a href="/topics.html" class="back-link"><i class="fas fa-arrow-left"></i> Grįžti į temas</a>
        <h1 style="font-size:1.6rem; margin-top:8px;">${topic.title}</h1>
        ${topic.category ? `<span class="category-badge">${topic.category}</span>` : ''}
      </div>
    </header>

    <article class="content-card lesson-content" style="padding: 32px;">
      ${content}
    </article>

    <div style="margin-top: 24px; text-align: center;">
      <a href="/topics.html" class="back-link">← Visos temos</a>
    </div>
  </main>

</div>

<footer class="site-footer">
  <div class="f-inner">
    <div class="f-bottom">
      <p class="f-copy">&copy; ${new Date().getFullYear()} StudijųBankas. Visos teisės saugomos.</p>
      <ul class="f-legal">
        <li><a href="/privacy.html">Privatumo politika</a></li>
        <li><a href="/kontaktai.html">Kontaktai</a></li>
      </ul>
    </div>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/scripts.js"></script>
<script src="/subscription.js"></script>
</body>
</html>`;
}

function generateSitemap(topics, existingSitemapPath) {
  // Nuskaitome esamą sitemap.xml ir išsaugome visus URL
  let existingUrls = '';
  if (fs.existsSync(existingSitemapPath)) {
    const raw = fs.readFileSync(existingSitemapPath, 'utf8');
    const match = raw.match(/<urlset[^>]*>([\s\S]*)<\/urlset>/);
    if (match) existingUrls = match[1];
  }

  // Sugeneruojame naujus /lessons/ URL
  const lessonUrls = topics.map(t => `
  <url>
    <loc>${SITE_URL}/lessons/${slugify(t.title)}.html</loc>
    <lastmod>${new Date(t.updated_at || t.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${existingUrls}
  <!-- Pamokų puslapiai (automatiškai sugeneruota) -->${lessonUrls}
</urlset>`;
}

async function main() {
  console.log('⏳ Jungiamasi prie Supabase...');

  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase klaida:', error.message);
    process.exit(1);
  }

  console.log(`✅ Rasta ${topics.length} temų`);

  // Sukuriame output katalogą
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generuojame HTML kiekvienai temai
  let generated = 0;
  for (const topic of topics) {
    const slug = slugify(topic.title);
    const html = generateLessonHTML(topic);
    const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✓ lessons/${slug}.html`);
    generated++;
  }

  // Generuojame sitemap.xml
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  const sitemap = generateSitemap(topics, sitemapPath);
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log('  ✓ sitemap.xml');

  console.log(`\n🎉 Baigta! Sugeneruota ${generated} pamokų puslapių.`);
  console.log(`📁 Failai: ${OUTPUT_DIR}`);
  console.log('\n📌 Kitas žingsnis: įkelkite /lessons/ katalogą ir sitemap.xml į savo serverį.');
}

main();