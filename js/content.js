/**
 * content.js — Core rendering engine per il blog Erosioni
 * Versione locale: 20261108j
 */

(function() {
  'use strict';

  const REPO_OWNER = 'davideamatoag';
  const REPO_NAME  = 'Erosioni';
  const BRANCH     = 'main';
  const USE_GH     = true;

  /* ---------- Cache-busting ---------- */
  const CB = '?v=20261108j';

  /* ---------- Stato ---------- */
  let articles = [], portfolio = [], settings = {}, scatti = [];
  let currentArticle = null;

  /* ---------- Helper fetch ---------- */
  async function fetchJSON(path) {
    const url = USE_GH
      ? `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${path}`
      : path;
    const r = await fetch(url + CB, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  }

  /* ---------- Caricamento dati ---------- */
  async function loadAllData() {
    try {
      articles  = await fetchJSON('content/articoli.json');
      portfolio = await fetchJSON('content/portfolio.json');
      settings  = await fetchJSON('content/impostazioni.json');
      try { scatti = await fetchJSON('content/scatti.json'); } catch(e) { scatti = []; }
    } catch(e) {
      console.error('Errore caricamento dati:', e);
    }
  }

  /* ---------- Social Meta ---------- */
  function setSocialMeta(article) {
    const baseUrl = 'https://davideamatoag.github.io/Erosioni';
    const title = article ? article.title : (settings.site_title || 'Erosioni');
    const desc  = article ? (article.excerpt || '') : (settings.site_description || '');
    const image = article ? article.image : (settings.site_image || '');
    const url   = article ? `${baseUrl}/articoli/${article.slug}.html` : baseUrl;

    document.title = title + (article ? ' — Erosioni' : '');

    const metaTags = {
      'description': desc,
      'og:title': title,
      'og:description': desc,
      'og:image': image ? (image.startsWith('http') ? image : baseUrl + '/' + image) : '',
      'og:url': url,
      'og:type': article ? 'article' : 'website',
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': desc,
      'twitter:image': image ? (image.startsWith('http') ? image : baseUrl + '/' + image) : '',
    };

    Object.entries(metaTags).forEach(([prop, content]) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(prop.startsWith('og:') ? 'property' : 'name', prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    });
  }

  /* ---------- Render articoli ---------- */
  function renderArticles(containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const list = limit ? articles.slice(0, limit) : articles;
    list.forEach((article, index) => {
      const card = document.createElement('article');
      card.className = 'article-card';
      card.style.animationDelay = `${index * 0.08}s`;
      card.innerHTML = `
        <a href="articoli/${article.slug}.html" class="card-image-link" data-slug="${article.slug}">
          <img src="${article.image}" alt="${article.title}" loading="lazy">
        </a>
        <div class="card-body">
          <div class="card-meta">
            <span class="card-category">${article.category}</span>
            <span class="card-date">${article.date}</span>
          </div>
          <h3 class="card-title"><a href="articoli/${article.slug}.html" data-slug="${article.slug}">${article.title}</a></h3>
          <p class="card-excerpt">${article.excerpt}</p>
          <a href="articoli/${article.slug}.html" class="read-more" data-slug="${article.slug}">Leggi →</a>
        </div>
      `;
      container.appendChild(card);
    });

    /* Intercetta click per apertura modale */
    container.querySelectorAll('a[data-slug]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        openArticleModal(link.dataset.slug);
      });
    });
  }

  /* ---------- Shortcode parser ---------- */
  function parseShortcodes(html) {
    /* [nota]...[/nota] */
    html = html.replace(/\[nota\]([\s\S]*?)\[\/nota\]/g, '<span class="nota">$1</span>');
    /* [colore #hex]...[/colore] */
    html = html.replace(/\[colore\s+([#\w]+)\]([\s\S]*?)\[\/colore\]/g, '<span style="color:$1">$2</span>');
    /* [font nome]...[/font] */
    html = html.replace(/\[font\s+([\w-]+)\]([\s\S]*?)\[\/font\]/g, '<span style="font-family:$1">$2</span>');
    /* [interlinea N]...[/interlinea] */
    html = html.replace(/\[interlinea\s+(\d+(?:\.\d+)?)\]([\s\S]*?)\[\/interlinea\]/g, '<span style="line-height:$1">$2</span>');
    /* [riga-vuota] */
    html = html.replace(/\[riga-vuota\]/g, '<div style="height:1.5em"></div>');
    /* [blocco]...[/blocco] */
    html = html.replace(/\[blocco\]([\s\S]*?)\[\/blocco\]/g, '<div class="blocco">$1</div>');
    /* [blocco-font nome]...[/blocco-font] */
    html = html.replace(/\[blocco-font\s+([\w-]+)\]([\s\S]*?)\[\/blocco-font\]/g, '<div style="font-family:$1">$1</div>');
    /* [citazione]...[/citazione] */
    html = html.replace(/\[citazione\]([\s\S]*?)\[\/citazione\]/g, '<blockquote class="citazione-lunga">$1</blockquote>');
    return html;
  }

  /* ---------- Modal articolo ---------- */
  function openArticleModal(slug) {
    const article = articles.find(a => a.slug === slug);
    if (!article) return;
    currentArticle = article;

    const modal = document.getElementById('articleModal');
    const backdrop = modal.querySelector('.article-modal-backdrop');
    const grain = modal.querySelector('.article-modal-grain');
    const content = modal.querySelector('.article-modal-content');

    /* Sfondo dinamico */
    if (article.image) {
      backdrop.style.backgroundImage = `url('${article.image}')`;
      backdrop.classList.add('has-image');
    } else {
      backdrop.style.backgroundImage = '';
      backdrop.classList.remove('has-image');
    }

    /* Meta social */
    setSocialMeta(article);

    /* Contenuto */
    const bodyHtml = parseShortcodes(article.content);
    content.innerHTML = `
      <button class="modal-close" onclick="closeArticleModal()">&times;</button>
      <div class="article-top">
        <div class="container">
          <a href="#" class="article-back" onclick="closeArticleModal(); return false;">&larr; Torna agli articoli</a>
          <div class="article-top-grid">
            <div>
              <h1 class="article-page-title">${article.title}</h1>
              <p class="article-excerpt">${article.excerpt}</p>
            </div>
            <div class="article-top-meta">
              <div><span class="meta-label">Data</span><span class="meta-value">${article.date}</span></div>
              <div><span class="meta-label">Categoria</span><span class="meta-value">${article.category}</span></div>
              ${article.reading_time ? `<div><span class="meta-label">Tempo di lettura</span><span class="meta-value">${article.reading_time}</span></div>` : ''}
            </div>
          </div>
          <hr class="article-top-divider">
        </div>
      </div>
      <div class="container">
        <div class="article-body">${bodyHtml}</div>
        
        <div class="share-bar">
          <span class="share-label">Condividi</span>
          <button class="share-btn" onclick="shareArticle('twitter')" title="Twitter">𝕏</button>
          <button class="share-btn" onclick="shareArticle('facebook')" title="Facebook">f</button>
          <button class="share-btn" onclick="shareArticle('whatsapp')" title="WhatsApp">📱</button>
          <button class="share-btn" onclick="shareArticle('copy')" title="Copia link">🔗</button>
        </div>

        ${renderAuthorBio()}
        ${renderPrevNext(article)}
      </div>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    /* Progresso lettura */
    setupReadingProgress(modal);
  }

  function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    const backdrop = modal.querySelector('.article-modal-backdrop');
    backdrop.style.backgroundImage = '';
    backdrop.classList.remove('has-image');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    setSocialMeta(null);
    currentArticle = null;
  }

  /* ---------- Bio autore ---------- */
  function renderAuthorBio() {
    const bio = settings.author_bio || '';
    const img = settings.author_image || '';
    if (!bio && !img) return '';
    return `
      <div class="author-bio-section">
        ${img ? `<img class="author-image" src="${img}" alt="${settings.author_name || 'Autore'}">` : ''}
        <div class="author-bio-text">
          ${bio ? `<p><strong>${settings.author_name || 'Autore'}</strong> — ${bio}</p>` : ''}
        </div>
      </div>
    `;
  }

  /* ---------- Prev / Next ---------- */
  function renderPrevNext(article) {
    const idx = articles.findIndex(a => a.slug === article.slug);
    const prev = articles[idx - 1];
    const next = articles[idx + 1];
    if (!prev && !next) return '';
    return `
      <div class="article-prev-next">
        ${prev ? `<a href="articoli/${prev.slug}.html" data-slug="${prev.slug}"><div class="nav-label">← Precedente</div><div class="nav-title">${prev.title}</div></a>` : '<div></div>'}
        ${next ? `<a href="articoli/${next.slug}.html" data-slug="${next.slug}" style="text-align:right"><div class="nav-label">Successivo →</div><div class="nav-title">${next.title}</div></a>` : '<div></div>'}
      </div>
    `;
  }

  /* ---------- Condivisione ---------- */
  function shareArticle(platform) {
    if (!currentArticle) return;
    const baseUrl = 'https://davideamatoag.github.io/Erosioni';
    const url = `${baseUrl}/articoli/${currentArticle.slug}.html`;
    const text = currentArticle.title;
    
    switch(platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url).then(() => alert('Link copiato!'));
        break;
    }
  }

  /* ---------- Progresso lettura ---------- */
  function setupReadingProgress(container) {
    const bar = container.querySelector('.modal-reading-progress');
    if (!bar) return;
    const content = container.querySelector('.article-body');
    if (!content) return;
    
    container.addEventListener('scroll', () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = content.offsetHeight - container.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = Math.min(progress, 100) + '%';
    });
  }

  /* ---------- Torna su ---------- */
  function setupBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 600);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Render pagina articolo dedicata ---------- */
  function renderArticlePage() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) return;
    
    const article = articles.find(a => a.slug === slug);
    if (!article) return;
    currentArticle = article;

    const container = document.getElementById('articleContainer');
    if (!container) return;

    setSocialMeta(article);

    const bodyHtml = parseShortcodes(article.content);
    container.innerHTML = `
      <div class="article-top">
        <div class="container">
          <a href="index.html" class="article-back">&larr; Torna agli articoli</a>
          <div class="article-top-grid">
            <div>
              <h1 class="article-page-title">${article.title}</h1>
              <p class="article-excerpt">${article.excerpt}</p>
            </div>
            <div class="article-top-meta">
              <div><span class="meta-label">Data</span><span class="meta-value">${article.date}</span></div>
              <div><span class="meta-label">Categoria</span><span class="meta-value">${article.category}</span></div>
              ${article.reading_time ? `<div><span class="meta-label">Tempo di lettura</span><span class="meta-value">${article.reading_time}</span></div>` : ''}
            </div>
          </div>
          <hr class="article-top-divider">
        </div>
      </div>
      <div class="container">
        <div class="article-body">${bodyHtml}</div>
        
        <div class="share-bar">
          <span class="share-label">Condividi</span>
          <button class="share-btn" onclick="shareArticle('twitter')" title="Twitter">𝕏</button>
          <button class="share-btn" onclick="shareArticle('facebook')" title="Facebook">f</button>
          <button class="share-btn" onclick="shareArticle('whatsapp')" title="WhatsApp">📱</button>
          <button class="share-btn" onclick="shareArticle('copy')" title="Copia link">🔗</button>
        </div>

        ${renderAuthorBio()}
        ${renderPrevNext(article)}
        
        <div style="text-align:center;margin-top:48px">
          <button class="article-back" onclick="openArticleModal('${article.slug}')">Apri a tendina ↗</button>
        </div>
      </div>
    `;

    setupReadingProgress(document);
  }

  /* ---------- Render portfolio ---------- */
  function renderPortfolio(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    portfolio.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'portfolio-item';
      card.style.animationDelay = `${index * 0.1}s`;
      card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="portfolio-overlay">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </div>
      `;
      container.appendChild(card);
    });
  }

  /* ---------- Render scatti ---------- */
  function renderScatti(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    scatti.forEach((scatto, index) => {
      const item = document.createElement('div');
      item.className = 'scatto-item';
      item.style.animationDelay = `${index * 0.08}s`;
      item.innerHTML = `
        <img src="${scatto.image}" alt="${scatto.title}" loading="lazy">
        <div class="scatto-caption">
          <h4>${scatto.title}</h4>
          <p>${scatto.description}</p>
        </div>
      `;
      container.appendChild(item);
    });
  }

  /* ---------- Slugify ---------- */
  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /* ---------- Export ---------- */
  window.Erosioni = {
    loadAllData,
    renderArticles,
    renderPortfolio,
    renderScatti,
    renderArticlePage,
    openArticleModal,
    closeArticleModal,
    shareArticle,
    setupBackToTop,
    setupReadingProgress,
    parseShortcodes,
    slugify,
    get articles() { return articles; },
    get portfolio() { return portfolio; },
    get settings() { return settings; },
    get currentArticle() { return currentArticle; },
  };

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    if (document.getElementById('articlesGrid')) renderArticles('articlesGrid');
    if (document.getElementById('portfolioGrid')) renderPortfolio('portfolioGrid');
    if (document.getElementById('scattiGrid')) renderScatti('scattiGrid');
    if (document.getElementById('articleContainer')) renderArticlePage();
    setupBackToTop();
    setSocialMeta(null);
  });

})();
/* __PLACEHOLDER__ */