// ==========================================================
// content.js — legge content/articoli.json e content/portfolio.json
// e costruisce dinamicamente le sezioni del sito. Questo è ciò che
// rende il pannello di amministrazione (Decap CMS) utile: un
// articolo o una voce di portfolio pubblicati da lì compaiono qui
// automaticamente, senza toccare l'HTML.
// ==========================================================

const CATEGORY_LABELS = {
  recensioni: 'Recensioni',
  cinema: 'Cinema',
  politica: 'Politica',
  riflessioni: 'Riflessioni',
};

const MONTHS_IT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

function formatDateIt(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return isoDate;
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
}

function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

async function fetchArticles() {
  const res = await fetch('content/articoli.json', { cache: 'no-store' });
  const data = await res.json();
  return (data.articles || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function fetchPortfolio() {
  const res = await fetch('content/portfolio.json', { cache: 'no-store' });
  const data = await res.json();
  return data.items || [];
}

function articleCardHtml(a) {
  return `
    <a class="article-card" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="article-thumb" style="background-image:url('${a.image}')"></div>
      <p class="article-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
      <h3 class="article-title">${a.title}</h3>
    </a>`;
}

function archiveItemHtml(a) {
  return `
    <a class="archive-item" data-category="${a.category}" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
      <div class="archive-thumb" style="background-image:url('${a.image}')"></div>
      <div class="archive-body">
        <p class="archive-meta">${formatDateIt(a.date)} / ${categoryLabel(a.category).toUpperCase()}</p>
        <h3 class="archive-title">${a.title}</h3>
      </div>
    </a>`;
}

// ---------------- HOMEPAGE: carosello "Ultimi articoli" ----------------
async function renderHomeCarousel() {
  const track = document.getElementById('articlesTrack');
  if (!track) return;
  const articles = await fetchArticles();
  track.innerHTML = articles.slice(0, 6).map(articleCardHtml).join('');
  window.initArticlesCarousel && window.initArticlesCarousel();
}

// ---------------- PAGINA ARTICOLI: in evidenza + successivi + archivio ----------------
async function renderArticoliPage() {
  const featuredEl = document.getElementById('featuredArticle');
  if (!featuredEl) return;
  const articles = await fetchArticles();
  if (!articles.length) return;

  const [latest, ...rest] = articles;

  featuredEl.href = `articolo.html?slug=${encodeURIComponent(latest.slug)}`;
  featuredEl.innerHTML = `
    <div class="featured-thumb" style="background-image:url('${latest.image}')"></div>
    <p class="featured-meta">${formatDateIt(latest.date)} / ${categoryLabel(latest.category).toUpperCase()}</p>
    <h2 class="featured-title">${latest.title}</h2>`;

  const row3 = document.getElementById('articlesRow3');
  if (row3) row3.innerHTML = rest.slice(0, 3).map(articleCardHtml).join('');

  const archiveList = document.getElementById('archiveList');
  if (archiveList) {
    archiveList.innerHTML = articles.map(archiveItemHtml).join('');
    window.initArchiveFilters && window.initArchiveFilters();
  }
}

// ---------------- PAGINA SINGOLO ARTICOLO ----------------
function renderInline(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(md) {
  // Piccolo motore markdown minimale: paragrafi, ## sottotitoli, > citazioni,
  // più **grassetto**, *corsivo* e [link](url) dentro ai paragrafi.
  const blocks = md.split(/\n\s*\n/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) return `<h2>${renderInline(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith('> ')) return `<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`;
    return `<p>${renderInline(trimmed).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

async function renderArticlePage() {
  const bodyEl = document.getElementById('articleBody');
  if (!bodyEl) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const articles = await fetchArticles();
  const article = articles.find(a => a.slug === slug) || articles[0];

  if (!article) {
    bodyEl.innerHTML = '<p>Articolo non trovato.</p>';
    return;
  }

  document.title = `${article.title} — Erosioni`;
  document.getElementById('articleEyebrow').textContent = categoryLabel(article.category).toUpperCase();
  document.getElementById('articleTitle').textContent = article.title;
  document.getElementById('articleMeta').textContent = formatDateIt(article.date);
  const heroImg = document.getElementById('articleHeroImg');
  heroImg.src = article.image;
  heroImg.alt = article.title;
  bodyEl.innerHTML = renderMarkdown(article.body || '');

  const latestPanel = document.getElementById('latestArticlesList');
  if (latestPanel) {
    const others = articles.filter(a => a.slug !== article.slug).slice(0, 4);
    latestPanel.innerHTML = others.map(archiveItemHtml).join('');
  }
}

// ---------------- PAGINA PORTFOLIO: mosaico ----------------
async function renderPortfolioPage() {
  const grid = document.getElementById('portfolioMasonry');
  if (!grid) return;
  const items = await fetchPortfolio();
  grid.innerHTML = items.map(item => {
    const href = item.link && item.link.trim() ? item.link.trim() : item.image;
    return `
    <a class="masonry-item" href="${href}" target="_blank" rel="noopener">
      <img class="masonry-media" src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.closest('.masonry-item').classList.add('is-broken')">
      <div class="masonry-caption">
        <h3>${item.title}</h3>
        <span class="masonry-tag">${capitalize(item.category)} · ${item.medium === 'video' ? 'Video' : 'Foto'}</span>
      </div>
    </a>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomeCarousel();
  renderArticoliPage();
  renderArticlePage();
  renderPortfolioPage();
});
