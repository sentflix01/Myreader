// ─── helpers ────────────────────────────────────────────────────────────────

export function isDesktop() {
  return window.innerWidth > 1200;
}

export function openSidebar(el) {
  if (isDesktop()) {
    el.classList.remove('sidebar-collapsed');
  } else {
    el.classList.add('show-sidebar');
  }
}

export function closeSidebar(el) {
  if (isDesktop()) {
    el.classList.add('sidebar-collapsed');
  } else {
    el.classList.remove('show-sidebar');
  }
}

export function isOpen(el) {
  if (isDesktop()) {
    return !el.classList.contains('sidebar-collapsed');
  }
  return el.classList.contains('show-sidebar');
}

// ─── main init ──────────────────────────────────────────────────────────────

export function initSidebarToggle() {
  const leftToggle   = document.querySelector('#toggleLeftSidebar');
  const rightToggle  = document.querySelector('#toggleRightSidebar');
  const bottomToggle = document.querySelector('#toggleBottomPanel');
  const leftSidebar  = document.querySelector('#leftSidebar');
  const rightSidebar = document.querySelector('#rightSidebar');
  const bottomPanel  = document.querySelector('#bottomPanel');
  const closeBottomBtn = document.querySelector('#closeBottomPanel');

  if (!leftToggle || !rightToggle || !bottomToggle ||
      !leftSidebar || !rightSidebar || !bottomPanel) return;

  // ── overlay for mobile sidebar dismissal ──────────────────────────────────
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.querySelector('.chat-container')?.appendChild(overlay);
  }

  function showOverlay() { overlay.classList.add('active'); }
  function hideOverlay() { overlay.classList.remove('active'); }

  // ── bottom panel state (single source of truth: data attribute) ───────────
  function isBottomOpen() {
    return bottomPanel.dataset.collapsed !== 'true';
  }

  function openBottom() {
    bottomPanel.dataset.collapsed = 'false';
    bottomPanel.classList.remove('panel-collapsed');
    bottomPanel.style.display = '';
  }

  function closeBottom() {
    bottomPanel.dataset.collapsed = 'true';
    bottomPanel.classList.add('panel-collapsed');
    bottomPanel.style.display = 'none';
  }

  // ── sync all icon active states ───────────────────────────────────────────
  function sync() {
    leftToggle.classList.toggle('panel-icon-active', isOpen(leftSidebar));
    rightToggle.classList.toggle('panel-icon-active', isOpen(rightSidebar));
    bottomToggle.classList.toggle('panel-icon-active', isBottomOpen());
  }

  // ── left sidebar toggle ───────────────────────────────────────────────────
  leftToggle.addEventListener('click', () => {
    if (isOpen(leftSidebar)) {
      closeSidebar(leftSidebar);
      hideOverlay();
    } else {
      openSidebar(leftSidebar);
      if (!isDesktop()) showOverlay();
    }
    sync();
  });

  // ── right sidebar toggle ──────────────────────────────────────────────────
  rightToggle.addEventListener('click', () => {
    if (isOpen(rightSidebar)) {
      closeSidebar(rightSidebar);
      hideOverlay();
    } else {
      openSidebar(rightSidebar);
      if (!isDesktop()) showOverlay();
    }
    sync();
  });

  // ── bottom panel toggle ───────────────────────────────────────────────────
  bottomToggle.addEventListener('click', () => {
    if (isBottomOpen()) {
      closeBottom();
    } else {
      openBottom();
    }
    sync();
  });

  // ── close button inside bottom panel ─────────────────────────────────────
  if (closeBottomBtn) {
    closeBottomBtn.addEventListener('click', () => {
      closeBottom();
      sync();
    });
  }

  // ── overlay click: dismiss whichever sidebar is open ─────────────────────
  overlay.addEventListener('click', () => {
    if (isOpen(leftSidebar))  closeSidebar(leftSidebar);
    if (isOpen(rightSidebar)) closeSidebar(rightSidebar);
    hideOverlay();
    sync();
  });

  // ── resize: re-sync states when crossing the desktop breakpoint ───────────
  let lastDesktop = isDesktop();
  window.addEventListener('resize', () => {
    const nowDesktop = isDesktop();
    if (nowDesktop === lastDesktop) return;
    lastDesktop = nowDesktop;

    if (nowDesktop) {
      // switching to desktop: clear mobile classes, hide overlay
      leftSidebar.classList.remove('show-sidebar');
      rightSidebar.classList.remove('show-sidebar');
      hideOverlay();
    } else {
      // switching to mobile: clear desktop classes
      leftSidebar.classList.remove('sidebar-collapsed');
      rightSidebar.classList.remove('sidebar-collapsed');
    }
    sync();
  });

  // ── set correct initial states ────────────────────────────────────────────
  // Bottom panel starts open
  openBottom();
  sync();
}
