/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Shared Navigation Component
   Injected into every page. Handles sidebar + mobile nav.
   ═══════════════════════════════════════════════════ */

const Nav = (() => {
  const PAGES = [
    { id: 'ritual',    label: 'Morning Ritual', icon: '⌂', href: 'index.html' },
    { id: 'leads',     label: 'Leads',          icon: '◐', href: 'leads.html' },
    { id: 'tasks',     label: 'Task Engine',    icon: '✓', href: 'tasks.html' },
    { id: 'finance',   label: 'Finance',         icon: '◆', href: 'finance.html' },
    { id: 'energy',    label: 'Energy',           icon: '⚡', href: 'energy.html' },
    { id: 'health',    label: 'Health Command',  icon: '◎', href: 'health.html' },
    { id: 'calendar',  label: 'Calendar',        icon: '⬡', href: 'calendar.html' },
    { id: 'strategy',  label: 'Strategy',        icon: '◈', href: 'strategy.html' },
    { id: 'settings',  label: 'Settings',        icon: '⚙', href: 'settings.html' }
  ];

  let currentPage = '';
  let deferredPrompt = null;

  function init(pageId) {
    currentPage = pageId;
    renderSidebar();
    renderMobileNav();
    renderTopbar();
    startClock();
    checkInstallPrompt();
    checkOnlineStatus();
  }

  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const settings = DataService.getSettings();
    const tasks = DataService.getTasks();
    const overdue = tasks.filter(t => !t.done && t.dueDate && t.dueDate < DataService.today()).length;

    sidebar.innerHTML = `
      <div class="sb-brand">
        <div class="sb-logo">
          <div class="sb-logo-icon">⚡</div>
          <div>
            <div class="sb-logo-text">EHV Ops Hub</div>
            <div class="sb-logo-sub">Operations Engine</div>
          </div>
        </div>
      </div>
      <nav class="sb-nav">
        <div class="sb-label">Modules</div>
        ${PAGES.map(p => `
          <a class="nav-item ${p.id === currentPage ? 'active' : ''}" href="${p.href}">
            <span class="nav-icon">${p.icon}</span>
            ${p.label}
            ${p.id === 'tasks' && overdue > 0 ? `<span class="nav-badge">${overdue}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sb-footer">
        <div class="sb-user">${settings.fullName || 'Operator'}</div>
        <button class="sb-install-btn" id="installBtn" onclick="Nav.install()">Install App</button>
      </div>
    `;
  }

  function renderMobileNav() {
    let mobileNav = document.getElementById('mobile-nav');
    if (!mobileNav) {
      mobileNav = document.createElement('div');
      mobileNav.id = 'mobile-nav';
      document.body.appendChild(mobileNav);
    }

    mobileNav.innerHTML = PAGES.slice(0, 5).map(p => `
      <a class="mobile-nav-item ${p.id === currentPage ? 'active' : ''}" href="${p.href}">
        <span class="nav-icon">${p.icon}</span>
        ${p.label.split(' ')[0]}
      </a>
    `).join('');
  }

  function renderTopbar() {
    const topbar = document.getElementById('topbar');
    if (!topbar) return;

    const page = PAGES.find(p => p.id === currentPage);
    const title = page ? page.label : '';

    topbar.innerHTML = `
      <div class="tb-left">
        <span class="tb-module-name">${title}</span>
      </div>
      <div class="tb-right">
        <span class="tb-clock" id="tb-clock"></span>
        <button class="tb-notification" id="notifBtn" onclick="Nav.toggleNotifications()">
          🔔
        </button>
      </div>
    `;
  }

  function startClock() {
    function tick() {
      const el = document.getElementById('tb-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-AU', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  function checkInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('installBtn');
      if (btn) btn.style.display = 'block';
    });
  }

  function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(result => {
      deferredPrompt = null;
      const btn = document.getElementById('installBtn');
      if (btn) btn.style.display = 'none';
    });
  }

  function checkOnlineStatus() {
    const banner = document.getElementById('offline-banner');
    function update() {
      if (banner) {
        banner.classList.toggle('visible', !navigator.onLine);
      }
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  function toggleNotifications() {
    // Placeholder — will be wired to notification panel
    console.log('Notifications panel toggled');
  }

  // Page transition
  function navigateTo(href) {
    const content = document.getElementById('content');
    if (content) {
      content.classList.add('page-enter');
      setTimeout(() => { window.location.href = href; }, 220);
    } else {
      window.location.href = href;
    }
  }

  return { init, install, toggleNotifications, navigateTo, PAGES };
})();
