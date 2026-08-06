// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Newsletter form (placeholder handler — collega qui il tuo servizio di
// newsletter preferito, es. Mailchimp, Buttondown, ConvertKit...)
const newsletterForm = document.getElementById('newsletterForm');
const newsletterNote = document.getElementById('newsletterNote');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: sostituire con una vera chiamata API al servizio newsletter
    newsletterForm.reset();
    if (newsletterNote) newsletterNote.hidden = false;
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
