/**
 * bottomPanel.js — tab activation + drag reordering for the bottom panel.
 */

const TAB_ORDER_KEY = 'myreader_bottom_tab_order';

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

function getTabs(root = document) {
  return Array.from(root.querySelectorAll('.bottom-tab[data-tab]'));
}

function getPanes(root = document) {
  return Array.from(root.querySelectorAll('.bottom-panel-content'));
}

function readStoredOrder() {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(TAB_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function persistOrder(container) {
  try {
    const storage = getStorage();
    if (!storage) return;
    const order = getTabs(container).map((tab) => tab.dataset.tab);
    storage.setItem(TAB_ORDER_KEY, JSON.stringify(order));
  } catch (_error) {}
}

export function activateBottomTab(tabId, root = document) {
  const tabs = getTabs(root);
  const panes = getPanes(root);
  if (!tabs.length || !panes.length) return;

  const targetPane = root.querySelector(
    `.bottom-panel-content[data-content="${tabId}"]`,
  );
  if (!targetPane) return;

  tabs.forEach((tab) =>
    tab.classList.toggle('bottom-tab-active', tab.dataset.tab === tabId),
  );
  panes.forEach((pane) =>
    pane.classList.toggle('bottom-content-active', pane.dataset.content === tabId),
  );
}

export function applyBottomTabOrder(container, order = []) {
  if (!container || !order.length) return;

  const closeButton = container.querySelector('.bottom-panel-close');
  const tabs = getTabs(container);
  const byId = new Map(tabs.map((tab) => [tab.dataset.tab, tab]));
  const orderedIds = new Set(order);
  const orderedTabs = order.map((id) => byId.get(id)).filter(Boolean);
  const remainingTabs = tabs.filter((tab) => !orderedIds.has(tab.dataset.tab));

  [...orderedTabs, ...remainingTabs].forEach((tab) => {
    container.insertBefore(tab, closeButton || null);
  });
}

function reorderTabs(container, draggedTab, targetTab, clientX) {
  if (!container || !draggedTab || !targetTab || draggedTab === targetTab) return;

  const rect = targetTab.getBoundingClientRect();
  const insertAfter = clientX > rect.left + rect.width / 2;
  const referenceNode = insertAfter ? targetTab.nextElementSibling : targetTab;
  container.insertBefore(draggedTab, referenceNode);
}

/**
 * Initialise the bottom panel tab switching + reordering behaviour.
 */
export function initBottomPanel() {
  const panel = document.getElementById('bottomPanel');
  const tabsContainer = panel?.querySelector('.bottom-panel-tabs');
  if (!panel || !tabsContainer) return;

  const tabs = getTabs(panel);
  const panes = getPanes(panel);
  if (!tabs.length || !panes.length) return;

  applyBottomTabOrder(tabsContainer, readStoredOrder());

  let draggingTab = null;
  let pointerDragging = false;
  let pointerHoldTimer = null;
  let pointerCandidate = null;
  let suppressClick = false;

  const cancelPointerHold = () => {
    if (pointerHoldTimer) {
      window.clearTimeout(pointerHoldTimer);
      pointerHoldTimer = null;
    }
    pointerCandidate = null;
  };

  const finishDragging = () => {
    if (!draggingTab) return;
    draggingTab.classList.remove('bottom-tab-dragging');
    tabsContainer.classList.remove('bottom-tabs-sorting');
    draggingTab = null;
    pointerDragging = false;
    persistOrder(tabsContainer);
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
  };

  const startDragging = (tab) => {
    draggingTab = tab;
    tabsContainer.classList.add('bottom-tabs-sorting');
    tab.classList.add('bottom-tab-dragging');
  };

  getTabs(panel).forEach((tab) => {
    tab.draggable = true;
    tab.classList.add('bottom-tab-sortable');

    tab.addEventListener('dragstart', (event) => {
      startDragging(tab);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try {
          event.dataTransfer.setData('text/plain', tab.dataset.tab || '');
        } catch (_error) {}
      }
    });

    tab.addEventListener('dragend', () => {
      if (!pointerDragging) finishDragging();
    });
  });

  tabsContainer.addEventListener('dragover', (event) => {
    if (!draggingTab || pointerDragging) return;
    event.preventDefault();
    const targetTab = event.target.closest('.bottom-tab[data-tab]');
    reorderTabs(tabsContainer, draggingTab, targetTab, event.clientX);
  });

  tabsContainer.addEventListener('drop', (event) => {
    if (!draggingTab || pointerDragging) return;
    event.preventDefault();
    const targetTab = event.target.closest('.bottom-tab[data-tab]');
    reorderTabs(tabsContainer, draggingTab, targetTab, event.clientX);
    finishDragging();
  });

  tabsContainer.addEventListener('pointerdown', (event) => {
    const tab = event.target.closest('.bottom-tab[data-tab]');
    if (!tab || event.pointerType === 'mouse') return;

    cancelPointerHold();
    pointerCandidate = {
      tab,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };

    pointerHoldTimer = window.setTimeout(() => {
      pointerHoldTimer = null;
      pointerDragging = true;
      suppressClick = true;
      startDragging(tab);
      if (tabsContainer.setPointerCapture) {
        tabsContainer.setPointerCapture(event.pointerId);
      }
    }, 180);
  });

  tabsContainer.addEventListener('pointermove', (event) => {
    if (pointerCandidate && !pointerDragging) {
      const dx = Math.abs(event.clientX - pointerCandidate.startX);
      const dy = Math.abs(event.clientY - pointerCandidate.startY);
      if (dx > 8 || dy > 8) {
        cancelPointerHold();
      }
    }

    if (!pointerDragging || !draggingTab) return;

    event.preventDefault();
    const targetTab = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('.bottom-tab[data-tab]');
    reorderTabs(tabsContainer, draggingTab, targetTab, event.clientX);
  });

  const finishPointerInteraction = (event) => {
    const pointerId = pointerCandidate?.pointerId;
    cancelPointerHold();
    if (!pointerDragging) return;

    event.preventDefault();
    if (tabsContainer.releasePointerCapture && pointerId) {
      try {
        tabsContainer.releasePointerCapture(pointerId);
      } catch (_error) {}
    }
    finishDragging();
  };

  tabsContainer.addEventListener('pointerup', finishPointerInteraction);
  tabsContainer.addEventListener('pointercancel', finishPointerInteraction);

  tabsContainer.addEventListener('click', (event) => {
    const tab = event.target.closest('.bottom-tab[data-tab]');
    if (!tab) return;

    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    activateBottomTab(tab.dataset.tab, document);
  });
}
