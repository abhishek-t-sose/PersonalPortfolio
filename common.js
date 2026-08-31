/* ============================================================
   common.js — shared chrome for every page on the site.
   Injects nav.html / footer.html into #site-nav / #site-footer,
   then wires up: theme toggle (persisted + system-preference
   default), the mobile hamburger menu, current-page highlighting,
   and the fade-up scroll-reveal used across sections.

   Pages that need to react to a theme change (e.g. re-themeing a
   Plotly chart) can listen for: window.addEventListener('sitethemechange', ...)
   ============================================================ */

(function () {
  const html = document.documentElement;

  function applyStoredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) html.setAttribute('data-theme', saved);
    else if (window.matchMedia('(prefers-color-scheme:dark)').matches) html.setAttribute('data-theme', 'dark');
  }
  applyStoredTheme(); // do this immediately, before partials load, to avoid a flash

  function wireThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      window.dispatchEvent(new CustomEvent('sitethemechange', { detail: { theme: next } }));
    });
  }

  function wireHamburger() {
    const hamburger = document.getElementById('hamburger');
    const links = document.getElementById('navLinks');
    if (!hamburger || !links) return;
    hamburger.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(l => l.addEventListener('click', () => links.classList.remove('open')));
  }

  function highlightCurrentPage() {
    const page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
      if (a.dataset.page === page) a.classList.add('current');
    });
  }

  function wireFadeUp() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  }

  async function injectPartial(placeholderId, url) {
    const el = document.getElementById(placeholderId);
    if (!el) return;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Partial fetch failed (${res.status}): ${url}`);
        el.innerHTML = ''; // fail quietly rather than injecting an error page's HTML
        return;
      }
      el.outerHTML = await res.text();
    } catch (e) {
      console.error('Failed to load partial', url, e);
      el.innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      injectPartial('site-nav', 'partials/nav.html'),
      injectPartial('site-footer', 'partials/footer.html'),
    ]);
    wireThemeToggle();
    wireHamburger();
    highlightCurrentPage();
    wireFadeUp();
  });
})();
